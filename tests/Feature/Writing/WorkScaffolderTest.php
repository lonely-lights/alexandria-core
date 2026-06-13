<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Services\Writing\WorkScaffolder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('scaffolds a novel with chapters, prose format, and the novel length plan', function () {
    $project = Project::factory()->create();

    $work = app(WorkScaffolder::class)->create($project, 7, [
        'title' => 'The Long Dark',
        'type' => 'novel',
    ]);

    expect($work->format)->toBe('prose')
        ->and($work->user_id)->toBe(7)
        ->and($work->length_plan['target_words'])->toBe(90000)
        ->and($work->target_words)->toBe(90000)
        ->and($work->rootSections)->toHaveCount(3)
        ->and($work->rootSections->first()->label)->toBe('Chapter')
        ->and($work->rootSections->first()->target_words)->toBe(3000);
});

it('scaffolds a screenplay with nested act/scene structure', function () {
    $project = Project::factory()->create();

    $work = app(WorkScaffolder::class)->create($project, 7, [
        'title' => 'Cold Open',
        'type' => 'screenplay',
    ]);

    $acts = $work->rootSections;

    expect($work->format)->toBe('screenplay')
        ->and($acts)->toHaveCount(3)
        ->and($acts->first()->children)->toHaveCount(1)
        ->and($acts->first()->children->first()->label)->toBe('Scene');
});

it('falls back to the other template for unknown types with no length plan', function () {
    $project = Project::factory()->create();

    $work = app(WorkScaffolder::class)->create($project, 7, [
        'title' => 'Mystery Form',
        'type' => 'zine',
    ]);

    expect($work->type)->toBe('zine')
        ->and($work->length_plan)->toBeNull()
        ->and($work->target_words)->toBeNull()
        ->and($work->rootSections)->toHaveCount(1)
        ->and($work->rootSections->first()->target_words)->toBeNull();
});

it('scaffolds an essay without a length plan (user-defined-first)', function () {
    $project = Project::factory()->create();

    $work = app(WorkScaffolder::class)->create($project, 7, [
        'title' => 'On Quiet Rooms',
        'type' => 'essay',
    ]);

    expect($work->format)->toBe('prose')
        ->and($work->length_plan)->toBeNull()
        ->and($work->target_words)->toBeNull()
        ->and($work->rootSections)->toHaveCount(1)
        ->and($work->rootSections->first()->target_words)->toBeNull();
});

it('scaffolds a poem with a single Poem section inheriting the work title', function () {
    $project = Project::factory()->create();

    $work = app(WorkScaffolder::class)->create($project, 7, [
        'title' => 'Cinders',
        'type' => 'poem',
    ]);

    // The poem template leaves the section title null — the single
    // section IS the poem, so it inherits the work's title instead of
    // a generic "Untitled" placeholder.
    expect($work->format)->toBe('prose')
        ->and($work->length_plan)->toBeNull()
        ->and($work->target_words)->toBeNull()
        ->and($work->rootSections)->toHaveCount(1)
        ->and($work->rootSections->first()->label)->toBe('Poem')
        ->and($work->rootSections->first()->title)->toBe('Cinders')
        ->and($work->rootSections->first()->target_words)->toBeNull();
});
