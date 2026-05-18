<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * Stage 7a — Drop the global slug-unique on role_permission_categories
 * and replace it with a composite `(slug, type)` unique constraint.
 *
 * Why: role categories and permission categories are separate
 * namespaces. The original migration declared `slug` as unique across
 * all rows, which collides whenever a sensible slug like `system`
 * needs to exist as BOTH a role category ("System" — Owner / System
 * Operator) AND a permission category ("System" — app-wide settings).
 *
 * After this migration, `('system', 'role')` and `('system',
 * 'permission')` can co-exist; `(slug, type)` stays unique within
 * each namespace.
 *
 * **Idempotency note (Postgres):** Earlier versions of this migration
 * used `$table->dropUnique(['slug'])` + `$table->unique(['slug','type'])`
 * inside a single Schema::table closure. On `migrate:fresh` back-to-
 * back, the batched ALTER TABLE statements occasionally tripped over
 * each other — Postgres DDL is transactional, and any failure rolls
 * the whole transaction back, including the constraint drop. The
 * symptom was a misleading "Key (slug)=(system) is duplicated" error
 * pointing at the slug-only constraint name (which is what the
 * rollback was trying to restore). The fix: drop both possible
 * constraint names with IF EXISTS, then add the composite. Raw SQL
 * to skip Laravel's batching layer entirely.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // Drop old + new constraint names defensively. IF EXISTS
            // makes this safe on fresh installs (where _slug_unique
            // may never have existed if 000100 was modified) AND on
            // re-runs where the composite may already be in place.
            DB::statement('ALTER TABLE role_permission_categories DROP CONSTRAINT IF EXISTS role_permission_categories_slug_unique');
            DB::statement('ALTER TABLE role_permission_categories DROP CONSTRAINT IF EXISTS role_permission_categories_slug_type_unique');
            DB::statement('ALTER TABLE role_permission_categories ADD CONSTRAINT role_permission_categories_slug_type_unique UNIQUE (slug, type)');

            return;
        }

        // SQLite / MySQL path — Schema builder works fine here.
        Schema::table('role_permission_categories', function (Blueprint $table) {
            try {
                $table->dropUnique(['slug']);
            } catch (Throwable) {
                // Index may not exist on fresh installs — fine.
            }
            $table->unique(['slug', 'type']);
        });
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE role_permission_categories DROP CONSTRAINT IF EXISTS role_permission_categories_slug_type_unique');

            return;
        }

        Schema::table('role_permission_categories', function (Blueprint $table) {
            $table->dropUnique(['slug', 'type']);
        });

        // Intentionally NOT restoring the slug-only unique on
        // rollback — seeded data has duplicate slugs across types
        // ('system' as both role + permission category), so adding
        // `unique(slug)` would fail. Operators rolling all the way
        // back to pre-Stage-7a should truncate the table first.
    }
};
