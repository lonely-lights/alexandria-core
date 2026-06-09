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
 * `t('security.recovery_codes.acknowledge')`, etc.
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

    // ── Steady-state panel — disabled phase ────────────────────────
    'two_factor.heading' => 'Two-factor authentication',
    'two_factor.disabled_summary' => 'Two-factor authentication is not enabled.',
    'two_factor.disabled_explanation' => 'When enabled, you will be required to enter a code from your authenticator app each time you sign in.',
    'two_factor.enable_button' => 'Enable two-factor authentication',

    // ── Steady-state panel — enabled phase ─────────────────────────
    'two_factor.enabled_summary' => 'Two-factor authentication is enabled.',
    'two_factor.enabled_explanation' => 'You will be asked for a code from your authenticator app each time you sign in.',
    'two_factor.regenerate_codes_button' => 'Regenerate recovery codes',
    'two_factor.disable_button' => 'Disable two-factor authentication',

    // ── Setup-pending panel (user closed mid-enrollment) ───────────
    'setup_pending.heading' => 'Two-factor setup is incomplete.',
    'setup_pending.explanation' => 'You started enabling two-factor authentication but didn\'t confirm a code from your authenticator. Resume to finish, or cancel to start fresh later.',
    'setup_pending.resume_button' => 'Resume setup',
    'setup_pending.cancel_button' => 'Cancel setup',
    'setup_pending.cancel_modal_title' => 'Cancel two-factor setup',
    'setup_pending.cancel_password_intro' => 'Confirm your password to cancel the pending two-factor setup. The unconfirmed secret will be discarded.',
    'setup_pending.cancel_confirm_button' => 'Discard setup',

    // ── Enable wizard ───────────────────────────────────────────────
    'enable.modal_title' => 'Enable two-factor authentication',
    'enable.password_intro' => 'Confirm your password to start enabling two-factor authentication.',
    'enable.password_submit' => 'Continue',
    'enable.setup_title' => 'Scan the QR code',
    'enable.setup_intro' => 'Scan this QR with your authenticator app, then enter the 6-digit code it generates to confirm enrollment.',
    'enable.scan_label' => 'Scan with your authenticator',
    'enable.manual_label' => "Can't scan? Enter this key manually:",
    'enable.code_label' => 'Confirmation code',
    'enable.confirm_button' => 'Confirm and continue',
    'enable.recovery_title' => 'Save your recovery codes',
    'enable.done_button' => 'Finish setup',

    // ── Regenerate wizard ───────────────────────────────────────────
    'regenerate.modal_title' => 'Regenerate recovery codes',
    'regenerate.password_intro' => 'Confirm your password to generate fresh recovery codes. Your previous codes will stop working.',
    'regenerate.password_submit' => 'Generate new codes',
    'regenerate.recovery_title' => 'Your new recovery codes',

    // ── Disable wizard ──────────────────────────────────────────────
    'disable.modal_title' => 'Disable two-factor authentication',
    'disable.password_intro' => 'Confirm your password to disable two-factor authentication.',
    'disable.password_submit' => 'Continue',
    'disable.confirm_title' => 'Disable two-factor?',
    'disable.confirm_warning' => 'You\'ll sign in with just your password — no second factor. We strongly recommend keeping two-factor authentication enabled to protect your account.',
    'disable.confirm_button' => 'Yes, disable',

    // ── Recovery-codes panel (shared by Enable + Regenerate) ───────
    'recovery_codes.intro' => 'These codes let you sign in if you lose access to your authenticator app. Each code works exactly once.',
    'recovery_codes.warning' => "This is the only time you'll see these codes. Store them somewhere safe — a password manager is ideal.",
    'recovery_codes.copy_all_button' => 'Copy all codes',
    'recovery_codes.copied_button' => 'Copied',
    'recovery_codes.copied' => 'Recovery codes copied to clipboard',
    'recovery_codes.acknowledge' => "I've saved these codes somewhere safe.",
    'recovery_codes.done_button' => 'Done',

    // ── Toasts ──────────────────────────────────────────────────────
    'toast.enabled' => 'Two-factor authentication enabled',
    'toast.confirmed' => 'Two-factor authentication confirmed',
    'toast.disabled' => 'Two-factor authentication disabled',
    'toast.setup_cancelled' => 'Two-factor setup cancelled',
    'toast.codes_regenerated' => 'Recovery codes regenerated',

    // ── Errors ──────────────────────────────────────────────────────
    'error.confirm_invalid_code' => 'That code didn\'t match. Try again with a fresh code from your app.',
    'error.password_confirmation_required' => 'Please confirm your password before changing security settings.',
    'error.generic' => 'Something went wrong. Please try again.',

    // ── Inline password-confirmation step (shared) ─────────────────
    'password_confirm.password_label' => 'Password',
    'password_confirm.invalid' => 'That password didn\'t match. Try again.',
];
