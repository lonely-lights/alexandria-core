<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blueprint_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blueprint_id')->constrained()->cascadeOnDelete();
            // FK relaxed to bare bigint -- the users table is owned by the host app, see ADR-006.
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('name', 100)
                ->default('Default');
            $table->string('type', 30)
                ->default('table')
                ->comment('table, timeline, gallery, kanban, map');
            $table->json('config')
                ->comment('Type-specific configuration (columns, sort, etc.)');
            $table->boolean('is_default')
                ->default(false)
                ->comment('Whether this is the project default for this blueprint');
            $table->unsignedSmallInteger('sort_order')
                ->default(0);
            $table->timestamps();

            $table->index(['blueprint_id', 'user_id']);
            $table->index(['blueprint_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blueprint_views');
    }
};
