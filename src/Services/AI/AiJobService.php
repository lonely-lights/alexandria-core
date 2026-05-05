<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\Events\NoteAiStatusUpdated;
use Alexandria\Core\Models\Notable\Note;

/**
 * Shared service for AI categorization jobs — tracks acting user, mutates `ai_notes`, dispatches NoteAiStatusUpdated.
 */
class AiJobService
{
    protected ?int $actingUserId = null;

    /**
     * Return a clone of this service scoped to the given acting user ID.
     *
     * Immutable on purpose: if a host app ever binds AiJobService as a
     * singleton, mutating $actingUserId on the shared instance would leak
     * state across notes / users. Each call site gets its own scoped clone
     * and the original instance stays neutral. Existing fluent call sites
     * keep working because they use the return value.
     */
    public function forUser(int $userId): static
    {
        $clone = clone $this;
        $clone->actingUserId = $userId;

        return $clone;
    }

    /**
     * Update a note's ai_notes with an error and broadcast.
     */
    public function updateNoteWithError(Note $note, string $errorMessage): void
    {
        $aiNotes = $note->ai_notes ?? [];
        $aiNotes['last_error'] = $errorMessage;
        $aiNotes['last_error_at'] = now()->toIso8601String();
        $aiNotes['status'] = 'failed';

        $note->update([
            'ai_notes' => $aiNotes,
            'status' => 'active',
        ]);

        NoteAiStatusUpdated::dispatch($note, 'failed', $errorMessage, $this->actingUserId);
    }

    /**
     * Clear any previous error and set status to processing.
     */
    public function clearNoteError(Note $note): void
    {
        $aiNotes = $note->ai_notes ?? [];
        unset($aiNotes['last_error'], $aiNotes['last_error_at']);
        $aiNotes['status'] = 'processing';

        $note->update(['ai_notes' => $aiNotes]);

        NoteAiStatusUpdated::dispatch($note, 'processing', userId: $this->actingUserId);
    }

    /**
     * Mark the note as successfully processed.
     */
    public function markNoteAsCompleted(Note $note): void
    {
        $aiNotes = $note->ai_notes ?? [];
        unset($aiNotes['last_error'], $aiNotes['last_error_at']);
        $aiNotes['status'] = 'completed';
        $aiNotes['completed_at'] = now()->toIso8601String();

        $note->update(['ai_notes' => $aiNotes]);

        NoteAiStatusUpdated::dispatch($note, 'completed', userId: $this->actingUserId);
    }
}
