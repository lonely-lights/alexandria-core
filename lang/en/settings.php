<?php

declare(strict_types=1);

/*
 * Settings-page UI strings — labels, descriptions, helper text, save
 * buttons, and section headers across the /settings + /profile body.
 *
 * Surfaced React-side via the `t.settings` shared prop and accessed
 * through `useT()`: `t('settings.appearance.color_mode_label')`,
 * `t('settings.notifications.unwired_banner')`, etc.
 *
 * Keys use dot-prefixed sub-namespaces matching the section structure
 * (`appearance.*`, `language.*`, `notifications.*`, `editor.*`,
 * `accessibility.*`) — useT() does a single substring split at the
 * group boundary, so the sub-namespace has to be a flat lookup
 * inside the group's bag.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/settings.php.
 */
return [
    // ── Appearance ──────────────────────────────────────────────────
    'appearance.color_mode_label' => 'Color Mode',
    'appearance.color_mode_light' => 'Light',
    'appearance.color_mode_dark' => 'Dark',
    'appearance.color_mode_system' => 'System',
    'appearance.color_mode_help' => 'System follows your operating system setting.',
    'appearance.font_size_label' => 'Font Size',
    'appearance.font_size_preview' => 'Aa',
    'appearance.reduced_motion_label' => 'Reduced Motion',
    'appearance.reduced_motion_description' => 'Minimize animations and transitions',
    'appearance.compact_mode_label' => 'Compact Mode',
    'appearance.compact_mode_description' => 'Use a denser layout with less spacing',
    'appearance.save_button' => 'Save Appearance',

    // ── Language / Regional Formats ─────────────────────────────────
    'language.date_format_label' => 'Date Format',
    'language.time_format_label' => 'Time Format',
    'language.first_day_label' => 'First Day of Week',
    'language.number_format_label' => 'Number Format',
    'language.save_button' => 'Save Formats',

    // ── Notifications ───────────────────────────────────────────────
    'notifications.unwired_banner' => 'Notification delivery is not yet wired up. These preferences are saved but won\'t take effect until the notification system is connected.',
    'notifications.delivery_header' => 'Delivery',
    'notifications.email_label' => 'Email Notifications',
    'notifications.email_frequency_label' => 'Email Frequency',
    'notifications.push_label' => 'Push Notifications',
    'notifications.in_app_label' => 'In-App Notifications',
    'notifications.notify_about_header' => 'Notify Me About',
    'notifications.mentions_label' => 'Mentions',
    'notifications.mentions_description' => 'When someone @mentions you',
    'notifications.comments_label' => 'Comments',
    'notifications.comments_description' => 'New comments on your content',
    'notifications.invites_label' => 'Project Invites',
    'notifications.invites_description' => 'When you\'re invited to a project',
    'notifications.ai_completion_label' => 'AI Completion',
    'notifications.ai_completion_description' => 'When AI tasks finish processing',
    'notifications.communications_header' => 'Communications',
    'notifications.marketing_emails_label' => 'Marketing Emails',
    'notifications.product_updates_label' => 'Product Updates',
    'notifications.tips_label' => 'Tips & Tutorials',
    'notifications.community_digest_label' => 'Community Digest',
    'notifications.save_button' => 'Save Notifications',

    // ── Editor ──────────────────────────────────────────────────────
    'editor.unwired_banner' => 'Editor settings are saved but not yet applied to the editor interface. This will be connected in a future update.',
    'editor.default_mode_label' => 'Default Editor Mode',
    'editor.auto_save_label' => 'Auto-Save',
    'editor.auto_save_description' => 'Automatically save your work',
    'editor.auto_save_interval_label' => 'Auto-Save Interval',
    'editor.spell_check_label' => 'Spell Check',
    'editor.word_count_label' => 'Show Word Count',
    'editor.reading_time_label' => 'Show Reading Time',
    'editor.note_visibility_label' => 'Default Note Visibility',
    'editor.save_button' => 'Save Editor Settings',

    // ── Accessibility ───────────────────────────────────────────────
    'accessibility.high_contrast_label' => 'High Contrast',
    'accessibility.high_contrast_description' => 'Boost contrast for better visibility',
    'accessibility.focus_indicators_label' => 'Focus Indicators',
    'accessibility.dyslexia_label' => 'Dyslexia-Friendly Font',
    'accessibility.dyslexia_description' => 'Use a font designed for easier reading (Atkinson Hyperlegible)',
    'accessibility.reduce_motion_label' => 'Reduce Motion',
    'accessibility.reduce_motion_description' => 'Minimize animations and transitions across the app',
    'accessibility.os_motion_help' => 'Your operating system\'s reduce-motion setting is also respected automatically.',
    'accessibility.screen_reader_label' => 'Screen Reader Mode',
    'accessibility.screen_reader_description' => 'Optimize the interface for screen readers',
    'accessibility.keyboard_shortcuts_label' => 'Keyboard Shortcuts',
    'accessibility.keyboard_shortcuts_description' => 'Enable keyboard shortcuts for common actions',
    'accessibility.save_button' => 'Save Accessibility',

    // ── SettingsDrawer overlay ──────────────────────────────────────
    'drawer.title' => 'Settings',
    'drawer.aria_label' => 'Settings drawer',

    // ── Profile-card chrome (banner / avatar controls / preview) ────
    'aria.banner_alt' => 'Profile banner',
    'aria.change_avatar' => 'Change avatar',
    'aria.remove_avatar' => 'Remove avatar',
    'aria.change_avatar_ring' => 'Change avatar ring',
    'preview.website_label' => 'Website',

    // ── Section card chrome (SectionContent dispatcher) ─────────────
    // Title / subtitle / label that wrap each settings section card.
    // Keyed by activeSection slug. Per-section sub-pages reuse these
    // for their own SectionHeader; this is the dispatcher's view.
    'section.links.title' => 'Connected Links',
    'section.links.subtitle' => 'Social media, support links, and other connections',
    'section.links.label' => 'Social & Links',

    'section.account.title' => 'Account',
    'section.account.subtitle' => 'Email, password, and account management',
    'section.account.label' => 'Account',
    'section.account.unconfigured' => 'Account management is supplied by the consumer app.',

    'section.security.unconfigured' => 'Two-factor authentication is not configured by the consumer app.',

    'section.privacy-visibility.title' => 'Field Visibility',
    'section.privacy-visibility.subtitle' => 'Control who can see each part of your profile',
    'section.privacy-settings.title' => 'Privacy Settings',
    'section.privacy-settings.subtitle' => 'Global privacy and social interaction preferences',
    'section.privacy-lists.title' => 'Privacy Lists',
    'section.privacy-lists.subtitle' => 'Manage custom groups for granular access control',
    'section.privacy.label' => 'Privacy',

    'section.ai-connection.title' => 'AI Connection',
    'section.ai-connection.subtitle' => 'Manage your API keys and providers',
    'section.ai-models.title' => 'Model Selection',
    'section.ai-models.subtitle' => 'Choose AI models for different tasks',
    'section.ai-usage.title' => 'Usage',
    'section.ai-usage.subtitle' => 'Track your AI usage this month',
    'section.ai-preferences.title' => 'AI Preferences',
    'section.ai-preferences.subtitle' => 'Response style and behavior settings',
    'section.ai.label' => 'AI',

    'section.pref-appearance.title' => 'Appearance',
    'section.pref-appearance.subtitle' => 'Theme, font size, and display preferences',
    'section.pref-language.title' => 'Regional Formats',
    'section.pref-language.subtitle' => 'Date, time, and number formatting',
    'section.pref-notifications.title' => 'Notifications',
    'section.pref-notifications.subtitle' => 'Email, push, and in-app notification preferences',
    'section.preferences.label' => 'Preferences',

    'section.tools-editor.title' => 'Editor',
    'section.tools-editor.subtitle' => 'Writing and editing preferences',
    'section.tools.label' => 'Tools',

    'section.a11y-visual.title' => 'Visual Accessibility',
    'section.a11y-visual.subtitle' => 'Contrast, fonts, and focus indicators',
    'section.a11y-motion.title' => 'Motion & Animation',
    'section.a11y-motion.subtitle' => 'Reduce motion and transitions',
    'section.a11y-assistive.title' => 'Assistive Technology',
    'section.a11y-assistive.subtitle' => 'Screen reader and keyboard support',
    'section.accessibility.label' => 'Accessibility',

    // Placeholders for the not-yet-built tools sub-pages.
    'placeholder.coming_soon' => 'Coming Soon',
    'placeholder.tools-shortcuts.title' => 'Keyboard Shortcuts',
    'placeholder.tools-shortcuts.subtitle' => 'Customize your key bindings',
    'placeholder.tools-shortcuts.description' => 'Customizable keyboard shortcuts will let you navigate and edit faster with your preferred key combinations.',
    'placeholder.tools-integrations.title' => 'Integrations',
    'placeholder.tools-integrations.subtitle' => 'Connect your favorite tools',
    'placeholder.tools-integrations.description' => 'Connect your favorite tools like Notion, Google Drive, Dropbox, and more to streamline your workflow.',

    // ── Save-success toasts (shared across every section) ───────────
    'toast.saved' => 'Changes saved',
    'toast.profile_saved' => 'Profile updated',
    'toast.preferences_saved' => 'Preferences saved',
    'toast.privacy_saved' => 'Privacy settings saved',
    'toast.field_visibility_saved' => 'Visibility updated',
    'toast.list_created' => 'Privacy list created',
    'toast.list_updated' => 'Privacy list updated',
    'toast.list_deleted' => 'Privacy list deleted',
    'toast.link_added' => 'Link added',
    'toast.link_updated' => 'Link updated',
    'toast.link_deleted' => 'Link removed',
    'toast.api_key_added' => 'API key added',
    'toast.api_key_deleted' => 'API key removed',
    'toast.api_key_activated' => 'API key activated',
    'toast.models_saved' => 'AI models saved',
    'toast.ai_preferences_saved' => 'AI preferences saved',

    // ── Avatar ring picker (RingModal) ──────────────────────────────
    'ring_picker.title' => 'Avatar Ring',
    'ring_picker.none_label' => 'None',
    'ring_picker.none_description' => 'No ring around your avatar',
    'ring_picker.animated_badge' => 'Animated',
    'ring_picker.cancel_button' => 'Cancel',
    'ring_picker.save_button' => 'Save Ring',
];
