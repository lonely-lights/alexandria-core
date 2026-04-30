<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\ProjectSortingPrompt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('creates a row with all columns populated by the factory', function () {
    $prompt = ProjectSortingPrompt::factory()->create();

    expect($prompt->id)->toBeInt()
        ->and($prompt->project_id)->toBeInt()
        ->and($prompt->name)->toBeString()->not->toBe('')
        ->and($prompt->instructions)->toBeString()->not->toBe('')
        ->and($prompt->is_default)->toBeFalse()
        ->and($prompt->is_active)->toBeTrue()
        ->and($prompt->created_at)->not->toBeNull()
        ->and($prompt->updated_at)->not->toBeNull();
});

it('casts is_default and is_active to booleans', function () {
    $prompt = ProjectSortingPrompt::factory()->create([
        'is_default' => 1,
        'is_active' => 0,
    ]);

    expect($prompt->is_default)->toBeBool()->toBeTrue()
        ->and($prompt->is_active)->toBeBool()->toBeFalse();
});

it('project() BelongsTo relationship resolves to a Project', function () {
    $project = Project::factory()->create();
    $prompt = ProjectSortingPrompt::factory()->forProject($project)->create();

    expect($prompt->project)->not->toBeNull()
        ->and($prompt->project)->toBeInstanceOf(Project::class)
        ->and($prompt->project->id)->toBe($project->id);
});

it('default() factory state sets is_default to true', function () {
    $prompt = ProjectSortingPrompt::factory()->default()->create();

    expect($prompt->is_default)->toBeTrue();
});

it('inactive() factory state sets is_active to false', function () {
    $prompt = ProjectSortingPrompt::factory()->inactive()->create();

    expect($prompt->is_active)->toBeFalse();
});

it('forProject() factory state assigns the right project_id', function () {
    $project = Project::factory()->create();
    $prompt = ProjectSortingPrompt::factory()->forProject($project)->create();

    expect($prompt->project_id)->toBe($project->id);
});

it('is_default defaults to false at the database level', function () {
    $project = Project::factory()->create();

    DB::table('project_sorting_prompts')->insert([
        'project_id' => $project->id,
        'name' => 'Raw insert',
        'instructions' => 'Raw insert instructions',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $prompt = ProjectSortingPrompt::query()->latest('id')->first();

    expect($prompt->is_default)->toBeFalse();
});

it('is_active defaults to true at the database level', function () {
    $project = Project::factory()->create();

    DB::table('project_sorting_prompts')->insert([
        'project_id' => $project->id,
        'name' => 'Raw insert',
        'instructions' => 'Raw insert instructions',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $prompt = ProjectSortingPrompt::query()->latest('id')->first();

    expect($prompt->is_active)->toBeTrue();
});

it('cascades delete when the parent Project is deleted', function () {
    $project = Project::factory()->create();
    ProjectSortingPrompt::factory()->forProject($project)->count(3)->create();

    expect(ProjectSortingPrompt::where('project_id', $project->id)->count())->toBe(3);

    $project->forceDelete();

    expect(ProjectSortingPrompt::where('project_id', $project->id)->count())->toBe(0);
});
