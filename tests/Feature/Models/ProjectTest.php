<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Tests\Support\FakeUserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a project with a slug and name', function () {
    $project = Project::factory()->create([
        'name' => 'Test World',
        'slug' => 'test-world',
    ]);

    expect($project)->toBeInstanceOf(Project::class)
        ->and($project->name)->toBe('Test World')
        ->and($project->slug)->toBe('test-world')
        ->and($project->id)->toBeInt();
});

it('soft-deletes a project', function () {
    $project = Project::factory()->create();
    $project->delete();

    /** @var Project $fresh */
    $fresh = $project->fresh();
    expect($fresh->trashed())->toBeTrue();
});

it('returns null owner when owner_id is null (nullable FK contract)', function () {
    $project = Project::factory()->create();

    expect($project->owner_id)->toBeNull()
        ->and($project->owner)->toBeNull()
        ->and($project->creator)->toBeNull();
});

it('resolves owner relationship through config (ADR-006)', function () {
    config()->set('alexandria.models.user', FakeUserModel::class);

    $project = Project::factory()->create();

    expect($project->owner()->getRelated())->toBeInstanceOf(FakeUserModel::class)
        ->and($project->creator()->getRelated())->toBeInstanceOf(FakeUserModel::class);
});

it('exposes a users BelongsToMany relation that resolves through config (ADR-006)', function () {
    config()->set('alexandria.models.user', FakeUserModel::class);

    $project = Project::factory()->create();

    expect($project->users()->getRelated())->toBeInstanceOf(FakeUserModel::class)
        ->and($project->users()->getTable())->toBe('project_user')
        ->and($project->users)->toBeEmpty();
});

it('inserts pivot rows on project_user with project_id + user_id + role_id', function () {
    $project = Project::factory()->create();
    // Insert directly into roles to avoid Spatie's PermissionRegistrar
    // boot dependencies — we just need a row with an id this FK can target.
    $roleId = DB::table('roles')->insertGetId([
        'name' => 'editor',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('project_user')->insert([
        'project_id' => $project->id,
        'user_id' => 99,
        'role_id' => $roleId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(DB::table('project_user')->count())->toBe(1);
});

it('cascades pivot rows when a project is force-deleted', function () {
    $project = Project::factory()->create();
    $roleId = DB::table('roles')->insertGetId([
        'name' => 'viewer',
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('project_user')->insert([
        'project_id' => $project->id,
        'user_id' => 99,
        'role_id' => $roleId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $project->forceDelete();

    expect(DB::table('project_user')->count())->toBe(0);
});
