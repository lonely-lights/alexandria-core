<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Actions;

use Alexandria\Core\Exceptions\AiActionException;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Validates and executes note-related AI actions — methods are dispatched dynamically by AiCommandFactory/Executor.
 */
class NoteActionService
{
    /**
     * @return class-string
     */
    private function noteModel(): string
    {
        return config('alexandria.models.note');
    }

    /**
     * @return class-string
     */
    private function projectModel(): string
    {
        return config('alexandria.models.project');
    }

    /**
     * Validate payload for create_note action.
     *
     * @throws ValidationException
     */
    public function validateCreateNote(array $payload, int $index): void
    {
        $validator = Validator::make($payload, [
            'attributes' => ['required', 'array'],
            'temp_id' => ['nullable', 'string'],
            'target_model_class' => ['required', 'string'],
            'target_model_id' => ['required'],
        ]);

        if ($validator->fails()) {
            $validator->errors()->add('_command_index', (string) $index);
            throw new ValidationException($validator);
        }
    }

    /**
     * Validate payload for copy_note action.
     *
     * @throws ValidationException
     */
    public function validateCopyNote(array $payload, int $index): void
    {
        $validator = Validator::make($payload, [
            'note_id' => ['required'],
            'target_model_class' => ['required', 'string'],
            'target_model_id' => ['required'],
            'ai_notes' => ['nullable', 'array'], // Optional field for relationship metadata
        ]);

        if ($validator->fails()) {
            $validator->errors()->add('_command_index', (string) $index);
            throw new ValidationException($validator);
        }
    }

    /**
     * Validate payload for move_note action.
     *
     * @throws ValidationException
     */
    public function validateMoveNote(array $payload, int $index): void
    {
        $validator = Validator::make($payload, [
            'note_id' => ['required'],
            'source_model_class' => ['required', 'string'],
            'source_model_id' => ['required'],
            'destination_model_class' => ['required', 'string'],
            'destination_model_id' => ['required'],
        ]);

        if ($validator->fails()) {
            $validator->errors()->add('_command_index', (string) $index);
            throw new ValidationException($validator);
        }
    }

    /**
     * Validate payload for transfer_note action (simpler move without requiring source).
     *
     * @throws ValidationException
     */
    public function validateTransferNote(array $payload, int $index): void
    {
        $validator = Validator::make($payload, [
            'note_id' => ['required'],
            'target_model_class' => ['required', 'string'],
            'target_model_id' => ['required'],
            'ai_notes' => ['nullable', 'array'], // Optional field for relationship metadata
        ]);

        if ($validator->fails()) {
            $validator->errors()->add('_command_index', (string) $index);
            throw new ValidationException($validator);
        }
    }

    /**
     * Create a new note and attach it to the specified target.
     *
     * @throws AiActionException
     */
    public function createNote(AiReviewCommand $command, array &$tempIdMap): void
    {
        $payload = $command->payload;
        $attributes = $payload['attributes'];

        // Create the note
        $attributes['user_id'] = $command->user_id;
        $noteClass = $this->noteModel();
        $note = $noteClass::create($attributes);

        // Store in temp map if needed
        if (isset($payload['temp_id'])) {
            $tempIdMap[$payload['temp_id']] = $note->id;
        }

        // Attach to target model
        $targetModelClass = $payload['target_model_class'];
        $targetModelId = $this->resolveId($payload['target_model_id'], $tempIdMap);

        $targetModel = $targetModelClass::findOrFail($targetModelId);

        if (! method_exists($targetModel, 'notes')) {
            throw new AiActionException("Model '$targetModelClass' does not have a 'notes' relationship.");
        }

        $targetModel->notes()->attach($note->id);
    }

    /**
     * Transfer a note to a new target by automatically detecting and updating its current attachment.
     *
     * @throws AiActionException
     */
    public function transferNote(AiReviewCommand $command, array $tempIdMap): void
    {
        $payload = $command->payload;
        $noteId = $payload['note_id'];
        $targetModelClass = $payload['target_model_class'];
        $targetModelId = $this->resolveId($payload['target_model_id'], $tempIdMap);

        // Check if ai_notes should be updated
        $aiNotes = $payload['ai_notes'] ?? null;

        // Find the current attachment(s) for this note
        $currentAttachments = DB::table('notables')
            ->where('note_id', $noteId)
            ->get();

        if ($currentAttachments->isEmpty()) {
            throw new AiActionException("Cannot transfer note #$noteId. It is not currently attached to any model.");
        }

        // For simplicity, move the first attachment found (most notes should only have one)
        $currentAttachment = $currentAttachments->first();

        // Update the attachment to point to the new target
        DB::table('notables')
            ->where('note_id', $noteId)
            ->where('notable_type', $currentAttachment->notable_type)
            ->where('notable_id', $currentAttachment->notable_id)
            ->update([
                'notable_type' => $targetModelClass,
                'notable_id' => $targetModelId,
            ]);

        // Update ai_notes if provided
        if ($aiNotes !== null) {
            DB::table('notes')
                ->where('id', $noteId)
                ->update(['ai_notes' => json_encode($aiNotes)]);

            Log::info('Updated ai_notes for transferred note', [
                'note_id' => $noteId,
                'ai_notes' => $aiNotes,
            ]);
        }

        // If there were multiple attachments, log a warning but continue
        if ($currentAttachments->count() > 1) {
            Log::warning('Note has multiple attachments, only moved the first one', [
                'note_id' => $noteId,
                'attachment_count' => $currentAttachments->count(),
                'moved_from' => $currentAttachment->notable_type.'#'.$currentAttachment->notable_id,
                'moved_to' => $targetModelClass.'#'.$targetModelId,
            ]);
        }
    }

    /**
     * Move a note from one model to another.
     *
     * @throws AiActionException
     */
    public function moveNote(AiReviewCommand $command, array $tempIdMap): void
    {
        $payload = $command->payload;
        $noteId = $payload['note_id'];
        $destModelClass = $payload['destination_model_class'];
        $destModelId = $this->resolveId($payload['destination_model_id'], $tempIdMap);

        if (! isset($payload['source_model_class']) || ! isset($payload['source_model_id'])) {
            throw new AiActionException("Move Note command requires 'source_model_class' and 'source_model_id'.");
        }

        $sourceModelClass = $payload['source_model_class'];
        $sourceModelId = $this->resolveId($payload['source_model_id'], $tempIdMap);

        // Find the specific pivot record to update.
        $query = DB::table('notables')
            ->where('note_id', $noteId)
            ->where('notable_type', $sourceModelClass)
            ->where('notable_id', $sourceModelId);

        // If we find the specific record, update it.
        if ($query->exists()) {
            $query->update([
                'notable_type' => $destModelClass,
                'notable_id' => $destModelId,
            ]);
        } else {
            // If it doesn't exist, we can't move it. This is an error condition.
            throw new AiActionException("Cannot move note #$noteId. It is not attached to the specified source model ($sourceModelClass #$sourceModelId).");
        }
    }

    /**
     * Copy a note to another model (supports multiple formats).
     *
     * @throws AiActionException
     */
    public function copyNote(AiReviewCommand $command, array &$tempIdMap): void
    {
        $payload = $command->payload;

        // Check format and route to appropriate handler
        if (isset($payload['target_blueprint'])) {
            // Stage 1 Blueprint copy format
            $this->handleBlueprintCopy($command);
        } elseif (isset($payload['note_id'], $payload['target_model_class'], $payload['target_model_id'])) {
            // Current AI format (note_id + target_model_class + target_model_id)
            $this->handleDirectCopyNote($payload, $tempIdMap);
        } else {
            // Legacy format (source_note_id + destination_model_class + destination_model_id)
            $this->handleLegacyCopyNote($payload, $command);
        }
    }

    /**
     * Resolve temporary ID to actual ID.
     *
     * Return type is widened to `string|int` because the temp ID map (populated
     * by EntryActionService) can store `'rel_' . $relationshipId` strings for
     * relationship-classification blueprints. Under strict_types, returning a
     * string from an int-declared method would TypeError at runtime.
     *
     * @throws AiActionException
     */
    private function resolveId(string|int $id, array $tempIdMap): string|int
    {
        if (is_int($id)) {
            return $id;
        }
        if (! isset($tempIdMap[$id])) {
            throw new AiActionException("Unresolved temporary ID: $id");
        }

        return $tempIdMap[$id];
    }

    /**
     * Handle direct copy note (current AI format).
     *
     * Receives `$tempIdMap` by reference so the new note's id can be threaded
     * back to subsequent commands in the batch when the payload includes a
     * `temp_id`. Without this, chained copy-then-reference command sequences
     * would lose the new note's id.
     *
     * @throws AiActionException
     */
    private function handleDirectCopyNote(array $payload, array &$tempIdMap): void
    {
        $noteId = $payload['note_id'];
        $targetModelClass = $payload['target_model_class'];
        $targetModelId = $payload['target_model_id'];
        $aiNotes = $payload['ai_notes'] ?? null;

        // Resolve temp ID if needed
        if (is_string($targetModelId) && isset($tempIdMap[$targetModelId])) {
            $targetModelId = $tempIdMap[$targetModelId];
        }

        $noteClass = $this->noteModel();
        $originalNote = $noteClass::with('tags')->findOrFail($noteId);
        $destinationModel = $targetModelClass::findOrFail($targetModelId);

        // Create a copy of the note. The copy is a terminal artifact
        // attached to its destination — it must NOT inherit the source
        // note's AI routing lifecycle (status/routed_blueprints/
        // routing_count), which resurrects Process/Reject routing
        // controls on the destination's note surfaces. Keep provenance
        // instead; an explicit ai_notes payload still overrides.
        $newNote = $originalNote->replicate();
        $newNote->ai_notes = [
            'status' => 'completed',
            'copied_from_note_id' => $originalNote->id,
        ];

        // Update ai_notes if provided
        if ($aiNotes !== null) {
            $newNote->ai_notes = $aiNotes;
            Log::info('Updated ai_notes for copied note', [
                'original_note_id' => $noteId,
                'new_note_id' => $newNote->id ?? 'pending',
                'ai_notes' => $aiNotes,
            ]);
        }

        $newNote->save();

        // Copy tags if they exist
        if ($originalNote->tags->isNotEmpty()) {
            $newNote->tags()->sync($originalNote->tags->pluck('id'));
        }

        // Attach the copied note to the destination model
        $destinationModel->notes()->attach($newNote->id);

        // Thread the new note's id into the temp map so chained commands can
        // reference it.
        if (isset($payload['temp_id'])) {
            $tempIdMap[$payload['temp_id']] = $newNote->id;
        }
    }

    /**
     * Handle Stage 1 → Stage 2 Blueprint copying.
     *
     * @throws AiActionException
     */
    private function handleBlueprintCopy(AiReviewCommand $command): void
    {
        $payload = $command->payload;
        $noteId = $payload['note_id'];
        $targetBlueprintSlug = $payload['target_blueprint'];

        // Get the original note
        $noteClass = $this->noteModel();
        $note = $noteClass::findOrFail($noteId);

        // Get project context from the original command
        $context = $command->context;
        $project = null;
        if (isset($context['project_id'])) {
            $projectClass = $this->projectModel();
            $project = $projectClass::findOrFail($context['project_id']);
        }

        if (! $project) {
            throw new AiActionException('Project context required for Blueprint copying');
        }

        // Verify Blueprint exists in project
        $blueprint = $project->blueprints()->where('slug', $targetBlueprintSlug)->first();
        if (! $blueprint) {
            throw new AiActionException("Blueprint '$targetBlueprintSlug' not found in project");
        }

        // TODO: Implement Stage 2 AI processing for Blueprint copying
        Log::warning('Blueprint copying not yet implemented', [
            'note_id' => $note->id,
            'target_blueprint' => $targetBlueprintSlug,
            'project_id' => $project->id,
        ]);
    }

    /**
     * Handle legacy copy note functionality.
     *
     * @throws AiActionException
     */
    private function handleLegacyCopyNote(array $payload, AiReviewCommand $command): void
    {
        $sourceNoteId = $payload['source_note_id'];
        $destModelClass = $payload['destination_model_class'];
        $destModelId = $payload['destination_model_id'];

        $noteClass = $this->noteModel();
        $originalNote = $noteClass::with('tags')->findOrFail($sourceNoteId);
        $destinationModel = $destModelClass::findOrFail($destModelId);

        // This logic mimics your LinkNoteModal's 'performCopy'. Same
        // ai_notes reset as the direct format: copies are terminal and
        // must not inherit the source's routing lifecycle.
        $newNote = $originalNote->replicate();
        $newNote->title .= ' (Copy)';
        $newNote->user_id = $command->user_id;
        $newNote->note_date = now();
        $newNote->is_pinned = false;
        $newNote->ai_notes = [
            'status' => 'completed',
            'copied_from_note_id' => $originalNote->id,
        ];
        $newNote->save();

        if ($originalNote->relationLoaded('tags') && $originalNote->tags->isNotEmpty()) {
            $newNote->attachTags($originalNote->tags->pluck('name'));
        }

        $destinationModel->notes()->attach($newNote->id);
    }
}
