<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scope_section_id')->nullable()->constrained('work_sections')->cascadeOnDelete();
            $table->unsignedInteger('number');
            $table->string('label')->nullable();
            $table->string('cause')->default('manual');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->index(['work_id', 'scope_section_id', 'number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_revisions');
    }
};
