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
        Schema::create('project_ai_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained()->onDelete('cascade');

            // AI Feature Toggles
            $table->boolean('ai_enabled')->default(true)->comment('Master switch for AI features in this project');
            $table->boolean('auto_categorize')->default(false)->comment('Automatically categorize new notes');
            $table->boolean('require_approval')->default(true)->comment('Require manual approval for AI-suggested routings');

            // Model Overrides (null = use user default)
            $table->foreignId('ai_provider_id')->nullable()->constrained('ai_providers')->nullOnDelete();
            $table->string('analyst_model_name')->nullable()->comment('Override analyst model for this project');
            $table->string('creative_model_name')->nullable()->comment('Override creative model for this project');

            // Budget Controls
            $table->decimal('monthly_budget', 10)->nullable()->comment('Monthly cost limit in USD');
            $table->decimal('per_request_limit', 8, 4)->nullable()->comment('Max cost per single AI request');

            // Behavior Settings
            $table->string('default_routing_action')->default('suggest')->comment('suggest, copy, move');
            $table->json('enabled_features')->nullable()->comment('Which AI features are enabled');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_ai_settings');
    }
};
