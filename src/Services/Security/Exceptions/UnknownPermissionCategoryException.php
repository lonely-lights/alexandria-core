<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Security\Exceptions;

use RuntimeException;

/**
 * Thrown when `AppPermissionRegistry::register()` encounters a manifest
 * entry whose `category_slug` doesn't exist in `role_permission_categories`.
 *
 * Packages own their own permission categories — the registry never
 * auto-creates them. Catching this exception in tests / install
 * tooling lets the operator surface a clear "you forgot to seed
 * category X" message rather than a silent permissions-without-a-home
 * state.
 */
class UnknownPermissionCategoryException extends RuntimeException
{
    /**
     * @param  array<int, string>  $missingSlugs
     */
    public static function forPackage(string $packageSlug, array $missingSlugs): self
    {
        $list = implode(', ', $missingSlugs);

        return new self(
            "Package '$packageSlug' references unknown permission categories: $list. "
            .'Categories must be seeded into `role_permission_categories` before '
            .'`AppPermissionRegistry::register()` is called.',
        );
    }
}
