<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pattern_marks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pattern_thread_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->foreignId('work_section_id')->constrained()->cascadeOnDelete();
            $table->text('anchor_text')->nullable();
            $table->unsignedInteger('anchor_offset_hint')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['pattern_thread_id']);
            $table->index(['work_section_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pattern_marks');
    }
};
