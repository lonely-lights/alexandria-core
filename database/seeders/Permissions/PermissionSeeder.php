<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Seeders\Permissions;

use Alexandria\Core\Models\Permissions\Permission;
use Alexandria\Core\Models\Permissions\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds the entry-type management permissions + the four canonical
 * roles (owner / maintainer / editor / viewer) with their default
 * grants. Strict legacy match.
 *
 * Re-runnable: uses firstOrCreate + givePermissionTo (non-
 * destructive grant grants), so re-running won't wipe custom
 * grants applied to these roles after first seed.
 */
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = 'web';

        $perms = [
            'view entry types',
            'create entry types',
            'edit entry types',
            'delete entry types',
            'manage blueprints',
        ];

        foreach ($perms as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        // Map to your existing role names if they differ
        $owner = Role::firstOrCreate(['name' => 'owner', 'guard_name' => $guard]);
        $maintainer = Role::firstOrCreate(['name' => 'maintainer', 'guard_name' => $guard]);
        $editor = Role::firstOrCreate(['name' => 'editor', 'guard_name' => $guard]);
        $viewer = Role::firstOrCreate(['name' => 'viewer', 'guard_name' => $guard]);

        // Use givePermissionTo (non-destructive) so we don't wipe any existing grants
        $owner->givePermissionTo($perms);

        $maintainer->givePermissionTo([
            'view entry types',
            'create entry types',
            'edit entry types',
            'delete entry types',
            'manage blueprints',
        ]);

        $editor->givePermissionTo([
            'view entry types',
            'create entry types',
            'edit entry types',
        ]);

        $viewer->givePermissionTo([
            'view entry types',
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
