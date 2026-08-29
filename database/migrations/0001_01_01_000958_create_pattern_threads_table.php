<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pattern_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pattern_card_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('stance')->nullable();
            $table->string('scope_type');
            $table->unsignedBigInteger('scope_id');
            $table->foreignId('entry_id')->nullable()->constrained('entries')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'pattern_card_id']);
            $table->index(['scope_type', 'scope_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pattern_threads');
    }
};
