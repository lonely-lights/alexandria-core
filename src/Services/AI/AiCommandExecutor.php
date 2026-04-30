<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\Exceptions\BatchExecutionException;
use Alexandria\Core\Models\Notable\AiReviewCommand;
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

        DB::beginTransaction();

        try {
            /** @var AiReviewCommand $command */
            foreach ($commands as $command) {
                try {
                    $this->executeCommand($command);
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

            // @DEFERRED_RELATIONSHIPS - PHASE 2: Process Deferred Relationships
            // After all entries are created and temp IDs are resolved, process any relationship
            // metadata stored in ai_notes fields. This is the second stage of AI processing.
            //
            // IMPLEMENTATION PLAN:
            // 1. Check if any executed commands have ai_notes with relationship data
            // 2. Call DeferredRelationshipProcessor::processBatch($batchId, $this->tempIdMap)
            // 3. Log relationship processing results separately
            // 4. Update $results array with relationship statistics
            //
            // TEST SCENARIOS:
            // - Batch with parent-child entry relationships → Should create hierarchy
            // - Batch with character-location associations → Should create pivot records
            // - Batch with invalid relationship references → Should skip gracefully
            // - Batch with no relationships → Should complete without errors
            //
            // EDGE CASES:
            // - Circular relationship references (A→B→A)
            // - Relationships to entries outside the batch
            // - Multiple relationships between same entry pair
            //
            // Example:
            // $relationshipProcessor = app(DeferredRelationshipProcessor::class);
            // $relationshipResults = $relationshipProcessor->processBatch($batchId, $this->tempIdMap);
            // $results['relationships_created'] = $relationshipResults['created'];
            // $results['relationships_failed'] = $relationshipResults['failed'];

        } catch (Throwable $e) {
            DB::rollBack();
            Log::critical("AI Batch Execution Transaction Failed for batch $batchId", ['exception' => $e]);

            throw new BatchExecutionException(
                "AI batch execution failed: {$e->getMessage()}",
                previous: $e,
            );
        }

        return $results;
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
            default => throw new Exception("Unsupported action_type: $command->action_type"),
        };
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

        $entryRelationshipClass = config('alexandria.models.entry_relationship');

        $entryRelationshipClass::create([
            'parent_entry_id' => $payload['parent_entry_id'],
            'child_entry_id' => $payload['child_entry_id'],
            'relationship_type' => $payload['relationship_type'],
            'parent_label' => $payload['parent_label'] ?? null,
            'child_label' => $payload['child_label'] ?? null,
            'metadata' => $payload['metadata'] ?? null,
        ]);
    }
}
