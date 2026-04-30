<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Single-row, bidirectional relationships.
     *
     * Orientation still exists (parent/child) only to attach the *correct label* to each side.
     * - parent_label: what the PARENT is called on the CHILD's page
     * - child_label : what the CHILD is called on the PARENT's page
     *
     * Examples:
     *   Aurora (parent) — Luna (child):
     *     parent_label = "Spouse"   // label for Aurora when viewed on Luna's page
     *     child_label  = "Wife"     // label for Luna   when viewed on Aurora's page
     *
     * We intentionally avoid a uniqueness constraint so multiple rows can exist
     * for the same pair + type (e.g., different periods, subtypes, or contexts).
     */
    public function up(): void
    {
        Schema::create('entry_relationships', function (Blueprint $table) {
            $table->id()
                ->comment('Primary key');

            // Source entry in the relationship (directional only for labeling convenience)
            $table->foreignId('parent_entry_id')
                ->constrained('entries')
                ->cascadeOnDelete();
            // Target entry in the relationship
            $table->foreignId('child_entry_id')
                ->constrained('entries')
                ->cascadeOnDelete();

            // Relationship type
            $table->string('relationship_type')
                ->index()
                ->comment('Relationship identifier (e.g., "character-relationship", "contains_scene")');

            // Bidirectional labels stored in one row
            $table->string('parent_label')
                ->nullable()
                ->comment('Label shown on child entry (describes parent)');
            $table->string('child_label')
                ->nullable()
                ->comment('Label shown on parent entry (describes child)');

            // Additional relationship data
            $table->json('metadata')
                ->nullable()
                ->comment('Additional attributes (subtype, events, notes, etc.)');

            $table->timestamps();

            // Lifecycle columns
            $table->timestamp('archived_at')
                ->nullable()
                ->comment('When the connection was archived (filed away, still recoverable)');
            $table->unsignedBigInteger('cascade_archived_by')
                ->nullable()
                ->comment('Entry ID that triggered cascade archive (null = user-initiated)');
            $table->foreign('cascade_archived_by')->references('id')->on('entries')->onDelete('set null');
            $table->softDeletes()
                ->comment('When the connection was moved to trash (pending permanent deletion)');

            // Indexes for efficient relationship traversal
            $table->index(['parent_entry_id', 'relationship_type']);
            $table->index(['child_entry_id', 'relationship_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entry_relationships');
    }
};
