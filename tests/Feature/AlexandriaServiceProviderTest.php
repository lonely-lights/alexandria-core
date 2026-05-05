<?php

declare(strict_types=1);

use Alexandria\Core\AlexandriaServiceProvider;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AlexandriaServiceProvider boot contract
|--------------------------------------------------------------------------
|
| The service provider is the package's public API entry point. Consumer
| apps install Alexandria Core, the provider auto-registers, and from
| that point every contract documented in CONFIGURATION.md and
| docs/EXTENDING.md must hold. These tests pin the boot-time
| guarantees so v0.1.0 doesn't ship with an unwired surface.
|
*/

it('is registered with the application container', function () {
    $providers = app()->getLoadedProviders();
    expect($providers)->toHaveKey(AlexandriaServiceProvider::class);
});

it('merges the alexandria config from the package into the host app', function () {
    expect(config('alexandria'))->toBeArray()
        ->and(config('alexandria.models'))->toBeArray()
        ->and(config('alexandria.media'))->toBeArray()
        ->and(config('alexandria.ai'))->toBeArray();
});

it('registers the alexandria-config publish tag', function () {
    $paths = AlexandriaServiceProvider::pathsToPublish(
        AlexandriaServiceProvider::class,
        'alexandria-config',
    );

    expect($paths)->toBeArray()->not->toBeEmpty();
    // Both source and destination paths are absolute and live in
    // platform-dependent directories under Testbench's bootstrap. We
    // assert on the basename rather than the full path.
    $source = array_key_first($paths);
    $destination = $paths[$source];
    expect(basename($source))->toBe('alexandria.php')
        ->and(basename($destination))->toBe('alexandria.php');
});

it('loads the package migrations into the host migrator', function () {
    $migrator = app('migrator');
    $packagePath = realpath(__DIR__.'/../../database/migrations');
    expect($packagePath)->not->toBeFalse();

    $registered = collect($migrator->paths())
        ->map(fn (string $p) => realpath($p) ?: $p)
        ->all();

    expect($registered)->toContain($packagePath);
});

it('registers the auth-availability routes', function () {
    expect(Route::has('register.check-username'))->toBeTrue()
        ->and(Route::has('register.check-email'))->toBeTrue();
});

it('overrides Fortify config keys to alexandria defaults', function () {
    // AlexandriaServiceProvider::register() hard-sets fortify.home and
    // fortify.features before Fortify's own boot() reads them. If
    // either drifts, the auth UX breaks silently.
    expect(config('fortify.home'))->toBe('/dashboard')
        ->and(config('fortify.features'))->toBeArray()->not->toBeEmpty();
});

it('enables email verification in fortify features', function () {
    $features = config('fortify.features');
    // Each feature is registered as a string keyed by the feature name —
    // the ::emailVerification() helper returns 'email-verification'.
    $hasEmailVerification = collect($features)->contains(
        fn ($entry) => is_string($entry) ? $entry === 'email-verification' : false,
    ) || array_key_exists('email-verification', $features);

    expect($hasEmailVerification)->toBeTrue();
});
