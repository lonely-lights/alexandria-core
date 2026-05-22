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
        Schema::create('user_ai_settings', function (Blueprint $table) {
            $table->id();
            // No FK constraint per ADR-006: the users table belongs to the host app.
            $table->unsignedBigInteger('user_id')->unique();
            $table->foreignId('ai_provider_id')->constrained('ai_providers');

            // Legacy: API keys are now stored in user_api_keys table.
            // These fields kept for backwards compatibility.
            $table->longText('api_key')->nullable();
            $table->string('api_key_last_four', 4)->nullable();
            $table->date('api_key_expires_at')->nullable();
            $table->timestamp('api_key_created_at')->nullable();

            // Default model names for each AI purpose.
            //
            // Tiered text models (Stage 8c follow-up — separation of
            // concerns: classification, deep reasoning, and creative
            // output are different jobs with different cost/quality
            // tradeoffs, so each is independently configurable).
            $table->string('sorting_model_name')
                ->nullable()
                ->comment('Quick classifier — Stage 1 sorting, low cost/latency');
            $table->string('reasoning_model_name')
                ->nullable()
                ->comment('Deep reasoning — Stage 2 commands, dedup, integration; higher capability');
            $table->string('writing_model_name')
                ->nullable()
                ->comment('Creative output — drafts, prose, writing-craft suite');

            // Legacy aliases — kept so consumer apps that still reference
            // analyst_model_name / creative_model_name keep working
            // during the migration window. Resolution preference at the
            // orchestrator: tier-specific field > legacy field > provider default.
            $table->string('analyst_model_name')->nullable();
            $table->string('creative_model_name')->nullable();

            // Non-text models (no tier abstraction yet — single slot each).
            $table->string('image_model_name')->nullable();
            $table->string('video_model_name')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_ai_settings');
    }
};
