<?php

declare(strict_types=1);

namespace Alexandria\Core\Jobs;

use Alexandria\Core\Services\AI\AiCommandExecutor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Execute the approved AiReviewCommand rows for a single batch.
 *
 * The user is typed as {@see Authenticatable} (not a concrete model) so host
 * apps can plug their own user implementation. We only ever read
 * `getAuthIdentifier()` to derive a user_id-like value for log context — the
 * job never persists a user reference.
 *
 * Throwable is caught (not Exception) because executeBatch() declares
 * BatchExecutionException (a RuntimeException) but downstream action services
 * can surface arbitrary errors during a transactional batch; we want this job
 * to log and exit cleanly rather than re-queue forever on poison pills.
 *
 * Queue routing: this job is left on the host app's default queue. Legacy used
 * `->onQueue('ai')` in the constructor; we deliberately dropped that so host
 * apps that want a dedicated AI worker can opt in at the dispatch site via
 * `Job::dispatch(...)->onQueue('ai')`.
 */
class ExecuteAiCommandsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $batchId,
        public Authenticatable $user
    ) {}

    public function handle(AiCommandExecutor $commandExecutor): void
    {
        Log::info('ExecuteAiCommandsJob: Starting execution', [
            'batch_id' => $this->batchId,
            'user_id' => $this->user->getAuthIdentifier(),
        ]);

        try {
            // Execute only approved commands in this batch
            $results = $commandExecutor->executeBatch($this->batchId);

            Log::info('ExecuteAiCommandsJob: Batch execution completed', [
                'batch_id' => $this->batchId,
                'user_id' => $this->user->getAuthIdentifier(),
                'success_count' => $results['success'],
                'failed_count' => $results['failed'],
            ]);

            // TODO: Add notification to user about execution results
            // broadcast(new \App\Events\AiCommandsExecuted($this->user, $this->batchId, $results));

        } catch (Throwable $e) {
            Log::error('ExecuteAiCommandsJob: Execution failed', [
                'batch_id' => $this->batchId,
                'user_id' => $this->user->getAuthIdentifier(),
                'error' => $e->getMessage(),
            ]);
            // TODO: Notify user of execution failure
        }
    }
}
