<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Relationships;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Creates/removes single-row, bidirectional relationships.
 *
 * Columns:
 *  - parent_label : label for the PARENT when viewing the CHILD’s page
 *  - child_label  : label for the CHILD  when viewing the PARENT’s page
 *
 * Notes:
 *  - Labels are promoted to first-class columns; they are stripped from `metadata`
 *    so your JSON remains for true relationship data (subtype, events, etc.).
 */
class RelationshipWriter
{
    /**
     * Create a relationship row (single, bidirectional edge).
     *
     * @param  string  $relationshipType  Canonical relationship slug (will be snake_cased)
     * @param  array  $metadata  May include 'parent_label' and/or 'child_label'. Legacy keys are rejected.
     */
    public function add(Entry $parent, Entry $child, string $relationshipType, array $metadata = []): EntryRelationship
    {
        // Reject legacy metadata keys early -- parent_label / child_label are
        // first-class columns on entry_relationships, and role_label /
        // role_override no longer exist anywhere.
        foreach (['role_label', 'role_override'] as $legacy) {
            if (array_key_exists($legacy, $metadata) && $metadata[$legacy] !== null) {
                throw new InvalidArgumentException(
                    "Legacy key `$legacy` is no longer supported. ".
                    'Use `parent_label` / `child_label` (stored as columns on entry_relationships).'
                );
            }
        }

        // Optional, explicit labels.
        $parentLabel = $metadata['parent_label'] ?? null;
        $childLabel = $metadata['child_label'] ?? null;

        // Keep JSON metadata clean (no label / role_* leakage into the JSON column).
        $cleanMeta = Arr::except($metadata, ['parent_label', 'child_label', 'role_label', 'role_override']);

        return EntryRelationship::query()->create([
            'parent_entry_id' => $parent->id,
            'child_entry_id' => $child->id,
            'relationship_type' => Str::snake($relationshipType),
            'parent_label' => $parentLabel,
            'child_label' => $childLabel,
            'metadata' => $cleanMeta,
        ]);
    }

    public function remove(Entry $parent, Entry $child, string $relationshipType): bool
    {
        return (bool) EntryRelationship::query()
            ->where('parent_entry_id', $parent->id)
            ->where('child_entry_id', $child->id)
            ->where('relationship_type', Str::snake($relationshipType))
            ->delete();
    }
}
