<?php

declare(strict_types=1);

/**
 * A note waiting to be sorted into a blueprint carries a pivot to that
 * blueprint. Once a batch has sorted it — by copying it onto an entry — the
 * pivot is stale, and it is the only reason the note keeps showing up in the
 * blueprint's queue.
 *
 * Clearing it used to live in the HTTP controller, so batches run from the CLI,
 * the categorisation orchestrator or the queued job left every source note
 * flagged forever. These tests run the executor DIRECTLY, with no controller
 * anywhere, which is the case that was never covered.
 */

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\AiCommandExecutor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/** @return array{0: Project, 1: Blueprint, 2: Entry, 3: Note} */
function drainFixture(array $aiNotes = []): array
{
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create(['slug' => 'innovation']);
    $entry = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id]);
    $note = Note::factory()->create(['ai_notes' => $aiNotes ?: null]);

    $note->blueprints()->attach($blueprint->id, ['processing_status' => 'completed']);

    return [$project, $blueprint, $entry, $note];
}

function drainCommand(string $batchId, Project $project, Blueprint $blueprint, Entry $entry, Note $note, string $action = 'copy_note'): AiReviewCommand
{
    return AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => $action,
        'context' => [
            'user_id' => 1,
            'project_id' => $project->id,
            'blueprint_slug' => $blueprint->slug,
            'note_id' => $note->id,
        ],
        'payload' => [
            'note_id' => $note->id,
            'target_model_class' => Entry::class,
            'target_model_id' => $entry->id,
        ],
    ]);
}

it('clears the queue marker when the batch runs without a controller', function () {
    $batchId = (string) Str::uuid();
    [$project, $blueprint, $entry, $note] = drainFixture();
    drainCommand($batchId, $project, $blueprint, $entry, $note);

    (new AiCommandExecutor)->executeBatch($batchId);

    expect(DB::table(Note::PIVOT_TABLE)
        ->where('note_id', $note->id)
        ->where('notable_type', Blueprint::class)
        ->where('notable_id', $blueprint->id)
        ->exists())->toBeFalse();
});

it('leaves the original note itself alone — copy means the source stays', function () {
    $batchId = (string) Str::uuid();
    [$project, $blueprint, $entry, $note] = drainFixture();
    drainCommand($batchId, $project, $blueprint, $entry, $note);

    (new AiCommandExecutor)->executeBatch($batchId);

    expect(Note::find($note->id))->not->toBeNull()
        ->and(Entry::find($entry->id)->notes()->count())->toBe(1)
        ->and(Entry::find($entry->id)->notes()->first()->id)->not->toBe($note->id);
});

it('keeps pivots to blueprints this batch did not sort into', function () {
    $batchId = (string) Str::uuid();
    [$project, $blueprint, $entry, $note] = drainFixture();
    $other = Blueprint::factory()->forProject($project)->create(['slug' => 'terminology']);
    $note->blueprints()->attach($other->id, ['processing_status' => 'completed']);

    drainCommand($batchId, $project, $blueprint, $entry, $note);
    (new AiCommandExecutor)->executeBatch($batchId);

    expect($note->fresh()->blueprints()->pluck('blueprints.id')->all())->toBe([$other->id]);
});

it('retires only the sorted slug from the routing suggestion', function () {
    $batchId = (string) Str::uuid();
    [$project, $blueprint, $entry, $note] = drainFixture([
        'routed_blueprints' => ['innovation', 'terminology'],
        'routing_count' => 2,
    ]);
    drainCommand($batchId, $project, $blueprint, $entry, $note);

    (new AiCommandExecutor)->executeBatch($batchId);

    expect($note->fresh()->ai_notes)
        ->toMatchArray(['routed_blueprints' => ['terminology'], 'routing_count' => 1]);
});

it('drops the routing suggestion entirely once nothing is left to sort', function () {
    $batchId = (string) Str::uuid();
    [$project, $blueprint, $entry, $note] = drainFixture([
        'routed_blueprints' => ['innovation'],
        'routing_count' => 1,
    ]);
    drainCommand($batchId, $project, $blueprint, $entry, $note);

    (new AiCommandExecutor)->executeBatch($batchId);

    expect($note->fresh()->ai_notes)->toBeNull();
});

it('drains on transfer_note as well as copy_note', function () {
    $batchId = (string) Str::uuid();
    [$project, $blueprint, $entry, $note] = drainFixture();
    drainCommand($batchId, $project, $blueprint, $entry, $note, 'transfer_note');

    (new AiCommandExecutor)->executeBatch($batchId);

    expect(DB::table(Note::PIVOT_TABLE)
        ->where('note_id', $note->id)
        ->where('notable_type', Blueprint::class)
        ->where('notable_id', $blueprint->id)
        ->exists())->toBeFalse();
});

it('leaves the marker alone when the command failed', function () {
    $batchId = (string) Str::uuid();
    [$project, $blueprint, $entry, $note] = drainFixture();

    // A payload pointing at nothing — the command fails, so nothing was sorted.
    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'copy_note',
        'context' => [
            'project_id' => $project->id,
            'blueprint_slug' => $blueprint->slug,
            'note_id' => $note->id,
        ],
        'payload' => [
            'note_id' => 99999999,
            'target_model_class' => Entry::class,
            'target_model_id' => $entry->id,
        ],
    ]);

    (new AiCommandExecutor)->executeBatch($batchId);

    expect(DB::table(Note::PIVOT_TABLE)
        ->where('note_id', $note->id)
        ->where('notable_type', Blueprint::class)
        ->where('notable_id', $blueprint->id)
        ->exists())->toBeTrue();
});
