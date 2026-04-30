<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates an entry scoped to a project and blueprint', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);

    $entry = Entry::factory()->create([
        'project_id' => $project->id,
        'blueprint_id' => $blueprint->id,
        'name' => 'Test Entry',
    ]);

    expect($entry->project_id)->toBe($project->id)
        ->and($entry->blueprint_id)->toBe($blueprint->id)
        ->and($entry->name)->toBe('Test Entry');
});

it('belongs to a project', function () {
    $entry = Entry::factory()->create();
    expect($entry->project)->toBeInstanceOf(Project::class);
});

it('belongs to a blueprint via the type relationship', function () {
    $entry = Entry::factory()->create();
    expect($entry->type)->toBeInstanceOf(Blueprint::class);
});

it('supports parent/child hierarchies', function () {
    $parent = Entry::factory()->create();
    $child = Entry::factory()->withParent($parent)->create();

    expect($child->parent->id)->toBe($parent->id)
        ->and($parent->children->first()->id)->toBe($child->id);
});

it('auto-assigns sort_order on create as max+1 in sibling group', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);

    $first = Entry::factory()->create([
        'project_id' => $project->id,
        'blueprint_id' => $blueprint->id,
        'sort_order' => null,
    ]);
    $second = Entry::factory()->create([
        'project_id' => $project->id,
        'blueprint_id' => $blueprint->id,
        'sort_order' => null,
    ]);

    expect($second->sort_order)->toBeGreaterThan($first->sort_order);
});

it('soft-deletes', function () {
    $entry = Entry::factory()->create();
    $entry->delete();
    expect($entry->fresh()?->trashed())->toBeTrue();
});

it('exposes active and archived scopes', function () {
    Entry::factory()->create(['archived_at' => null]);
    Entry::factory()->create(['archived_at' => now()]);

    expect(Entry::active()->count())->toBe(1)
        ->and(Entry::archived()->count())->toBe(1);
});
