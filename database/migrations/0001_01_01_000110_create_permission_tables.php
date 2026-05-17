<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $teams = config('permission.teams');
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $pivotRole = $columnNames['role_pivot_key'] ?? 'role_id';
        $pivotPermission = $columnNames['permission_pivot_key'] ?? 'permission_id';

        throw_if(empty($tableNames), new Exception('Error: config/permission.php not loaded. Run [php artisan config:clear] and try again.'));
        throw_if($teams && empty($columnNames['team_foreign_key'] ?? null), new Exception('Error: team_foreign_key on config/permission.php not loaded. Run [php artisan config:clear] and try again.'));

        Schema::create($tableNames['permissions'], static function (Blueprint $table) {
            // $table->engine('InnoDB');
            $table->bigIncrements('id'); // permission id
            $table->string('name');       // For MyISAM use string('name', 225); // (or 166 for InnoDB with Redundant/Compact row format)
            $table->string('guard_name'); // For MyISAM use string('guard_name', 25);
            $table->unsignedBigInteger('category_id')->nullable();
            $table->string('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['name', 'guard_name']);
            $table->foreign('category_id')->references('id')->on('role_permission_categories')->onDelete('set null');
            $table->index('sort_order');
        });

        Schema::create($tableNames['roles'], static function (Blueprint $table) use ($teams, $columnNames) {
            // $table->engine('InnoDB');
            $table->bigIncrements('id'); // role id
            if ($teams || config('permission.testing')) { // permission.testing is a fix for sqlite testing
                $table->unsignedBigInteger($columnNames['team_foreign_key'])->nullable();
                $table->index($columnNames['team_foreign_key'], 'roles_team_foreign_key_index');
            }
            $table->string('name');       // For MyISAM use string('name', 225); // (or 166 for InnoDB with Redundant/Compact row format)
            $table->string('guard_name'); // For MyISAM use string('guard_name', 25);
            $table->unsignedBigInteger('category_id')->nullable();
            $table->timestamps();
            if ($teams || config('permission.testing')) {
                $table->unique([$columnNames['team_foreign_key'], 'name', 'guard_name']);
            } else {
                $table->unique(['name', 'guard_name']);
            }
            $table->foreign('category_id')->references('id')->on('role_permission_categories')->onDelete('set null');
        });

        // Note on the surrogate `id` PK + UNIQUE NULLS NOT DISTINCT
        // pattern below — when teams=true, the team_foreign_key
        // (`project_id`) must allow NULL for app-level role assignments
        // (Spatie's "global" scope). PostgreSQL enforces NOT NULL on
        // every PK column regardless of `->nullable()`, so the original
        // Spatie composite PK (team_foreign_key first) is incompatible.
        // We use a synthetic `id` PK + a composite UNIQUE constraint
        // with NULLS NOT DISTINCT (PG 15+) so two rows with the same
        // (NULL, role, user, model_type) tuple are still rejected.
        // SQLite fallback uses a regular composite unique — less strict
        // but tests don't exercise the duplicate-NULL detection.

        Schema::create($tableNames['model_has_permissions'], static function (Blueprint $table) use ($tableNames, $columnNames, $pivotPermission, $teams) {
            if ($teams) {
                $table->bigIncrements('id');
            }
            $table->unsignedBigInteger($pivotPermission);

            $table->string('model_type');
            $table->unsignedBigInteger($columnNames['model_morph_key']);
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_model_id_model_type_index');

            $table->foreign($pivotPermission)
                ->references('id') // permission id
                ->on($tableNames['permissions'])
                ->onDelete('cascade');
            if ($teams) {
                $table->unsignedBigInteger($columnNames['team_foreign_key'])->nullable(); // Nullable for global permissions
                $table->index($columnNames['team_foreign_key'], 'model_has_permissions_team_foreign_key_index');
            } else {
                $table->primary(
                    [$pivotPermission, $columnNames['model_morph_key'], 'model_type'],
                    'model_has_permissions_permission_model_type_primary'
                );
            }
        });

        Schema::create($tableNames['model_has_roles'], static function (Blueprint $table) use ($tableNames, $columnNames, $pivotRole, $teams) {
            if ($teams) {
                $table->bigIncrements('id');
            }
            $table->unsignedBigInteger($pivotRole);

            $table->string('model_type');
            $table->unsignedBigInteger($columnNames['model_morph_key']);
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_roles_model_id_model_type_index');

            $table->foreign($pivotRole)
                ->references('id') // role id
                ->on($tableNames['roles'])
                ->onDelete('cascade');
            if ($teams) {
                $table->unsignedBigInteger($columnNames['team_foreign_key'])->nullable(); // Nullable for global roles
                $table->index($columnNames['team_foreign_key'], 'model_has_roles_team_foreign_key_index');
            } else {
                $table->primary(
                    [$pivotRole, $columnNames['model_morph_key'], 'model_type'],
                    'model_has_roles_role_model_type_primary'
                );
            }
        });

        // Driver-specific composite uniqueness for the teams=true case.
        if ($teams) {
            $driver = DB::connection()->getDriverName();
            $teamCol = $columnNames['team_foreign_key'];
            $morphCol = $columnNames['model_morph_key'];

            if ($driver === 'pgsql') {
                // NULLS NOT DISTINCT (PG 15+) treats two NULL team_ids
                // as equal so duplicate app-level role assignments still
                // collide. Required because PostgreSQL would otherwise
                // allow infinitely many (NULL, role, user) rows.
                DB::statement("ALTER TABLE {$tableNames['model_has_permissions']} ADD CONSTRAINT model_has_permissions_team_unique UNIQUE NULLS NOT DISTINCT ({$teamCol}, {$pivotPermission}, {$morphCol}, model_type)");
                DB::statement("ALTER TABLE {$tableNames['model_has_roles']} ADD CONSTRAINT model_has_roles_team_unique UNIQUE NULLS NOT DISTINCT ({$teamCol}, {$pivotRole}, {$morphCol}, model_type)");
            } else {
                // SQLite / MySQL fallback. SQLite treats NULL as
                // distinct in unique constraints so duplicate global
                // assignments slip through at the DB layer — accept
                // the test-only divergence since trait-level checks
                // catch the same case in app code.
                Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($teamCol, $pivotPermission, $morphCol) {
                    $table->unique([$teamCol, $pivotPermission, $morphCol, 'model_type'], 'model_has_permissions_team_unique');
                });
                Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($teamCol, $pivotRole, $morphCol) {
                    $table->unique([$teamCol, $pivotRole, $morphCol, 'model_type'], 'model_has_roles_team_unique');
                });
            }
        }

        Schema::create($tableNames['role_has_permissions'], static function (Blueprint $table) use ($tableNames, $pivotRole, $pivotPermission) {
            $table->unsignedBigInteger($pivotPermission);
            $table->unsignedBigInteger($pivotRole);

            $table->foreign($pivotPermission)
                ->references('id') // permission id
                ->on($tableNames['permissions'])
                ->onDelete('cascade');

            $table->foreign($pivotRole)
                ->references('id') // role id
                ->on($tableNames['roles'])
                ->onDelete('cascade');

            $table->primary([$pivotPermission, $pivotRole], 'role_has_permissions_permission_id_role_id_primary');
        });

        app('cache')
            ->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableNames = config('permission.table_names');

        if (empty($tableNames)) {
            throw new Exception('Error: config/permission.php not found and defaults could not be merged. Please publish the package configuration before proceeding, or drop the tables manually.');
        }

        Schema::drop($tableNames['role_has_permissions']);
        Schema::drop($tableNames['model_has_roles']);
        Schema::drop($tableNames['model_has_permissions']);
        Schema::drop($tableNames['roles']);
        Schema::drop($tableNames['permissions']);
    }
};
