<?php

declare(strict_types=1);

namespace Alexandria\Core;

use Alexandria\Core\Actions\Fortify\CreateNewUser;
use Alexandria\Core\Actions\Fortify\ResetUserPassword;
use Alexandria\Core\Actions\Fortify\UpdateUserPassword;
use Alexandria\Core\Actions\Fortify\UpdateUserProfileInformation;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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
        $this->mergeConfigFrom(__DIR__.'/../config/alexandria.php', 'alexandria');

        $this->forceFortifyDefaults();
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/alexandria.php' => config_path('alexandria.php'),
            ], 'alexandria-config');
        }

        $this->bindFortifyActions();
        $this->bindFortifyViews();

        $this->loadRoutesFrom(__DIR__.'/../routes/auth.php');
    }

    /**
     * Override Fortify's defaults with core's preferred values.
     *
     * Why config()->set() instead of mergeConfigFrom: Fortify's service
     * provider auto-discovers before ours and primes config/fortify.* via
     * its own mergeConfigFrom. Laravel's mergeConfigFrom is "merge our
     * defaults INTO current config, current wins for shared keys" — so a
     * later provider can't override a prior provider's values that way.
     * config()->set() does a hard set and lands regardless of order.
     *
     * Must run in register() (not boot()): Fortify's boot() registers its
     * routes by reading config('fortify.features') and config('fortify.home')
     * — by the time our boot() runs, unwanted routes are already on the
     * router. Our register() runs after Fortify's register() (alphabetical
     * service-provider order), so the override lands before any boot()
     * phase.
     *
     * WIRE-B.4 (2FA) and WIRE-E (settings) re-enable the appropriate
     * features. Consumers who want a different post-login home publish
     * their own config or override fortify.home in their own provider.
     */
    private function forceFortifyDefaults(): void
    {
        config()->set('fortify.home', '/dashboard');
        config()->set('fortify.features', [
            Features::registration(),
            Features::resetPasswords(),
            Features::emailVerification(),
        ]);
    }

    /**
     * Wire Fortify's action callbacks + the login rate limiter.
     * UpdateUserPassword and UpdateUserProfileInformation are inert
     * until WIRE-E re-enables their features; binding now means that
     * step is a one-line feature flip.
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
     * Wire Fortify view callbacks so the 6 FE-F1 auth pages render at
     * their canonical Fortify URLs. Submit handlers use Fortify defaults
     * for B.1; WIRE-B.2 lifts custom Action classes from legacy.
     */
    private function bindFortifyViews(): void
    {
        $copy = $this->authCopy();

        Fortify::loginView(fn () => Inertia::render('Auth/Login', [
            'copy' => $copy,
            'registerUrl' => Route::has('register') ? route('register') : null,
            'forgotPasswordUrl' => Route::has('password.request') ? route('password.request') : null,
            'canResetPassword' => Route::has('password.request'),
            'termsUrl' => Route::has('legal.terms') ? route('legal.terms') : '#',
            'privacyUrl' => Route::has('legal.privacy') ? route('legal.privacy') : '#',
            'status' => session('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('Auth/Register', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            'termsUrl' => Route::has('legal.terms') ? route('legal.terms') : '#',
            'privacyUrl' => Route::has('legal.privacy') ? route('legal.privacy') : '#',
        ]));

        Fortify::requestPasswordResetLinkView(fn () => Inertia::render('Auth/ForgotPassword', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            'termsUrl' => Route::has('legal.terms') ? route('legal.terms') : '#',
            'privacyUrl' => Route::has('legal.privacy') ? route('legal.privacy') : '#',
            'status' => session('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('Auth/ResetPassword', [
            'copy' => $copy,
            'token' => $request->route('token'),
            'email' => $request->email,
            'loginUrl' => route('login'),
            'termsUrl' => Route::has('legal.terms') ? route('legal.terms') : '#',
            'privacyUrl' => Route::has('legal.privacy') ? route('legal.privacy') : '#',
        ]));

        Fortify::verifyEmailView(fn () => Inertia::render('Auth/VerifyEmail', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            'termsUrl' => Route::has('legal.terms') ? route('legal.terms') : '#',
            'privacyUrl' => Route::has('legal.privacy') ? route('legal.privacy') : '#',
            'status' => session('status'),
        ]));

        Fortify::confirmPasswordView(fn () => Inertia::render('Auth/ConfirmPassword', [
            'copy' => $copy,
            'termsUrl' => Route::has('legal.terms') ? route('legal.terms') : '#',
            'privacyUrl' => Route::has('legal.privacy') ? route('legal.privacy') : '#',
        ]));
    }

    /**
     * Inline English auth copy for B.1. Translation files come in a later
     * WIRE sub-slice (lang/en/auth.php scaffold).
     *
     * @return array<string, string>
     */
    private function authCopy(): array
    {
        return [
            'login.welcome_back' => 'Welcome back',
            'login.intro' => 'Sign in to continue.',
            'login.or' => 'or',
            'login.agree_terms' => 'By signing in, you agree to our',
            'login.and' => 'and',
            'email' => 'Email',
            'password' => 'Password',
            'remember_me' => 'Remember me',
            'login' => 'Log in',
            'forgot_password' => 'Forgot password?',
            'have_account' => "Don't have an account?",
            'enlist' => 'Enlist',
            'registration.intro' => 'Create your account and start building. Every idea finds a home.',
            'name' => 'Username',
            'signup' => 'Enlist',
            'already_registered' => 'Already have an account?',
            'agree_terms_privacy' => 'I agree to the :terms_of_service and :privacy_policy.',
            'forgot_password.intro' => 'Enter your email and we\'ll send you a reset link.',
            'email_reset_link' => 'Email reset link',
            'reset_password' => 'Reset password',
            'verification.intro' => 'A verification link has been sent. Click the link in the email to confirm your address.',
            'verification_sent' => 'A new verification link has been sent.',
            'resend_verification' => 'Resend verification email',
            'confirm_password.intro' => 'Please confirm your password to continue.',
            'confirm_password' => 'Confirm Password',
            'terms_of_service' => 'Terms of Service',
            'privacy_policy' => 'Privacy Policy',
        ];
    }
}
