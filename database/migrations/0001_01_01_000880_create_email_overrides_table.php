<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * email_overrides — DB-backed lang-string overrides for branded
 * Mailables. Admins edit subject + body copy via the admin email
 * panel; the values land here. BrandedTextResolver checks this
 * table first before falling back to the file lang.
 *
 * Locale included from day one (defaults 'en') so the Prosetta-
 * driven multilingual roadmap doesn't require a data migration
 * later.
 *
 * No FK on updated_by per ADR-006 — users live in the host app.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_overrides', function (Blueprint $table) {
            $table->id();
            $table->string('mail_slug')->comment('Registry slug, e.g. verify, reset, store-receipt');
            $table->string('lang_key')->comment('Lang key within the mail\'s langGroup, e.g. subject, intro, action');
            $table->string('locale', 10)->default('en');
            $table->text('content');
            $table->unsignedBigInteger('updated_by')->nullable()->comment('users.id (no FK per ADR-006)');
            $table->timestamps();

            $table->unique(['mail_slug', 'lang_key', 'locale']);
            $table->index(['mail_slug', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_overrides');
    }
};
