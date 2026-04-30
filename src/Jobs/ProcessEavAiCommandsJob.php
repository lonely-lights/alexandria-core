<?php

declare(strict_types=1);

namespace Alexandria\Core\Jobs;

use Alexandria\Core\DTO\AiResponseDTO;
use Alexandria\Core\Models\Framework\Project;
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
 * Project-scoped variant of {@see ProcessAiCommandsJob}: persists pending
 * commands and logs an AiTransaction without auto-approval. Manual approval
 * (and the subsequent ExecuteAiCommandsJob dispatch) is the caller's
 * responsibility.
 *
 * The user is typed as {@see Authenticatable} so host apps can plug their own
 * user implementation. AiTransaction columns are mapped to the core schema —
 * legacy used a single `token_usage` column that no longer exists, and
 * AiResponseDTO does not expose providerName, so 'unknown' is recorded.
 *
 * Queue routing: this job is left on the host app's default queue. Legacy used
 * `->onQueue('ai')` in the constructor; we deliberately dropped that so host
 * apps that want a dedicated AI worker can opt in at the dispatch site via
 * `Job::dispatch(...)->onQueue('ai')`.
 */
class ProcessEavAiCommandsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public array $commandsData,
        public Authenticatable $user,
        public Project $project,
        public AiResponseDTO $dto
    ) {}

    public function handle(AiCommandFactory $commandFactory): void
    {
        try {
            // Persist the pending commands + transaction log atomically.
            // AiCommandFactory::createBatchFromJson processes commands in a
            // foreach loop; if command index N throws, rows 0..N-1 are already
            // inserted. Wrapping in a DB transaction rolls those partial writes
            // back so we never leave orphan AiReviewCommand rows under a
            // batch_id with no AiTransaction companion.
            $batchId = DB::transaction(function () use ($commandFactory): string {
                $batchId = $commandFactory->createBatchFromJson($this->commandsData, $this->user, $this->project);

                AiTransaction::create([
                    'user_id' => $this->user->getAuthIdentifier(),
                    'batch_id' => $batchId,
                    'provider_name' => 'unknown',
                    'model_name' => $this->dto->modelName,
                    'context' => 'process_eav_ai_commands',
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

            // Notify the user that the plan is ready.
            // broadcast(new \App\Events\AiPlanReady($this->user, $batchId));

            Log::info("Successfully created EAV AI command batch $batchId for user {$this->user->getAuthIdentifier()} and project {$this->project->id}.");

        } catch (Throwable $e) {
            Log::error('ProcessEavAiCommandsJob failed to create commands.', [
                'user_id' => $this->user->getAuthIdentifier(),
                'project_id' => $this->project->id,
                'error' => $e->getMessage(),
            ]);
            // Notify the user of the failure.
            // broadcast(new \App\Events\AiPlanFailed($this->user, $e->getMessage()));
        }
    }
}
