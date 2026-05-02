<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Seeders;

use Alexandria\Core\Models\Permissions\Permission;
use Alexandria\Core\Models\Permissions\RolePermissionCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

/**
 * Seeds the project-level permission catalog — the 9 canonical
 * permissions every project knows about (view / settings.edit /
 * members.manage / delete + entry view/create/edit/delete/
 * forceDelete).
 *
 * NOTE: this seeder does NOT create roles. Per legacy convention,
 * roles are created per project in Project::booted()->created()
 * once the consumer wires a Project lifecycle observer. This
 * seeder only makes sure the permission rows exist so role
 * creation can attach them.
 *
 * Strict legacy match.
 */
class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        Artisan::call('permission:cache-reset');

        $guard = 'web';

        // Get the project permissions category
        $projectCategory = RolePermissionCategory::where('slug', 'project')->first();

        // Global, project-agnostic permissions with descriptions and order
        $permissions = [
            [
                'name' => 'project.view',
                'description' => 'View project content and navigate through the project',
                'sort_order' => 10,
            ],
            [
                'name' => 'project.settings.edit',
                'description' => 'Modify project settings, roles, and configuration',
                'sort_order' => 20,
            ],
            [
                'name' => 'project.members.manage',
                'description' => 'Add, remove, and manage project members and their roles',
                'sort_order' => 30,
            ],
            [
                'name' => 'project.delete',
                'description' => 'Permanently delete the entire project (destructive action)',
                'sort_order' => 40,
            ],
            [
                'name' => 'entry.view',
                'description' => 'View entries (characters, locations, events, etc.) in the project',
                'sort_order' => 50,
            ],
            [
                'name' => 'entry.create',
                'description' => 'Create new entries and add content to the project',
                'sort_order' => 60,
            ],
            [
                'name' => 'entry.edit',
                'description' => 'Edit and modify existing entries and their content',
                'sort_order' => 70,
            ],
            [
                'name' => 'entry.delete',
                'description' => 'Soft delete entries (can be restored by administrators)',
                'sort_order' => 80,
            ],
            [
                'name' => 'entry.forceDelete',
                'description' => 'Permanently delete entries (destructive action, cannot be undone)',
                'sort_order' => 90,
            ],
        ];

        foreach ($permissions as $permissionData) {
            Permission::firstOrCreate([
                'name' => $permissionData['name'],
                'guard_name' => $guard,
            ], [
                'category_id' => $projectCategory?->id,
                'description' => $permissionData['description'],
                'sort_order' => $permissionData['sort_order'],
            ]);
        }

        // Roles are created per project in Project::booted()->created().
        Artisan::call('permission:cache-reset');
    }
}
