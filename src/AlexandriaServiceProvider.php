<?php

declare(strict_types=1);

namespace Alexandria\Core;

use Illuminate\Support\ServiceProvider;

class AlexandriaServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/alexandria.php', 'alexandria');
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/alexandria.php' => config_path('alexandria.php'),
            ], 'alexandria-config');
        }
    }
}
