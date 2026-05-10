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

    // ── Project AI Dashboard chrome (AiDashboard.tsx) ───────────────
    'dashboard.heading.title' => 'AI',
    'dashboard.heading.subtitle' => 'Manage AI features for :project',
    'dashboard.breadcrumb' => 'AI Dashboard',
    'dashboard.tab.dashboard' => 'Dashboard',
    'dashboard.tab.commands' => 'Commands',
    'dashboard.tab.usage' => 'Usage',
    'dashboard.tab.models' => 'Models',
    'dashboard.tab.settings' => 'Settings',

    // ── Settings → UsageSidebar (project usage stats card) ──────────
    'usage_sidebar.title' => 'Project Usage',
    'usage_sidebar.this_month' => 'This Month',
    'usage_sidebar.requests' => 'Requests',
    'usage_sidebar.tokens' => 'Tokens',
    'usage_sidebar.cost' => 'Cost',
    'usage_sidebar.budget_used' => 'Budget Used',
    'usage_sidebar.all_time' => 'All Time',
    'usage_sidebar.total_requests' => 'Total Requests',
    'usage_sidebar.total_tokens' => 'Total Tokens',
    'usage_sidebar.total_cost' => 'Total Cost',

    // ── Settings → UserDefaultsSidebar (account defaults readout) ───
    'user_defaults.title' => 'Your Defaults',
    'user_defaults.provider' => 'Provider',
    'user_defaults.analyst_model' => 'Analyst Model',
    'user_defaults.creative_model' => 'Creative Model',
    'user_defaults.api_key' => 'API Key',
    'user_defaults.key_valid' => 'Valid',
    'user_defaults.key_not_set' => 'Not set',
    'user_defaults.empty.title' => 'No AI settings configured',
    'user_defaults.empty.body' => 'Set up your AI provider and API keys first.',
    'user_defaults.dash' => '—',
    'user_defaults.quick_links_title' => 'Quick Links',
    'user_defaults.api_keys_title' => 'API Keys',
    'user_defaults.api_keys_desc' => 'Manage your API keys',
    'user_defaults.global_settings_title' => 'Global AI Settings',
    'user_defaults.global_settings_desc' => 'Default models & preferences',

    // ── Dashboard tab (project AI dashboard primary tab) ────────────
    'dashboard_tab.stat.queued_notes' => 'Queued Notes',
    'dashboard_tab.stat.pending_commands' => 'Pending Commands',
    'dashboard_tab.stat.this_month' => 'This Month',
    'dashboard_tab.stat.this_month_sub' => 'requests',
    'dashboard_tab.stat.token_usage' => 'Token Usage',
    'dashboard_tab.stat.monthly_cost' => 'Monthly Cost',
    'dashboard_tab.stat.budget_suffix' => 'of $:amount budget',
    'dashboard_tab.queue.title' => 'Note Queue',
    'dashboard_tab.queue.empty' => 'No notes queued',
    'dashboard_tab.batches.title' => 'Recent Batches',
    'dashboard_tab.batches.empty' => 'No batches yet',
    'dashboard_tab.batch.executed' => ':count done',
    'dashboard_tab.batch.pending' => ':count pending',
    'dashboard_tab.batch.failed' => ':count failed',
    'dashboard_tab.batch.rejected' => ':count rejected',

    // ── Commands tab (batch list + status filter + empty state) ─────
    'commands_tab.title' => 'Command Batches',
    'commands_tab.batch_count.one' => ':count batch',
    'commands_tab.batch_count.many' => ':count batches',
    'commands_tab.filter.all' => 'All',
    'commands_tab.filter.pending' => 'Pending',
    'commands_tab.filter.executed' => 'Executed',
    'commands_tab.filter.failed' => 'Failed',
    'commands_tab.empty.title' => 'No command batches found',
    'commands_tab.empty.hint' => 'Try switching to "All" to see all batches.',
    'commands_tab.batch.review' => 'Review',
    'commands_tab.batch.fallback_name' => 'Command Batch',
    'commands_tab.batch.executed' => ':count done',
    'commands_tab.batch.approved' => ':count approved',
    'commands_tab.batch.pending' => ':count pending',
    'commands_tab.batch.failed' => ':count failed',
    'commands_tab.batch.rejected' => ':count rejected',
];
