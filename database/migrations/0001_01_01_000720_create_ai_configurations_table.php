<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_configurations', function (Blueprint $table) {
            $table->id();

            // Polymorphic relationship to any model
            $table->morphs('configurable'); // creates configurable_type and configurable_id

            // Configuration type (field_instructions, blueprint_instructions, etc.)
            $table->string('type');

            // The actual AI configuration data
            $table->longText('instructions')->nullable();
            $table->json('metadata')->nullable(); // For additional AI config data

            // Priority/ordering for multiple configs of same type
            $table->integer('priority')->default(0);

            // Status for enabling/disabling AI configs
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            // Indexes for performance
            // Note: morphs() already creates an index for configurable_type, configurable_id
            $table->index(['type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_configurations');
    }
};
