<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prompt_template_versions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('prompt_template_id')
                ->constrained('prompt_templates')
                ->cascadeOnDelete();

            $table->unsignedInteger('version');
            $table->longText('template')->comment('The template content at this version');

            // Audit trail
            // Bare unsignedBigInteger — no FK constraint to users table per ADR-006 (host-app owns the users table).
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->text('change_reason')->nullable();

            $table->timestamp('created_at');

            // Unique version per template
            $table->unique(['prompt_template_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prompt_template_versions');
    }
};
