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
            $table->string('analyst_model_name')->nullable();
            $table->string('creative_model_name')->nullable();
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
