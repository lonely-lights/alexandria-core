<?php

declare(strict_types=1);

/**
 * Create project_user pivot table.
 *
 * Manages project membership. A user can hold multiple roles per
 * project (e.g. Editor + Viewer), so the unique key spans all three
 * columns rather than just (project_id, user_id).
 *
 * Note for consumers: the user_id column is intentionally NOT
 * constrained to a `users` table here — User lives in the consumer
 * app per ADR-006 (config-driven model resolution). Consumers that
 * want referential integrity can add the FK in their own migration.
 *
 * role_id keeps its FK to Spatie's `roles` table since that's
 * already shipped by core's permission migration.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_user', function (Blueprint $table): void {
            $table->id();

            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();

            // No FK: User class resolves via config('alexandria.models.user').
            $table->unsignedBigInteger('user_id');

            $table->foreignId('role_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->timestamps();

            // A user can hold multiple roles per project — uniqueness
            // spans all three columns.
            $table->unique(['project_id', 'user_id', 'role_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_user');
    }
};
