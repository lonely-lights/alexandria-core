<?php

declare(strict_types=1);

namespace Alexandria\Core\Support;

/**
 * Value object representing a parsed dynamic relationship "key".
 *
 * Example raw keys:
 *   - "characters"            → outgoing, slug=characters
 *   - "parentScenes"          → incoming, slug=scenes
 *   - "parentScenes;limit=10" → incoming, slug=scenes, filters[limit]=10
 *
 * The Key is intentionally tiny and immutable. All behavior lives in the
 * parser and repository, not here.
 */
final readonly class RelationshipKey
{
    /**
     * @param  'incoming'|'outgoing'  $direction  The orientation relative to the current entry.
     * @param  string  $slug  Snake_case relationship_type (e.g., "contains_scene").
     * @param  array<string,mixed>  $filters  Optional parsed filters (limit, order, dir, etc.).
     * @param  string  $canonical  Stable string for caching/metrics (direction|slug|filters).
     */
    public function __construct(
        public string $direction,
        public string $slug,
        public array $filters = [],
        public string $canonical = '',
    ) {}
}
