<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\Notable\Notebook;
use Alexandria\Core\Tests\Support\FakeUserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a notebook scoped to a project', function () {
    $project = Project::factory()->create();
    $notebook = Notebook::factory()->create([
        'project_id' => $project->id,
        'title' => 'My Notebook',
    ]);

    expect($notebook->project_id)->toBe($project->id)
        ->and($notebook->title)->toBe('My Notebook');
});

it('belongs to a project', function () {
    $notebook = Notebook::factory()->create();
    expect($notebook->project)->toBeInstanceOf(Project::class);
});

it('attaches notes via the notebook_notes pivot', function () {
    $notebook = Notebook::factory()->create();
    $note1 = Note::factory()->create();
    $note2 = Note::factory()->create();

    $notebook->notes()->attach($note1, ['sort_order' => 0, 'added_at' => now()]);
    $notebook->notes()->attach($note2, ['sort_order' => 1, 'added_at' => now()]);

    expect($notebook->notes)->toHaveCount(2);
});

it('soft-deletes a notebook', function () {
    $notebook = Notebook::factory()->create();
    $notebook->delete();

    /** @var Notebook $fresh */
    $fresh = $notebook->fresh();
    expect($fresh->trashed())->toBeTrue();
});

it('resolves creator relationship through config (ADR-006)', function () {
    config()->set('alexandria.models.user', FakeUserModel::class);

    $notebook = Notebook::factory()->create();

    expect($notebook->creator()->getRelated())->toBeInstanceOf(FakeUserModel::class);
});
