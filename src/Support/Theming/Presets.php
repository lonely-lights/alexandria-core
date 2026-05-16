<?php

declare(strict_types=1);

namespace Alexandria\Core\Support\Theming;

/**
 * Single source of truth for the named-preset whitelist.
 *
 * The React-side `PRESETS` registry in alexandria-app's
 * `resources/js/lib/ThemingBridge.tsx` is the actual preset
 * definition (full ThemeTokens objects); this PHP-side list
 * mirrors only the slugs so server validation can reject
 * preset names not in the registry.
 *
 * Keep `SLUGS` in sync when the React-side registry adds or
 * removes a preset. A future improvement would publish a
 * `config/theming.php` that consumer apps can extend with
 * custom presets — for now the registry is library-managed
 * and consumers add presets by overriding ThemingBridge.
 */
final class Presets
{
    /**
     * @var list<string>
     */
    public const SLUGS = ['default', 'cyberpunk'];

    /**
     * Validation rule fragment for `in:...` rules.
     */
    public static function validationRule(): string
    {
        return 'in:'.implode(',', self::SLUGS);
    }
}
