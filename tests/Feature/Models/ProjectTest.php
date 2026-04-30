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
