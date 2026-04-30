<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\AiPrompt;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a prompt with key + name + template_path', function () {
    $prompt = AiPrompt::factory()->create([
        'key' => 'notes.sort',
        'name' => 'Sort Notes',
    ]);

    expect($prompt->key)->toBe('notes.sort')
        ->and($prompt->name)->toBe('Sort Notes')
        ->and($prompt->status)->toBe('active');
});

it('enforces unique (key, version) compound constraint', function () {
    AiPrompt::factory()->create(['key' => 'unique.test', 'version' => 1]);

    AiPrompt::factory()->create(['key' => 'unique.test', 'version' => 1]);
})->throws(QueryException::class);

it('allows multiple versions of the same key', function () {
    AiPrompt::factory()->create(['key' => 'notes.sort', 'version' => 1]);
    AiPrompt::factory()->create(['key' => 'notes.sort', 'version' => 2]);

    expect(AiPrompt::query()->where('key', 'notes.sort')->count())->toBe(2);
});

it('active scope filters by status=active', function () {
    AiPrompt::factory()->create(['status' => 'active']);
    AiPrompt::factory()->inactive()->create();
    AiPrompt::factory()->archived()->create();

    expect(AiPrompt::active()->count())->toBe(1);
});
