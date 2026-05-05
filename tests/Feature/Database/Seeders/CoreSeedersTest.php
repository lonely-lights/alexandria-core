<?php

declare(strict_types=1);

use Alexandria\Core\Database\Seeders\AiModelSeeder;
use Alexandria\Core\Database\Seeders\AiProviderSeeder;
use Alexandria\Core\Database\Seeders\Permissions\PermissionSeeder;
use Alexandria\Core\Database\Seeders\Permissions\RolePermissionCategorySeeder;
use Alexandria\Core\Database\Seeders\RoleAndPermissionSeeder;
use Alexandria\Core\Models\AiModel;
use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Models\Permissions\RolePermissionCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

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

it('RolePermissionCategorySeeder creates the 8 default categories', function () {
    (new RolePermissionCategorySeeder)->run();

    expect(RolePermissionCategory::query()->count())->toBe(8)
        ->and(RolePermissionCategory::query()->where('slug', 'project')->exists())->toBeTrue();
});

it('PermissionSeeder + RoleAndPermissionSeeder run without errors', function () {
    (new RolePermissionCategorySeeder)->run();
    (new PermissionSeeder)->run();
    (new RoleAndPermissionSeeder)->run();

    expect(Permission::query()->count())->toBeGreaterThan(0)
        ->and(Role::query()->count())->toBeGreaterThan(0);
})->skip('Spatie PermissionRegistrar boot fails in Testbench without the spatie/permission config primed (same blocker we hit in MP-B C3 project_user test). Seeders are validated end-to-end in a real Laravel app context (alexandria-app) at MP-J.');
