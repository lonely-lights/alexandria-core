<?php

declare(strict_types=1);

/*
 * Profile-page UI strings — labels, hints, placeholders, help copy
 * across the /profile body (Identity / About / Details tabs) and the
 * username-change modal.
 *
 * Surfaced React-side via the `t.profile` shared prop and accessed
 * through `useT()`: `t('profile.identity.username_label')`,
 * `t('profile.username_modal.change_title')`, etc.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/profile.php.
 */
return [
    // ── Section headers (one per /profile?section=…) ────────────────
    'identity.header_title' => 'Identity',
    'identity.header_subtitle' => 'How others see and identify you',
    'about.header_title' => 'About',
    'about.header_subtitle' => 'Tell the world about yourself',
    'details.header_title' => 'Details',
    'details.header_subtitle' => 'Personal details and preferences',

    // ── Identity tab ────────────────────────────────────────────────
    'identity.username_label' => 'Username',
    'identity.username_hint' => '@mentions & URL',
    'identity.username_change_button' => 'Change',
    'identity.username_edit_case_button' => 'Edit Case',
    'identity.username_cooldown_message' => 'Full changes available :date (:diff)',
    'identity.username_revert_hint' => 'You can revert to @:username or edit casing.',
    'identity.display_name_label' => 'Display Name',
    'identity.display_name_hint' => 'How you want to be called',
    'identity.display_name_placeholder' => 'How you want to be called',
    'identity.pronouns_label' => 'Pronouns',
    'identity.pronouns_hint' => 'Select one or more',
    'identity.custom_pronouns_placeholder' => 'Custom pronouns',
    'identity.pronoun_reorder_hint' => 'Drag to reorder your pronouns:',

    // ── About tab ───────────────────────────────────────────────────
    'about.tagline_label' => 'Tagline',
    'about.tagline_placeholder' => 'A short one-liner about you',
    'about.bio_label' => 'Bio',
    'about.bio_placeholder' => 'Tell others about yourself',
    'about.private_bio_label' => 'Private Bio',
    'about.private_bio_placeholder' => 'Only visible based on your visibility settings',

    // ── Details tab ─────────────────────────────────────────────────
    'details.location_label' => 'Location',
    'details.location_hint' => 'Anywhere — real or imagined',
    'details.website_label' => 'Website',
    'details.website_hint' => 'Your personal site',
    'details.website_placeholder' => 'https://example.com',
    'details.birthday_label' => 'Birthday',
    'details.birthday_hint' => 'Date of birth',
    'details.birthday_month_placeholder' => 'Month',
    'details.birthday_day_placeholder' => 'Day',
    'details.birthday_year_placeholder' => 'Year',
    'details.dob_visibility_label' => 'Show Birthday As',
    'details.dob_visibility_empty' => 'Fill in birthday fields above to see display options',
    'details.age_suffix' => 'years old',

    // ── Save row (shared across all three tabs) ─────────────────────
    'save_button' => 'Save Changes',

    // ── Username change modal ───────────────────────────────────────
    'username_modal.change_title' => 'Change Username',
    'username_modal.case_title' => 'Edit Username Casing',
    'username_modal.revert_title' => 'Revert Username',
    'username_modal.before_change_header' => 'Before you change',
    'username_modal.cooldown_after' => '6-month cooldown after changing',
    'username_modal.revert_window' => '14 days to revert if needed',
    'username_modal.old_becomes_available' => 'Old username becomes available to others',
    'username_modal.case_only_explanation' => 'Casing changes are always allowed — only the capitalization is updated.',
    'username_modal.current_label' => 'Current username',
    'username_modal.new_label' => 'New username',
    'username_modal.charset_hint' => 'Letters, numbers, dashes, and underscores only',
    'username_modal.format_error' => 'Only letters, numbers, dashes, and underscores',
    'username_modal.length_error' => 'Username must be 30 characters or less',
    'username_modal.generic_error' => 'Something went wrong. Please try again.',
    'username_modal.update_casing_button' => 'Update Casing',
    'username_modal.change_button' => 'Change Username',
    'username_modal.revert_button' => 'Revert Username',
    'username_modal.reverting' => 'Reverting…',
    'username_modal.revert_to_button' => 'Revert to @:username',
    'username_modal.revert_current_label' => 'Current',
    'username_modal.revert_target_label' => 'Revert to',
    'username_modal.revert_important_header' => 'Important',
    'username_modal.revert_cooldown_remains' => 'The 6-month cooldown remains active',
    'username_modal.revert_old_available' => '@:username becomes immediately available',
    'username_modal.revert_no_reservation' => 'You cannot reserve usernames by reverting',
];
