<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Stage 7a — Track which packages have registered permissions through
 * `AppPermissionRegistry`.
 *
 * One row per package; the slug is the primary key and matches
 * `permissions.package_slug`. The admin grid (Stage 7c) reads this to
 * render one column-group per registered package, with the package's
 * human-readable name + last-seen timestamp.
 *
 * `version` is optional — populated from composer's installed-version
 * lookup when the registering package can resolve its own version,
 * blank when it can't.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registered_packages', function (Blueprint $table) {
            $table->string('slug')->primary();
            $table->string('name');
            $table->string('version')->nullable();
            $table->timestamp('last_registered_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registered_packages');
    }
};
