<?php

declare(strict_types=1);

use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\Notable\NoteHistory;
use Alexandria\Core\Models\Notable\NoteLink;
use Alexandria\Core\Tests\Support\FakeUserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a note with default factory state', function () {
    $note = Note::factory()->create(['title' => 'My Note', 'text' => 'Some content']);

    expect($note->title)->toBe('My Note')
        ->and($note->text)->toBe('Some content')
        ->and($note->status)->toBe('active')
        ->and($note->is_pinned)->toBeFalse();
});

it('records a NoteHistory row when title changes', function () {
    $note = Note::factory()->create(['title' => 'Original', 'text' => 'First text']);
    expect(NoteHistory::query()->count())->toBe(0);

    $note->update(['title' => 'Renamed']);

    expect(NoteHistory::query()->count())->toBe(1);
    $history = NoteHistory::query()->first();
    expect($history->note_id)->toBe($note->id)
        ->and($history->previous_title)->toBe('Original');
});

it('records a NoteHistory row when text changes', function () {
    $note = Note::factory()->create(['title' => 'Original', 'text' => 'First text']);

    $note->update(['text' => 'Updated text']);

    expect(NoteHistory::query()->count())->toBe(1);
    $history = NoteHistory::query()->first();
    expect($history->previous_text)->toBe('First text');
});

it('does NOT record a NoteHistory row when only non-tracked fields change', function () {
    $note = Note::factory()->create();
    $note->update(['is_pinned' => true]);

    expect(NoteHistory::query()->count())->toBe(0);
});

it('attaches and detaches Spatie tags', function () {
    $note = Note::factory()->create();
    $note->attachTag('important');
    $note->attachTag('urgent');

    expect($note->tags)->toHaveCount(2);

    $note->detachTag('urgent');
    expect($note->fresh()->tags)->toHaveCount(1);
});

it('manages NoteLink children via the links HasMany', function () {
    $note = Note::factory()->create();
    NoteLink::factory()->forNote($note)->create(['url' => 'https://example.com']);

    expect($note->links)->toHaveCount(1)
        ->and($note->links->first()->url)->toBe('https://example.com');
});

it('soft-deletes a note', function () {
    $note = Note::factory()->create();
    $note->delete();

    /** @var Note $fresh */
    $fresh = $note->fresh();
    expect($fresh->trashed())->toBeTrue();
});

it('resolves creator relationship through config (ADR-006)', function () {
    config()->set('alexandria.models.user', FakeUserModel::class);

    $note = Note::factory()->create();

    expect($note->creator()->getRelated())->toBeInstanceOf(FakeUserModel::class);
});
