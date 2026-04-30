<?php

declare(strict_types=1);

use Alexandria\Core\Models\UserAiPrompt;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a user prompt with label + body + action', function () {
    $prompt = UserAiPrompt::factory()->forUser(42)->create([
        'label' => 'Summarize',
        'prompt' => 'Summarize the following note...',
        'action' => 'summarize',
    ]);

    expect($prompt->user_id)->toBe(42)
        ->and($prompt->label)->toBe('Summarize')
        ->and($prompt->action)->toBe('summarize')
        ->and($prompt->sort_order)->toBe(0);
});

it('multiple prompts can exist per user with sort_order', function () {
    UserAiPrompt::factory()->forUser(1)->create(['sort_order' => 0]);
    UserAiPrompt::factory()->forUser(1)->create(['sort_order' => 1]);
    UserAiPrompt::factory()->forUser(1)->create(['sort_order' => 2]);

    expect(UserAiPrompt::query()->where('user_id', 1)->count())->toBe(3);
});
