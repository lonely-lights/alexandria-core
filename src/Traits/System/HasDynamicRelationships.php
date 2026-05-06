<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits\System;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Alexandria\Core\Services\Relationships\RelationshipRepository;
use Alexandria\Core\Services\Relationships\RelationshipWriter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * HasDynamicRelationships
 *
 * Provides dynamic relationship functionality for the EAV system, enabling entries
 * to have user-defined relationships that work seamlessly with Eloquent.
 *
 * What this trait does:
 *  - Exposes "dynamic" relationship accessors via magic helpers:
 *      $entry->getDynamicRelationship('characters')   // Collection<Entry> (outgoing)
 *      $entry->callDynamicRelationship('parentScenes', []) // Builder (incoming)
 *  - Keeps normal Eloquent relationships for edges:
 *      parentRelationships(): edges where $this is parent (outgoing)
 *      childRelationships(): edges where $this is child  (incoming)
 *  - Delegates query building and writes to services:
 *      RelationshipRepository, RelationshipWriter
 *
 * Parsing convention (enforced by RelationshipKeyParser):
 *  - "parentXxx"   → incoming, slug = snake_case('Xxx')
 *  - "xxx"         → outgoing, slug = snake_case('xxx')
 *  - optional filters: ;limit=10;order=name;dir=desc
 *
 * Performance: In-memory cache, lazy-loaded services, efficient queries
 * Caching: Caches resolved dynamic collections per request on the instance, keyed by the raw key string
 *
 * @mixin Model
 *
 * @property int $id
 * @property-read Collection<int, EntryRelationship> $childRelationships
 * @property-read Collection<int, EntryRelationship> $parentRelationships
 */
trait HasDynamicRelationships
{
    /**
     * In-memory cache for dynamic relationship collections to prevent redundant queries.
     * The key is the relationship name (e.g., 'characters').
     */
    protected array $dynamicRelationshipCache = [];

    // Cached Service Instances

    private ?RelationshipRepository $relRepo = null;

    private ?RelationshipWriter $relWriter = null;

    /**
     * Lazy-load and cache the RelationshipRepository instance.
     */
    protected function repo(): RelationshipRepository
    {
        return $this->relRepo ??= app(RelationshipRepository::class);
    }

    /**
     * Lazy-load and cache the RelationshipWriter instance.
     */
    protected function writer(): RelationshipWriter
    {
        return $this->relWriter ??= app(RelationshipWriter::class);
    }

    // Core Getters (Magic Methods)

    /**
     * Return a cached Collection of related Entries for a given dynamic key.
     * Example:
     *   $entry->getDynamicRelationship('characters');
     *   $entry->getDynamicRelationship('parentScenes;limit=10;order=name');
     */
    public function getDynamicRelationship(string $key): Collection
    {
        if (isset($this->dynamicRelationshipCache[$key])) {
            return $this->dynamicRelationshipCache[$key];
        }

        return $this->dynamicRelationshipCache[$key] = $this->repo()->getForKey($this, $key);
    }

    /**
     * Build a query for a dynamic relationship key, with optional inline filters.
     *
     * Composes a raw relationship key from `$method` plus optional filters in
     * `$parameters` (either a `'k=v;…'` string or an `['k' => 'v']` map). Parsing
     * + validation lives in RelationshipKeyParser; this method only composes
     * the key string. See HasDynamicRelationshipsTest for shape examples.
     *
     * @param  string  $method  Raw dynamic key (may already include filters after a ';').
     * @param  array  $parameters  Either [ 'k=v;…' ] OR [ 'k' => 'v', … ].
     */
    public function callDynamicRelationship(string $method, array $parameters): Builder
    {
        $methodWithFilters = $method;

        // 1. Optional string filters (first list element), e.g. ['limit=10;order=name']
        $rawSuffix = null;
        if (! empty($parameters) && array_is_list($parameters) && isset($parameters[0]) && is_string($parameters[0])) {
            $rawSuffix = trim($parameters[0], " ;\t\n\r\0\x0B");
        }

        // 2. Optional associative filters, e.g. ['limit' => 5, 'order' => 'name']
        $assocSuffix = null;
        if (! empty($parameters) && ! array_is_list($parameters)) {
            $pairs = [];
            foreach ($parameters as $k => $v) {
                if ($k === '' || $v === null || $v === '') {
                    continue;
                }
                $pairs[] = "$k=$v";
            }
            if ($pairs) {
                $assocSuffix = implode(';', $pairs);
            }
        }

        // 3. Compose suffix: string filters first, then assoc (assoc takes precedence on duplicate keys)
        $suffix = '';
        if (! empty($rawSuffix)) {
            $suffix = $rawSuffix;
        }
        if (! empty($assocSuffix)) {
            $suffix .= ($suffix !== '' ? ';' : '').$assocSuffix;
        }

        // 4. Append with a single separator, avoiding ';;'
        if ($suffix !== '') {
            $sep = str_ends_with($methodWithFilters, ';') ? '' : ';';
            $methodWithFilters .= $sep.$suffix;
        }

        return $this->repo()->queryForKey($this, $methodWithFilters);
    }

    // Write Helpers

    /**
     * A developer-friendly helper to create a directional relationship.
     *
     * Clears `$dynamicRelationshipCache` on this instance + unsets the
     * loaded `parentRelationships`/`childRelationships` relations so a
     * subsequent `getDynamicRelationship()` re-fetches the freshly written
     * row instead of returning the pre-write cached Collection.
     *
     * @param  Entry  $child  The entry to relate to.
     * @param  string  $relationshipType  The snake_case name of the relationship.
     * @param  array<string, mixed>  $metadata  Optional data for the relationship pivot.
     */
    public function addRelationship(Entry $child, string $relationshipType, array $metadata = []): EntryRelationship
    {
        $rel = $this->writer()->add($this, $child, $relationshipType, $metadata);
        $this->invalidateDynamicRelationshipCache();

        return $rel;
    }

    /**
     * A developer-friendly helper to remove a directional relationship.
     * Cache invalidation parallels addRelationship -- without it, a
     * write-then-read on the same instance returns the stale pre-delete
     * Collection.
     *
     * @param  Entry  $child  The related entry.
     * @param  string  $relationshipType  The snake_case name of the relationship.
     */
    public function removeRelationship(Entry $child, string $relationshipType): bool
    {
        $removed = $this->writer()->remove($this, $child, $relationshipType);
        $this->invalidateDynamicRelationshipCache();

        return $removed;
    }

    /**
     * Reset the in-memory dynamic-relationship cache and any loaded edge
     * relations so subsequent reads reflect freshly-written data.
     */
    protected function invalidateDynamicRelationshipCache(): void
    {
        $this->dynamicRelationshipCache = [];
        $this->unsetRelation('parentRelationships');
        $this->unsetRelation('childRelationships');
    }

    // Standard Eloquent Relationships

    /**
     * Defines the relationship for all connections where this entry is the CHILD.
     */
    public function childRelationships(): HasMany
    {
        return $this->hasMany(EntryRelationship::class, 'child_entry_id');
    }

    /**
     * Defines the relationship for all connections where this entry is the PARENT.
     */
    public function parentRelationships(): HasMany
    {
        return $this->hasMany(EntryRelationship::class, 'parent_entry_id');
    }
}
