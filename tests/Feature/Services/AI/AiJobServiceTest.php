<?php

declare(strict_types=1);

use Alexandria\Core\Events\NoteAiStatusUpdated;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Services\AI\AiJobService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

it('returns the same instance from forUser to support fluent chaining', function () {
    $service = new AiJobService;

    expect($service->forUser(42))->toBe($service);
});

it('updateNoteWithError stamps error metadata, resets row status, and broadcasts failure', function () {
    Event::fake([NoteAiStatusUpdated::class]);

    $note = Note::factory()->create([
        'user_id' => 7,
        'status' => 'submitted',
        'ai_notes' => ['something' => 'pre-existing'],
    ]);

    (new AiJobService)
        ->forUser(7)
        ->updateNoteWithError($note, 'Provider exploded');

    $fresh = $note->fresh();

    expect($fresh->ai_notes)->toMatchArray([
        'something' => 'pre-existing',
        'last_error' => 'Provider exploded',
        'status' => 'failed',
    ])
        ->and($fresh->ai_notes['last_error_at'] ?? null)->not->toBeNull()
        ->and($fresh->status)->toBe('active');

    Event::assertDispatched(
        NoteAiStatusUpdated::class,
        fn (NoteAiStatusUpdated $e): bool => $e->note->is($note)
            && $e->status === 'failed'
            && $e->error === 'Provider exploded'
            && $e->userId === 7
    );
});

it('clearNoteError removes error keys, marks processing, and broadcasts processing', function () {
    Event::fake([NoteAiStatusUpdated::class]);

    $note = Note::factory()->create([
        'user_id' => 11,
        'ai_notes' => [
            'last_error' => 'Old failure',
            'last_error_at' => '2026-01-01T00:00:00+00:00',
            'status' => 'failed',
        ],
    ]);

    (new AiJobService)
        ->forUser(11)
        ->clearNoteError($note);

    $fresh = $note->fresh();

    expect($fresh->ai_notes)->not->toHaveKey('last_error')
        ->and($fresh->ai_notes)->not->toHaveKey('last_error_at')
        ->and($fresh->ai_notes['status'])->toBe('processing');

    Event::assertDispatched(
        NoteAiStatusUpdated::class,
        fn (NoteAiStatusUpdated $e): bool => $e->note->is($note)
            && $e->status === 'processing'
            && $e->error === null
            && $e->userId === 11
    );
});

it('markNoteAsCompleted clears errors, stamps completed_at, and broadcasts completed', function () {
    Event::fake([NoteAiStatusUpdated::class]);

    $note = Note::factory()->create([
        'user_id' => 99,
        'ai_notes' => [
            'last_error' => 'transient',
            'last_error_at' => '2026-01-01T00:00:00+00:00',
            'status' => 'processing',
        ],
    ]);

    (new AiJobService)
        ->forUser(99)
        ->markNoteAsCompleted($note);

    $fresh = $note->fresh();

    expect($fresh->ai_notes)->not->toHaveKey('last_error')
        ->and($fresh->ai_notes)->not->toHaveKey('last_error_at')
        ->and($fresh->ai_notes['status'])->toBe('completed')
        ->and($fresh->ai_notes['completed_at'] ?? null)->not->toBeNull();

    Event::assertDispatched(
        NoteAiStatusUpdated::class,
        fn (NoteAiStatusUpdated $e): bool => $e->note->is($note)
            && $e->status === 'completed'
            && $e->userId === 99
    );
});

it('falls back to the note user_id for the broadcast channel when forUser was not called', function () {
    Event::fake([NoteAiStatusUpdated::class]);

    $note = Note::factory()->create([
        'user_id' => 314,
        'ai_notes' => null,
    ]);

    (new AiJobService)->markNoteAsCompleted($note);

    Event::assertDispatched(
        NoteAiStatusUpdated::class,
        fn (NoteAiStatusUpdated $e): bool => $e->userId === 314
    );
});
