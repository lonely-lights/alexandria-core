<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\ProjectAiInstruction;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates an instruction set scoped to a project', function () {
    $project = Project::factory()->create();
    $instr = ProjectAiInstruction::factory()->create([
        'project_id' => $project->id,
        'label' => 'Worldbuilding voice',
        'instructions' => 'Write in third-person past tense.',
    ]);

    expect($instr->project_id)->toBe($project->id)
        ->and($instr->label)->toBe('Worldbuilding voice')
        ->and($instr->is_default)->toBeFalse();
});

it('belongs to a project', function () {
    $instr = ProjectAiInstruction::factory()->create();
    expect($instr->project)->toBeInstanceOf(Project::class);
});

it('Project::aiInstructions HasMany returns all instruction rows', function () {
    $project = Project::factory()->create();
    ProjectAiInstruction::factory()->count(3)->create(['project_id' => $project->id]);

    expect($project->aiInstructions)->toHaveCount(3);
});

it('default flag distinguishes the primary instruction set', function () {
    $project = Project::factory()->create();
    ProjectAiInstruction::factory()->create(['project_id' => $project->id, 'is_default' => false]);
    $primary = ProjectAiInstruction::factory()->default()->create(['project_id' => $project->id]);

    expect(ProjectAiInstruction::query()->where('is_default', true)->first()->id)
        ->toBe($primary->id);
});
