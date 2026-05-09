<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Stage 7a — Extend Spatie's `permissions` table with two columns the
 * existing schema doesn't carry:
 *
 *  - `display_name`  Human-readable label ("View Users") for the
 *                    admin grid. The slug-shaped `name` ("app-users-
 *                    view") stays the durable lookup key.
 *  - `package_slug`  Which registered package brought this permission
 *                    into existence ("app", "saas", "craft", …). The
 *                    admin grid uses this to render one column-group
 *                    per package; the registry uses it for idempotent
 *                    upserts.
 *
 * `description`, `category_id`, and `sort_order` already live on the
 * table from the earlier `0001_01_01_000110_create_permission_tables`
 * migration — we don't redefine them.
 *
 * Both new columns are nullable. The registry enforces non-null via
 * the manifest contract; pre-existing rows (none, but conceptually)
 * stay valid until they get re-registered.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('display_name')->nullable()->after('guard_name');
            $table->string('package_slug')->nullable()->after('display_name');
            $table->index('package_slug');
            $table->index(['package_slug', 'category_id', 'sort_order'], 'permissions_package_category_sort_index');
        });
    }

    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropIndex('permissions_package_category_sort_index');
            $table->dropIndex(['package_slug']);
            $table->dropColumn(['display_name', 'package_slug']);
        });
    }
};
