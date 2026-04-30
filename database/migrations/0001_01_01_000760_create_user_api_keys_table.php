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
        Schema::create('user_api_keys', function (Blueprint $table) {
            $table->id();
            // No FK constraint per ADR-006: the users table belongs to the host app.
            $table->unsignedBigInteger('user_id');
            $table->foreignId('ai_provider_id')->constrained('ai_providers')->onDelete('cascade');
            $table->string('label'); // e.g., "Personal - OpenAI - Nov 2025"
            $table->longText('api_key'); // Encrypted at application level
            $table->string('api_key_last_four', 4);
            $table->date('expires_at')->nullable();
            $table->boolean('is_active')->default(false); // Only one active per provider per user
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            // Index for quick lookups
            $table->index(['user_id', 'ai_provider_id', 'is_active']);
        });

        // Add reference to active key in user_ai_settings (two-step per cross-table FK)
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->foreignId('active_api_key_id')->nullable()->after('ai_provider_id')
                ->constrained('user_api_keys')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('active_api_key_id');
        });

        Schema::dropIfExists('user_api_keys');
    }
};
