<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Security;

use Alexandria\Core\Models\Permissions\Permission;
use Alexandria\Core\Models\Permissions\RegisteredPackage;
use Alexandria\Core\Models\Permissions\RolePermissionCategory;
use Alexandria\Core\Services\Security\Exceptions\UnknownPermissionCategoryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * Registry that lets each package (alexandria-app, the future
 * alexandria-saas, alexandria-craft, etc.) declare its permissions
 * once, at service-provider boot time.
 *
 * Contract:
 *   - **Eager.** Called from a service provider's boot(). Runs once
 *     per request — cheap idempotent upsert.
 *   - **Idempotent.** Re-running the same manifest produces no
 *     duplicates; permission rows match by `name`, the
 *     `registered_packages` row matches by `slug`.
 *   - **Strict.** Manifest entries reference categories by slug; if
 *     the slug doesn't exist, the registry throws
 *     `UnknownPermissionCategoryException` rather than auto-creating.
 *     Packages own their own category seeds.
 *
 * Permission spec shape (one entry per permission in the manifest):
 *
 *   [
 *     'name'          => 'app-users-view',         // required, slug
 *     'display_name'  => 'View Users',             // required
 *     'description'   => 'Read user accounts.',    // optional
 *     'category_slug' => 'user-management',        // required, must exist
 *     'sort'          => 10,                       // optional, default 0
 *   ]
 *
 * Service-provider usage:
 *
 *   public function boot(AppPermissionRegistry $registry): void
 *   {
 *       $registry->register(
 *           packageSlug: 'app',
 *           packageName: 'Alexandria App',
 *           manifest: require __DIR__ . '/../../config/permissions/app.php',
 *           version: '0.1.0',
 *       );
 *   }
 */
class AppPermissionRegistry
{
    public function __construct(
        private readonly PermissionRegistrar $spatie,
    ) {}

    /**
     * Register or refresh a package's permission manifest.
     *
     * @param  array<int, array{
     *     name: string,
     *     display_name: string,
     *     description?: string|null,
     *     category_slug: string,
     *     sort?: int,
     * }> $manifest
     * @return int Count of permission rows written or updated.
     *
     * @throws UnknownPermissionCategoryException
     */
    public function register(
        string $packageSlug,
        string $packageName,
        array $manifest,
        ?string $version = null,
    ): int {
        // Pre-resolve every distinct category slug the manifest
        // references so we fail loudly + early on any miss, before
        // touching the permissions table.
        $categorySlugs = collect($manifest)
            ->pluck('category_slug')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $categories = RolePermissionCategory::query()
            ->permissions()
            ->whereIn('slug', $categorySlugs)
            ->pluck('id', 'slug');

        $missing = array_values(array_diff($categorySlugs, $categories->keys()->all()));
        if ($missing !== []) {
            throw UnknownPermissionCategoryException::forPackage($packageSlug, $missing);
        }

        return DB::transaction(function () use (
            $packageSlug,
            $packageName,
            $manifest,
            $version,
            $categories,
        ): int {
            RegisteredPackage::updateOrCreate(
                ['slug' => $packageSlug],
                [
                    'name' => $packageName,
                    'version' => $version,
                    'last_registered_at' => Carbon::now(),
                ],
            );

            $written = 0;
            foreach ($manifest as $spec) {
                Permission::updateOrCreate(
                    ['name' => $spec['name']],
                    [
                        'guard_name' => 'web',
                        'display_name' => $spec['display_name'],
                        'description' => $spec['description'] ?? null,
                        'package_slug' => $packageSlug,
                        'category_id' => $categories[$spec['category_slug']],
                        'sort_order' => $spec['sort'] ?? 0,
                    ],
                );
                $written++;
            }

            // Spatie caches resolved permissions for the request; bust
            // it so any later checks see the new rows immediately.
            $this->spatie->forgetCachedPermissions();

            return $written;
        });
    }
}
