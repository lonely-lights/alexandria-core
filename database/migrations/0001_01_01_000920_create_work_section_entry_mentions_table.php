<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_section_entry_mentions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_section_id')->constrained()->cascadeOnDelete();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->string('source');
            $table->unsignedInteger('mention_count')->default(1);
            $table->timestamps();
            $table->unique(['work_section_id', 'entry_id', 'source'], 'work_section_entry_mention_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_section_entry_mentions');
    }
};
