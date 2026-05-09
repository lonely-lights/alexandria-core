<?php

declare(strict_types=1);

/*
 * AI-settings UI strings — connection / models / usage / preferences
 * across the /settings?tab=ai surfaces. Mirrors profile.php and
 * settings.php in shape.
 *
 * Surfaced React-side via the `t.ai` shared prop and accessed
 * through `useT()`: `t('ai.connection.key_added_badge')`,
 * `t('ai.models.save_button')`, etc.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/ai.php.
 */
return [
    // ── Connection (API Keys) ───────────────────────────────────────
    'connection.key_added_badge' => 'Key Added',
    'connection.no_key_badge' => 'No Key',
    'connection.active_badge' => 'Active',
    'connection.expired_badge' => 'Expired',
    'connection.activate_button' => 'Activate',
    'connection.empty_state' => 'No API keys for :provider',
    'connection.empty_state_default' => 'this provider',
    'connection.add_key_button' => 'Add API Key',

    'connection.delete_modal_title' => 'Delete API Key?',
    'connection.delete_button' => 'Delete Key',

    'connection.add_form_heading' => 'Add :provider Key',
    'connection.label_field' => 'Label',
    'connection.api_key_field' => 'API Key',
    'connection.api_key_placeholder' => 'sk-…',
    'connection.validate_button' => 'Validate Key',
    'connection.validating' => 'Validating…',
    'connection.validation_failed' => 'Validation failed',
    'connection.skip_validation' => 'Skip validation (not recommended)',
    'connection.expires_field' => 'Expiration Date',
    'connection.expires_optional' => 'Optional',
    'connection.save_key_button' => 'Save Key',

    // ── Models ──────────────────────────────────────────────────────
    'models.no_keys_heading' => 'No valid API keys',
    'models.no_keys_description' => 'Add an API key in the Connection tab to select models.',

    'models.analyst_label' => 'Analyst Model',
    'models.analyst_description' => 'For categorization & analysis',
    'models.creative_label' => 'Creative Model',
    'models.creative_description' => 'For content generation',
    'models.image_label' => 'Image Model',
    'models.image_description' => 'For image generation',
    'models.video_label' => 'Video Model',
    'models.video_description' => 'For video generation',

    'models.select_placeholder' => 'Select a model…',
    'models.info_provider' => 'Provider:',
    'models.info_pricing' => 'Pricing:',
    'models.info_context' => 'Context:',
    'models.pricing_in_suffix' => 'in',
    'models.pricing_out_suffix' => 'out',
    'models.tokens_suffix' => 'tokens',

    'models.feature_json' => 'JSON',
    'models.feature_vision' => 'Vision',
    'models.feature_recommended' => 'Recommended',

    'models.save_button' => 'Save Model Settings',
    'models.saved_indicator' => 'Saved',

    // ── Usage ───────────────────────────────────────────────────────
    'usage.heading' => "This month's AI usage across all projects.",
    'usage.tokens_label' => 'Tokens',
    'usage.cost_label' => 'Est. Cost',
    'usage.requests_label' => 'Requests',
    'usage.empty_state' => 'No AI usage this month yet.',

    // ── Preferences ─────────────────────────────────────────────────
    'preferences.response_length_label' => 'Response Length',
    'preferences.response_length_concise' => 'Concise',
    'preferences.response_length_balanced' => 'Balanced',
    'preferences.response_length_detailed' => 'Detailed',
    'preferences.suggestions_label' => 'AI Suggestions',
    'preferences.suggestions_description' => 'Get AI-powered suggestions while writing',
    'preferences.auto_categorize_label' => 'Auto-Categorize',
    'preferences.auto_categorize_description' => 'Automatically categorize new entries using AI',
    'preferences.save_button' => 'Save Preferences',
    'preferences.saved_indicator' => 'Saved',
];
