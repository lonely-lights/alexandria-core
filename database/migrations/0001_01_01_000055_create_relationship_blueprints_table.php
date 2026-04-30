<?php

declare(strict_types=1);

/**
 * Create Relationship Blueprints Table
 *
 * Defines allowed relationships between blueprint types (e.g., "Character can have Location").
 * Supports AI-guided relationship creation with priority levels and context triggers.
 * Bidirectional relationships are managed with separate labels for each side.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint as SchemaBlueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('relationship_blueprints', function (SchemaBlueprint $table) {
            $table->id()
                ->comment('Primary key');

            // Source blueprint in the relationship
            $table->foreignId('from_blueprint_id')
                ->constrained('blueprints')
                ->cascadeOnDelete();
            // Target blueprint in the relationship
            $table->foreignId('to_blueprint_id')
                ->constrained('blueprints')
                ->cascadeOnDelete();

            // Relationship definition
            $table->string('relationship_name')
                ->comment('Identifier (e.g., "hasLifeEvent", "familyRelationship", "residesIn")');
            $table->string('from_label')
                ->nullable()
                ->comment('Label shown on target entry (describes source)');
            $table->string('to_label')
                ->nullable()
                ->comment('Label shown on source entry (describes target)');

            // AI guidance for relationship detection
            $table->enum('ai_priority', ['required', 'preferred', 'optional'])
                ->default('optional')
                ->comment('How important this relationship is for AI to create');
            $table->text('ai_instruction')
                ->nullable()
                ->comment('Instructions for AI when creating this relationship');
            $table->json('context_triggers')
                ->nullable()
                ->comment('Keywords/phrases that should trigger this relationship');

            // Relationship constraints
            $table->boolean('is_bidirectional')
                ->default(true)
                ->comment('Whether relationship appears on both entries');
            $table->integer('max_connections')
                ->nullable()
                ->comment('Maximum instances of this relationship per entry');

            // Metadata for complex relationships
            $table->json('metadata_schema')
                ->nullable()
                ->comment('Schema for additional relationship attributes');

            $table->timestamps();
            $table->softDeletes();

            // Indexes for efficient lookups
            $table->index(['from_blueprint_id', 'relationship_name']);
            $table->index(['to_blueprint_id', 'relationship_name']);
            $table->index('ai_priority');

            // Ensure unique relationship definitions
            $table->unique(['from_blueprint_id', 'to_blueprint_id', 'relationship_name'], 'unique_relationship_blueprint');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('relationship_blueprints');
    }
};
