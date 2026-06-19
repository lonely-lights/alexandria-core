<?php

declare(strict_types=1);

/**
 * Backdating: an entry created from — or linked to — a source note inherits
 * the note's created_at when the note is earlier. Gated by
 * config('alexandria.ai.backdate_to_source_note'). The date only ever moves
 * earlier, never forward. See AiCommandExecutor::backdateToSourceNote().
 */

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\AiCommandExecutor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

it('backdates a created entry to an earlier source note', function () {
    config(['alexandria.ai.backdate_to_source_note' => true]);

    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $note = Note::factory()->create(['created_at' => Carbon::parse('2022-05-20 08:00:00')]);

    $batchId = (string) Str::uuid();
    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'context' => ['note_id' => $note->id],
        'payload' => [
            'model_class' => Entry::class,
            'temp_id' => 'temp_entry',
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Backdated Hero',
            ],
        ],
    ]);

    (new AiCommandExecutor)->executeBatch($batchId);

    $entry = Entry::query()->where('name', 'Backdated Hero')->firstOrFail();
    expect($entry->created_at->toDateTimeString())->toBe('2022-05-20 08:00:00');
});

it('backdates an existing entry when a note is linked to it (copy_note)', function () {
    config(['alexandria.ai.backdate_to_source_note' => true]);

    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();
    $note = Note::factory()->create(['created_at' => Carbon::parse('2021-01-01 00:00:00')]);

    $batchId = (string) Str::uuid();
    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'copy_note',
        'context' => ['note_id' => $note->id],
        'payload' => [
            'note_id' => $note->id,
            'target_model_class' => Entry::class,
            'target_model_id' => $entry->id,
        ],
    ]);

    (new AiCommandExecutor)->executeBatch($batchId);

    expect($entry->fresh()->created_at->toDateTimeString())->toBe('2021-01-01 00:00:00');
});

it('never moves an entry created_at forward when the note is newer', function () {
    config(['alexandria.ai.backdate_to_source_note' => true]);

    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)
        ->create(['created_at' => Carbon::parse('2020-01-01 00:00:00')]);
    $note = Note::factory()->create(['created_at' => Carbon::parse('2023-06-01 00:00:00')]);

    $batchId = (string) Str::uuid();
    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'copy_note',
        'context' => ['note_id' => $note->id],
        'payload' => [
            'note_id' => $note->id,
            'target_model_class' => Entry::class,
            'target_model_id' => $entry->id,
        ],
    ]);

    (new AiCommandExecutor)->executeBatch($batchId);

    expect($entry->fresh()->created_at->toDateTimeString())->toBe('2020-01-01 00:00:00');
});

it('does not backdate when the config flag is off', function () {
    config(['alexandria.ai.backdate_to_source_note' => false]);

    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $note = Note::factory()->create(['created_at' => Carbon::parse('2019-03-03 00:00:00')]);

    $batchId = (string) Str::uuid();
    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'context' => ['note_id' => $note->id],
        'payload' => [
            'model_class' => Entry::class,
            'temp_id' => 'temp_entry',
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Untouched Hero',
            ],
        ],
    ]);

    (new AiCommandExecutor)->executeBatch($batchId);

    $entry = Entry::query()->where('name', 'Untouched Hero')->firstOrFail();
    expect($entry->created_at->greaterThan($note->created_at))->toBeTrue();
});

it('does not backdate when a note is linked to a non-entry target', function () {
    config(['alexandria.ai.backdate_to_source_note' => true]);

    $project = Project::factory()->create(['created_at' => Carbon::parse('2024-09-09 00:00:00')]);
    $note = Note::factory()->create(['created_at' => Carbon::parse('2018-01-01 00:00:00')]);

    $batchId = (string) Str::uuid();
    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'copy_note',
        'context' => ['note_id' => $note->id],
        'payload' => [
            'note_id' => $note->id,
            'target_model_class' => Project::class,
            'target_model_id' => $project->id,
        ],
    ]);

    (new AiCommandExecutor)->executeBatch($batchId);

    // The project is not an Entry, so its created_at must be untouched.
    expect($project->fresh()->created_at->toDateTimeString())->toBe('2024-09-09 00:00:00');
});
