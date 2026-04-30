<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Relationships;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Support\RelationshipKeyParser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Builds queries that resolve dynamic relationship "keys" into entries.
 *
 * Input:   a current Entry + a raw key string (e.g., "parentScenes;limit=10")
 * Output:  an Eloquent Builder (or a Collection) of related Entry rows
 *
 * Responsibilities:
 *  - Parse the key via RelationshipKeyParser (direction, slug, filters)
 *  - Translate direction to correct subquery orientation (parent→child vs child←parent)
 *  - Apply small, portable filters (limit, order by name/priority)
 *  - Return a Builder so callers can chain if they wish; provide get()-style helper too
 *
 * Non-Goals (for now):
 *  - Filtering by JSON metadata (subtype) — we can add later with portable predicates
 *  - Eager-loading here — callers know what they need (keep repo focused)
 */
readonly class RelationshipRepository
{
    public function __construct(private RelationshipKeyParser $parser) {}

    /**
     * Parse a raw key and build a query returning the related Entries.
     */
    public function queryForKey(Entry $entry, string $rawKey): Builder
    {
        $k = $this->parser->parse($rawKey);

        // Map direction to foreign/local ids inside entry_relationships.
        $foreignKey = $k->direction === 'incoming' ? 'parent_entry_id' : 'child_entry_id'; // who we SELECT
        $localKey = $k->direction === 'incoming' ? 'child_entry_id' : 'parent_entry_id'; // where current sits

        // Subquery: pick the "other side" entry ids for the given relationship_type slug.
        // The raw `from('entry_relationships')` bypasses EntryRelationship's SoftDeletes
        // global scope, so we filter `deleted_at IS NULL` explicitly -- otherwise
        // soft-deleted rows leak into dynamic-relationship reads.
        $builder = Entry::query()->whereIn('id', function ($q) use ($k, $entry, $foreignKey, $localKey) {
            $q->select($foreignKey)
                ->from('entry_relationships')
                ->where($localKey, $entry->id)
                ->where('relationship_type', $k->slug)
                ->whereNull('deleted_at');
        });

        // Lightweight, portable filters.
        if (isset($k->filters['order'])) {
            $dir = $k->filters['dir'] ?? 'asc';
            $field = $k->filters['order']; // 'name' | 'priority'
            $builder->orderBy($field, $dir);
        }

        if (isset($k->filters['limit'])) {
            $builder->limit((int) $k->filters['limit']);
        }

        return $builder;
    }

    /**
     * Convenience sugar: query + get.
     *
     * @return Collection<int, Entry>
     */
    public function getForKey(Entry $entry, string $rawKey): Collection
    {
        return $this->queryForKey($entry, $rawKey)->get();
    }
}
