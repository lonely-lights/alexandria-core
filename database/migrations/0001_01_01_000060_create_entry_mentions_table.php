<?php

declare(strict_types=1);

/**
 * Create Entry Mentions Table
 *
 * Tracks when entries reference or mention other entries in their content.
 * Used for automatic cross-linking and relationship discovery. The mention_count
 * field enables importance ranking (entries mentioned more frequently are likely more significant).
 *
 * Batch: 1.1 - EAV Core Migrations
 * Focus: Mention tracking, unique constraints, mention counting
 * Cross-Refs: Batch 3.5 (Content processing), Batch 2.5 (Entry management)
 * Issues: None
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entry_mentions', function (Blueprint $table) {
            $table->id()
                ->comment('Primary key');
            // Entry that contains the mention
            $table->foreignId('source_entry_id')
                ->constrained('entries')
                ->cascadeOnDelete();
            // Entry being mentioned
            $table->foreignId('target_entry_id')
                ->constrained('entries')
                ->cascadeOnDelete();
            $table->unsignedInteger('mention_count')
                ->default(1)
                ->comment('Number of times target is mentioned in source');

            // Prevent duplicate mention tracking between same entry pair
            $table->unique(['source_entry_id', 'target_entry_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entry_mentions');
    }
};
