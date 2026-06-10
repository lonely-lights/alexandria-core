<?php

declare(strict_types=1);

/*
 * Privacy-settings UI strings — field visibility, general privacy
 * preferences, and privacy lists across the /settings?tab=privacy
 * surfaces. Mirrors profile.php / ai.php / settings.php in shape.
 *
 * Surfaced React-side via the `t.privacy` shared prop and accessed
 * through `useT()`: `t('privacy.visibility.intro')`,
 * `t('privacy.lists.create_button')`, etc.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/privacy.php.
 */
return [
    // ── Field Visibility tab ────────────────────────────────────────
    'visibility.intro' => 'Control who can see each part of your profile. Click any field to change its visibility.',
    'visibility.public_fallback' => 'Public',
    'visibility.modal_title_fallback' => 'Field Visibility',
    'visibility.include_lists_header' => 'Include these lists',
    'visibility.no_lists_hint' => 'You have no lists yet — create one under Privacy › Lists to choose who this includes. Until then, custom visibility means only you.',
    'visibility.save_button' => 'Save',

    // ── General Privacy Settings tab ────────────────────────────────
    'settings.profile_visibility_label' => 'Profile Visibility',
    'settings.online_label' => 'Show Online Status',
    'settings.online_description' => "Let others see when you're online",
    'settings.activity_label' => 'Show Activity Status',
    'settings.activity_description' => 'Let others see your recent activity',
    'settings.invites_label' => 'Allow Project Invites',
    'settings.save_button' => 'Save Privacy',

    // ── Privacy Lists tab ───────────────────────────────────────────
    'lists.intro' => 'Privacy lists let you group people — like "Close Friends" or "Writing Group" — so you can share specific profile fields with just those groups.',
    'lists.empty_state' => 'No privacy lists yet',
    'lists.create_button' => 'Create List',
    'lists.new_heading' => 'New List',
    'lists.edit_heading' => 'Edit List',
    'lists.system_badge' => 'System',
    'lists.member_singular' => 'member',
    'lists.member_plural' => 'members',
    'lists.edit_modal_title' => 'Edit ":name"',

    'lists.name_field' => 'Name',
    'lists.name_placeholder' => 'e.g., Close Friends',
    'lists.description_field' => 'Description',
    'lists.description_placeholder' => 'Optional',
    'lists.icon_field' => 'Icon',
    'lists.color_field' => 'Color',
    'lists.save_button' => 'Save',
    'lists.create_action_button' => 'Create List',
];
