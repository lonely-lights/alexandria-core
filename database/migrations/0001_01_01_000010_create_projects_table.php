<?php

declare(strict_types=1);

/**
 * Create Projects Table
 *
 * Projects are the TOP-LEVEL container in Alexandria, replacing the legacy Worlds system.
 * Each project contains blueprints (entry types) and entries (entry instances).
 * Projects support team collaboration via project_user pivot table with role-based permissions.
 * Subdomain routing is optional per project.
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
        Schema::create('projects', function (Blueprint $table) {

            // ID
            $table->id()
                ->comment('Primary key');

            // Core Details
            $table->string('name')
                ->comment('Project display name');
            $table->string('slug')
                ->unique()
                ->comment('URL-friendly identifier');
            $table->boolean('use_subdomain')
                ->default(false)
                ->comment('Whether project uses custom subdomain routing');

            // Project Owner and Creator
            // No FK constraint: the users table is owned by the host app, not core.
            // Relationship enforcement happens at the model layer via
            // belongsTo(config('alexandria.models.user')) per ADR-006.
            $table->unsignedBigInteger('owner_id')->nullable()
                ->comment('FK to host app user table (model-layer relationship; no schema constraint)');
            $table->unsignedBigInteger('creator_id')->nullable()
                ->comment('FK to host app user table (model-layer relationship; no schema constraint)');

            // Descriptive Fields
            $table->string('logline', 1000)
                ->nullable()
                ->comment('One-sentence pitch or tagline');
            $table->text('summary')
                ->nullable()
                ->comment('Brief overview of the project');
            $table->longText('contents')
                ->nullable()
                ->comment('Full description and details');

            // Flexible Storage
            $table->json('metadata')
                ->nullable()
                ->comment('Additional unstructured data');

            // Theming cascade (Stage 8b M1) — chrome + content read these
            // when the project is current; the React-side ThemingBridge
            // feeds them into resolveChromeTheme/resolveContentTheme.
            // Chrome stops at this scope per the
            // project_chrome_themed_at_project_scope guarantee; blueprint
            // and entry overrides only affect the content area.
            $table->string('theme_preset_slug')
                ->nullable()
                ->comment('Named preset slug (e.g. default, cyberpunk). NULL inherits user-level.');
            $table->json('theme_override')
                ->nullable()
                ->comment('Sparse DeepPartial<ThemeTokens> JSON overlaid on the preset by the resolver');

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('owner_id');
            $table->index('creator_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
