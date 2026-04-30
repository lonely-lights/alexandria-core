<?php

declare(strict_types=1);

/**
 * @noinspection PhpUndefinedFieldInspection
 */

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

it('creates a command with all columns populated by the factory', function () {
    $command = AiReviewCommand::factory()->create();

    expect($command->id)->toBeInt()
        ->and($command->batch_id)->toBeString()
        ->and($command->user_id)->toBeInt()
        ->and($command->action_type)->toBeString()
        ->and($command->payload)->toBeArray()
        ->and($command->status)->toBe('pending')
        ->and($command->is_active)->toBeTrue()
        ->and($command->order_index)->toBe(0);
});

it('casts JSON columns to arrays, is_active to bool, executed_at to Carbon, order_index to int', function () {
    $command = AiReviewCommand::factory()->create([
        'context' => ['source' => 'unit-test', 'note_id' => 42],
        'payload' => ['name' => 'Rivendell', 'parent_id' => 7],
        'raw_command' => ['original' => 'AI text dump'],
        'validation_errors' => ['parse_error' => 'unexpected token'],
        'is_active' => true,
        'executed_at' => '2026-04-30 12:00:00',
        'order_index' => 5,
    ]);

    expect($command->context)->toBeArray()->toMatchArray(['source' => 'unit-test', 'note_id' => 42])
        ->and($command->payload)->toBeArray()->toMatchArray(['name' => 'Rivendell', 'parent_id' => 7])
        ->and($command->raw_command)->toBeArray()->toMatchArray(['original' => 'AI text dump'])
        ->and($command->validation_errors)->toBeArray()->toMatchArray(['parse_error' => 'unexpected token'])
        ->and($command->is_active)->toBeBool()->toBeTrue()
        ->and($command->executed_at)->toBeInstanceOf(Carbon::class)
        ->and($command->order_index)->toBeInt()->toBe(5);
});

it('isReadyForExecution() returns true only when active+approved+non-null action_type', function () {
    $command = AiReviewCommand::factory()->approved()->create([
        'is_active' => true,
        'action_type' => 'create_entry',
    ]);

    expect($command->isReadyForExecution())->toBeTrue();
});

it('isReadyForExecution() returns false when inactive', function () {
    $command = AiReviewCommand::factory()->approved()->inactive()->create([
        'action_type' => 'create_entry',
    ]);

    expect($command->isReadyForExecution())->toBeFalse();
});

it('isReadyForExecution() returns false when status is pending', function () {
    $command = AiReviewCommand::factory()->pending()->create([
        'is_active' => true,
        'action_type' => 'create_entry',
    ]);

    expect($command->isReadyForExecution())->toBeFalse();
});

it('isReadyForExecution() returns false when status is rejected', function () {
    $command = AiReviewCommand::factory()->rejected()->create([
        'is_active' => true,
        'action_type' => 'create_entry',
    ]);

    expect($command->isReadyForExecution())->toBeFalse();
});

it('isReadyForExecution() returns false when status is executed', function () {
    $command = AiReviewCommand::factory()->executed()->create([
        'is_active' => true,
        'action_type' => 'create_entry',
    ]);

    expect($command->isReadyForExecution())->toBeFalse();
});

it('isReadyForExecution() returns false when status is failed', function () {
    $command = AiReviewCommand::factory()->failed()->create([
        'is_active' => true,
        'action_type' => 'create_entry',
    ]);

    expect($command->isReadyForExecution())->toBeFalse();
});

it('isReadyForExecution() returns false when action_type is null', function () {
    $command = AiReviewCommand::factory()->approved()->malformed()->create([
        'is_active' => true,
    ]);

    expect($command->isReadyForExecution())->toBeFalse();
});

it('hasValidationErrors() returns true when validation_errors is non-empty', function () {
    $command = AiReviewCommand::factory()->malformed()->create();

    expect($command->hasValidationErrors())->toBeTrue();
});

it('hasValidationErrors() returns false when validation_errors is null', function () {
    $command = AiReviewCommand::factory()->create(['validation_errors' => null]);

    expect($command->hasValidationErrors())->toBeFalse();
});

it('hasValidationErrors() returns false when validation_errors is an empty array', function () {
    $command = AiReviewCommand::factory()->create(['validation_errors' => []]);

    expect($command->hasValidationErrors())->toBeFalse();
});

it('getActionDisplayName() returns the right human-readable string for known actions', function () {
    expect(AiReviewCommand::factory()->withAction('create_entry', [])->make()->getActionDisplayName())
        ->toBe('Create New Entry')
        ->and(AiReviewCommand::factory()->withAction('transfer_note', [])->make()->getActionDisplayName())
        ->toBe('Move Note')
        ->and(AiReviewCommand::factory()->withAction('copy_note', [])->make()->getActionDisplayName())
        ->toBe('Copy Note')
        ->and(AiReviewCommand::factory()->withAction('create_relationship', [])->make()->getActionDisplayName())
        ->toBe('Create Relationship');
});

it('getActionDisplayName() falls back to humanized action_type for unknown actions', function () {
    $command = AiReviewCommand::factory()->withAction('purge_universe', [])->make();

    expect($command->getActionDisplayName())->toBe('Purge universe');
});

it('getActionDisplayName() returns Invalid Command when action_type is null', function () {
    $command = AiReviewCommand::factory()->malformed()->make();

    expect($command->getActionDisplayName())->toBe('Invalid Command');
});

it('forBatch() scope filters by batch_id', function () {
    $batchA = (string) Str::uuid();
    $batchB = (string) Str::uuid();

    AiReviewCommand::factory()->forBatch($batchA)->count(2)->create();
    AiReviewCommand::factory()->forBatch($batchB)->count(3)->create();

    expect(AiReviewCommand::query()->forBatch($batchA)->count())->toBe(2)
        ->and(AiReviewCommand::query()->forBatch($batchB)->count())->toBe(3);
});

it('active() scope filters is_active=true', function () {
    AiReviewCommand::factory()->count(2)->create(['is_active' => true]);
    AiReviewCommand::factory()->inactive()->count(3)->create();

    expect(AiReviewCommand::query()->active()->count())->toBe(2);
});

it('readyForExecution() scope returns only active+approved+non-null-action_type rows', function () {
    // Should be returned: active, approved, action_type set
    AiReviewCommand::factory()->approved()->create([
        'is_active' => true,
        'action_type' => 'create_entry',
    ]);
    // Inactive — excluded
    AiReviewCommand::factory()->approved()->inactive()->create([
        'action_type' => 'create_entry',
    ]);
    // Pending — excluded
    AiReviewCommand::factory()->pending()->create([
        'is_active' => true,
        'action_type' => 'create_entry',
    ]);
    // Null action_type — excluded
    AiReviewCommand::factory()->approved()->malformed()->create([
        'is_active' => true,
    ]);

    expect(AiReviewCommand::query()->readyForExecution()->count())->toBe(1);
});

it('project() BelongsTo relationship resolves to a Project', function () {
    $project = Project::factory()->create();
    $command = AiReviewCommand::factory()->forProject($project)->create();

    expect($command->project)->not->toBeNull()
        ->and($command->project->id)->toBe($project->id)
        ->and($command->project)->toBeInstanceOf(Project::class);
});

it('user() BelongsTo resolves to the class bound in alexandria.models.user', function () {
    $command = AiReviewCommand::factory()->forUser(99)->create();

    $relation = $command->user();
    $expectedClass = config('alexandria.models.user');

    expect($command->user_id)->toBe(99)
        ->and($relation->getRelated()::class)->toBe($expectedClass);
});

it('persists user_id without requiring a users table row (no FK constraint per ADR-006)', function () {
    $command = AiReviewCommand::factory()->forUser(424242)->create();

    expect($command->fresh()->user_id)->toBe(424242);
});

it('is_active defaults to true at the database level', function () {
    // Raw insert WITHOUT is_active so the migration column default is the only thing under test.
    DB::table('ai_review_commands')->insert([
        'batch_id' => (string) Str::uuid(),
        'user_id' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $command = AiReviewCommand::query()->latest('id')->first();

    expect($command->is_active)->toBeTrue();
});

it('status defaults to pending at the database level', function () {
    DB::table('ai_review_commands')->insert([
        'batch_id' => (string) Str::uuid(),
        'user_id' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $command = AiReviewCommand::query()->latest('id')->first();

    expect($command->status)->toBe('pending');
});

it('order_index defaults to 0 at the database level', function () {
    DB::table('ai_review_commands')->insert([
        'batch_id' => (string) Str::uuid(),
        'user_id' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $command = AiReviewCommand::query()->latest('id')->first();

    expect($command->order_index)->toBe(0);
});
