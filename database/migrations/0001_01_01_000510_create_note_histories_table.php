<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('note_histories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('note_id')->constrained()->cascadeOnDelete();
            // user_id is left as a plain unsigned bigint (no FK constraint) because
            // this package cannot reference the host application's users table.
            $table->unsignedBigInteger('user_id')->nullable();

            $table->string('previous_title');
            $table->longText('previous_text');
            $table->dateTime('previous_note_date')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('note_histories');
    }
};
