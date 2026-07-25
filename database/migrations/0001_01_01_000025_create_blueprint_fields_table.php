<?php

declare(strict_types=1);

/**
 * Create Blueprint Fields Table
 *
 * Defines the schema for custom fields that can be added to blueprints.
 * This allows users to define their own field schemas for each blueprint
 * (e.g., "Age" for Character, "Population" for Location).
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
        Schema::create('blueprint_fields', function (SchemaBlueprint $table) {

            // ID
            $table->id()
                ->comment('Primary key');

            // Assigned to Blueprint
            $table->foreignId('blueprint_id')
                ->constrained()
                ->cascadeOnDelete();

            // Field Definition
            $table->string('name')
                ->comment('Machine-readable identifier (e.g., "character_age")');
            $table->string('label')
                ->comment('Human-readable label for UI (e.g., "Character Age")');
            $table->string('type')
                ->default('text')
                ->comment('Data type: text, textarea, integer, boolean, date, entry_reference');
            $table->text('description')
                ->nullable()
                ->comment('Help text shown to users');
            $table->string('default_value')
                ->nullable()
                ->comment('Default value when creating new entries');

            // Field Behavior
            $table->boolean('is_required')
                ->default(false)
                ->comment('Whether field must have a value');
            $table->boolean('include_in_ai_sorting')
                ->default(true)
                ->comment('Whether the field appears in AI sorting prompts. Turn off for fields sorting cannot fill from a note (appearance, traits, beliefs) so the schema the model sees stays minimal');
            $table->integer('sort_order')
                ->default(0)
                ->comment('Display order in forms and views');

            // Validation and Configuration
            $table->json('validation_rules')
                ->nullable()
                ->comment('Laravel validation rules and field-specific config');

            // AI Configuration
            $table->text('ai_instruction')
                ->nullable()
                ->comment('Field-specific AI instructions (priority level, context triggers, etc.)');

            $table->timestamps();
            $table->softDeletes();

            // Field Unique Per Blueprint
            $table->unique(['blueprint_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blueprint_fields');
    }
};
