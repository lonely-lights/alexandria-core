<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a blueprint scoped to a project', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create([
        'project_id' => $project->id,
        'name' => 'Character',
        'slug' => 'character',
    ]);

    expect($blueprint->project_id)->toBe($project->id)
        ->and($blueprint->name)->toBe('Character')
        ->and($blueprint->slug)->toBe('character');
});

it('belongs to a project', function () {
    $blueprint = Blueprint::factory()->create();

    expect($blueprint->project)->toBeInstanceOf(Project::class);
});

it('soft-deletes a blueprint', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->delete();

    expect($blueprint->fresh()?->trashed())->toBeTrue();
});

it('exposes the standard scope', function () {
    Blueprint::factory()->create(['classification' => 'standard']);
    Blueprint::factory()->create(['classification' => 'list']);

    expect(Blueprint::standard()->count())->toBe(1);
});

it('exposes the list scope', function () {
    Blueprint::factory()->create(['classification' => 'standard']);
    Blueprint::factory()->create(['classification' => 'list']);

    expect(Blueprint::list()->count())->toBe(1);
});

it('casts JSON columns to arrays', function () {
    $blueprint = Blueprint::factory()->create([
        'metadata' => ['key' => 'value'],
        'views' => [['type' => 'kanban', 'enabled' => true]],
    ]);

    expect($blueprint->metadata)->toBe(['key' => 'value'])
        ->and($blueprint->views[0]['type'])->toBe('kanban');
});
