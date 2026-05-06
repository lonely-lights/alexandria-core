<?php

declare(strict_types=1);

namespace Alexandria\Core\Jobs;

use Alexandria\Core\DTO\AiResponseDTO;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\System\AiTransaction;
use Alexandria\Core\Services\AI\AiCommandFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Persist a raw AI command batch, log the transaction, auto-approve safe
 * commands, and queue {@see ExecuteAiCommandsJob} when at least one command
 * was auto-approved.
 *
 * The user is typed as {@see Authenticatable} so host apps can plug their own
 * user implementation. We only ever read `getAuthIdentifier()` for log /
 * persistence context — the job never persists a user reference.
 *
 * AiTransaction columns are mapped to the core schema (input/output/thinking/
 * cache_read/cache_write/total_tokens + cost). Legacy used a single
 * `token_usage` column that no longer exists.
 *
 * Queue routing: this job is left on the host app's default queue. Legacy used
 * `->onQueue('ai')` in the constructor; we deliberately dropped that so host
 * apps that want a dedicated AI worker can opt in at the dispatch site via
 * `Job::dispatch(...)->onQueue('ai')`.
 */
class ProcessAiCommandsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public array $commandsData,
        public Authenticatable $user,
        public Project $context,
        public AiResponseDTO $dto
    ) {}

    /**
     * @throws Throwable
     */
    public function handle(AiCommandFactory $commandFactory): void
    {
        Log::info('ProcessAiCommandsJob: Starting job execution', [
            'user_id' => $this->user->getAuthIdentifier(),
            'command_count' => count($this->commandsData),
            'context_type' => get_class($this->context),
        ]);

        try {
            // Persist the pending commands + transaction log atomically — partial
            // writes from a mid-loop ValidationException would otherwise leave
            // orphan AiReviewCommand rows under a batch_id with no companion row.
            $batchId = DB::transaction(function () use ($commandFactory): string {
                Log::info('ProcessAiCommandsJob: Calling createBatchFromJson', [
                    'user_id' => $this->user->getAuthIdentifier(),
                    'command_count' => count($this->commandsData),
                ]);

                $batchId = $commandFactory->createBatchFromJson($this->commandsData, $this->user, $this->context);

                Log::info('ProcessAiCommandsJob: Factory returned batch ID', [
                    'user_id' => $this->user->getAuthIdentifier(),
                    'batch_id' => $batchId,
                ]);

                AiTransaction::create([
                    'user_id' => $this->user->getAuthIdentifier(),
                    'batch_id' => $batchId,
                    'provider_name' => AiTransaction::PROVIDER_UNKNOWN,
                    'model_name' => $this->dto->modelName,
                    'context' => 'process_ai_commands',
                    'input_tokens' => $this->dto->inputTokens,
                    'output_tokens' => $this->dto->outputTokens,
                    'thinking_tokens' => $this->dto->thinkingTokens,
                    'cache_read_tokens' => $this->dto->cacheReadTokens,
                    'cache_write_tokens' => $this->dto->cacheWriteTokens,
                    'total_tokens' => $this->dto->totalTokens,
                    'cost' => $this->dto->cost,
                ]);

                return $batchId;
            });

            Log::info('ProcessAiCommandsJob: Batch created', [
                'batch_id' => $batchId,
                'user_id' => $this->user->getAuthIdentifier(),
            ]);

            // Auto-approve safe commands after commit, then queue execution.
            $this->autoApproveCommands($batchId);
            $this->queueApprovedCommandsExecution($batchId);

        } catch (Throwable $e) {
            Log::error('ProcessAiCommandsJob failed to create commands.', [
                'user_id' => $this->user->getAuthIdentifier(),
                'error' => $e->getMessage(),
            ]);

            // Rethrow so the queue worker records the failure + respects retry config.
            // Swallowing here would mark the job successful despite the error.
            throw $e;
        }
    }

    /**
     * Auto-approve commands that don't require manual review.
     * Safe commands (note operations, simple attachments) are auto-approved.
     * Destructive commands (deletes, moves with multiple targets) require manual approval.
     */
    private function autoApproveCommands(string $batchId): void
    {
        // No inner try/catch: any DB-constraint failure here propagates to the
        // outer handle() catch where it's logged with full context. Swallowing
        // it here would leave the batch in a half-approved state with no
        // surfaced error.
        $pendingCommands = AiReviewCommand::query()
            ->where('batch_id', $batchId)
            ->where('status', 'pending')
            ->get();

        $autoApprovedCount = 0;
        $requiresApprovalCount = 0;

        foreach ($pendingCommands as $command) {
            if ($this->shouldAutoApprove($command)) {
                $command->update(['status' => 'approved']);
                $autoApprovedCount++;
            } else {
                $requiresApprovalCount++;
            }
        }

        Log::info('ProcessAiCommandsJob: Command approval analysis', [
            'batch_id' => $batchId,
            'user_id' => $this->user->getAuthIdentifier(),
            'auto_approved' => $autoApprovedCount,
            'requires_approval' => $requiresApprovalCount,
        ]);

        if ($requiresApprovalCount > 0) {
            Log::info('ProcessAiCommandsJob: Commands require manual approval', [
                'batch_id' => $batchId,
                'user_id' => $this->user->getAuthIdentifier(),
                'pending_approval_count' => $requiresApprovalCount,
            ]);
            // TODO: Notify user that commands require manual approval
        }
    }

    /**
     * Queue execution of approved commands in a separate job.
     */
    private function queueApprovedCommandsExecution(string $batchId): void
    {
        $approvedCount = AiReviewCommand::query()
            ->where('batch_id', $batchId)
            ->where('status', 'approved')
            ->count();

        if ($approvedCount > 0) {
            Log::info('ProcessAiCommandsJob: Queueing execution job for approved commands', [
                'batch_id' => $batchId,
                'user_id' => $this->user->getAuthIdentifier(),
                'approved_count' => $approvedCount,
            ]);

            // Queue the execution in a separate job
            ExecuteAiCommandsJob::dispatch($batchId, $this->user);
        } else {
            Log::info('ProcessAiCommandsJob: No approved commands to execute', [
                'batch_id' => $batchId,
                'user_id' => $this->user->getAuthIdentifier(),
            ]);
        }
    }

    /**
     * Determine if a command should be auto-approved based on its risk level.
     * Safe operations are auto-approved, potentially destructive ones require manual review.
     */
    private function shouldAutoApprove(AiReviewCommand $command): bool
    {
        $actionType = $command->action_type;

        // Safe operations that create new data without modifying existing
        $safeOperations = [
            'create_note',      // Creating new notes is safe
            'copy_note',        // Copying creates new data
            'create_entry',     // Creating new entries is safe
            'create_model',     // Backward compat for create_entry
            'integrate_field',  // Copying note content to a field is safe
            'attach_relationship', // Creating links between entries is safe
        ];

        // Risky operations that modify or delete existing data
        $riskyOperations = [
            'transfer_note',    // Moving can lose data if destination is wrong
            'move_note',        // Moving can lose data
            'delete_note',      // Deleting is destructive
            'update_note',      // Updating existing content could lose data
            'update_entry',     // Modifying existing entries is risky
            'update_model',     // Backward compat for update_entry
        ];

        if (in_array($actionType, $safeOperations, true)) {
            return true;
        }

        if (in_array($actionType, $riskyOperations, true)) {
            return false;
        }

        // Unknown action types require manual approval
        Log::warning('ProcessAiCommandsJob: Unknown action type requires manual approval', [
            'action_type' => $actionType,
            'command_id' => $command->id,
        ]);

        return false;
    }
}
