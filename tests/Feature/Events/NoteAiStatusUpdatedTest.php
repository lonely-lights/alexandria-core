<?php

declare(strict_types=1);

use Alexandria\Core\Events\NoteAiStatusUpdated;
use Alexandria\Core\Models\Notable\Note;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('populates note, status, error, and userId from constructor arguments', function () {
    $note = Note::factory()->create(['user_id' => 7]);

    $event = new NoteAiStatusUpdated($note, 'processing', 'oops');

    expect($event->note->is($note))->toBeTrue()
        ->and($event->status)->toBe('processing')
        ->and($event->error)->toBe('oops')
        ->and($event->userId)->toBe(7);
});

it('defaults userId to the note user_id when not explicitly supplied', function () {
    $note = Note::factory()->create(['user_id' => 42]);

    $event = new NoteAiStatusUpdated($note, 'completed');

    expect($event->userId)->toBe(42)
        ->and($event->error)->toBeNull();
});

it('honors an explicit userId override', function () {
    $note = Note::factory()->create(['user_id' => 42]);

    $event = new NoteAiStatusUpdated($note, 'completed', null, 999);

    expect($event->userId)->toBe(999);
});

it('broadcastOn() returns a single PrivateChannel keyed user.<userId>', function () {
    $note = Note::factory()->create(['user_id' => 12]);
    $event = new NoteAiStatusUpdated($note, 'queued');

    $channels = $event->broadcastOn();

    expect($channels)->toBeArray()->toHaveCount(1)
        ->and($channels[0])->toBeInstanceOf(PrivateChannel::class)
        ->and($channels[0]->name)->toBe('private-user.12');
});

it('broadcastWith() returns the expected payload shape', function () {
    $note = Note::factory()->create([
        'user_id' => 3,
        'ai_notes' => ['routing' => 'pending'],
    ]);

    $event = new NoteAiStatusUpdated($note, 'processing', 'no key');

    expect($event->broadcastWith())->toMatchArray([
        'note_id' => $note->id,
        'status' => 'processing',
        'error' => 'no key',
        'ai_notes' => ['routing' => 'pending'],
    ]);
});

it('broadcastWith() reads ai_notes fresh from DB', function () {
    $note = Note::factory()->create([
        'user_id' => 5,
        'ai_notes' => ['stage' => 'initial'],
    ]);

    $event = new NoteAiStatusUpdated($note, 'processing');

    // Update ai_notes in DB after constructing the event.
    Note::query()->whereKey($note->id)->update(['ai_notes' => json_encode(['stage' => 'final'])]);

    $payload = $event->broadcastWith();

    expect($payload['ai_notes'])->toBe(['stage' => 'final']);
});

it('broadcastAs() returns note.ai.status', function () {
    $note = Note::factory()->create(['user_id' => 1]);
    $event = new NoteAiStatusUpdated($note, 'queued');

    expect($event->broadcastAs())->toBe('note.ai.status');
});

it('implements ShouldBroadcast', function () {
    $note = Note::factory()->create(['user_id' => 1]);
    $event = new NoteAiStatusUpdated($note, 'queued');

    expect($event)->toBeInstanceOf(ShouldBroadcast::class);
});

it('throws when neither $userId nor $note->user_id is set', function () {
    // user_id is bare bigint per ADR-006 (host owns the users table), so
    // it can legitimately be null. Without a userId override, we'd otherwise
    // broadcast to "user." which silently reaches no subscribers — fail loud.
    $note = Note::factory()->create(['user_id' => null]);

    new NoteAiStatusUpdated($note, 'queued');
})->throws(RuntimeException::class, 'cannot derive a broadcast channel');

it('returns null ai_notes in broadcast payload when the note has been deleted', function () {
    // Realistic queued-broadcast race: dispatch fires before the worker,
    // the note gets deleted in between, the worker calls broadcastWith().
    // ->fresh()?->ai_notes returns null instead of fataling on null->prop.
    $note = Note::factory()->create(['user_id' => 7, 'ai_notes' => ['stale' => true]]);
    $event = new NoteAiStatusUpdated($note, 'completed');

    $note->forceDelete();

    $payload = $event->broadcastWith();

    expect($payload['note_id'])->toBe($note->id)
        ->and($payload['status'])->toBe('completed')
        ->and($payload['ai_notes'])->toBeNull();
});
