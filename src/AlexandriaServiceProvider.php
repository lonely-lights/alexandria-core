<?php

declare(strict_types=1);

namespace Alexandria\Core;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

class AlexandriaServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/alexandria.php', 'alexandria');
        $this->mergeConfigFrom(__DIR__.'/../config/fortify.php', 'fortify');
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/alexandria.php' => config_path('alexandria.php'),
            ], 'alexandria-config');
        }

        $this->bindFortifyViews();
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
            'termsUrl' => '#',
            'privacyUrl' => '#',
            'status' => session('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('Auth/Register', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            'termsUrl' => '#',
            'privacyUrl' => '#',
        ]));

        Fortify::requestPasswordResetLinkView(fn () => Inertia::render('Auth/ForgotPassword', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            'termsUrl' => '#',
            'privacyUrl' => '#',
            'status' => session('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('Auth/ResetPassword', [
            'copy' => $copy,
            'token' => $request->route('token'),
            'email' => $request->email,
            'loginUrl' => route('login'),
            'termsUrl' => '#',
            'privacyUrl' => '#',
        ]));

        Fortify::verifyEmailView(fn () => Inertia::render('Auth/VerifyEmail', [
            'copy' => $copy,
            'loginUrl' => route('login'),
            'termsUrl' => '#',
            'privacyUrl' => '#',
            'status' => session('status'),
        ]));

        Fortify::confirmPasswordView(fn () => Inertia::render('Auth/ConfirmPassword', [
            'copy' => $copy,
            'termsUrl' => '#',
            'privacyUrl' => '#',
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
            'login' => 'Sign in',
            'forgot_password' => 'Forgot password?',
            'have_account' => "Don't have an account?",
            'enlist' => 'Sign up',
            'registration.intro' => 'Create your account.',
            'name' => 'Name',
            'signup' => 'Create account',
            'already_registered' => 'Already registered?',
            'agree_terms_privacy' => 'By signing up, you agree to our Terms of Service and Privacy Policy.',
            'forgot_password.intro' => 'Enter your email and we\'ll send you a reset link.',
            'email_reset_link' => 'Email reset link',
            'reset_password' => 'Reset password',
            'verification.intro' => 'A verification link has been sent. Click the link in the email to confirm your address.',
            'verification_sent' => 'A new verification link has been sent.',
            'resend_verification' => 'Resend verification email',
            'confirm_password.intro' => 'Please confirm your password to continue.',
            'confirm_password' => 'Confirm password',
            'terms_of_service' => 'Terms of Service',
            'privacy_policy' => 'Privacy Policy',
        ];
    }
}
