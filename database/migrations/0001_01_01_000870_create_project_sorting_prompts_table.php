<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_sorting_prompts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->text('instructions')->comment('User-editable preamble instructions');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Composite covers the orchestrator's primary lookup:
            // WHERE project_id = ? AND is_default = 1 AND is_active = 1
            $table->index(['project_id', 'is_default', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_sorting_prompts');
    }
};
