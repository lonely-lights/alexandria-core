<?php

declare(strict_types=1);

/**
 * @noinspection PhpUndefinedMethodInspection
 * @noinspection PhpUndefinedFieldInspection
 */

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\AiTransaction;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\Actions\NoteActionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// validateCreateNote
// ---------------------------------------------------------------------------

it('throws when create_note payload is missing required fields', function () {
    (new NoteActionService)->validateCreateNote([
        'attributes' => ['title' => 'Hi'],
        // missing target_model_class, target_model_id
    ], 0);
})->throws(ValidationException::class);

it('passes validation for a well-formed create_note payload', function () {
    (new NoteActionService)->validateCreateNote([
        'attributes' => ['title' => 'Hi', 'text' => 'Body'],
        'target_model_class' => Project::class,
        'target_model_id' => 1,
    ], 0);

    expect(true)->toBeTrue();
});

// ---------------------------------------------------------------------------
// validateCopyNote
// ---------------------------------------------------------------------------

it('throws when copy_note payload is missing note_id', function () {
    (new NoteActionService)->validateCopyNote([
        'target_model_class' => Project::class,
        'target_model_id' => 1,
    ], 0);
})->throws(ValidationException::class);

it('passes validation for a well-formed copy_note payload', function () {
    (new NoteActionService)->validateCopyNote([
        'note_id' => 1,
        'target_model_class' => Project::class,
        'target_model_id' => 1,
    ], 0);

    expect(true)->toBeTrue();
});

// ---------------------------------------------------------------------------
// validateMoveNote
// ---------------------------------------------------------------------------

it('throws when move_note payload is missing source/destination fields', function () {
    (new NoteActionService)->validateMoveNote([
        'note_id' => 1,
        // missing source_model_class, source_model_id, destination_model_class, destination_model_id
    ], 0);
})->throws(ValidationException::class);

it('passes validation for a well-formed move_note payload', function () {
    (new NoteActionService)->validateMoveNote([
        'note_id' => 1,
        'source_model_class' => Project::class,
        'source_model_id' => 1,
        'destination_model_class' => Entry::class,
        'destination_model_id' => 2,
    ], 0);

    expect(true)->toBeTrue();
});

// ---------------------------------------------------------------------------
// validateTransferNote
// ---------------------------------------------------------------------------

it('throws when transfer_note payload is missing target fields', function () {
    (new NoteActionService)->validateTransferNote([
        'note_id' => 1,
        // missing target_model_class, target_model_id
    ], 0);
})->throws(ValidationException::class);

it('passes validation for a well-formed transfer_note payload', function () {
    (new NoteActionService)->validateTransferNote([
        'note_id' => 1,
        'target_model_class' => Project::class,
        'target_model_id' => 1,
    ], 0);

    expect(true)->toBeTrue();
});

// ---------------------------------------------------------------------------
// createNote
// ---------------------------------------------------------------------------

it('creates a note, attaches it to the target, and injects user_id', function () {
    $project = Project::factory()->create();

    $command = AiReviewCommand::factory()->create([
        'user_id' => 42,
        'action_type' => 'create_note',
        'payload' => [
            'attributes' => [
                'title' => 'Lore drop',
                'text' => 'Aragorn is the heir of Isildur.',
            ],
            'target_model_class' => Project::class,
            'target_model_id' => $project->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->createNote($command, $tempIdMap);

    $note = Note::query()->where('title', 'Lore drop')->first();

    expect($note)->not->toBeNull()
        ->and($note->user_id)->toBe(42)
        ->and($project->refresh()->notes)->toHaveCount(1)
        ->and($project->notes->first()->id)->toBe($note->id);
});

it('stores temp_id => note id in tempIdMap when temp_id is provided', function () {
    $project = Project::factory()->create();

    $command = AiReviewCommand::factory()->create([
        'user_id' => 99,
        'action_type' => 'create_note',
        'payload' => [
            'temp_id' => 'note_lore_1',
            'attributes' => [
                'title' => 'Tracked note',
                'text' => 'Body.',
            ],
            'target_model_class' => Project::class,
            'target_model_id' => $project->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->createNote($command, $tempIdMap);

    $note = Note::query()->where('title', 'Tracked note')->first();

    expect($tempIdMap)->toHaveKey('note_lore_1')
        ->and($tempIdMap['note_lore_1'])->toBe($note->id);
});

it('throws when target model class lacks a notes() relationship', function () {
    // AiTransaction is a real Eloquent model in core that does NOT use the
    // HasNotes trait, so it has findOrFail() but not notes() — exactly the
    // shape this branch expects.
    $transaction = AiTransaction::factory()->create();

    $command = AiReviewCommand::factory()->create([
        'user_id' => 1,
        'action_type' => 'create_note',
        'payload' => [
            'attributes' => [
                'title' => 'Orphan',
                'text' => 'No home.',
            ],
            'target_model_class' => AiTransaction::class,
            'target_model_id' => $transaction->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->createNote($command, $tempIdMap);
})->throws(Exception::class, "does not have a 'notes' relationship");

// ---------------------------------------------------------------------------
// transferNote
// ---------------------------------------------------------------------------

it('moves a notes attachment from source to target via the notables pivot', function () {
    $source = Project::factory()->create();
    $target = Project::factory()->create();
    $note = Note::factory()->create();
    $source->notes()->attach($note);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'transfer_note',
        'payload' => [
            'note_id' => $note->id,
            'target_model_class' => Project::class,
            'target_model_id' => $target->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->transferNote($command, $tempIdMap);

    expect($source->refresh()->notes)->toHaveCount(0)
        ->and($target->refresh()->notes)->toHaveCount(1)
        ->and($target->notes->first()->id)->toBe($note->id);
});

it('throws when transferring a note that has no current attachments', function () {
    $target = Project::factory()->create();
    $note = Note::factory()->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'transfer_note',
        'payload' => [
            'note_id' => $note->id,
            'target_model_class' => Project::class,
            'target_model_id' => $target->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->transferNote($command, $tempIdMap);
})->throws(Exception::class, 'is not currently attached to any model');

it('updates ai_notes JSON when transfer payload includes ai_notes', function () {
    $source = Project::factory()->create();
    $target = Project::factory()->create();
    $note = Note::factory()->create();
    $source->notes()->attach($note);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'transfer_note',
        'payload' => [
            'note_id' => $note->id,
            'target_model_class' => Project::class,
            'target_model_id' => $target->id,
            'ai_notes' => ['confidence' => 0.92, 'reason' => 'subject mismatch'],
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->transferNote($command, $tempIdMap);

    $note->refresh();
    expect($note->ai_notes)->toMatchArray([
        'confidence' => 0.92,
        'reason' => 'subject mismatch',
    ]);
});

// ---------------------------------------------------------------------------
// moveNote
// ---------------------------------------------------------------------------

it('moves the specific source pivot row to the destination', function () {
    $source = Project::factory()->create();
    $destination = Project::factory()->create();
    $note = Note::factory()->create();
    $source->notes()->attach($note);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'move_note',
        'payload' => [
            'note_id' => $note->id,
            'source_model_class' => Project::class,
            'source_model_id' => $source->id,
            'destination_model_class' => Project::class,
            'destination_model_id' => $destination->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->moveNote($command, $tempIdMap);

    expect($source->refresh()->notes)->toHaveCount(0)
        ->and($destination->refresh()->notes)->toHaveCount(1);
});

it('throws when source attachment is not present', function () {
    $source = Project::factory()->create();
    $destination = Project::factory()->create();
    $note = Note::factory()->create();
    // intentionally do NOT attach the note to source

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'move_note',
        'payload' => [
            'note_id' => $note->id,
            'source_model_class' => Project::class,
            'source_model_id' => $source->id,
            'destination_model_class' => Project::class,
            'destination_model_id' => $destination->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->moveNote($command, $tempIdMap);
})->throws(Exception::class, 'It is not attached to the specified source model');

it('throws when source_model_class/source_model_id are missing from payload', function () {
    $destination = Project::factory()->create();
    $note = Note::factory()->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'move_note',
        'payload' => [
            'note_id' => $note->id,
            'destination_model_class' => Project::class,
            'destination_model_id' => $destination->id,
            // missing source_model_class and source_model_id
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->moveNote($command, $tempIdMap);
})->throws(Exception::class, "requires 'source_model_class' and 'source_model_id'");

// ---------------------------------------------------------------------------
// copyNote — three formats
// ---------------------------------------------------------------------------

it('does not throw when copying via target_blueprint format (Stage 2 deferred warning path)', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create([
        'slug' => 'characters',
    ]);
    $note = Note::factory()->create();

    $command = AiReviewCommand::factory()->create([
        'context' => ['project_id' => $project->id],
        'action_type' => 'copy_note',
        'payload' => [
            'note_id' => $note->id,
            'target_blueprint' => 'characters',
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->copyNote($command, $tempIdMap);

    // Stage 2 not yet implemented — we only assert no exception was thrown.
    expect(true)->toBeTrue();
});

it('replicates the note + tags and attaches it to the target via direct copy format', function () {
    $target = Project::factory()->create();
    $note = Note::factory()->create(['title' => 'Original']);
    $note->attachTags(['lore', 'character']);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'copy_note',
        'payload' => [
            'note_id' => $note->id,
            'target_model_class' => Project::class,
            'target_model_id' => $target->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->copyNote($command, $tempIdMap);

    $copied = Note::query()
        ->where('title', 'Original')
        ->where('id', '!=', $note->id)
        ->first();

    expect($copied)->not->toBeNull()
        ->and($target->refresh()->notes->pluck('id'))->toContain($copied->id)
        ->and($copied->tags->pluck('name')->all())->toEqualCanonicalizing(['lore', 'character']);
});

it('replicates with (Copy) suffix and pinned=false via legacy format', function () {
    $target = Project::factory()->create();
    $note = Note::factory()->pinned()->create(['title' => 'Important note']);

    $command = AiReviewCommand::factory()->create([
        'user_id' => 7,
        'action_type' => 'copy_note',
        'payload' => [
            'source_note_id' => $note->id,
            'destination_model_class' => Project::class,
            'destination_model_id' => $target->id,
        ],
    ]);

    $tempIdMap = [];
    (new NoteActionService)->copyNote($command, $tempIdMap);

    $copied = Note::query()
        ->where('id', '!=', $note->id)
        ->first();

    expect($copied)->not->toBeNull()
        ->and($copied->title)->toBe('Important note (Copy)')
        ->and($copied->is_pinned)->toBeFalse()
        ->and($copied->user_id)->toBe(7)
        ->and($target->refresh()->notes->pluck('id'))->toContain($copied->id);
});
