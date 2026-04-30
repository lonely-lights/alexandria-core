<?php

declare(strict_types=1);

namespace Alexandria\Core\Tests;

use Alexandria\Core\AlexandriaServiceProvider;
use Orchestra\Testbench\Concerns\WithWorkbench;
use Orchestra\Testbench\TestCase as BaseTestCase;
use Spatie\Activitylog\ActivitylogServiceProvider;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\PermissionServiceProvider;

abstract class TestCase extends BaseTestCase
{
    use WithWorkbench;

    /**
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            ActivitylogServiceProvider::class,
            PermissionServiceProvider::class,
            AlexandriaServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'testing');
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);

        $app['config']->set('permission.table_names', [
            'roles' => 'roles',
            'permissions' => 'permissions',
            'model_has_permissions' => 'model_has_permissions',
            'model_has_roles' => 'model_has_roles',
            'role_has_permissions' => 'role_has_permissions',
        ]);
        $app['config']->set('permission.column_names', [
            'role_pivot_key' => null,
            'permission_pivot_key' => null,
            'model_morph_key' => 'model_id',
            'team_foreign_key' => null,
        ]);
        $app['config']->set('permission.teams', false);
        $app['config']->set('permission.cache', [
            'expiration_time' => \DateInterval::createFromDateString('24 hours'),
            'key' => 'spatie.permission.cache',
            'store' => 'default',
        ]);

        $app['config']->set('activitylog.enabled', true);
        $app['config']->set('activitylog.delete_records_older_than_days', 365);
        $app['config']->set('activitylog.default_log_name', 'default');
        $app['config']->set('activitylog.default_auth_driver', null);
        $app['config']->set('activitylog.subject_returns_soft_deleted_models', false);
        $app['config']->set('activitylog.activity_model', Activity::class);
        $app['config']->set('activitylog.table_name', 'activity_log');
        $app['config']->set('activitylog.database_connection', null);
    }

    protected function defineDatabaseMigrations(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }
}
