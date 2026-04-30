<?php

declare(strict_types=1);

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
        Schema::create('ai_models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_provider_id')->constrained('ai_providers')->onDelete('cascade');
            $table->string('model_id');                    // e.g., "gpt-4o", "claude-3-opus-20240229"
            $table->string('display_name');                // e.g., "GPT-4o", "Claude 3 Opus"
            $table->string('category')->default('general'); // analyst, creative, general
            $table->integer('context_window')->nullable(); // Max tokens
            $table->decimal('input_price_per_million', 10, 4)->nullable();  // Price per 1M input tokens
            $table->decimal('output_price_per_million', 10, 4)->nullable(); // Price per 1M output tokens
            $table->boolean('supports_json_mode')->default(false);
            $table->boolean('supports_vision')->default(false);
            $table->boolean('is_flagship')->default(false);   // Top-tier model from provider
            $table->boolean('is_recommended')->default(false);
            $table->boolean('is_active')->default(true);
            $table->date('released_at')->nullable();             // Model release date (for sorting and display)
            $table->text('notes')->nullable();
            $table->json('capabilities')->nullable();      // Additional capability flags
            $table->timestamps();

            $table->unique(['ai_provider_id', 'model_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_models');
    }
};
