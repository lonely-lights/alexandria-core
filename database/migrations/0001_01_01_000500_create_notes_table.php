<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(config('notable-ai.notesTable', 'notes'), function (Blueprint $table) {
            $table->id();
            // user_id is left as a plain unsigned bigint (no FK constraint) because
            // this package cannot reference the host application's users table.
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
            $table->string('title');
            $table->dateTime('note_date')->default(DB::raw('CURRENT_DATE'));
            $table->longText('text');
            $table->enum('status', ['active', 'archived', 'submitted', 'integrated'])->default('active');
            $table->string('type')->nullable();
            $table->integer('order_column')->nullable();
            $table->string('visibility')->default('private');
            $table->boolean('is_pinned')->default(false);
            $table->string('color', 20)->nullable()->comment('Note color (from Google Keep or user selection)');
            $table->json('ai_notes')->nullable()->comment('AI processing metadata for relationship building');

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('type');
        });

        Schema::create(config('notable-ai.notable.tableName', 'notables'), function (Blueprint $table) {
            $table->foreignId('note_id')->constrained()->cascadeOnDelete();
            $table->string('notable_type');
            $table->unsignedBigInteger('notable_id')->nullable();
            $table->enum('processing_status', ['pending', 'processing', 'completed', 'failed'])
                ->default('pending')
                ->comment('Tracks AI processing status for blueprint-attached notes');
            $table->timestamp('processed_at')->nullable();
            $table->index(['notable_id', 'notable_type']);
            $table->index('processing_status');
            $table->unique(['note_id', 'notable_id', 'notable_type']);
        });

        Schema::create('note_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_id')->constrained()->cascadeOnDelete();
            $table->text('url');
            $table->string('title', 500)->nullable();
            $table->text('description')->nullable();
            $table->text('image_url')->nullable();
            $table->string('favicon_url', 500)->nullable();
            $table->string('site_name')->nullable();
            $table->enum('status', ['pending', 'fetched', 'failed'])->default('pending');
            $table->timestamps();

            $table->index('note_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('note_links');
        Schema::dropIfExists(config('notable-ai.notable.tableName', 'notables'));
        Schema::dropIfExists(config('notable-ai.notesTable', 'notes'));
    }
};
