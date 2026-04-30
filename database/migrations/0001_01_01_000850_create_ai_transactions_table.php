<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_transactions', function (Blueprint $table) {
            $table->id();
            // No FK constraint per ADR-006: the users table belongs to the host app.
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->uuid('batch_id')->nullable()->index()->comment('Links to a batch of commands.');
            $table->string('provider_name');
            $table->string('model_name');
            $table->enum('source', ['user', 'env'])->default('env')->comment('Credential source for BYOK attribution: env (operator) or user (BYOK).');
            $table->string('context')->nullable()->comment('What triggered this transaction (e.g., project_categorization, note_sorting)');
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->unsignedInteger('thinking_tokens')->default(0)->comment('Reasoning tokens for models like Gemini 2.5');
            $table->unsignedInteger('cache_read_tokens')->default(0);
            $table->unsignedInteger('cache_write_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->decimal('cost', 10, 6);
            $table->unsignedInteger('latency_ms')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_transactions');
    }
};
