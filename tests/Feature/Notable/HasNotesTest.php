<?php

declare(strict_types=1);

/**
 * HasNotes polymorphic-relation tests across Project / Blueprint / Entry.
 *
 * @noinspection PhpUndefinedFieldInspection
 */

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('attaches a note to a project via the morph relation', function () {
    $project = Project::factory()->create();
    $note = Note::factory()->create();

    $project->notes()->attach($note);

    expect($project->notes)->toHaveCount(1)
        ->and($project->notes->first()->id)->toBe($note->id);
});

it('attaches the same note to multiple subjects via the polymorphic morph', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create();
    $entry = Entry::factory()->create();

    $note = Note::factory()->create();
    $project->notes()->attach($note);
    $blueprint->notes()->attach($note);
    $entry->notes()->attach($note);

    expect($project->notes)->toHaveCount(1)
        ->and($blueprint->notes)->toHaveCount(1)
        ->and($entry->notes)->toHaveCount(1);
});

it('exposes the processing_status pivot column', function () {
    $project = Project::factory()->create();
    $note = Note::factory()->create();

    $project->notes()->attach($note, ['processing_status' => 'completed', 'processed_at' => now()]);

    $attached = $project->notes->first();
    expect($attached->pivot->processing_status)->toBe('completed')
        ->and($attached->pivot->processed_at)->not->toBeNull();
});

it('detaches a note', function () {
    $project = Project::factory()->create();
    $note = Note::factory()->create();
    $project->notes()->attach($note);
    expect($project->notes)->toHaveCount(1);

    $project->fresh()->notes()->detach($note);

    expect($project->fresh()->notes)->toHaveCount(0);
});

it('attaches notes to entries and blueprints', function () {
    $blueprint = Blueprint::factory()->create();
    $entry = Entry::factory()->create();
    $note = Note::factory()->create();

    $blueprint->notes()->attach($note);
    $entry->notes()->attach($note);

    expect($blueprint->notes->first()->id)->toBe($note->id)
        ->and($entry->notes->first()->id)->toBe($note->id);
});

it('Note->blueprints morphedByMany returns blueprints attached to the note', function () {
    $blueprint = Blueprint::factory()->create();
    $note = Note::factory()->create();
    $blueprint->notes()->attach($note);

    expect($note->fresh()->blueprints)->toHaveCount(1)
        ->and($note->fresh()->blueprints->first()->id)->toBe($blueprint->id);
});
