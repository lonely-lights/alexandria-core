<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_section_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_section_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_revision_id')->nullable()->constrained('work_revisions')->cascadeOnDelete();
            $table->jsonb('payload');
            $table->unsignedInteger('word_count')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['work_section_id', 'created_at']);
            $table->index('work_revision_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_section_versions');
    }
};
