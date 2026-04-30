<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prompt_templates', function (Blueprint $table) {
            $table->id();

            // Identification
            $table->string('key', 100)->unique()->comment('Unique key, e.g., notes.categorize.project_level');
            $table->string('name')->comment('Human-readable name');
            $table->text('description')->nullable()->comment('What this prompt does');
            $table->string('category', 50)->comment('categorization, extraction, generation, etc.');

            // Template content - THE ACTUAL PROMPT
            // This contains ONLY instructions, no data. Data is injected via [DATA_CONTEXT] placeholder.
            $table->longText('template')->comment('Prompt instructions. Must contain [DATA_CONTEXT] placeholder.');

            // Context requirements - links to prompt_context_schemas
            $table->string('required_context_type', 100)->comment('e.g., ProjectCategorizationContext');
            $table->string('context_schema_version', 20)->default('1.0');

            // Metadata
            $table->boolean('is_system')->default(true)->comment('System prompts cannot be deleted');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);

            $table->timestamps();

            // Indexes
            $table->index('category');
            $table->index('is_active');
            $table->index('required_context_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prompt_templates');
    }
};
