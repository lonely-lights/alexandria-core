<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_section_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_section_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('parent_id')->nullable()->constrained('work_section_comments')->nullOnDelete();
            $table->text('body');
            $table->text('anchor_text')->nullable();
            $table->unsignedInteger('anchor_offset_hint')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_section_comments');
    }
};
