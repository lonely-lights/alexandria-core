<?php

declare(strict_types=1);

/**
 * Create entry_histories table.
 *
 * Audit trail of every change made to an Entry — core fields, EAV
 * attributes, metadata JSON, bulk ops. user_id is nullable to cover
 * system-/AI-driven changes.
 *
 * Note for consumers: the user_id column is intentionally NOT
 * constrained to a `users` table here — User lives in the consumer
 * app per ADR-006 (config-driven model resolution). Consumers that
 * want referential integrity can add the FK in their own migration.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entry_histories', function (Blueprint $table): void {
            $table->id();

            $table->foreignId('entry_id')
                ->constrained('entries')
                ->cascadeOnDelete();

            // Nullable + no FK: User class resolves via config('alexandria.models.user').
            // Consumer apps add their own FK in a follow-up migration if desired.
            $table->unsignedBigInteger('user_id')->nullable();

            $table->enum('change_type', ['field_update', 'attribute_update', 'metadata_update', 'bulk_update']);
            $table->string('field_name')->nullable();
            $table->longText('previous_value')->nullable();
            $table->longText('new_value')->nullable();
            $table->text('change_summary')->nullable();
            $table->json('context')->nullable();

            $table->timestamps();

            $table->index(['entry_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index('change_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entry_histories');
    }
};
