<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('role_permission_categories', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['slug', 'type']);
        });
    }

    public function down(): void
    {
        Schema::table('role_permission_categories', function (Blueprint $table) {
            $table->dropUnique(['slug', 'type']);
            $table->unique(['slug']);
        });
    }
};
