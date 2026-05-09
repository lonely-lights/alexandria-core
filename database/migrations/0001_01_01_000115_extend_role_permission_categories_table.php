<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Stage 7a — Extend `role_permission_categories` with the metadata the
 * admin grid needs: a description for tooltips / column headers, an
 * explicit `sort` ordinal, plus icon + style JSON for the badge
 * treatment in the role/permission lists.
 *
 * Lives in core because the table itself was created by core's earlier
 * `0001_01_01_000100_create_role_permission_categories_table.php` —
 * any consumer of the framework that mounts the admin grid wants the
 * same schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('role_permission_categories', function (Blueprint $table) {
            $table->text('description')->nullable()->after('type');
            $table->integer('sort')->default(0)->after('description');
            $table->string('icon')->nullable()->after('sort');
            $table->json('style')->nullable()->after('icon');
            $table->index(['type', 'sort']);
        });
    }

    public function down(): void
    {
        Schema::table('role_permission_categories', function (Blueprint $table) {
            $table->dropIndex(['type', 'sort']);
            $table->dropColumn(['description', 'sort', 'icon', 'style']);
        });
    }
};
