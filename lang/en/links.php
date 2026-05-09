<?php

declare(strict_types=1);

/*
 * Profile-links UI strings — the /settings?tab=links surface for the
 * social-media / portfolio / support links list. Mirrors profile.php
 * / privacy.php / ai.php / settings.php in shape.
 *
 * Surfaced React-side via the `t.links` shared prop and accessed
 * through `useT()`: `t('links.add_button')`, `t('links.form.platform_field')`,
 * etc.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/links.php.
 */
return [
    // ── Empty state + add affordance ────────────────────────────────
    'empty_heading' => 'No links yet',
    'empty_subtitle' => 'Add your social media, portfolio, and support links',
    'add_button' => 'Add Link',

    // ── Visibility chip labels ──────────────────────────────────────
    'visibility.public' => 'Public',
    'visibility.authenticated' => 'Members',
    'visibility.private' => 'Private',

    // ── Type-group labels (used in platform select <optgroup>s) ────
    'type.social' => 'Social Media',
    'type.support' => 'Creator Support',
    'type.professional' => 'Professional',
    'type.creative' => 'Creative',
    'type.other' => 'Other',

    // ── Card defaults ───────────────────────────────────────────────
    'card.fallback_name' => 'Link',

    // ── Add / Edit form ─────────────────────────────────────────────
    'form.add_heading' => 'Add New Link',
    'form.edit_heading' => 'Edit :platform',
    'form.platform_field' => 'Platform',
    'form.platform_placeholder' => 'Select a platform…',
    'form.handle_field' => 'Username / Handle',
    'form.handle_placeholder' => 'username',
    'form.url_field' => 'URL',
    'form.url_placeholder' => 'https://…',
    'form.url_required' => 'Required',
    'form.url_auto' => 'Auto-generated',
    'form.label_field' => 'Label',
    'form.label_placeholder' => 'e.g., "Personal", "Work"',
    'form.label_optional' => 'Optional',
    'form.visibility_field' => 'Visibility',

    // ── Save buttons + errors ───────────────────────────────────────
    'save_button' => 'Save Changes',
    'add_action_button' => 'Add Link',
    'adding' => 'Adding…',
    'error.add_failed' => 'Failed to add link',
    'error.generic' => 'Something went wrong',
];
