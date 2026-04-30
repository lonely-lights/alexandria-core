<?php

declare(strict_types=1);

use Alexandria\Core\Events\NoteAiStatusUpdated;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Services\AI\AiJobService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

it('returns a fresh clone from forUser so singleton bindings cannot bleed state', function () {
    $service = new AiJobService;

    $scoped = $service->forUser(42);

    // Immutable contract: each call site gets its own scoped instance, the
    // original stays neutral. Protects host apps that bind AiJobService as a
    // singleton from cross-call state leaks.
    expect($scoped)->toBeInstanceOf(AiJobService::class)
        ->and($scoped)->not->toBe($service);
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

it('uses the explicit forUser id on the dispatched event payload', function () {
    Event::fake([NoteAiStatusUpdated::class]);

    // Note user_id is 314, but forUser(777) overrides it for the broadcast.
    // This pins the contract that forUser() actually wins when set.
    $note = Note::factory()->create([
        'user_id' => 314,
        'ai_notes' => null,
    ]);

    (new AiJobService)
        ->forUser(777)
        ->markNoteAsCompleted($note);

    Event::assertDispatched(
        NoteAiStatusUpdated::class,
        fn (NoteAiStatusUpdated $e): bool => $e->userId === 777
    );
});

it('falls back to the note user_id when forUser was skipped (chain through NoteAiStatusUpdated)', function () {
    Event::fake([NoteAiStatusUpdated::class]);

    // This test verifies the fallthrough lives in NoteAiStatusUpdated, not in
    // AiJobService. AiJobService passes $this->actingUserId (null when forUser
    // was skipped) into the event constructor; the event then defaults to
    // $note->user_id via `$userId ?? $note->user_id`. Asserting the event
    // payload alone can't distinguish "service passed 999 explicitly" from
    // "service passed null and event defaulted" — but here forUser() is never
    // called, so the only way userId can land at 999 is via the event-level
    // fallback. That's the contract being pinned.
    $note = Note::factory()->create([
        'user_id' => 999,
        'ai_notes' => null,
    ]);

    (new AiJobService)->markNoteAsCompleted($note);

    Event::assertDispatched(
        NoteAiStatusUpdated::class,
        fn (NoteAiStatusUpdated $e): bool => $e->userId === 999
    );
});
