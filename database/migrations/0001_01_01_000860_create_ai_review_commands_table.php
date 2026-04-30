<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_review_commands', function (Blueprint $table) {
            $table->id();

            // Batch and user tracking
            $table->string('batch_id')->index();
            // No FK constraint per ADR-006: the users table belongs to the host app.
            $table->unsignedBigInteger('user_id')->index();
            $table->foreignId('project_id')->nullable()->constrained('projects')->cascadeOnDelete();
            $table->json('context')->nullable()->comment('Additional contextual data');

            // Command details (optional/flexible for malformed commands)
            $table->string('action_type')->nullable();
            $table->json('payload')->nullable();
            $table->text('reasoning')->nullable();

            // Review workflow tracking
            $table->boolean('is_active')->default(true)->comment('Can be toggled on/off for batch execution');
            $table->enum('status', ['pending', 'approved', 'rejected', 'executed', 'failed'])->default('pending');

            // Execution tracking
            $table->text('failure_reason')->nullable();
            $table->timestamp('executed_at')->nullable();

            // Fallback for invalid/malformed commands
            $table->json('raw_command')->nullable()->comment('Original AI response if command is malformed');
            $table->json('validation_errors')->nullable()->comment('Errors encountered during command parsing');

            // Display order and grouping
            $table->integer('order_index')->default(0)->comment('Display order within batch');

            $table->timestamps();

            // Indexes
            $table->index(['batch_id', 'status']);
            $table->index(['batch_id', 'is_active']);
            $table->index(['user_id', 'project_id']);
            $table->index(['project_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_review_commands');
    }
};
