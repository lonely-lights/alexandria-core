<?php

declare(strict_types=1);

namespace Alexandria\Core;

use Alexandria\Core\Actions\Fortify\CreateNewUser;
use Alexandria\Core\Actions\Fortify\ResetUserPassword;
use Alexandria\Core\Actions\Fortify\UpdateUserPassword;
use Alexandria\Core\Actions\Fortify\UpdateUserProfileInformation;
use Alexandria\Core\Support\ConfigDeepMerge;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class AlexandriaServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigDeepFrom(__DIR__.'/../config/alexandria.php');

        $this->forceFortifyDefaults();
    }

    /**
     * Recursive variant of Laravel's mergeConfigFrom.
     *
     * Laravel's built-in is shallow — only top-level keys merge, so a
     * consumer who publishes config/alexandria.php to tweak one entry
     * under `models.*` would lose every other key under it. Deep merge
     * lets consumers publish only the leaves they want to override and
     * core's defaults fill in the rest. Consumer wins on conflict; lists
     * replace wholesale. See ConfigDeepMerge for the merge contract.
     */
    private function mergeConfigDeepFrom(string $path): void
    {
        $packageDefaults = require $path;
        $consumerOverrides = $this->app['config']->get('alexandria', []);

        $this->app['config']->set(
            'alexandria',
            ConfigDeepMerge::merge($packageDefaults, $consumerOverrides),
        );
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        $this->loadTranslationsFrom(__DIR__.'/../lang', 'alexandria');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/alexandria.php' => config_path('alexandria.php'),
            ], 'alexandria-config');

            $this->publishes([
                __DIR__.'/../lang' => $this->app->langPath('vendor/alexandria'),
            ], 'alexandria-translations');
        }

        $this->bindFortifyActions();
        $this->bindFortifyViews();

        $this->loadRoutesFrom(__DIR__.'/../routes/auth.php');
    }

    /**
     * Override Fortify's defaults with core's preferred values.
     *
     * Uses config()->set instead of mergeConfigFrom: Fortify auto-discovers
     * before us and primes config/fortify.* via its own mergeConfigFrom.
     * Laravel's mergeConfigFrom is "merge our defaults INTO current, current
     * wins" — so a later provider can't override a prior provider's values
     * that way. config()->set lands regardless of order.
     *
     * Must run in register(), not boot(): Fortify's boot() registers routes
     * by reading config('fortify.features') and config('fortify.home').
     * Our register() runs after Fortify's register() (alphabetical service-
     * provider order), so the override lands before any boot() phase.
     *
     * Consumers wanting a different post-login home publish their own config
     * or override fortify.home in their own provider.
     */
    private function forceFortifyDefaults(): void
    {
        config()->set('fortify.home', '/dashboard');
        config()->set('fortify.features', [
            Features::registration(),
            Features::resetPasswords(),
            Features::emailVerification(),
            Features::updatePasswords(),
            Features::updateProfileInformation(),
            Features::twoFactorAuthentication([
                'confirm' => true,
                'confirmPassword' => true,
            ]),
        ]);
    }

    /**
     * Wire Fortify's action callbacks + the login rate limiter.
     */
    private function bindFortifyActions(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(
                Str::lower($request->input(Fortify::username())).'|'.$request->ip()
            );

            return Limit::perMinute(5)->by($throttleKey);
        });
    }

    /**
     * Wire Fortify view callbacks so each auth page renders its Inertia
     * component at Fortify's canonical URLs. Submit handlers route to the
     * Action classes bound in bindFortifyActions().
     */
    private function bindFortifyViews(): void
    {
        $copy = $this->authCopy();
        $legalUrls = $this->legalUrls();

        Fortify::loginView(fn () => Inertia::render('Auth/Login', [
            'copy' => $copy,
            'registerUrl' => Route::has('register') ? route('register') : null,
            'forgotPasswordUrl' => Route::has('password.request') ? route('password.request') : null,
            'canResetPassword' => Route::has('password.request'),
            ...$legalUrls,
            'status' => session('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('Auth/Register', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            ...$legalUrls,
        ]));

        Fortify::requestPasswordResetLinkView(fn () => Inertia::render('Auth/ForgotPassword', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            ...$legalUrls,
            'status' => session('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('Auth/ResetPassword', [
            'copy' => $copy,
            'token' => $request->route('token'),
            'email' => $request->email,
            'loginUrl' => route('login'),
            ...$legalUrls,
        ]));

        Fortify::verifyEmailView(fn () => Inertia::render('Auth/VerifyEmail', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            ...$legalUrls,
            'status' => session('status'),
        ]));

        Fortify::confirmPasswordView(fn () => Inertia::render('Auth/ConfirmPassword', [
            'copy' => $copy,
            ...$legalUrls,
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('Auth/TwoFactorChallenge', [
            'copy' => $copy,
            ...$legalUrls,
        ]));
    }

    /**
     * Resolve termsUrl + privacyUrl props passed to every Fortify view
     * callback. The route names live in the consumer app (per ADR-008
     * — legal pages can be brand-specific) so the Route::has() guard
     * keeps resolution runtime-safe when consumers haven't registered them.
     *
     * @return array{termsUrl: string, privacyUrl: string}
     */
    private function legalUrls(): array
    {
        return [
            'termsUrl' => $this->routeOrHashFallback('legal.terms'),
            'privacyUrl' => $this->routeOrHashFallback('legal.privacy'),
        ];
    }

    /**
     * Resolve a named route to its URL, falling back to '#' when the
     * consumer hasn't registered it. The route-name literal lives at the
     * call site so IDE inspections can flag unknown routes — passing
     * variables to route() defeats those inspections.
     */
    private function routeOrHashFallback(string $name): string
    {
        return Route::has($name) ? route($name) : '#';
    }

    /**
     * Auth copy resolved from the alexandria translation namespace
     * (lang/en/auth.php in core, or lang/vendor/alexandria/en/auth.php
     * if the consumer published + customised). Returns the flattened
     * dot-keyed array the React auth pages consume — e.g.
     * `copy['login.welcome_back']` resolves to the `login.welcome_back`
     * leaf.
     *
     * Consumers override individual strings by publishing the
     * `alexandria-translations` tag and editing the published files;
     * the package-namespaced lookup falls back to core's defaults for
     * any key the consumer hasn't customised.
     *
     * @return array<string, string>
     */
    private function authCopy(): array
    {
        return $this->flattenTranslations(Lang::get('alexandria::auth'));
    }

    /**
     * Recursively flatten a nested translation array into dot-keyed
     * leaves. lang/en/auth.php groups by section (login.*, registration.*,
     * etc.) for editor ergonomics; the React side expects a flat
     * `copy[key]` lookup.
     *
     * @param  array<string, mixed>  $translations
     * @return array<string, string>
     */
    private function flattenTranslations(array $translations, string $prefix = ''): array
    {
        $flat = [];

        foreach ($translations as $key => $value) {
            $compositeKey = $prefix === '' ? $key : "$prefix.$key";

            if (is_array($value)) {
                $flat = [...$flat, ...$this->flattenTranslations($value, $compositeKey)];

                continue;
            }

            $flat[$compositeKey] = $value;
        }

        return $flat;
    }
}
