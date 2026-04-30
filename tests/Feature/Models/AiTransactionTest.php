<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\AiTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

it('creates a transaction with all columns populated by the factory', function () {
    $transaction = AiTransaction::factory()->create();

    expect($transaction->id)->toBeInt()
        ->and($transaction->provider_name)->toBeString()
        ->and($transaction->model_name)->toBeString()
        ->and($transaction->source)->toBe('env')
        ->and($transaction->total_tokens)->toBeInt();
});

it('casts token columns to integer and cost to decimal:6 string', function () {
    $transaction = AiTransaction::factory()->create([
        'input_tokens' => 1234,
        'output_tokens' => 567,
        'thinking_tokens' => 89,
        'cache_read_tokens' => 12,
        'cache_write_tokens' => 34,
        'total_tokens' => 1936,
        'cost' => '0.012345',
        'latency_ms' => 1500,
    ]);

    expect($transaction->input_tokens)->toBeInt()->toBe(1234)
        ->and($transaction->output_tokens)->toBeInt()->toBe(567)
        ->and($transaction->thinking_tokens)->toBeInt()->toBe(89)
        ->and($transaction->cache_read_tokens)->toBeInt()->toBe(12)
        ->and($transaction->cache_write_tokens)->toBeInt()->toBe(34)
        ->and($transaction->total_tokens)->toBeInt()->toBe(1936)
        ->and($transaction->cost)->toBeString()->toBe('0.012345')
        ->and($transaction->latency_ms)->toBeInt()->toBe(1500);
});

it('source defaults to env at the database level', function () {
    // Raw insert WITHOUT setting source so the migration column default is the only thing under test.
    DB::table('ai_transactions')->insert([
        'provider_name' => 'openai',
        'model_name' => 'gpt-4o',
        'input_tokens' => 0,
        'output_tokens' => 0,
        'thinking_tokens' => 0,
        'cache_read_tokens' => 0,
        'cache_write_tokens' => 0,
        'total_tokens' => 0,
        'cost' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $transaction = AiTransaction::query()->latest('id')->first();

    expect($transaction->source)->toBe('env');
});

it('source accepts user as a valid value', function () {
    $transaction = AiTransaction::factory()->create(['source' => 'user']);

    expect($transaction->fresh()->source)->toBe('user');
});

it('byUser() factory state sets source to user', function () {
    $transaction = AiTransaction::factory()->byUser()->create();

    expect($transaction->source)->toBe('user');
});

it('byEnv() factory state sets source to env', function () {
    $transaction = AiTransaction::factory()->byEnv()->create();

    expect($transaction->source)->toBe('env');
});

it('project() BelongsTo relationship resolves to a Project', function () {
    $project = Project::factory()->create();
    $transaction = AiTransaction::factory()->forProject($project)->create();

    expect($transaction->project)->not->toBeNull()
        ->and($transaction->project->id)->toBe($project->id)
        ->and($transaction->project)->toBeInstanceOf(Project::class);
});

it('user() BelongsTo resolves to the class bound in alexandria.models.user', function () {
    $transaction = AiTransaction::factory()->forUser(99)->create();

    $relation = $transaction->user();
    $expectedClass = config('alexandria.models.user');

    expect($transaction->user_id)->toBe(99)
        ->and($relation->getRelated()::class)->toBe($expectedClass);
});

it('persists user_id without requiring a users table row (no FK constraint per ADR-006)', function () {
    $transaction = AiTransaction::factory()->forUser(424242)->create();

    expect($transaction->fresh()->user_id)->toBe(424242);
});

it('batch_id accepts UUID strings', function () {
    $uuid = (string) Str::uuid();
    $transaction = AiTransaction::factory()->forBatch($uuid)->create();

    expect($transaction->fresh()->batch_id)->toBe($uuid);
});

it('forProject + forUser + forBatch states compose correctly', function () {
    $project = Project::factory()->create();
    $uuid = (string) Str::uuid();

    $transaction = AiTransaction::factory()
        ->forProject($project)
        ->forUser(7)
        ->forBatch($uuid)
        ->byUser()
        ->create();

    expect($transaction->project_id)->toBe($project->id)
        ->and($transaction->user_id)->toBe(7)
        ->and($transaction->batch_id)->toBe($uuid)
        ->and($transaction->source)->toBe('user');
});
