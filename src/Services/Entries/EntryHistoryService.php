<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Entries;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryHistory;
use Illuminate\Support\Str;

/**
 * Entry History Service
 *
 * Handles recording and tracking changes to Entry models, creating audit trail
 * records in the entry_histories table. This service centralizes all history
 * tracking logic to keep the Entry model focused on data structure.
 *
 * Features:
 * - Tracks changes to core entry fields
 * - Generates human-readable change summaries
 * - Records user attribution and context
 * - Handles JSON/array field serialization
 */
class EntryHistoryService
{
    /**
     * The fields that should be tracked for changes.
     *
     * @var array<string>
     */
    protected array $trackableFields = [
        'name',
        'slug',
        'summary',
        'content',
        'sort_order',
        'metadata',
        'parent_id',
    ];

    /**
     * Record changes to core entry fields.
     *
     * Examines the entry for any dirty (changed) fields and creates
     * EntryHistory records for each changed trackable field.
     *
     * @param  Entry  $entry  The entry being updated
     */
    public function recordFieldChanges(Entry $entry): void
    {
        $userId = auth()->check() ? auth()->id() : null;
        $batchId = Str::uuid()->toString();

        foreach ($this->getTrackableFields() as $field) {
            if ($entry->isDirty($field)) {
                $oldValue = $entry->getOriginal($field);
                $newValue = $entry->getAttribute($field);

                // Handle array/JSON fields - serialize for storage
                if ($field === 'metadata' && (is_array($oldValue) || is_array($newValue))) {
                    $oldValue = is_array($oldValue) ? json_encode($oldValue) : $oldValue;
                    $newValue = is_array($newValue) ? json_encode($newValue) : $newValue;
                }

                EntryHistory::create([
                    'entry_id' => $entry->id,
                    'user_id' => $userId,
                    'change_type' => $field === 'metadata' ? 'metadata_update' : 'field_update',
                    'field_name' => $field,
                    'previous_value' => $oldValue,
                    'new_value' => $newValue,
                    'change_summary' => $this->generateChangeSummary($field, $oldValue, $newValue),
                    'context' => $this->formatContextData($entry, $batchId),
                ]);
            }
        }
    }

    /**
     * Generate a human-readable summary of the change.
     *
     * Creates a concise, user-friendly description of what changed
     * (e.g., "Set Name", "Cleared Summary", "Updated Content").
     *
     * @param  string  $field  The field name that changed
     * @param  mixed  $oldValue  The previous value
     * @param  mixed  $newValue  The new value
     * @return string Human-readable change summary
     */
    public function generateChangeSummary(string $field, mixed $oldValue, mixed $newValue): string
    {
        $fieldName = ucfirst(str_replace('_', ' ', $field));

        if (is_null($oldValue) && ! is_null($newValue)) {
            return "Set $fieldName";
        }

        if (! is_null($oldValue) && is_null($newValue)) {
            return "Cleared $fieldName";
        }

        return "Updated $fieldName";
    }

    /**
     * Get the list of trackable fields.
     *
     * @return array<string>
     */
    public function getTrackableFields(): array
    {
        return $this->trackableFields;
    }

    /**
     * Format context data for the history record.
     *
     * Builds a standardized context object with blueprint info,
     * entry name, and timestamp.
     *
     * @param  Entry  $entry  The entry being changed
     * @return array<string, mixed>
     */
    protected function formatContextData(Entry $entry, ?string $batchId = null): array
    {
        return [
            'batch_id' => $batchId,
            'blueprint' => $entry->type->name ?? 'Unknown',
            'entry_name' => $entry->name,
            'timestamp' => now()->toISOString(),
        ];
    }
}
