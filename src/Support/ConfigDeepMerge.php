<?php

declare(strict_types=1);

namespace Alexandria\Core\Support;

/**
 * Deep-merge consumer config overrides onto core defaults — list values are replaced wholesale, associative arrays recurse.
 */
final class ConfigDeepMerge
{
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
