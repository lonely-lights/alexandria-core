<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Actions;

use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Traits\InjectsCommandContext;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Service for handling all entry-related AI actions.
 * Consolidates validation and execution logic for entry operations.
 *
 * Note: Methods in this service are called dynamically by AiCommandFactory and AiCommandExecutor
 * via match() statements, so IDE may show them as "unused" but they are actively used.
 *
 * Model classes are resolved via config('alexandria.models.*') so host apps that
 * extend Blueprint or Entry get their override automatically. The user-supplied
 * `model_class` strings on payloads are NOT config-driven by design — those come
 * from runtime payloads, not from the package.
 */
class EntryActionService
{
    /**
     * Resolve the configured Blueprint model class.
     *
     * @return class-string
     */
    private function blueprintModel(): string
    {
        return config('alexandria.models.blueprint');
    }

    /**
     * Resolve the configured Entry model class.
     *
     * @return class-string
     */
    private function entryModel(): string
    {
        return config('alexandria.models.entry');
    }

    /**
     * Validate payload for create_entry action.
     *
     * @throws ValidationException
     */
    public function validateCreateEntry(array $payload, int $index): void
    {
        $validator = Validator::make($payload, [
            'model_class' => ['required', 'string'],
            'temp_id' => ['nullable', 'string'],
            'attributes' => ['required', 'array'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        // Additional validation for entry-specific requirements
        $this->validateFieldValues($payload['attributes'], $index);
    }

    /**
     * Validate payload for update_entry action.
     *
     * @throws ValidationException
     */
    public function validateUpdateEntry(array $payload, int $index): void
    {
        $validator = Validator::make($payload, [
            'model_class' => ['required', 'string'],
            'model_id' => ['required'],
            'attributes' => ['required', 'array'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }
    }

    /**
     * Create a new entry.
     *
     * @throws Exception
     */
    public function createEntry(AiReviewCommand $command, array &$tempIdMap): void
    {
        Log::info('EntryActionService: Creating entry', [
            'command_id' => $command->id,
            'model_class' => $command->payload['model_class'] ?? 'unknown',
            'temp_id' => $command->payload['temp_id'] ?? null,
        ]);

        $payload = $command->payload;
        $modelClass = $payload['model_class'];
        $attributes = $payload['attributes'];

        // Special handling for relationship Blueprints
        if ($this->isRelationshipBlueprint($payload)) {
            $this->handleCreateRelationshipEntry($command, $tempIdMap);

            return;
        }

        // Inject context (project_id, user_id, etc.) if model supports it.
        // Uses direct property access on the Eloquent model rather than
        // Arr::has/Arr::get — both work for top-level attributes via ArrayAccess
        // but property access is the idiomatic and less fragile path.
        if (in_array(InjectsCommandContext::class, class_uses_recursive($modelClass), true)) {
            $requiredKeys = $modelClass::getRequiredContextKeys();
            foreach ($requiredKeys as $modelAttribute => $commandProperty) {
                if (isset($command->{$commandProperty})) {
                    $attributes[$modelAttribute] = $command->{$commandProperty};
                }
            }
        }

        // Resolve any temp IDs in attributes (for chained creation like locations)
        $attributes = $this->resolveTempIdsInAttributes($attributes, $tempIdMap);

        // Map parent_entry_id to parent_id (AI uses parent_entry_id, Entry model uses parent_id)
        if (isset($attributes['parent_entry_id'])) {
            $attributes['parent_id'] = $attributes['parent_entry_id'];
            unset($attributes['parent_entry_id']);
            Log::info('EntryActionService: Mapped parent_entry_id to parent_id', [
                'command_id' => $command->id,
                'parent_id' => $attributes['parent_id'],
            ]);
        }

        // Separate native columns from dynamic (EAV) attributes
        // Dynamic attributes require the entry to exist first (need entry ID for FieldValue records)
        $nativeColumns = $this->getNativeEntryColumns();
        $nativeAttributes = [];
        $dynamicAttributes = [];

        foreach ($attributes as $key => $value) {
            if (in_array($key, $nativeColumns, true)) {
                $nativeAttributes[$key] = $value;
            } else {
                $dynamicAttributes[$key] = $value;
            }
        }

        // Create the model with native attributes only
        $model = new $modelClass($nativeAttributes);
        $model->save();

        // Now set dynamic attributes (EAV fields) - these require the entry to have an ID
        if (! empty($dynamicAttributes)) {
            foreach ($dynamicAttributes as $key => $value) {
                try {
                    $model->{$key} = $value;
                } catch (Exception $e) {
                    Log::warning('EntryActionService: Failed to set dynamic attribute', [
                        'command_id' => $command->id,
                        'entry_id' => $model->id,
                        'attribute' => $key,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
            Log::info('EntryActionService: Dynamic attributes set', [
                'command_id' => $command->id,
                'entry_id' => $model->id,
                'dynamic_attributes' => array_keys($dynamicAttributes),
            ]);
        }

        Log::info('EntryActionService: Entry created successfully', [
            'command_id' => $command->id,
            'entry_id' => $model->id,
            'entry_class' => get_class($model),
        ]);

        // Store temp ID mapping for later reference
        if (isset($payload['temp_id'])) {
            $tempIdMap[$payload['temp_id']] = $model->id;
            Log::info('EntryActionService: Temp ID mapped', [
                'temp_id' => $payload['temp_id'],
                'actual_id' => $model->id,
            ]);
        }

        // @DEFERRED_RELATIONSHIPS - PHASE 1: Store Relationship Metadata
        // If the command payload contains 'ai_notes' with relationship data, it should be
        // stored on the created entry for later processing. This is intentionally deferred
        // because relationship targets may not exist yet (temp IDs need to be resolved first).
        //
        // IMPLEMENTATION PLAN:
        // 1. Check if $payload['ai_notes'] exists and contains relationship data
        // 2. Store ai_notes on the entry model (ensure Entry model has ai_notes JSON field)
        // 3. Log that relationship metadata was stored for later processing
        //
        // Expected ai_notes structure:
        // {
        //   "relationships": [
        //     {
        //       "type": "parent_child",
        //       "target_temp_id": "temp_123",
        //       "relationship_name": "parent",
        //       "metadata": {"role": "mother"}
        //     }
        //   ]
        // }
        //
        // TEST SCENARIOS:
        // - Entry created with ai_notes → Should save to database
        // - Entry created without ai_notes → Should complete normally
        // - ai_notes with invalid JSON → Should log warning and continue
        //
        // Example:
        // if (isset($payload['ai_notes']) && !empty($payload['ai_notes'])) {
        //     $model->update(['ai_notes' => $payload['ai_notes']]);
        //     Log::info('EntryActionService: Stored relationship metadata for deferred processing', [
        //         'entry_id' => $model->id,
        //         'relationship_count' => count($payload['ai_notes']['relationships'] ?? [])
        //     ]);
        // }
    }

    /**
     * Update an existing entry.
     *
     * Native columns and EAV (dynamic) attributes must be persisted via different
     * paths — `update()` only honors native columns and silently drops anything
     * else. Mirrors the same split as createEntry.
     *
     * @throws Exception
     */
    public function updateEntry(AiReviewCommand $command, array $tempIdMap): void
    {
        Log::info('EntryActionService: Updating entry', [
            'command_id' => $command->id,
            'model_class' => $command->payload['model_class'] ?? 'unknown',
            'model_id' => $command->payload['model_id'] ?? 'unknown',
        ]);

        $payload = $command->payload;
        $modelId = $this->resolveId($payload['model_id'], $tempIdMap);
        $modelClass = $payload['model_class'];
        $model = $modelClass::findOrFail($modelId);

        // Resolve any temp IDs in the update attributes
        $attributes = $this->resolveTempIdsInAttributes($payload['attributes'], $tempIdMap);

        // Separate native columns from dynamic (EAV) attributes — `update()` only
        // writes native columns, so dynamic fields would silently fail otherwise.
        $nativeColumns = $this->getNativeEntryColumns();
        $nativeAttributes = [];
        $dynamicAttributes = [];

        foreach ($attributes as $key => $value) {
            if (in_array($key, $nativeColumns, true)) {
                $nativeAttributes[$key] = $value;
            } else {
                $dynamicAttributes[$key] = $value;
            }
        }

        if (! empty($nativeAttributes)) {
            $model->update($nativeAttributes);
        }

        // EAV (dynamic) attributes are persisted by the HasDynamicAttributes
        // setter directly on assignment (it writes to field_values), so an
        // explicit save() afterwards is not strictly required — but we call it
        // anyway to match createEntry's pattern and absorb any pending mutator
        // changes the host app might layer on.
        if (! empty($dynamicAttributes)) {
            foreach ($dynamicAttributes as $key => $value) {
                try {
                    $model->{$key} = $value;
                } catch (Exception $e) {
                    Log::warning('EntryActionService: Failed to set dynamic attribute on update', [
                        'command_id' => $command->id,
                        'entry_id' => $model->id,
                        'attribute' => $key,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
            $model->save();
        }

        Log::info('EntryActionService: Entry updated successfully', [
            'command_id' => $command->id,
            'entry_id' => $model->id,
            'native_attributes' => array_keys($nativeAttributes),
            'dynamic_attributes' => array_keys($dynamicAttributes),
        ]);
    }

    /**
     * Integrate field content from AI analysis into an entry.
     *
     * @throws Exception
     */
    public function integrateField(AiReviewCommand $command, array $tempIdMap): void
    {
        $payload = $command->payload;

        if (! isset($payload['entry_id']) || ! isset($payload['field_name']) || ! isset($payload['proposed_value'])) {
            throw new Exception('integrate_field command requires entry_id, field_name, and proposed_value');
        }

        $fieldName = $payload['field_name'];

        // Resolve entry_id in case it's a temp ID from earlier in the batch
        $entryId = $this->resolveId($payload['entry_id'], $tempIdMap);
        $entryClass = $this->entryModel();
        $entry = $entryClass::findOrFail($entryId);

        Log::info('EntryActionService: Integrating field content', [
            'command_id' => $command->id,
            'entry_id' => $entryId,
            'original_id' => $payload['entry_id'],
            'field_name' => $fieldName,
        ]);
        $operation = $payload['operation'] ?? 'enhance';
        $proposedValue = $payload['proposed_value'];

        // Apply the integration based on operation type
        $newValue = match ($operation) {
            'replace' => $proposedValue,
            'enhance' => $this->enhanceFieldContent($entry->getAttributeValue($fieldName), $proposedValue),
            'append' => $this->appendToField($entry->getAttributeValue($fieldName), $proposedValue),
            'merge' => $this->mergeFieldContent($entry->getAttributeValue($fieldName), $proposedValue),
            default => throw new Exception("Unsupported integration operation: $operation")
        };

        // Update the entry
        $entry->update([$fieldName => $newValue]);

        Log::info('EntryActionService: Field integrated successfully', [
            'command_id' => $command->id,
            'entry_id' => $entry->id,
            'field_name' => $fieldName,
            'operation' => $operation,
            'content_length_before' => strlen($payload['current_value'] ?? ''),
            'content_length_after' => strlen($newValue),
        ]);
    }

    /**
     * Validate field values for common requirements.
     *
     * @throws ValidationException
     */
    private function validateFieldValues(array $attributes, int $index): void
    {
        // Check for blueprint_id if this is an Entry model
        if (isset($attributes['blueprint_id'])) {
            // Resolve the actual table name from the configured Blueprint model
            // so host apps that override `alexandria.models.blueprint` with a
            // class using a different table get correct validation.
            $blueprintClass = $this->blueprintModel();
            $blueprintTable = (new $blueprintClass)->getTable();

            $blueprintValidator = Validator::make($attributes, [
                'blueprint_id' => ['required', 'integer', "exists:$blueprintTable,id"],
            ]);

            if ($blueprintValidator->fails()) {
                throw new ValidationException($blueprintValidator);
            }
        }
    }

    /**
     * Check if the payload is for creating a relationship Blueprint.
     */
    private function isRelationshipBlueprint(array $payload): bool
    {
        if (! isset($payload['attributes']['blueprint_id'])) {
            return false;
        }

        $blueprintClass = $this->blueprintModel();
        $blueprint = $blueprintClass::find($payload['attributes']['blueprint_id']);

        return $blueprint && $blueprint->classification === 'relationship';
    }

    /**
     * Handle creation of relationship Blueprints by creating entries in entry_relationships table.
     *
     * @throws Exception
     */
    private function handleCreateRelationshipEntry(AiReviewCommand $command, array &$tempIdMap): void
    {
        Log::info('EntryActionService: Creating relationship entry', [
            'command_id' => $command->id,
        ]);

        $payload = $command->payload;
        $attributes = $payload['attributes'];

        // Resolve any temp IDs in the attributes to actual entry IDs
        $attributes = $this->resolveTempIdsInAttributes($attributes, $tempIdMap);

        // Extract the relationship data from attributes
        $parentEntryId = $attributes['parent_entry_id'] ?? null;
        $childEntryId = $attributes['child_entry_id'] ?? null;

        if (! $parentEntryId || ! $childEntryId) {
            throw new Exception('Relationship entry creation requires parent_entry_id and child_entry_id');
        }

        // Get the Blueprint to determine the relationship_type
        $blueprintClass = $this->blueprintModel();
        $blueprint = $blueprintClass::find($attributes['blueprint_id']);
        $relationshipType = $blueprint->slug; // Use slug as relationship_type

        // Build metadata from the remaining attributes
        $metadata = [];
        $excludeFromMetadata = ['blueprint_id', 'parent_entry_id', 'child_entry_id', 'parent_label', 'child_label'];

        foreach ($attributes as $key => $value) {
            if (! in_array($key, $excludeFromMetadata, true) && $value !== null) {
                $metadata[$key] = $value;
            }
        }

        // Create the relationship record
        $relationshipId = DB::table('entry_relationships')->insertGetId([
            'parent_entry_id' => $parentEntryId,
            'child_entry_id' => $childEntryId,
            'relationship_type' => $relationshipType,
            'parent_label' => $attributes['parent_label'] ?? null,
            'child_label' => $attributes['child_label'] ?? null,
            'metadata' => json_encode($metadata),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Log::info('EntryActionService: Relationship entry created', [
            'command_id' => $command->id,
            'relationship_id' => $relationshipId,
            'relationship_type' => $relationshipType,
            'parent_entry_id' => $parentEntryId,
            'child_entry_id' => $childEntryId,
        ]);

        // Store the relationship ID in temp map if needed (using 'rel_' prefix)
        if (isset($payload['temp_id'])) {
            $tempIdMap[$payload['temp_id']] = 'rel_'.$relationshipId;
        }
    }

    /**
     * Resolve temporary IDs in attributes array.
     *
     * @throws Exception if a temp_id pattern is detected but not in the map (indicates wrong command order)
     */
    private function resolveTempIdsInAttributes(array $attributes, array $tempIdMap): array
    {
        // Common temp_id prefixes used by AI
        $tempIdPrefixes = ['location_', 'character_', 'event_', 'loctype_', 'temp_id:', 'entry_'];

        foreach ($attributes as $key => $value) {
            if (is_string($value)) {
                // Handle temp IDs with "temp_id:" prefix
                $tempId = $value;
                if (str_starts_with($value, 'temp_id:')) {
                    $tempId = substr($value, 8); // Remove "temp_id:" prefix
                }

                if (isset($tempIdMap[$tempId])) {
                    $attributes[$key] = $this->resolveId($tempId, $tempIdMap);
                    Log::info('EntryActionService: Resolved temp ID in attributes', [
                        'original_value' => $value,
                        'temp_id' => $tempId,
                        'resolved_id' => $tempIdMap[$tempId],
                    ]);
                } else {
                    // Check if value looks like a temp_id that should have been resolved
                    $looksLikeTempId = false;
                    foreach ($tempIdPrefixes as $prefix) {
                        if (str_starts_with($value, $prefix)) {
                            $looksLikeTempId = true;

                            break;
                        }
                    }

                    if ($looksLikeTempId) {
                        throw new Exception(
                            "Unresolved temp_id reference: '$value' for attribute '$key'. ".
                            'This usually means commands are in wrong dependency order - parent entries must be created before children. '.
                            'Available temp_ids: '.implode(', ', array_keys($tempIdMap))
                        );
                    }
                }
            }
        }

        return $attributes;
    }

    /**
     * Resolve a temporary ID to an actual ID.
     *
     * Return type is widened to `string|int` because the temp ID map can store
     * `'rel_' . $relationshipId` strings for relationship-classification blueprints
     * (see handleCreateRelationshipEntry). Under strict_types, returning a string
     * from an int-declared method would TypeError at runtime.
     *
     * @throws Exception
     */
    private function resolveId(string|int $id, array $tempIdMap): string|int
    {
        if (is_int($id)) {
            return $id;
        }

        // Handle temp IDs with "temp_id:" prefix
        $tempId = $id;
        if (str_starts_with($id, 'temp_id:')) {
            $tempId = substr($id, 8); // Remove "temp_id:" prefix
        }

        if (! isset($tempIdMap[$tempId])) {
            throw new Exception("Unresolved temporary ID: $id (cleaned: $tempId)");
        }

        return $tempIdMap[$tempId];
    }

    /**
     * Enhance existing field content with AI-suggested additions.
     */
    private function enhanceFieldContent(?string $currentContent, string $proposedContent): string
    {
        if (empty($currentContent)) {
            return $proposedContent;
        }

        // For enhance operations, we intelligently merge the content
        // Add a separator if the current content doesn't end with punctuation
        if (! in_array(substr($currentContent, -1), ['.', '!', '?', ':'], true)) {
            $separator = '. ';
        } else {
            $separator = ' ';
        }

        return $currentContent.$separator.$proposedContent;
    }

    /**
     * Append content to existing field with proper formatting.
     */
    private function appendToField(?string $currentContent, string $proposedContent): string
    {
        if (empty($currentContent)) {
            return $proposedContent;
        }

        return $currentContent."\n\n".$proposedContent;
    }

    /**
     * Merge field content intelligently, avoiding duplication.
     */
    private function mergeFieldContent(?string $currentContent, string $proposedContent): string
    {
        if (empty($currentContent)) {
            return $proposedContent;
        }

        // Simple merge - check for obvious duplicates and avoid them
        $currentWords = str_word_count(strtolower($currentContent), 1);
        $proposedWords = str_word_count(strtolower($proposedContent), 1);

        // If there's significant overlap, just enhance instead of duplicating
        $overlap = array_intersect($currentWords, $proposedWords);
        if (count($overlap) > min(count($currentWords), count($proposedWords)) * 0.7) {
            return $this->enhanceFieldContent($currentContent, $proposedContent);
        }

        return $this->appendToField($currentContent, $proposedContent);
    }

    /**
     * Get the list of native columns on the entries table.
     *
     * These are columns that exist directly on the table, not EAV dynamic attributes.
     * This list should be updated if the entries table schema changes.
     *
     * @return array<string>
     */
    private function getNativeEntryColumns(): array
    {
        return [
            'id',
            'blueprint_id',
            'project_id',
            'parent_id',
            'name',
            'slug',
            'summary',
            'content',
            'sort_order',
            'is_stub',
            'metadata',
            'ai_notes',
            'archived_at',
            'cascade_archived_by',
            'created_at',
            'updated_at',
            'deleted_at',
        ];
    }
}
