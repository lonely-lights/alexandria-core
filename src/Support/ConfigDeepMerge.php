<?php

declare(strict_types=1);

namespace Alexandria\Core\Support;

/**
 * Deep merge with list-replacement semantics. Used by
 * AlexandriaServiceProvider::mergeConfigDeepFrom so consumers can
 * publish a partial config/alexandria.php (only the keys they want
 * to override) and still inherit defaults at every other path.
 *
 * For each key in the override:
 *   - if both sides are associative arrays, recurse;
 *   - otherwise the override value wins as-is (list arrays included).
 *
 * The list-replacement contract matters for keys like
 * media.accepted_mimes — when the consumer narrows the list, we want
 * the consumer's narrower list to win, not get silently re-merged
 * with core's broader defaults at sibling indexes (which is what
 * PHP's array_replace_recursive would do).
 */
final class ConfigDeepMerge
{
    /**
     * @param  array<mixed, mixed>  $defaults
     * @param  array<mixed, mixed>  $overrides
     * @return array<mixed, mixed>
     */
    public static function merge(array $defaults, array $overrides): array
    {
        foreach ($overrides as $key => $value) {
            $isAssocOnBothSides = is_array($value)
                && ! array_is_list($value)
                && isset($defaults[$key])
                && is_array($defaults[$key])
                && ! array_is_list($defaults[$key]);

            $defaults[$key] = $isAssocOnBothSides
                ? self::merge($defaults[$key], $value)
                : $value;
        }

        return $defaults;
    }
}
