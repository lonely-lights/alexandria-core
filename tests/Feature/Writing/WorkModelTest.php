<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a work scoped to a project with a generated slug', function () {
    $project = Project::factory()->create();

    $work = Work::factory()->create([
        'project_id' => $project->id,
        'title' => 'The Long Dark',
    ]);

    expect($work->slug)->toBe('the-long-dark')
        ->and($work->project_id)->toBe($project->id)
        ->and($work->status)->toBe('concept')
        ->and($work->format)->toBe('prose');
});

it('suffixes duplicate slugs within a project but not across projects', function () {
    $project = Project::factory()->create();
    $other = Project::factory()->create();

    $first = Work::factory()->create(['project_id' => $project->id, 'title' => 'Embers']);
    $second = Work::factory()->create(['project_id' => $project->id, 'title' => 'Embers']);
    $elsewhere = Work::factory()->create(['project_id' => $other->id, 'title' => 'Embers']);

    expect($first->slug)->toBe('embers')
        ->and($second->slug)->toBe('embers-2')
        ->and($elsewhere->slug)->toBe('embers');
});

it('re-syncs the slug when the title changes', function () {
    $work = Work::factory()->create(['title' => 'Working Title']);

    $work->update(['title' => 'Final Title']);

    expect($work->fresh()->slug)->toBe('final-title');
});

it('keeps a manually set slug on title change', function () {
    $work = Work::factory()->create(['title' => 'Working Title']);

    $work->update(['title' => 'Final Title', 'slug' => 'my-slug']);

    expect($work->fresh()->slug)->toBe('my-slug');
});

it('casts length_plan to array and exposes sections relations', function () {
    $work = Work::factory()->create(['length_plan' => ['target_words' => 90000]]);

    expect($work->length_plan)->toBe(['target_words' => 90000])
        ->and($work->sections)->toBeEmpty()
        ->and($work->pins)->toBeEmpty();
});
