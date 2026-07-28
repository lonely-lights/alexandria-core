<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\Exceptions\BatchExecutionException;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Services\AI\Actions\EntryActionService;
use Alexandria\Core\Services\AI\Actions\NoteActionService;
use Exception;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class AiCommandExecutor
{
    private array $tempIdMap = [];

    private NoteActionService $noteActionService;

    private EntryActionService $entryActionService;

    public function __construct()
    {
        $this->noteActionService = new NoteActionService;
        $this->entryActionService = new EntryActionService;
    }

    /**
     * @throws BatchExecutionException
     */
    public function executeBatch(string $batchId): array
    {
        $commands = AiReviewCommand::query()
            ->where('batch_id', $batchId)
            ->where('status', 'approved')
            ->orderBy('id')
            ->get();

        if ($commands->isEmpty()) {
            return ['success' => 0, 'failed' => 0];
        }

        $this->tempIdMap = [];
        $results = ['success' => 0, 'failed' => 0];

        try {
            DB::beginTransaction();

            /** @var AiReviewCommand $command */
            foreach ($commands as $command) {
                try {
                    $this->executeCommand($command);
                    $this->backdateToSourceNote($command);
                    $command->update(['status' => 'executed', 'executed_at' => now()]);
                    $results['success']++;
                } catch (Throwable $e) {
                    $command->update([
                        'status' => 'failed',
                        'failure_reason' => $e->getMessage(),
                    ]);
                    $results['failed']++;
                    Log::error("AI Command #$command->id failed: ".$e->getMessage(), ['payload' => $command->payload]);
                }
            }
            DB::commit();

            $this->releaseDrainedNotes($batchId);

            // TODO(deferred-relationships): post-execution pass to materialize ai_notes relationships using $this->tempIdMap.

        } catch (Throwable $e) {
            try {
                DB::rollBack();
            } catch (Throwable $rollbackError) {
                Log::warning('AI Batch rollback also failed', ['exception' => $rollbackError]);
            }
            Log::critical("AI Batch Execution Transaction Failed for batch $batchId", ['exception' => $e]);

            throw new BatchExecutionException(
                "AI batch execution failed: {$e->getMessage()}",
                previous: $e,
            );
        }

        return $results;
    }

    /**
     * The host app's note model. Typed to the core model so callers can reach
     * its constants and scopes; a consumer's override must remain compatible.
     *
     * @return class-string<Note>
     */
    private function noteModel(): string
    {
        return config('alexandria.models.note');
    }

    /**
     * @return class-string<Blueprint>
     */
    private function blueprintModel(): string
    {
        return config('alexandria.models.blueprint');
    }

    /**
     * Clear the "still needs sorting" marker from source notes the batch has
     * just sorted.
     *
     * A copy_note deliberately leaves the original note where it is and makes
     * a separate note on the destination — that is the whole point of copy,
     * and nothing here changes it. What this removes is only the pivot marking
     * the ORIGINAL as still awaiting sorting into the blueprint this batch was
     * generated for. Once the note has been sorted there, that marker is a lie,
     * and it is the sole reason the note keeps appearing in the blueprint's
     * queue.
     *
     * The note keeps its project pivot and every OTHER blueprint's pivot, so a
     * source routed to several blueprints still waits for its other passes.
     *
     * This lives here rather than in the HTTP controller because executeBatch()
     * has four callers — the web app, the CLI sort command, the categorisation
     * orchestrator, and the queued job — and only the first of them used to run
     * it. Batches executed by any other route left every source note flagged
     * forever.
     */
    private function releaseDrainedNotes(string $batchId): void
    {
        $noteClass = $this->noteModel();
        $blueprintClass = $this->blueprintModel();

        $commands = AiReviewCommand::query()
            ->where('batch_id', $batchId)
            ->where('status', 'executed')
            ->whereIn('action_type', ['copy_note', 'transfer_note'])
            ->get();

        foreach ($commands as $command) {
            $context = is_array($command->context) ? $command->context : [];
            $noteId = $context['note_id'] ?? null;
            $slug = $context['blueprint_slug'] ?? null;

            // The HTTP route used to supply the project, so plenty of commands
            // carry no project_id in their context. The command row always has
            // one; prefer the context and fall back to the column.
            $projectId = $context['project_id'] ?? $command->project_id;

            if (! $noteId || ! $slug || ! $projectId) {
                continue;
            }

            $blueprintId = $blueprintClass::query()
                ->where('project_id', $projectId)
                ->where('slug', $slug)
                ->value('id');

            if (! $blueprintId) {
                continue;
            }

            DB::table($noteClass::PIVOT_TABLE)
                ->where('note_id', $noteId)
                ->where('notable_type', $blueprintClass)
                ->where('notable_id', $blueprintId)
                ->where('processing_status', 'completed')
                ->delete();

            // Retire the drained slug from the source's routing suggestion too,
            // or the note goes on offering "Sort into: <blueprint>" after the
            // sort already happened.
            $note = $noteClass::find($noteId);

            if (! $note) {
                continue;
            }

            $aiNotes = $note->ai_notes ?? [];
            $routed = array_values(array_diff((array) ($aiNotes['routed_blueprints'] ?? []), [$slug]));

            if ($routed === []) {
                unset($aiNotes['routed_blueprints'], $aiNotes['routing_count'], $aiNotes['routing_confidence']);
            } else {
                $aiNotes['routed_blueprints'] = $routed;
                $aiNotes['routing_count'] = count($routed);
            }

            $note->update(['ai_notes' => $aiNotes ?: null]);
        }
    }

    /**
     * @throws Exception
     */
    private function executeCommand(AiReviewCommand $command): void
    {
        $payload = $command->payload;

        if (isset($payload['target_model_id'])) {
            $payload['target_model_id'] = $this->resolveId($payload['target_model_id']);
        }
        if (isset($payload['destination_model_id'])) {
            $payload['destination_model_id'] = $this->resolveId($payload['destination_model_id']);
        }

        if (isset($payload['child_model_id'])) {
            $payload['child_model_id'] = $this->resolveId($payload['child_model_id']);
        }
        if (isset($payload['parent_model_id'])) {
            $payload['parent_model_id'] = $this->resolveId($payload['parent_model_id']);
        }
        if (isset($payload['parent_id'])) {
            $payload['parent_id'] = $this->resolveId($payload['parent_id']);
        }
        if (isset($payload['model_id'])) {
            $payload['model_id'] = $this->resolveId($payload['model_id']);
        }
        // For create_relationship commands
        if (isset($payload['parent_entry_temp_id'])) {
            $payload['parent_entry_id'] = $this->resolveId($payload['parent_entry_temp_id']);
            unset($payload['parent_entry_temp_id']);
        }
        if (isset($payload['child_entry_temp_id'])) {
            $payload['child_entry_id'] = $this->resolveId($payload['child_entry_temp_id']);
            unset($payload['child_entry_temp_id']);
        }
        if (isset($payload['metadata']) && is_array($payload['metadata'])) {
            $payload['metadata'] = $this->resolveTempIdsInMetadata($payload['metadata']);
        }

        $command->payload = $payload;

        match ($command->action_type) {
            // Entry operations
            'create_entry', 'create_model' => $this->entryActionService->createEntry($command, $this->tempIdMap),
            'update_entry', 'update_model' => $this->entryActionService->updateEntry($command, $this->tempIdMap),
            // Note operations
            'create_note' => $this->noteActionService->createNote($command, $this->tempIdMap),
            'move_note' => $this->noteActionService->moveNote($command, $this->tempIdMap),
            'transfer_note' => $this->noteActionService->transferNote($command, $this->tempIdMap),
            'copy_note' => $this->noteActionService->copyNote($command, $this->tempIdMap),
            // Entry integration operations
            'integrate_field' => $this->entryActionService->integrateField($command, $this->tempIdMap),
            // Relationship operations
            'attach_relationship' => $this->handleAttachRelationship($command),
            'create_relationship' => $this->handleCreateRelationship($command),
            // Observations are acknowledgements, not mutations: the flag's
            // content stays on the command row for the deferred enrichment
            // pass (see one-shot spec, relationship tiering).
            'flag_observation' => Log::info('AiCommandExecutor: flag_observation acknowledged', [
                'command_id' => $command->id,
            ]),
            default => throw new Exception("Unsupported action_type: $command->action_type"),
        };
    }

    /**
     * Backdate the entry a command created or linked a note to, so its
     * created_at follows the source note when the note is earlier.
     *
     * Gated by config('alexandria.ai.backdate_to_source_note'). The source
     * note comes from the command's context.note_id. Best-effort: a failure
     * here is logged and swallowed so it never fails an otherwise-successful
     * command. The date only ever moves earlier, never forward.
     */
    private function backdateToSourceNote(AiReviewCommand $command): void
    {
        if (! config('alexandria.ai.backdate_to_source_note', false)) {
            return;
        }

        $noteId = is_array($command->context) ? ($command->context['note_id'] ?? null) : null;
        if ($noteId === null) {
            return;
        }

        /** @var class-string $entryClass */
        $entryClass = config('alexandria.models.entry');

        $entryId = $this->backdateTargetEntryId($command, $entryClass);
        if ($entryId === null) {
            return;
        }

        try {
            /** @var class-string $noteClass */
            $noteClass = config('alexandria.models.note');
            $note = $noteClass::find($noteId);
            $entry = $entryClass::find($entryId);

            if ($note === null || $entry === null || $note->created_at === null) {
                return;
            }

            // Only ever move the date earlier — never forward.
            if ($entry->created_at !== null && $note->created_at->greaterThanOrEqualTo($entry->created_at)) {
                return;
            }

            // Write created_at only; leave updated_at on its own edit frame.
            $entry->timestamps = false;
            $entry->created_at = $note->created_at;
            $entry->save();
            $entry->timestamps = true;

            Log::info('AiCommandExecutor: Backdated entry created_at to source note', [
                'command_id' => $command->id,
                'entry_id' => $entry->id,
                'note_id' => $noteId,
                'backdated_to' => $note->created_at->toDateTimeString(),
            ]);
        } catch (Throwable $e) {
            Log::warning('AiCommandExecutor: Backdating to source note failed', [
                'command_id' => $command->id,
                'note_id' => $noteId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * The id of the entry a command creates or links a note to, or null when
     * the command neither creates nor links to an entry.
     */
    private function backdateTargetEntryId(AiReviewCommand $command, string $entryClass): ?int
    {
        $payload = $command->payload;

        return match ($command->action_type) {
            'create_entry', 'create_model' => $this->createdEntryId($payload),
            'transfer_note', 'copy_note' => $this->entryTargetId($payload, 'target_model_class', 'target_model_id', $entryClass),
            'move_note' => $this->entryTargetId($payload, 'destination_model_class', 'destination_model_id', $entryClass),
            default => null,
        };
    }

    /**
     * The id of the entry just created by a create_entry command, resolved via
     * the batch tempIdMap. Null when there's no temp_id or the mapped value is
     * a relationship marker ('rel_...') rather than an entry id.
     */
    private function createdEntryId(array $payload): ?int
    {
        $tempId = $payload['temp_id'] ?? null;
        if ($tempId === null) {
            return null;
        }

        $resolved = $this->tempIdMap[$tempId] ?? null;

        return is_int($resolved) ? $resolved : null;
    }

    /**
     * The target entry id for a note-link action, but only when the note is
     * attached to an Entry. Notes can also attach to projects/blueprints (the
     * routing inbox), which must never be backdated.
     */
    private function entryTargetId(array $payload, string $classKey, string $idKey, string $entryClass): ?int
    {
        $class = $payload[$classKey] ?? null;
        $id = $payload[$idKey] ?? null;

        if (! is_string($class) || $id === null) {
            return null;
        }

        if (ltrim($class, '\\') !== ltrim($entryClass, '\\')) {
            return null;
        }

        return is_numeric($id) ? (int) $id : null;
    }

    /**
     * Resolve a temporary ID to an actual ID.
     *
     * Return type is widened to `string|int` (mirroring EntryActionService::resolveId)
     * because the executor's tempIdMap can hold `'rel_' . $relationshipId` strings
     * for relationship-classification blueprints. Under strict_types, returning a
     * string from an int-declared method would TypeError at runtime.
     *
     * @throws Exception
     */
    private function resolveId(string|int $id): string|int
    {
        if (is_int($id)) {
            return $id;
        }

        // Handle temp IDs with "temp_id:" prefix
        $tempId = $id;
        if (str_starts_with($id, 'temp_id:')) {
            $tempId = substr($id, 8); // Remove "temp_id:" prefix
        }

        if (! isset($this->tempIdMap[$tempId])) {
            throw new Exception("Unresolved temporary ID: $id (cleaned: $tempId)");
        }

        return $this->tempIdMap[$tempId];
    }

    /**
     * Resolve temp-id strings nested in relationship metadata values —
     * e.g. `{"start_event": "temp_id:evt_x"}` referencing an Event entry
     * created earlier in the same batch. Only strings carrying the
     * explicit `temp_id:` prefix or matching a tempIdMap key exactly are
     * rewritten; other strings are ordinary metadata text (roles,
     * contribution labels) and pass through untouched.
     *
     * @throws Exception
     */
    private function resolveTempIdsInMetadata(array $metadata): array
    {
        foreach ($metadata as $key => $value) {
            if (! is_string($value)) {
                continue;
            }

            if (str_starts_with($value, 'temp_id:')) {
                $metadata[$key] = $this->resolveId($value);
            } elseif (isset($this->tempIdMap[$value])) {
                $metadata[$key] = $this->tempIdMap[$value];
            }
        }

        return $metadata;
    }

    /**
     * Handle attach_relationship action.
     *
     * @since extracted from legacy — host models may need to provide findParentModel()
     *
     * The one-to-many path assumes the child model exposes a `findParentModel()`
     * accessor that returns the parent model class instance — this is a legacy
     * convention. Host apps using this action type with `child_model_class` set
     * must implement that accessor on the relevant model.
     *
     * @throws Exception
     */
    private function handleAttachRelationship(AiReviewCommand $command): void
    {
        $payload = $command->payload;

        // One-to-Many: setting a parent_id on the child.
        // executeCommand() pre-resolves child_model_id and parent_id, so we
        // consume the payload values directly here.
        if (isset($payload['child_model_class'])) {
            $childId = $payload['child_model_id'];
            $parentId = $payload['parent_id'];
            $child = $payload['child_model_class']::findOrFail($childId);
            $parentForeignKey = Str::snake(class_basename($child->findParentModel())).'_id'; // Assumes a convention
            $child->update([$parentForeignKey => $parentId]);

            return;
        }

        // Many-to-Many: using attach() on a relationship.
        // executeCommand() pre-resolves parent_model_id and child_model_id.
        $parentClass = $payload['parent_model_class'];
        $parentId = $payload['parent_model_id'];
        $relationshipName = $payload['relationship_name'];
        $childId = $payload['child_model_id'];

        $parent = $parentClass::findOrFail($parentId);
        $relationship = $parent->{$relationshipName}();

        if ($relationship instanceof BelongsToMany) {
            $relationship->attach($childId);
        } else {
            throw new Exception("Relationship '$relationshipName' is not a BelongsToMany relationship.");
        }
    }

    /**
     * Handle creation of entry relationships in the entry_relationships table.
     *
     * @throws Exception
     */
    private function handleCreateRelationship(AiReviewCommand $command): void
    {
        $payload = $command->payload; // Already has resolved IDs

        $requiredFields = ['parent_entry_id', 'child_entry_id', 'relationship_type'];
        foreach ($requiredFields as $field) {
            if (! isset($payload[$field])) {
                throw new Exception("create_relationship command missing required field: $field");
            }
        }

        // Resolve the pairing FK: prefer an explicit relationship_blueprint_id in the
        // payload, fall back to looking it up from a relationship_name string.
        $relationshipBlueprintId = $payload['relationship_blueprint_id'] ?? null;
        if ($relationshipBlueprintId === null && ! empty($payload['relationship_name'])) {
            $relationshipBlueprintClass = config('alexandria.models.relationship_blueprint');
            if ($relationshipBlueprintClass !== null) {
                $relationshipBlueprintId = $relationshipBlueprintClass::query()
                    ->where('relationship_name', $payload['relationship_name'])
                    ->value('id');
            }
        }

        $entryRelationshipClass = config('alexandria.models.entry_relationship');

        $entryRelationshipClass::create([
            'parent_entry_id' => $payload['parent_entry_id'],
            'child_entry_id' => $payload['child_entry_id'],
            'relationship_type' => $payload['relationship_type'],
            'relationship_blueprint_id' => $relationshipBlueprintId,
            'parent_label' => $payload['parent_label'] ?? null,
            'child_label' => $payload['child_label'] ?? null,
            'metadata' => $payload['metadata'] ?? null,
        ]);
    }
}
