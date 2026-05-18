<?php

declare(strict_types=1);

return [
    'login' => [
        'welcome_back' => 'Welcome back',
        'intro' => 'Sign in to continue.',
        'or' => 'or',
        'agree_terms' => 'By signing in, you agree to our',
        'and' => 'and',
    ],

    'registration' => [
        'intro' => 'Create your account and start building. Every idea finds a home.',
    ],

    'forgot_password' => [
        'intro' => 'Enter your email and we\'ll send you a reset link.',
    ],

    'verification' => [
        'intro' => 'A verification link has been sent. Click the link in the email to confirm your address.',
    ],

    'confirm_password' => [
        'intro' => 'Please confirm your password to continue.',
    ],

    'two_factor' => [
        'challenge' => [
            'title' => 'Two-factor authentication',
            'intro' => 'Enter the authentication code from your authenticator app.',
            'code_label' => 'Authentication code',
            'recovery_label' => 'Recovery code',
            'use_recovery' => 'Use a recovery code',
            'use_authentication' => 'Use an authentication code',
            'submit' => 'Continue',
        ],
    ],

    'fields' => [
        'email' => 'Email',
        'password' => 'Password',
        'name' => 'Username',
        'remember_me' => 'Remember me',
        // Stage 8c.E.4 — shown on /register when open_registration is off.
        'invite_token' => 'Invite code',
    ],

    // Stage 8c.E.4 — error messages thrown by InviteTokenService::consume()
    // and wrapped into ValidationException by CreateNewUser.
    'invite_token' => [
        'unknown' => 'That invite code isn\'t recognized. Double-check the code with whoever gave it to you.',
        'expired' => 'That invite code has expired.',
        'exhausted' => 'That invite code has already been used up.',
    ],

    'actions' => [
        'login' => 'Log in',
        'forgot_password' => 'Forgot password?',
        'have_account' => "Don't have an account?",
        'have_invite_code' => 'Have an invite code?',
        'enlist' => 'Enlist',
        'signup' => 'Enlist',
        'already_registered' => 'Already have an account?',
        'email_reset_link' => 'Email reset link',
        'reset_password' => 'Reset password',
        'verification_sent' => 'A new verification link has been sent.',
        'resend_verification' => 'Resend verification email',
        'confirm_password' => 'Confirm Password',
        'agree_terms_privacy' => 'I agree to the :terms_of_service and :privacy_policy.',
    ],

    'legal' => [
        'terms_of_service' => 'Terms of Service',
        'privacy_policy' => 'Privacy Policy',
    ],

    'divider' => [
        // Between the password-reset / forgot-password form and the "back to
        // login" link. Surfaced via copy['divider.remembered'] on those pages.
        'remembered' => 'Remembered it?',
    ],
];
