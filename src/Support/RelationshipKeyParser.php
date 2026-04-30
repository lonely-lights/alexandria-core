<?php

declare(strict_types=1);

namespace Alexandria\Core\Support;

use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Turns a raw dynamic relationship key into a structured RelationshipKey.
 *
 * Why a parser?
 *  - One source of truth for "parent*" → incoming direction, slug normalization, and
 *    filter extraction.
 *  - Lets us evolve the grammar (aliases, deprecations, new filters) without touching call sites.
 *  - Testable in isolation (no DB).
 *
 * Grammar (initial, intentionally small):
 *   <Head>[;<k>=<v>;...]
 *
 * Examples:
 *   "characters"
 *   "parentScenes"
 *   "parentScenes;limit=10"
 *   "characters;order=priority;dir=desc"
 *
 * Head rules:
 *   - If Head starts with "parent", it's INCOMING. Base name is Head without "parent".
 *   - Else, it's OUTGOING. Base name is Head as-is.
 *   - Slug is snake_case(base name): "Scenes" → "scenes", "ContainsScene" → "contains_scene".
 *
 * Filters (optional, conservative set for now):
 *   - limit: positive integer
 *   - order: one of ["name","priority"] (applies to the selected entry rows)
 *   - dir:   "asc" | "desc"
 *
 * This minimal set covers 95% of current needs. We can add more (e.g., subtype)
 * later once we standardize cross-DB JSON querying for metadata.
 */
class RelationshipKeyParser
{
    /** @throws InvalidArgumentException */
    public function parse(string $raw): RelationshipKey
    {
        $raw = trim($raw);
        if ($raw === '') {
            throw new InvalidArgumentException('Empty relationship key is not allowed.');
        }

        // Split head from the filter tail once; subsequent semicolons belong to filters.
        [$head, $tail] = array_pad(explode(';', $raw, 2), 2, '');

        // Determine direction and base name
        $direction = Str::startsWith($head, 'parent') ? 'incoming' : 'outgoing';
        $base = $direction === 'incoming' ? Str::after($head, 'parent') : $head;

        if ($base === '') {
            throw new InvalidArgumentException("Bad relationship key `$raw`: missing base after prefix.");
        }

        // Normalize slug to snake_case (UI keys are usually CamelCase/PascalCase)
        $slug = Str::snake($base);

        // Parse filters into a flat k=v map
        $filters = [];
        if ($tail !== '') {
            foreach (explode(';', $tail) as $pair) {
                if ($pair === '') {
                    continue;
                }
                [$k, $v] = array_map('trim', array_pad(explode('=', $pair, 2), 2, null));
                if ($k === null || $k === '' || $v === null) {
                    throw new InvalidArgumentException("Bad filter in key `$raw`: `$pair`");
                }
                $filters[$k] = $v;
            }
        }

        // Validate the small set we support explicitly (others are ignored by the repo for now)
        if (isset($filters['limit'])) {
            $n = (int) $filters['limit'];
            if ($n <= 0) {
                throw new InvalidArgumentException("Filter `limit` must be a positive integer in key `$raw`.");
            }
            $filters['limit'] = $n;
        }

        if (isset($filters['order'])) {
            $order = strtolower((string) $filters['order']);
            if (! in_array($order, ['name', 'priority'], true)) {
                throw new InvalidArgumentException("Filter `order` must be one of [name, priority] in key `$raw`.");
            }
            $filters['order'] = $order;
        }

        if (isset($filters['dir'])) {
            $dir = strtolower((string) $filters['dir']);
            if (! in_array($dir, ['asc', 'desc'], true)) {
                throw new InvalidArgumentException("Filter `dir` must be asc|desc in key `$raw`.");
            }
            $filters['dir'] = $dir;
        }

        // Canonical form is stable and cheap to cache on the caller side
        $canonical = "$direction|$slug".($filters ? '|'.http_build_query($filters) : '');

        return new RelationshipKey($direction, $slug, $filters, $canonical);
    }
}
