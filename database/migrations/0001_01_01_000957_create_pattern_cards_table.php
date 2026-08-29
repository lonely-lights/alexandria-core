<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pattern_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('kind');
            $table->text('definition');
            $table->text('craft_guidance')->nullable();
            $table->text('pitfalls')->nullable();
            $table->text('shape')->nullable();
            $table->boolean('is_seeded')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['project_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pattern_cards');
    }
};
