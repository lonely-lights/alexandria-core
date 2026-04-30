<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('field_values', function (Blueprint $table) {

            // ID
            $table->id();

            // Cascade delete: field values removed when entry or field definition is deleted
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('blueprint_field_id')->constrained()->cascadeOnDelete();

            // The actual value stored as text (type coercion handled in application layer)
            $table->longText('value')
                ->nullable()
                ->comment('Stored as text; type determined by blueprint_field definition');

            $table->timestamps();

            // Index for query performance (supports multiple values per field)
            // Note: NO unique constraint - entries can have multiple values for the same field
            // (e.g., multiple titles, multiple occupations)
            $table->index(['entry_id', 'blueprint_field_id']);
            $table->index('blueprint_field_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('field_values');
    }
};
