<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_ai_instructions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('label')
                ->comment('Display name for this instruction set');
            $table->text('instructions')
                ->comment('The instructions to include in AI writing prompts');
            $table->boolean('is_default')
                ->default(false)
                ->comment('Whether this is the default instruction set for the project');
            $table->unsignedSmallInteger('sort_order')
                ->default(0);
            $table->timestamps();

            $table->index(['project_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_ai_instructions');
    }
};
