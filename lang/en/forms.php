<?php

declare(strict_types=1);

/*
 * Form-primitive UI strings — labels, descriptions, placeholders that
 * ship inside core's form components (TemporalFieldConfig, the
 * PasswordRulesPopover, and any future primitive that bakes its own
 * copy in rather than taking it via props).
 *
 * Surfaced React-side via the `t.forms` shared prop and accessed
 * through `useT()`: `t('forms.password.requirements_header')`,
 * `t('forms.temporal.title')`, etc.
 *
 * Keys use dot-prefixed sub-namespaces (e.g. `temporal.title`) rather
 * than nested arrays — useT() does a single substring split at the
 * group boundary, so the rest of the key has to be a flat lookup
 * inside the group's bag.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/forms.php.
 */
return [
    // ── PasswordRulesPopover ─────────────────────────────────────────
    'password.requirements_header' => 'Password requirements',
    'password.rule_length' => 'At least 8 characters',
    'password.rule_lowercase' => 'At least one lowercase letter',
    'password.rule_uppercase' => 'At least one uppercase letter',
    'password.rule_digit' => 'At least one number',
    'password.rule_symbol' => 'At least one symbol',
    'password.rule_match' => 'Passwords match',

    // ── TemporalFieldConfig ──────────────────────────────────────────
    'temporal.title' => 'Temporal Configuration',
    'temporal.date_precision_label' => 'Date Precision',
    'temporal.date_only' => 'Date only',
    'temporal.date_and_time' => 'Date and Time',
    'temporal.enable_intensity_label' => 'Enable Intensity',
    'temporal.enable_intensity_description' => 'Add a 1-10 scale to measure degree or importance',
    'temporal.intensity_label_label' => 'Intensity Label',
    'temporal.intensity_label_default' => 'Importance',
    'temporal.intensity_label_placeholder' => 'e.g. Importance, Strength, Priority',
    'temporal.link_to_entry_label' => 'Link to Entry',
    'temporal.link_to_entry_description' => 'Associate each record with an entry from another blueprint',
    'temporal.reference_blueprint_label' => 'Reference Blueprint',
    'temporal.reference_blueprint_placeholder' => 'Select a blueprint...',
    'temporal.allow_overlap_label' => 'Allow Overlapping Dates',
    'temporal.allow_overlap_description' => 'Multiple records can be active at the same time',

    // ── Media (uploader + metadata form) ─────────────────────────────
    'media.alt_placeholder' => 'Describe the image for screen readers…',
    'media.caption_placeholder' => 'Add a caption…',
    'media.error.alt_required' => 'Alt text is required.',
    'media.error.file_too_large' => 'File exceeds the :limit KB size limit.',
    'media.error.upload_failed' => 'Upload failed (HTTP :status)',
    'media.error.metadata_save_failed' => 'Failed to save metadata.',
];
