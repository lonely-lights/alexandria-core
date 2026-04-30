<?php

declare(strict_types=1);

use Alexandria\Core\DTO\AiResponseDTO;
use Alexandria\Core\Jobs\ProcessEavAiCommandsJob;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\System\AiTransaction;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\AiCommandFactory;
use Illuminate\Auth\GenericUser;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeAuthUserForEavJob(int $id = 1): GenericUser
{
    return new GenericUser(['id' => $id]);
}

function makeDtoForEavJob(): AiResponseDTO
{
    return new AiResponseDTO(
        content: 'eav output',
        totalTokens: 800,
        cost: 0.0044,
        modelName: 'claude-opus-4-7',
        inputTokens: 600,
        outputTokens: 200,
    );
}

it('implements ShouldQueue', function () {
    $project = Project::factory()->create();
    $job = new ProcessEavAiCommandsJob([], makeAuthUserForEavJob(), $project, makeDtoForEavJob());

    expect($job)->toBeInstanceOf(ShouldQueue::class);
});

it('exposes the constructor arguments as public properties', function () {
    $user = makeAuthUserForEavJob(13);
    $project = Project::factory()->create();
    $dto = makeDtoForEavJob();
    $commands = [['action_type' => 'create_entry']];

    $job = new ProcessEavAiCommandsJob($commands, $user, $project, $dto);

    expect($job->commandsData)->toBe($commands)
        ->and($job->user)->toBe($user)
        ->and($job->project)->toBe($project)
        ->and($job->dto)->toBe($dto);
});

it('persists pending commands plus an AiTransaction tagged with the EAV context', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $user = makeAuthUserForEavJob(99);

    $commands = [
        [
            'action_type' => 'create_entry',
            'reasoning' => 'eav-safe',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'Eowyn'],
            ],
        ],
    ];

    (new ProcessEavAiCommandsJob($commands, $user, $project, makeDtoForEavJob()))
        ->handle(new AiCommandFactory);

    $row = AiReviewCommand::query()->first();
    expect($row)->not->toBeNull()
        ->and($row->status)->toBe('pending');

    $tx = AiTransaction::query()->first();
    expect($tx)->not->toBeNull()
        ->and($tx->user_id)->toBe(99)
        ->and($tx->batch_id)->toBe($row->batch_id)
        ->and($tx->context)->toBe('process_eav_ai_commands')
        ->and($tx->model_name)->toBe('claude-opus-4-7')
        ->and($tx->input_tokens)->toBe(600)
        ->and($tx->output_tokens)->toBe(200)
        ->and($tx->total_tokens)->toBe(800)
        ->and((float) $tx->cost)->toBe(0.0044);
});

it('catches and logs without bubbling when the factory throws', function () {
    $project = Project::factory()->create();

    // Empty array triggers MalformedAiResponseException inside the factory.
    $job = new ProcessEavAiCommandsJob([], makeAuthUserForEavJob(), $project, makeDtoForEavJob());

    expect(fn () => $job->handle(new AiCommandFactory))->not->toThrow(Throwable::class);

    expect(AiReviewCommand::query()->count())->toBe(0)
        ->and(AiTransaction::query()->count())->toBe(0);
});
