<?php

declare(strict_types=1);

/*
 * Security-section UI strings — the Settings › Security tab where users
 * enable / confirm / disable two-factor authentication and manage
 * recovery codes. Mirrors profile.php / privacy.php / settings.php in
 * shape.
 *
 * Surfaced React-side via the `t.security` shared prop and accessed
 * through `useT()`: `t('security.two_factor.enable_button')`,
 * `t('security.two_factor.recovery_codes_heading')`, etc.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/security.php.
 */
return [
    // ── Section header ──────────────────────────────────────────────
    'header_title' => 'Security',
    'header_subtitle' => 'Two-factor authentication and account safety',
    'header_label' => 'Security',

    // ── Two-factor authentication panel ─────────────────────────────
    'two_factor.heading' => 'Two-factor authentication',

    // Disabled state
    'two_factor.disabled_summary' => 'Two-factor authentication is not enabled.',
    'two_factor.disabled_explanation' => 'When enabled, you will be required to enter a code from your authenticator app each time you sign in.',
    'two_factor.enable_button' => 'Enable two-factor authentication',

    // Setup state (secret created, awaiting confirmation)
    'two_factor.setup_heading' => 'Finish setup',
    'two_factor.setup_explanation' => 'Scan the QR code with your authenticator app, then enter the 6-digit code it generates to confirm enrollment.',
    'two_factor.scan_qr_label' => 'Scan with your authenticator',
    'two_factor.manual_entry_label' => "Can't scan? Enter this key manually:",
    'two_factor.confirmation_code_label' => 'Confirmation code',
    'two_factor.confirmation_code_placeholder' => '000000',
    'two_factor.confirm_button' => 'Confirm and enable',
    'two_factor.cancel_setup_button' => 'Cancel',

    // Enabled state
    'two_factor.enabled_summary' => 'Two-factor authentication is enabled.',
    'two_factor.enabled_explanation' => 'You will be asked for a code from your authenticator app each time you sign in.',
    'two_factor.recovery_codes_heading' => 'Recovery codes',
    'two_factor.recovery_codes_explanation' => 'Store these codes in a password manager or another safe place. Each code lets you sign in once if you lose access to your authenticator app.',
    'two_factor.regenerate_codes_button' => 'Regenerate recovery codes',
    'two_factor.disable_button' => 'Disable two-factor authentication',

    // Toasts
    'toast.enabled' => 'Two-factor authentication enabled',
    'toast.confirmed' => 'Two-factor authentication confirmed',
    'toast.disabled' => 'Two-factor authentication disabled',
    'toast.codes_regenerated' => 'Recovery codes regenerated',

    // Errors
    'error.confirm_invalid_code' => 'That code didn\'t match. Try again with a fresh code from your app.',
    'error.password_confirmation_required' => 'Please confirm your password before changing security settings.',
    'error.generic' => 'Something went wrong. Please try again.',

    // Inline password-confirmation modal
    'password_confirm.title' => 'Confirm your password',
    'password_confirm.intro' => 'For your security, please confirm your password to continue with this change.',
    'password_confirm.password_label' => 'Password',
    'password_confirm.submit' => 'Confirm',
    'password_confirm.invalid' => 'That password didn\'t match. Try again.',
];
