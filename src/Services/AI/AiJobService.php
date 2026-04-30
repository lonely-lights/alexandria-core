<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\Events\NoteAiStatusUpdated;
use Alexandria\Core\Models\Notable\Note;

/**
 * Shared service for AI categorization jobs.
 *
 * Extracts common functionality used by note-categorization jobs:
 *   - tracking the acting user id for broadcasts (host apps may dispatch
 *     these jobs from queue/CLI contexts where there's no auth user)
 *   - mutating the `ai_notes` JSON blob in a consistent shape
 *   - dispatching {@see NoteAiStatusUpdated} so connected clients can
 *     reflect status transitions in real time
 *
 * The `notes.status` enum (active/archived/submitted/integrated) is
 * separate from the `ai_notes['status']` lifecycle key
 * (processing/completed/failed). Failure resets the row's enum back to
 * 'active' so the user can re-submit, while success leaves it whatever
 * the caller set (typically 'submitted' or 'integrated').
 */
class AiJobService
{
    protected ?int $actingUserId = null;

    /**
     * Set the acting user ID for broadcasts.
     */
    public function forUser(int $userId): static
    {
        $this->actingUserId = $userId;

        return $this;
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
