import { useForm } from '@inertiajs/react';
import Select from '@alexandria/components/form/Select';
import Toggle from '@alexandria/components/form/Toggle';
import Button from '@alexandria/components/ui/Button';
import { useTheme } from '@alexandria/hooks/useTheme';
import useT, { type Translator } from '@alexandria/hooks/useT';
import type { SyntheticEvent, ReactNode } from 'react';

/**
 * Subset of view preferences the consumer app may want to mirror onto
 * `<html>` as data-* attributes for optimistic UI updates. Pass an
 * `applyViewPreferences` callback so the framework piece stays generic
 * — consumer apps decide how (or whether) to reflect changes in the
 * DOM ahead of the server round-trip. The DOM-mutation helper itself
 * lives in the consumer app per the FE-B audit (ADR-008).
 */
export interface ViewPreferences {
    font_size?: string;
    reduced_motion?: boolean;
    compact_mode?: boolean;
    high_contrast?: boolean;
    focus_indicators?: string;
    dyslexia_friendly_font?: boolean;
}

type ApplyViewPreferences = (prefs: ViewPreferences) => void;

interface PreferencesSectionProps {
    section: string;
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
    /**
     * Optional callback invoked whenever the user toggles a view-related
     * preference. Consumer apps typically wire this to a small DOM
     * helper (e.g. `applyViewPreferences`) so changes mirror onto
     * `<html>` as data-attributes ahead of the server round-trip. Core
     * stays agnostic — see ADR-008.
     */
    applyViewPreferences?: ApplyViewPreferences;
}

export default function PreferencesSection({
    section,
    preferences,
    options,
    applyViewPreferences,
}: PreferencesSectionProps) {
    const apply: ApplyViewPreferences = applyViewPreferences ?? (() => undefined);

    switch (section) {
        case 'appearance':
            return <AppearanceSection preferences={preferences} options={options} applyViewPreferences={apply} />;
        case 'language':
            return <LanguageSection preferences={preferences} options={options} />;
        case 'notifications':
            return <NotificationsSection preferences={preferences} options={options} />;
        case 'editor':
            return <EditorSection preferences={preferences} options={options} />;
        case 'accessibility':
        case 'a11y-visual':
            return <AccessibilitySection preferences={preferences} options={options} subsection="visual" applyViewPreferences={apply} />;
        case 'a11y-motion':
            return <AccessibilitySection preferences={preferences} options={options} subsection="motion" applyViewPreferences={apply} />;
        case 'a11y-assistive':
            return <AccessibilitySection preferences={preferences} options={options} subsection="assistive" applyViewPreferences={apply} />;
        default:
            return null;
    }
}

/**
 * Save-button row used at the bottom of every preferences sub-form. The
 * label is per-section (Save Appearance / Save Formats / etc.); the
 * processing label uses the universal `common.saving` key.
 */
function SaveRow({
    processing,
    labelKey,
    t,
}: {
    processing: boolean;
    labelKey: string;
    t: Translator;
}) {
    return (
        <div className="flex justify-end pt-2">
            <Button type="submit" loading={processing} variant="primary">
                {processing ? t('common.saving') : t(labelKey)}
            </Button>
        </div>
    );
}

/**
 * Yellow-tinted "this is wired but not connected yet" banner. Used by
 * the Notifications + Editor sub-forms where the preference fields
 * persist but downstream wiring is pending.
 */
function UnwiredBanner({ children }: { children: ReactNode }) {
    return (
        <div
            className="flex items-start gap-2 p-3 text-sm"
            style={{
                // Subtle warning-tinted bg + base-content for readable
                // body text (which adapts to mode automatically). The
                // warning hue stays as an accent on the icon and the
                // border so the row still reads as "warning" without
                // sacrificing legibility — `--theme-status-warning-stroke`
                // as text on a subtle warning bg was too low-contrast,
                // especially in dark mode where the stroke desaturates.
                background: 'var(--theme-status-warning-subtle)',
                color: 'var(--theme-base-content)',
                borderRadius: 'var(--theme-radius-card)',
                border: '1px solid color-mix(in srgb, var(--theme-status-warning-fill) 35%, transparent)',
            }}
        >
            <i
                className="fa-solid fa-triangle-exclamation mt-0.5"
                style={{ color: 'var(--theme-status-warning-fill)' }}
                aria-hidden="true"
            />
            <span>{children}</span>
        </div>
    );
}

/**
 * Section header used between toggle groups inside the Notifications
 * sub-form. Uppercase tracking, brand-primary tint at 80% opacity.
 */
function GroupHeader({ children }: { children: ReactNode }) {
    return (
        <h3
            className="text-[11px] font-semibold uppercase tracking-[.25em]"
            style={{
                color: 'color-mix(in srgb, var(--theme-brand-primary-500) 80%, transparent)',
            }}
        >
            {children}
        </h3>
    );
}

/** Quiet horizontal rule between grouped toggle blocks. */
function GroupDivider() {
    return (
        <hr
            className="border-0 border-t"
            style={{
                borderColor: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
            }}
        />
    );
}

function AppearanceSection({
    preferences,
    options,
    applyViewPreferences,
}: {
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
    applyViewPreferences: ApplyViewPreferences;
}) {
    const t = useT();
    const theme = useTheme();
    const form = useForm({
        font_size: preferences.font_size as string,
        reduced_motion: preferences.reduced_motion as boolean,
        compact_mode: preferences.compact_mode as boolean,
    });

    const modes: Array<{ key: 'light' | 'dark' | 'system'; labelKey: string; icon: string }> = [
        { key: 'light', labelKey: 'settings.appearance.color_mode_light', icon: 'fa-sun' },
        { key: 'dark', labelKey: 'settings.appearance.color_mode_dark', icon: 'fa-moon' },
        { key: 'system', labelKey: 'settings.appearance.color_mode_system', icon: 'fa-circle-half-stroke' },
    ];

    // Derived selection state from the theme store (always authoritative).
    const activeModeKey: 'light' | 'dark' | 'system' = theme?.followSystem ? 'system' : (theme?.mode ?? 'dark');

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        // Success feedback comes from the controller's flash via the
        // ToastProvider bridge — a client-side onSuccess toast here
        // doubled it (findings #10).
        form.put('/account/preferences');
    }

    const labelStyle = { color: 'var(--theme-base-content)' };
    const helpStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Color mode */}
            <div>
                <span className="mb-2 block text-sm font-semibold" style={labelStyle}>
                    {t('settings.appearance.color_mode_label')}
                </span>
                <div className="grid grid-cols-3 gap-3">
                    {modes.map((m) => {
                        const selected = activeModeKey === m.key;
                        return (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => {
                                    if (!theme) return;
                                    if (m.key === 'system') {
                                        theme.setFollowSystem(true);
                                    } else {
                                        theme.setMode(m.key);
                                    }
                                }}
                                className={`alex-pref-card flex flex-col items-center gap-2 p-4 ${selected ? 'alex-pref-card--selected' : ''}`}
                            >
                                <i
                                    className={`fa-solid ${m.icon} text-xl`}
                                    style={{
                                        color: selected
                                            ? 'var(--theme-brand-primary-500)'
                                            : 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                                    }}
                                    aria-hidden="true"
                                />
                                <span className="text-sm font-medium">{t(m.labelKey)}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="mt-2 text-xs" style={helpStyle}>
                    {t('settings.appearance.color_mode_help')}
                </p>
            </div>

            {/* Font Size */}
            <div>
                <span className="mb-2 block text-sm font-semibold" style={labelStyle}>
                    {t('settings.appearance.font_size_label')}
                </span>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(options.font_size).map(([val, label]) => {
                        const selected = form.data.font_size === val;
                        const previewSize = val === 'small' ? 'text-sm' : val === 'large' ? 'text-lg' : val === 'x-large' ? 'text-xl' : 'text-base';
                        return (
                            <button
                                key={val}
                                type="button"
                                onClick={() => {
                                    form.setData('font_size', val);
                                    applyViewPreferences({ font_size: val });
                                }}
                                className={`alex-pref-card flex flex-col items-center gap-1 p-4 ${selected ? 'alex-pref-card--selected' : ''}`}
                            >
                                <span className={`${previewSize} font-semibold`}>
                                    {t('settings.appearance.font_size_preview')}
                                </span>
                                <span className="text-xs">{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
                <Toggle
                    label={t('settings.appearance.reduced_motion_label')}
                    description={t('settings.appearance.reduced_motion_description')}
                    checked={form.data.reduced_motion}
                    onChange={(v) => {
                        form.setData('reduced_motion', v);
                        applyViewPreferences({ reduced_motion: v });
                    }}
                />
                <Toggle
                    label={t('settings.appearance.compact_mode_label')}
                    description={t('settings.appearance.compact_mode_description')}
                    checked={form.data.compact_mode}
                    onChange={(v) => {
                        form.setData('compact_mode', v);
                        applyViewPreferences({ compact_mode: v });
                    }}
                />
            </div>

            <SaveRow processing={form.processing} labelKey="settings.appearance.save_button" t={t} />
        </form>
    );
}

function LanguageSection({
    preferences,
    options,
}: {
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
}) {
    const t = useT();
    const form = useForm({
        date_format: preferences.date_format as string,
        time_format: preferences.time_format as string,
        first_day_of_week: preferences.first_day_of_week as string,
        number_format: preferences.number_format as string,
    });

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        // Success feedback comes from the controller's flash via the
        // ToastProvider bridge — a client-side onSuccess toast here
        // doubled it (findings #10).
        form.put('/account/preferences');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                    label={t('settings.language.date_format_label')}
                    name="date_format"
                    value={form.data.date_format}
                    onChange={(e) => form.setData('date_format', e.target.value)}
                    options={options.date_format}
                />
                <Select
                    label={t('settings.language.time_format_label')}
                    name="time_format"
                    value={form.data.time_format}
                    onChange={(e) => form.setData('time_format', e.target.value)}
                    options={options.time_format}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                    label={t('settings.language.first_day_label')}
                    name="first_day_of_week"
                    value={form.data.first_day_of_week}
                    onChange={(e) => form.setData('first_day_of_week', e.target.value)}
                    options={options.first_day_of_week}
                />
                <Select
                    label={t('settings.language.number_format_label')}
                    name="number_format"
                    value={form.data.number_format}
                    onChange={(e) => form.setData('number_format', e.target.value)}
                    options={options.number_format}
                />
            </div>

            <SaveRow processing={form.processing} labelKey="settings.language.save_button" t={t} />
        </form>
    );
}

function NotificationsSection({
    preferences,
    options,
}: {
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
}) {
    const t = useT();
    const form = useForm({
        email_notifications: preferences.email_notifications as boolean,
        email_frequency: preferences.email_frequency as string,
        push_notifications: preferences.push_notifications as boolean,
        in_app_notifications: preferences.in_app_notifications as boolean,
        notify_mentions: preferences.notify_mentions as boolean,
        notify_comments: preferences.notify_comments as boolean,
        notify_project_invites: preferences.notify_project_invites as boolean,
        notify_ai_completion: preferences.notify_ai_completion as boolean,
        marketing_emails: preferences.marketing_emails as boolean,
        product_updates: preferences.product_updates as boolean,
        tips_and_tutorials: preferences.tips_and_tutorials as boolean,
        community_digest: preferences.community_digest as boolean,
    });

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        // Success feedback comes from the controller's flash via the
        // ToastProvider bridge — a client-side onSuccess toast here
        // doubled it (findings #10).
        form.put('/account/preferences');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <UnwiredBanner>{t('settings.notifications.unwired_banner')}</UnwiredBanner>

            <div className="space-y-4">
                <GroupHeader>{t('settings.notifications.delivery_header')}</GroupHeader>
                <Toggle
                    label={t('settings.notifications.email_label')}
                    checked={form.data.email_notifications}
                    onChange={(v) => form.setData('email_notifications', v)}
                />
                {form.data.email_notifications && (
                    <Select
                        label={t('settings.notifications.email_frequency_label')}
                        name="email_frequency"
                        options={options.email_frequency}
                        value={form.data.email_frequency}
                        onChange={(e) => form.setData('email_frequency', e.target.value)}
                    />
                )}
                <Toggle
                    label={t('settings.notifications.push_label')}
                    checked={form.data.push_notifications}
                    onChange={(v) => form.setData('push_notifications', v)}
                />
                <Toggle
                    label={t('settings.notifications.in_app_label')}
                    checked={form.data.in_app_notifications}
                    onChange={(v) => form.setData('in_app_notifications', v)}
                />
            </div>

            <GroupDivider />

            <div className="space-y-4">
                <GroupHeader>{t('settings.notifications.notify_about_header')}</GroupHeader>
                <Toggle
                    label={t('settings.notifications.mentions_label')}
                    description={t('settings.notifications.mentions_description')}
                    checked={form.data.notify_mentions}
                    onChange={(v) => form.setData('notify_mentions', v)}
                />
                <Toggle
                    label={t('settings.notifications.comments_label')}
                    description={t('settings.notifications.comments_description')}
                    checked={form.data.notify_comments}
                    onChange={(v) => form.setData('notify_comments', v)}
                />
                <Toggle
                    label={t('settings.notifications.invites_label')}
                    description={t('settings.notifications.invites_description')}
                    checked={form.data.notify_project_invites}
                    onChange={(v) => form.setData('notify_project_invites', v)}
                />
                <Toggle
                    label={t('settings.notifications.ai_completion_label')}
                    description={t('settings.notifications.ai_completion_description')}
                    checked={form.data.notify_ai_completion}
                    onChange={(v) => form.setData('notify_ai_completion', v)}
                />
            </div>

            <GroupDivider />

            <div className="space-y-4">
                <GroupHeader>{t('settings.notifications.communications_header')}</GroupHeader>
                <Toggle
                    label={t('settings.notifications.marketing_emails_label')}
                    checked={form.data.marketing_emails}
                    onChange={(v) => form.setData('marketing_emails', v)}
                />
                <Toggle
                    label={t('settings.notifications.product_updates_label')}
                    checked={form.data.product_updates}
                    onChange={(v) => form.setData('product_updates', v)}
                />
                <Toggle
                    label={t('settings.notifications.tips_label')}
                    checked={form.data.tips_and_tutorials}
                    onChange={(v) => form.setData('tips_and_tutorials', v)}
                />
                <Toggle
                    label={t('settings.notifications.community_digest_label')}
                    checked={form.data.community_digest}
                    onChange={(v) => form.setData('community_digest', v)}
                />
            </div>

            <SaveRow processing={form.processing} labelKey="settings.notifications.save_button" t={t} />
        </form>
    );
}

function EditorSection({
    preferences,
    options,
}: {
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
}) {
    const t = useT();
    const form = useForm({
        default_editor_mode: preferences.default_editor_mode as string,
        auto_save: preferences.auto_save as boolean,
        auto_save_interval: preferences.auto_save_interval as number,
        spell_check: preferences.spell_check as boolean,
        show_word_count: preferences.show_word_count as boolean,
        show_reading_time: preferences.show_reading_time as boolean,
        default_note_visibility: preferences.default_note_visibility as string,
    });

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        // Success feedback comes from the controller's flash via the
        // ToastProvider bridge — a client-side onSuccess toast here
        // doubled it (findings #10).
        form.put('/account/preferences');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <UnwiredBanner>{t('settings.editor.unwired_banner')}</UnwiredBanner>

            <Select
                label={t('settings.editor.default_mode_label')}
                name="default_editor_mode"
                options={options.editor_mode}
                value={form.data.default_editor_mode}
                onChange={(e) => form.setData('default_editor_mode', e.target.value)}
            />
            <Toggle
                label={t('settings.editor.auto_save_label')}
                description={t('settings.editor.auto_save_description')}
                checked={form.data.auto_save}
                onChange={(v) => form.setData('auto_save', v)}
            />
            {form.data.auto_save && (
                <Select
                    label={t('settings.editor.auto_save_interval_label')}
                    name="auto_save_interval"
                    options={Object.fromEntries(Object.entries(options.auto_save_interval).map(([k, v]) => [k, v]))}
                    value={form.data.auto_save_interval.toString()}
                    onChange={(e) => form.setData('auto_save_interval', parseInt(e.target.value))}
                />
            )}
            <Toggle
                label={t('settings.editor.spell_check_label')}
                checked={form.data.spell_check}
                onChange={(v) => form.setData('spell_check', v)}
            />
            <Toggle
                label={t('settings.editor.word_count_label')}
                checked={form.data.show_word_count}
                onChange={(v) => form.setData('show_word_count', v)}
            />
            <Toggle
                label={t('settings.editor.reading_time_label')}
                checked={form.data.show_reading_time}
                onChange={(v) => form.setData('show_reading_time', v)}
            />
            <Select
                label={t('settings.editor.note_visibility_label')}
                name="default_note_visibility"
                options={options.note_visibility}
                value={form.data.default_note_visibility}
                onChange={(e) => form.setData('default_note_visibility', e.target.value)}
            />

            <SaveRow processing={form.processing} labelKey="settings.editor.save_button" t={t} />
        </form>
    );
}

type A11ySubsection = 'visual' | 'motion' | 'assistive';

function AccessibilitySection({
    preferences,
    options,
    subsection,
    applyViewPreferences,
}: {
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
    subsection: A11ySubsection;
    applyViewPreferences: ApplyViewPreferences;
}) {
    const t = useT();
    const form = useForm({
        screen_reader_mode: preferences.screen_reader_mode as boolean,
        high_contrast: preferences.high_contrast as boolean,
        keyboard_shortcuts: preferences.keyboard_shortcuts as boolean,
        focus_indicators: preferences.focus_indicators as string,
        dyslexia_friendly_font: preferences.dyslexia_friendly_font as boolean,
        reduced_motion: preferences.reduced_motion as boolean,
    });

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        // Success feedback comes from the controller's flash via the
        // ToastProvider bridge — a client-side onSuccess toast here
        // doubled it (findings #10).
        form.put('/account/preferences');
    }

    if (subsection === 'visual') {
        return (
            <form onSubmit={handleSubmit} className="space-y-6">
                <Toggle
                    label={t('settings.accessibility.high_contrast_label')}
                    description={t('settings.accessibility.high_contrast_description')}
                    checked={form.data.high_contrast}
                    onChange={(v) => {
                        form.setData('high_contrast', v);
                        applyViewPreferences({ high_contrast: v });
                    }}
                />
                <Select
                    label={t('settings.accessibility.focus_indicators_label')}
                    name="focus_indicators"
                    options={options.focus_indicators}
                    value={form.data.focus_indicators}
                    onChange={(e) => {
                        form.setData('focus_indicators', e.target.value);
                        applyViewPreferences({ focus_indicators: e.target.value });
                    }}
                />
                <Toggle
                    label={t('settings.accessibility.dyslexia_label')}
                    description={t('settings.accessibility.dyslexia_description')}
                    checked={form.data.dyslexia_friendly_font}
                    onChange={(v) => {
                        form.setData('dyslexia_friendly_font', v);
                        applyViewPreferences({ dyslexia_friendly_font: v });
                    }}
                />
                <SaveRow processing={form.processing} labelKey="settings.accessibility.save_button" t={t} />
            </form>
        );
    }

    if (subsection === 'motion') {
        return (
            <form onSubmit={handleSubmit} className="space-y-6">
                <Toggle
                    label={t('settings.accessibility.reduce_motion_label')}
                    description={t('settings.accessibility.reduce_motion_description')}
                    checked={form.data.reduced_motion}
                    onChange={(v) => {
                        form.setData('reduced_motion', v);
                        applyViewPreferences({ reduced_motion: v });
                    }}
                />
                <p
                    className="text-xs"
                    style={{
                        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                    }}
                >
                    {t('settings.accessibility.os_motion_help')}
                </p>
                <SaveRow processing={form.processing} labelKey="settings.accessibility.save_button" t={t} />
            </form>
        );
    }

    // subsection === 'assistive'
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Toggle
                label={t('settings.accessibility.screen_reader_label')}
                description={t('settings.accessibility.screen_reader_description')}
                checked={form.data.screen_reader_mode}
                onChange={(v) => form.setData('screen_reader_mode', v)}
            />
            <Toggle
                label={t('settings.accessibility.keyboard_shortcuts_label')}
                description={t('settings.accessibility.keyboard_shortcuts_description')}
                checked={form.data.keyboard_shortcuts}
                onChange={(v) => form.setData('keyboard_shortcuts', v)}
            />
            <SaveRow processing={form.processing} labelKey="settings.accessibility.save_button" t={t} />
        </form>
    );
}
