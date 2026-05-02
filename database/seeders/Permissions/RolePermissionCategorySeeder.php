<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Seeders\Permissions;

use Alexandria\Core\Models\Permissions\RolePermissionCategory;
use Illuminate\Database\Seeder;

/**
 * Seeds the framework's role + permission categories — the
 * grouping vocabulary used by the admin UI when listing roles
 * and permissions. Strict legacy match.
 */
class RolePermissionCategorySeeder extends Seeder
{
    public function run(): void
    {
        RolePermissionCategory::create([
            'name' => 'General',
            'slug' => 'general',
            'type' => 'role',
        ]);

        RolePermissionCategory::create([
            'name' => 'Custom Groups',
            'slug' => 'custom',
            'type' => 'role',
        ]);

        RolePermissionCategory::create([
            'name' => 'Special Groups',
            'slug' => 'special',
            'type' => 'role',
        ]);

        RolePermissionCategory::create([
            'name' => 'Staff',
            'slug' => 'staff',
            'type' => 'role',
        ]);

        RolePermissionCategory::create([
            'name' => 'File Uploads',
            'slug' => 'public-uploads',
            'type' => 'permission',
        ]);

        RolePermissionCategory::create([
            'name' => 'Models - User',
            'slug' => 'model-user',
            'type' => 'permission',
        ]);

        RolePermissionCategory::create([
            'name' => 'Alexandria Permissions',
            'slug' => 'alexandria-general',
            'type' => 'permission',
        ]);

        RolePermissionCategory::create([
            'name' => 'Project Permissions',
            'slug' => 'project',
            'type' => 'permission',
        ]);
    }
}
