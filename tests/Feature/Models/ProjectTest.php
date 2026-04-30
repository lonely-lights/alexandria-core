<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
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
    expect($project->fresh()?->trashed())->toBeTrue();
});
