<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('works', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('title');
            $table->string('slug');
            $table->string('type')->default('novel');
            $table->string('format')->default('prose');
            $table->text('logline')->nullable();
            $table->string('genre')->nullable();
            $table->string('status')->default('concept');
            $table->string('target_audience')->nullable();
            $table->string('language')->nullable();
            $table->string('setting_period')->nullable();
            $table->json('length_plan')->nullable();
            $table->unsignedInteger('target_words')->nullable();
            $table->unsignedInteger('word_count')->default(0);
            $table->unsignedInteger('line_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['project_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('works');
    }
};
