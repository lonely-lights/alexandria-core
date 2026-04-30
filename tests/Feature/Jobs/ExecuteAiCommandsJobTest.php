<?php

declare(strict_types=1);

use Alexandria\Core\Jobs\ExecuteAiCommandsJob;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\AiCommandExecutor;
use Illuminate\Auth\GenericUser;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeAuthUserForExecuteJob(int $id = 1): GenericUser
{
    return new GenericUser(['id' => $id]);
}

it('implements ShouldQueue so dispatch lands in the queue', function () {
    $job = new ExecuteAiCommandsJob('batch-x', makeAuthUserForExecuteJob());

    expect($job)->toBeInstanceOf(ShouldQueue::class);
});

it('exposes the batchId and Authenticatable user as public constructor properties', function () {
    $user = makeAuthUserForExecuteJob(77);
    $job = new ExecuteAiCommandsJob('batch-y', $user);

    expect($job->batchId)->toBe('batch-y')
        ->and($job->user)->toBe($user);
});

it('runs the executor against the given batch and marks approved commands as executed', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $command = AiReviewCommand::factory()
        ->forBatch($batchId)
        ->approved()
        ->create([
            'action_type' => 'create_entry',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => [
                    'blueprint_id' => $blueprint->id,
                    'project_id' => $project->id,
                    'name' => 'Boromir',
                ],
            ],
        ]);

    (new ExecuteAiCommandsJob($batchId, makeAuthUserForExecuteJob()))
        ->handle(new AiCommandExecutor);

    expect($command->fresh()->status)->toBe('executed')
        ->and(Entry::query()->where('name', 'Boromir')->exists())->toBeTrue();
});

it('swallows executor exceptions so the job does not bubble back to the worker', function () {
    $batchId = (string) Str::uuid();

    // Approved command with no resolvable payload — execution will throw inside
    // the executor's transaction and surface as a BatchExecutionException.
    AiReviewCommand::factory()
        ->forBatch($batchId)
        ->approved()
        ->create([
            'action_type' => 'create_entry',
            'payload' => [
                // model_class missing -> validation/translation failure deep inside
                'attributes' => ['name' => 'Doomed'],
            ],
        ]);

    expect(fn () => (new ExecuteAiCommandsJob($batchId, makeAuthUserForExecuteJob()))
        ->handle(new AiCommandExecutor))
        ->not->toThrow(Throwable::class);
});
