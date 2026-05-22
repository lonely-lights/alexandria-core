<?php

declare(strict_types=1);

/**
 * Create Blueprints Table
 *
 * Defines the schema for user-created blueprints (Character, Location, Spell, etc.).
 * Blueprints define what kind of entries can be created in a project.
 * Each blueprint can have custom fields and behavior settings.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('blueprints', function (Blueprint $table) {

            // ID
            $table->id()
                ->comment('Primary key');

            // Assigned to Project
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();

            // Core Details
            $table->string('name')
                ->comment('Blueprint display name (e.g., "Character", "Location")');
            $table->string('slug')
                ->comment('URL-friendly identifier');
            $table->text('description')
                ->nullable()
                ->comment('Explanation of this blueprint type');
            $table->string('icon')
                ->nullable()
                ->comment('Icon identifier (e.g., "fa-user", "fa-map-marker")');

            // Display & Behavior Settings
            $table->boolean('show_on_dashboard')
                ->default(false)
                ->comment('Whether entries appear on project dashboard');
            $table->boolean('is_linkable')
                ->default(true)
                ->comment('Whether entries can be linked to other entries');
            $table->boolean('is_hub')
                ->default(false)
                ->comment('Whether this blueprint serves as a content hub');

            // Classification Determines Entry Behavior
            $table->string('classification')
                ->default('standard')
                ->comment('Type: standard (entries), list (selections), structural (organization)');
            $table->string('list_selection_mode')
                ->default('single')
                ->comment('For list blueprints: single or multiple selection');

            // Advanced Configuration
            $table->json('infobox_schema')
                ->nullable()
                ->comment('Structure for entry infobox display');
            $table->string('content_renderer')
                ->default('content')
                ->comment('Component used to render entry content');
            $table->json('metadata')
                ->nullable()
                ->comment('Additional unstructured data');

            // View Options
            $table->boolean('show_tree_view')
                ->default(false)
                ->comment('Whether to show the tree/hierarchy view for this blueprint');
            $table->boolean('enable_timeline')
                ->default(false)
                ->comment('Whether to show the timeline view for this blueprint');
            $table->json('views')
                ->nullable()
                ->comment('View registry entries: [{type, enabled, config, sort_order}]');

            // AI Configuration
            $table->text('ai_prompt_instructions')
                ->nullable()
                ->comment('Instructions for AI when categorizing/creating entries of this blueprint type');
            $table->boolean('allow_ai_sorting')
                ->default(false)
                ->comment('Whether this blueprint should be considered for top-level AI note sorting');
            $table->json('tag_aliases')
                ->nullable()
                ->comment('Tags that always route notes to this blueprint (deterministic, bypasses LLM). Case-insensitive match.');

            // Theming cascade (Stage 8b M2) — content-area only per the
            // project_chrome_themed_at_project_scope guarantee. When the
            // user views entries of this blueprint, the content cascade
            // layers these overrides on top of project + user; chrome
            // stays at project scope and ignores them.
            $table->string('theme_preset_slug')
                ->nullable()
                ->comment('Named preset slug. NULL inherits project-level cascade.');
            $table->json('theme_override')
                ->nullable()
                ->comment('Sparse DeepPartial<ThemeTokens> JSON layered on top of project + user');

            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index(['classification', 'is_hub']);

            // Slug Unique Per Project
            $table->unique(['project_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blueprints');
    }
};
