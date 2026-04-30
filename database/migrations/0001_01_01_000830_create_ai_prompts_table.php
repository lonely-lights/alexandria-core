<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_prompts', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('Human-readable name for the prompt.');
            $table->string('key')->comment('Code-friendly key, e.g., notes.sort');
            $table->unsignedInteger('version')->default(1);
            $table->string('template_path')->comment('Path to the template file within resources/prompts/');
            $table->enum('status', ['active', 'inactive', 'archived'])->default('inactive');
            $table->text('notes')->nullable()->comment('Internal notes about the prompt for developers/admins.');
            $table->timestamps();

            $table->unique(['key', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_prompts');
    }
};
