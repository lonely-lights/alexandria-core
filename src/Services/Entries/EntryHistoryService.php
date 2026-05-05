<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Entries;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryHistory;
use Illuminate\Support\Str;

/**
 * Records mutations of tracked Entry columns into entry_histories audit rows.
 */
class EntryHistoryService
{
    /**
     * @var list<string>
     */
    public array $trackableFields {
        get => [
            'name',
            'slug',
            'summary',
            'content',
            'sort_order',
            'metadata',
            'parent_id',
        ];
    }

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

        foreach ($this->trackableFields as $field) {
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
