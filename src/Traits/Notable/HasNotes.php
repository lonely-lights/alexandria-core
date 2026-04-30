<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits\Notable;

use Alexandria\Core\Models\Notable\Note;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

/**
 * Trait HasNotes
 *
 * This trait provides functionality to attach, detach, and manage notes
 * associated with a model using a polymorphic many-to-many relationship.
 *
 * @mixin Model
 */
trait HasNotes
{
    /**
     * Retrieve the notes associated with the model.
     *
     * This defines the polymorphic many-to-many relationship.
     */
    public function notes(): MorphToMany
    {
        return $this->morphToMany(
            config('notable-ai.notableModel', Note::class),
            config('notable-ai.notable.morphName', 'notable'),
            config('notable-ai.notable.tableName', 'notables')
        )->withPivot(['processing_status', 'processed_at']);
    }

    /**
     * Get notes that are pending processing.
     */
    public function pendingNotes(): MorphToMany
    {
        return $this->notes()->wherePivot('processing_status', 'pending');
    }

    /**
     * Get notes that have been processed.
     */
    public function processedNotes(): MorphToMany
    {
        return $this->notes()->wherePivot('processing_status', 'completed');
    }

    /**
     * Attach a note to the model from a string.
     *
     * @param  string  $text  The content of the note.
     * @param  array  $attributes  Additional attributes for the Note model.
     * @return Note The created note instance.
     */
    public function addNote(string $text, array $attributes = []): Note
    {
        $noteModelClass = config('notable-ai.notableModel', Note::class);

        /** @var Note $note */
        $note = new $noteModelClass(array_merge(['text' => $text], $attributes));

        $this->notes()->save($note);

        return $note;
    }

    /**
     * Attach an existing Note instance to the model.
     */
    public function attachNote(Note $note): void
    {
        $this->notes()->save($note);
    }

    /**
     * Detach a note from the model.
     */
    public function removeNote(Note $note): int
    {
        return $this->notes()->detach($note->getKey());
    }

    /**
     * Mark a note as processed (entry creation completed).
     */
    public function markNoteProcessed(Note $note): void
    {
        $this->notes()->updateExistingPivot($note->getKey(), [
            'processing_status' => 'completed',
            'processed_at' => now(),
        ]);
    }

    /**
     * Mark a note as failed during processing.
     */
    public function markNoteFailed(Note $note): void
    {
        $this->notes()->updateExistingPivot($note->getKey(), [
            'processing_status' => 'failed',
        ]);
    }

    /**
     * Mark a note as currently being processed.
     */
    public function markNoteProcessing(Note $note): void
    {
        $this->notes()->updateExistingPivot($note->getKey(), [
            'processing_status' => 'processing',
        ]);
    }

    /**
     * Get a displayable title for the model.
     *
     * This method checks for common title attributes like 'name' or 'title'
     * and provides a fallback to the class name and ID if none are found.
     * You can override this method in your model for custom title logic.
     */
    public function getNotableTitle(): string
    {
        // Create a Priority List
        $titleAttributes = ['name', 'title', 'label', 'subject'];

        // Check the List
        foreach ($titleAttributes as $attribute) {
            if (! empty($this->{$attribute})) {
                return $this->{$attribute};
            }
        }

        // Fallback to Class Name and ID
        return class_basename($this).' #'.$this->getKey();
    }

    /**
     * Get the JSON Resource class responsible for generating the AI context for this model.
     *
     * Models should override this method to specify their dedicated resource class.
     * Returning null indicates that this model cannot serve as a primary context root.
     *
     * @return string|null The fully qualified class name of the JsonResource.
     */
    public function getAiContextResourceClass(): ?string
    {
        return null;
    }
}
