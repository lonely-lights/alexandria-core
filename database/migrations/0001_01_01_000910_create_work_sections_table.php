<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('parent_id')->nullable()->index();
            $table->unsignedInteger('position')->default(0);
            $table->string('title');
            $table->string('slug');
            $table->string('label')->nullable();
            $table->longText('content')->nullable();
            $table->string('format')->nullable();
            $table->text('synopsis')->nullable();
            $table->string('status')->nullable();
            $table->string('beat_type')->nullable();
            $table->text('goal')->nullable();
            $table->text('conflict')->nullable();
            $table->text('stakes')->nullable();
            $table->text('mood')->nullable();
            $table->string('tone')->nullable();
            $table->string('timeline_position')->nullable();
            $table->string('int_ext')->nullable();
            $table->foreignId('pov_entry_id')->nullable()->constrained('entries')->nullOnDelete();
            $table->foreignId('setting_entry_id')->nullable()->constrained('entries')->nullOnDelete();
            $table->unsignedInteger('word_count')->default(0);
            $table->unsignedInteger('target_words')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['work_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_sections');
    }
};
