<?php

declare(strict_types=1);

use Alexandria\Core\Database\Seeders\AiModelSeeder;
use Alexandria\Core\Database\Seeders\AiProviderSeeder;
use Alexandria\Core\Models\AiModel;
use Alexandria\Core\Models\AiProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('AiProviderSeeder creates the 4 default providers', function () {
    (new AiProviderSeeder)->run();

    expect(AiProvider::query()->pluck('slug')->sort()->values()->all())
        ->toBe(['anthropic', 'fal', 'google', 'openai']);
});

it('AiProviderSeeder is idempotent', function () {
    (new AiProviderSeeder)->run();
    (new AiProviderSeeder)->run();

    expect(AiProvider::query()->count())->toBe(4);
});

it('AiModelSeeder seeds models when providers exist', function () {
    (new AiProviderSeeder)->run();
    (new AiModelSeeder)->run();

    // Sanity: lots of models, all linked to known providers.
    expect(AiModel::query()->count())->toBeGreaterThan(20)
        ->and(AiModel::query()->whereNull('ai_provider_id')->count())->toBe(0);
});

// RBAC seeders (RolePermissionCategorySeeder, PermissionSeeder,
// RoleAndPermissionSeeder) deliberately do NOT live in core — they're
// consumer-app scaffolding that sits in alexandria-app/database/seeders/
// per Stage 7a. Their tests live alongside in alexandria-app/tests/
// Feature/Security/.
