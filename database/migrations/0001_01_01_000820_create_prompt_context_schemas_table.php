<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prompt_context_schemas', function (Blueprint $table) {
            $table->id();

            // Identification
            $table->string('type', 100)->comment('e.g., ProjectCategorizationContext');
            $table->string('version', 20)->comment('e.g., 1.0');

            // The JSON Schema that validates context data
            $table->json('json_schema')->comment('JSON Schema for validating context data');

            // Documentation
            $table->text('description')->nullable();

            $table->timestamps();

            // Unique type + version combination
            $table->unique(['type', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prompt_context_schemas');
    }
};
