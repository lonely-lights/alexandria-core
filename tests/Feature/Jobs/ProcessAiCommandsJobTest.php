<?php

declare(strict_types=1);

use Alexandria\Core\DTO\AiResponseDTO;
use Alexandria\Core\Jobs\ExecuteAiCommandsJob;
use Alexandria\Core\Jobs\ProcessAiCommandsJob;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\System\AiTransaction;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\AiCommandExecutor;
use Alexandria\Core\Services\AI\AiCommandFactory;
use Illuminate\Auth\GenericUser;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;

uses(RefreshDatabase::class);

function makeAuthUserForProcessJob(int $id = 1): GenericUser
{
    return new GenericUser(['id' => $id]);
}

function makeDto(): AiResponseDTO
{
    return new AiResponseDTO(
        content: 'ai output',
        totalTokens: 1500,
        cost: 0.0123,
        modelName: 'gemini-2.5-pro',
        inputTokens: 1000,
        outputTokens: 500,
        thinkingTokens: 100,
        cacheReadTokens: 200,
        cacheWriteTokens: 50,
    );
}

it('implements ShouldQueue', function () {
    $project = Project::factory()->create();
    $job = new ProcessAiCommandsJob([], makeAuthUserForProcessJob(), $project, makeDto());

    expect($job)->toBeInstanceOf(ShouldQueue::class);
});

it('exposes the constructor arguments as public properties', function () {
    $user = makeAuthUserForProcessJob(7);
    $project = Project::factory()->create();
    $dto = makeDto();
    $commands = [['action_type' => 'create_entry']];

    $job = new ProcessAiCommandsJob($commands, $user, $project, $dto);

    expect($job->commandsData)->toBe($commands)
        ->and($job->user)->toBe($user)
        ->and($job->context)->toBe($project)
        ->and($job->dto)->toBe($dto);
});

it('persists pending command rows under a single batch_id and logs an AiTransaction', function () {
    Bus::fake([ExecuteAiCommandsJob::class]);

    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $user = makeAuthUserForProcessJob(42);

    $commands = [
        [
            'action_type' => 'transfer_note', // risky -> stays pending
            'reasoning' => 'risky',
            'payload' => [
                'note_id' => 1,
                'target_model_class' => Entry::class,
                'target_model_id' => 1,
            ],
        ],
    ];

    (new ProcessAiCommandsJob($commands, $user, $project, makeDto()))
        ->handle(new AiCommandFactory, new AiCommandExecutor);

    $rows = AiReviewCommand::query()->get();
    expect($rows)->toHaveCount(1)
        ->and($rows->pluck('batch_id')->unique())->toHaveCount(1);

    $tx = AiTransaction::query()->first();
    expect($tx)->not->toBeNull()
        ->and($tx->user_id)->toBe(42)
        ->and($tx->batch_id)->toBe($rows->first()->batch_id)
        ->and($tx->context)->toBe('process_ai_commands')
        ->and($tx->model_name)->toBe('gemini-2.5-pro')
        ->and($tx->input_tokens)->toBe(1000)
        ->and($tx->output_tokens)->toBe(500)
        ->and($tx->thinking_tokens)->toBe(100)
        ->and($tx->cache_read_tokens)->toBe(200)
        ->and($tx->cache_write_tokens)->toBe(50)
        ->and($tx->total_tokens)->toBe(1500)
        ->and((float) $tx->cost)->toBe(0.0123);
});

it('auto-approves safe commands like create_entry and queues ExecuteAiCommandsJob', function () {
    Bus::fake([ExecuteAiCommandsJob::class]);

    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $commands = [
        [
            'action_type' => 'create_entry',
            'reasoning' => 'safe',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'Frodo'],
            ],
        ],
    ];

    (new ProcessAiCommandsJob($commands, makeAuthUserForProcessJob(), $project, makeDto()))
        ->handle(new AiCommandFactory, new AiCommandExecutor);

    expect(AiReviewCommand::query()->first()->status)->toBe('approved');

    Bus::assertDispatched(ExecuteAiCommandsJob::class);
});

it('leaves risky commands pending when nothing else qualifies', function () {
    Bus::fake([ExecuteAiCommandsJob::class]);

    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    $commands = [
        [
            'action_type' => 'transfer_note',
            'reasoning' => 'risky',
            'payload' => [
                'note_id' => 1,
                'target_model_class' => Entry::class,
                'target_model_id' => $entry->id,
            ],
        ],
    ];

    (new ProcessAiCommandsJob($commands, makeAuthUserForProcessJob(), $project, makeDto()))
        ->handle(new AiCommandFactory, new AiCommandExecutor);

    expect(AiReviewCommand::query()->first()->status)->toBe('pending');
});

it('does not dispatch ExecuteAiCommandsJob when zero commands were auto-approved', function () {
    Bus::fake([ExecuteAiCommandsJob::class]);

    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    $commands = [
        [
            'action_type' => 'transfer_note', // risky -> pending
            'reasoning' => 'risky',
            'payload' => [
                'note_id' => 1,
                'target_model_class' => Entry::class,
                'target_model_id' => $entry->id,
            ],
        ],
    ];

    (new ProcessAiCommandsJob($commands, makeAuthUserForProcessJob(), $project, makeDto()))
        ->handle(new AiCommandFactory, new AiCommandExecutor);

    Bus::assertNotDispatched(ExecuteAiCommandsJob::class);
});

it('catches and logs without bubbling when createBatchFromJson throws', function () {
    Bus::fake([ExecuteAiCommandsJob::class]);

    $project = Project::factory()->create();

    // Empty commandsData triggers MalformedAiResponseException inside the factory.
    $job = new ProcessAiCommandsJob([], makeAuthUserForProcessJob(), $project, makeDto());

    expect(fn () => $job->handle(new AiCommandFactory, new AiCommandExecutor))
        ->not->toThrow(Throwable::class);

    expect(AiReviewCommand::query()->count())->toBe(0)
        ->and(AiTransaction::query()->count())->toBe(0);
    Bus::assertNotDispatched(ExecuteAiCommandsJob::class);
});
