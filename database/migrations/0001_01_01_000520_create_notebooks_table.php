<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Notebooks
        Schema::create('notebooks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            // user_id is left as a plain unsigned bigint (no FK constraint) because
            // this package cannot reference the host application's users table.
            $table->unsignedBigInteger('user_id')->nullable()->comment('Creator');
            $table->string('title');
            $table->string('slug')->nullable()->comment('Stable routing token; also the AI-sort file target identifier');
            $table->text('description')->nullable();
            $table->string('color', 7)->nullable()->comment('Hex color for visual distinction');
            $table->string('icon')->nullable()->comment('FontAwesome class');
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->boolean('is_pinned')->default(false);
            $table->boolean('allow_ai_sort')->default(false)->comment('Notebook is a valid AI sort/file target');
            $table->boolean('is_catch_all')->default(false)->comment('Fits-nowhere fallback target for the AI sorter; at most one per project');
            $table->integer('sort_order')->default(0);
            $table->json('metadata')->nullable()->comment('auto_categorize, retention_policy, default_visibility');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->index(['project_id', 'status']);
            $table->unique(['project_id', 'slug']);
        });

        // Notebook <-> Notable (polymorphic: project/blueprint/entry)
        Schema::create('notebook_notables', function (Blueprint $table) {
            $table->unsignedBigInteger('notebook_id');
            $table->string('notable_type');
            $table->unsignedBigInteger('notable_id')->nullable();
            $table->timestamps();

            $table->foreign('notebook_id')->references('id')->on('notebooks')->onDelete('cascade');
            $table->unique(['notebook_id', 'notable_type', 'notable_id']);
        });

        // Notebook <-> Note (many-to-many)
        Schema::create('notebook_notes', function (Blueprint $table) {
            $table->unsignedBigInteger('notebook_id');
            $table->unsignedBigInteger('note_id');
            $table->integer('sort_order')->default(0);
            $table->timestamp('added_at')->useCurrent();

            $table->foreign('notebook_id')->references('id')->on('notebooks')->onDelete('cascade');
            $table->foreign('note_id')->references('id')->on('notes')->onDelete('cascade');
            $table->unique(['notebook_id', 'note_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notebook_notes');
        Schema::dropIfExists('notebook_notables');
        Schema::dropIfExists('notebooks');
    }
};
