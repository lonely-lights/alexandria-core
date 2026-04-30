<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_ai_prompts', function (Blueprint $table) {
            $table->id();
            // ADR-006: bare bigint — no FK constraint; host app owns the users table.
            $table->unsignedBigInteger('user_id');
            $table->string('label', 100);
            $table->text('prompt');
            $table->string('action', 30)->default('custom');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_ai_prompts');
    }
};
