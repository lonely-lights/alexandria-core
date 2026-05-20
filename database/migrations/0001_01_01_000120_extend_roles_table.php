<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Stage 7a — Extend Spatie's `roles` table with the display + sort
 * metadata that the admin grid + nav surfaces depend on.
 *
 * Spatie's stock columns (`name`, `guard_name`, `team_id`, `category_id`)
 * already cover the lookup + multi-tenant scope. The fields added
 * here are presentation-only — the role-name slug stays the durable
 * identifier; everything below is what gets rendered in the UI.
 *
 *  - `display_name`         Human-readable label ("Super Moderator")
 *  - `description`          Help text in the grid + role detail surfaces
 *  - `style`                JSON badge treatment: `{ color_light, color_dark, ... }`
 *  - `icon`                 FontAwesome glyph ("fa-solid fa-shield-halved")
 *  - `rank`                 Sort + hierarchy ordinal — lower number outranks
 *                           higher (Owner=10 outranks Member=50). Hierarchy
 *                           enforcement (e.g. "you can only assign roles
 *                           below your own rank") lands in Stage 7c with
 *                           the admin panel; this column is the data layer
 *                           it'll read.
 *  - `is_project_template`  Marks rows as globally-edited project role
 *                           templates surfaced inside every project via
 *                           Spatie's team scoping (project_id IS NULL,
 *                           is_project_template = true). Lets the three
 *                           role kinds share the same table without
 *                           collisions: app-level (null + false),
 *                           project templates (null + true), and
 *                           project-custom (N + false).
 *
 * `display_name` and `rank` are nullable to keep the migration
 * non-destructive against any existing rows; the seeder + the
 * model's accessor (falls back to ucfirst(name)) cover both.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->string('display_name')->nullable()->after('name');
            $table->text('description')->nullable()->after('display_name');
            $table->json('style')->nullable()->after('description');
            $table->string('icon')->nullable()->after('style');
            $table->integer('rank')->nullable()->after('icon');
            $table->boolean('is_project_template')->default(false)->after('category_id');
            $table->index(['category_id', 'rank']);
            $table->index(['is_project_template', 'rank']);
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropIndex(['is_project_template', 'rank']);
            $table->dropIndex(['category_id', 'rank']);
            $table->dropColumn(['display_name', 'description', 'style', 'icon', 'rank', 'is_project_template']);
        });
    }
};
