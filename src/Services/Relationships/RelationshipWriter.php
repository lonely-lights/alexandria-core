<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Relationships;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Creates/removes single-row bidirectional entry relationships; promotes parent_label/child_label to columns.
 */
readonly class RelationshipWriter
{
    /**
     * @param  array  $metadata  May include 'parent_label' / 'child_label' / 'relationship_blueprint_id' (promoted to columns); legacy keys are rejected.
     */
    public function add(Entry $parent, Entry $child, string $relationshipType, array $metadata = []): EntryRelationship
    {
        foreach (['role_label', 'role_override'] as $legacy) {
            if (array_key_exists($legacy, $metadata) && $metadata[$legacy] !== null) {
                throw new InvalidArgumentException(
                    "Legacy key `$legacy` is no longer supported. ".
                    'Use `parent_label` / `child_label` (stored as columns on entry_relationships).'
                );
            }
        }

        // Optional, explicit labels + pairing FK.
        $parentLabel = $metadata['parent_label'] ?? null;
        $childLabel = $metadata['child_label'] ?? null;
        $relationshipBlueprintId = $metadata['relationship_blueprint_id'] ?? null;

        // Keep JSON metadata clean (no column-promoted keys leak into the JSON column).
        $cleanMeta = Arr::except($metadata, ['parent_label', 'child_label', 'role_label', 'role_override', 'relationship_blueprint_id']);

        return EntryRelationship::query()->create([
            'parent_entry_id' => $parent->id,
            'child_entry_id' => $child->id,
            'relationship_type' => Str::snake($relationshipType),
            'relationship_blueprint_id' => $relationshipBlueprintId,
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
