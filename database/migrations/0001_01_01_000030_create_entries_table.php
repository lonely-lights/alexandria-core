<?php

declare(strict_types=1);

/**
 * Create Entries Table
 *
 * Stores instances of blueprints (e.g., a specific Character, Location, or Event).
 * Entries are the actual worldbuilding content created by users. Dynamic fields
 * are stored in the field_values table using the EAV pattern.
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
        Schema::create('entries', function (SchemaBlueprint $table) {

            // ID
            $table->id()
                ->comment('Primary key');

            // Project this Entry Belongs To (cascade delete: entries removed with project)
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();

            // Blueprint Defining this Entry Type (cascade delete: entries removed with blueprint)
            $table->foreignId('blueprint_id')
                ->constrained()
                ->cascadeOnDelete();

            // Core Fields
            $table->string('name')->index()->comment('Entry name (e.g., "Aragorn", "The Shire")');
            $table->string('slug')->comment('URL-friendly identifier');
            $table->text('summary')->nullable()->comment('Brief description of the entry');
            $table->longText('content')->nullable()->comment('Main content/description');

            // Organizational Fields
            $table->integer('sort_order')->default(0)->index()->comment('Display order within sibling group (auto-assigned)');
            $table->unsignedBigInteger('parent_id')->nullable()->index()->comment('For hierarchical entries (e.g., Scene → Chapter)');
            $table->boolean('is_stub')->default(false)->comment('Stub entries appear in lists/relationships but have no dedicated page');

            // Flexible data storage
            $table->json('metadata')->nullable()->comment('Additional unstructured data');
            $table->json('ai_notes')->nullable()->comment('AI processing metadata for deferred relationships and context');

            // Theme cascade — Stage 8b M3 (per-entry override; deepest scope)
            $table->string('theme_preset_slug')
                ->nullable()
                ->comment('Named preset slug (e.g. default, cyberpunk). NULL inherits blueprint/project/user.');
            $table->json('theme_override')
                ->nullable()
                ->comment('Sparse DeepPartial<ThemeTokens> JSON overlaid on the preset by the resolver');

            // Self-referencing foreign key for hierarchy
            $table->foreign('parent_id')->references('id')->on('entries')->onDelete('set null');

            $table->timestamps();
            $table->timestamp('archived_at')->nullable()->comment('When the entry was archived (filed away, still recoverable)');
            $table->unsignedBigInteger('cascade_archived_by')->nullable()->comment('Entry ID that triggered cascade archive (null = user-initiated)');
            $table->foreign('cascade_archived_by')->references('id')->on('entries')->onDelete('set null');
            $table->softDeletes();

            // Ensure slug uniqueness within project + blueprint scope
            $table->unique(['project_id', 'blueprint_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entries');
    }
};
