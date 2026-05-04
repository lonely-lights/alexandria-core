import { router, useForm } from '@inertiajs/react';
import Select from '@alexandria/components/form/Select';
import Toggle from '@alexandria/components/form/Toggle';
import { useTheme } from '@alexandria/hooks/useTheme';
import type { SyntheticEvent } from 'react';

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

export default function PreferencesSection({ section, preferences, options, applyViewPreferences }: PreferencesSectionProps) {
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

function AppearanceSection({ preferences, options, applyViewPreferences }: { preferences: Record<string, unknown>; options: Record<string, Record<string, string>>; applyViewPreferences: ApplyViewPreferences }) {
    const theme = useTheme();
    const form = useForm({
        font_size: preferences.font_size as string,
        reduced_motion: preferences.reduced_motion as boolean,
        compact_mode: preferences.compact_mode as boolean,
    });

    const modes: Array<{ key: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
        { key: 'light', label: 'Light', icon: 'fa-sun' },
        { key: 'dark', label: 'Dark', icon: 'fa-moon' },
        { key: 'system', label: 'System', icon: 'fa-circle-half-stroke' },
    ];

    // Derived selection state from the theme store (always authoritative).
    const activeModeKey: 'light' | 'dark' | 'system' = theme?.followSystem ? 'system' : (theme?.mode ?? 'dark');

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        form.put('/account/preferences');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Color mode */}
            <div className="form-control">
                <div className="label">
                    <span className="label-text font-semibold">Color Mode</span>
                </div>
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
                                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                                    selected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-base-content/10 hover:border-base-content/30'
                                }`}
                            >
                                <i className={`fa-solid ${m.icon} text-xl ${selected ? 'text-primary' : 'text-base-content/50'}`} aria-hidden="true" />
                                <span className="text-sm font-medium">{m.label}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="mt-2 text-xs text-base-content/50">
                    System follows your operating system setting.
                </p>
            </div>

            {/* Font Size */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text font-semibold">Font Size</span>
                </label>
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
                                className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-4 transition-all ${
                                    selected ? 'border-primary bg-primary/10' : 'border-base-content/10 hover:border-base-content/30'
                                }`}
                            >
                                <span className={`${previewSize} font-semibold`}>Aa</span>
                                <span className="text-xs">{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
                <Toggle
                    label="Reduced Motion"
                    description="Minimize animations and transitions"
                    checked={form.data.reduced_motion}
                    onChange={(v) => {
                        form.setData('reduced_motion', v);
                        applyViewPreferences({ reduced_motion: v });
                    }}
                />
                <Toggle
                    label="Compact Mode"
                    description="Use a denser layout with less spacing"
                    checked={form.data.compact_mode}
                    onChange={(v) => {
                        form.setData('compact_mode', v);
                        applyViewPreferences({ compact_mode: v });
                    }}
                />
            </div>

            {/* Save */}
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn btn-primary rounded-xl" disabled={form.processing}>
                    {form.processing ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Appearance'}
                </button>
            </div>
        </form>
    );
}

function LanguageSection({ preferences, options }: { preferences: Record<string, unknown>; options: Record<string, Record<string, string>> }) {
    const form = useForm({
        date_format: preferences.date_format as string,
        time_format: preferences.time_format as string,
        first_day_of_week: preferences.first_day_of_week as string,
        number_format: preferences.number_format as string,
    });

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        form.put('/account/preferences');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Two-column grids matching Livewire layout */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Date Format</span></label>
                    <select value={form.data.date_format} onChange={(e) => form.setData('date_format', e.target.value)} className="select select-bordered rounded-xl focus:select-primary">
                        {Object.entries(options.date_format).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Time Format</span></label>
                    <select value={form.data.time_format} onChange={(e) => form.setData('time_format', e.target.value)} className="select select-bordered rounded-xl focus:select-primary">
                        {Object.entries(options.time_format).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">First Day of Week</span></label>
                    <select value={form.data.first_day_of_week} onChange={(e) => form.setData('first_day_of_week', e.target.value)} className="select select-bordered rounded-xl focus:select-primary">
                        {Object.entries(options.first_day_of_week).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Number Format</span></label>
                    <select value={form.data.number_format} onChange={(e) => form.setData('number_format', e.target.value)} className="select select-bordered rounded-xl focus:select-primary">
                        {Object.entries(options.number_format).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn btn-primary rounded-xl" disabled={form.processing}>
                    {form.processing ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Formats'}
                </button>
            </div>
        </form>
    );
}



function NotificationsSection({ preferences, options }: { preferences: Record<string, unknown>; options: Record<string, Record<string, string>> }) {
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
        form.put('/account/preferences');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-start gap-2 rounded-2xl bg-warning/10 p-3 text-sm text-warning">
                <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                <span>Notification delivery is not yet wired up. These preferences are saved but won't take effect until the notification system is connected.</span>
            </div>

            <div className="space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[.25em] text-primary/80">Delivery</h3>
                <Toggle label="Email Notifications" checked={form.data.email_notifications} onChange={(v) => form.setData('email_notifications', v)} />
                {form.data.email_notifications && (
                    <Select label="Email Frequency" name="email_frequency" options={options.email_frequency} value={form.data.email_frequency} onChange={(e) => form.setData('email_frequency', e.target.value)} />
                )}
                <Toggle label="Push Notifications" checked={form.data.push_notifications} onChange={(v) => form.setData('push_notifications', v)} />
                <Toggle label="In-App Notifications" checked={form.data.in_app_notifications} onChange={(v) => form.setData('in_app_notifications', v)} />
            </div>

            <div className="divider" />

            <div className="space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[.25em] text-primary/80">Notify Me About</h3>
                <Toggle label="Mentions" description="When someone @mentions you" checked={form.data.notify_mentions} onChange={(v) => form.setData('notify_mentions', v)} />
                <Toggle label="Comments" description="New comments on your content" checked={form.data.notify_comments} onChange={(v) => form.setData('notify_comments', v)} />
                <Toggle label="Project Invites" description="When you're invited to a project" checked={form.data.notify_project_invites} onChange={(v) => form.setData('notify_project_invites', v)} />
                <Toggle label="AI Completion" description="When AI tasks finish processing" checked={form.data.notify_ai_completion} onChange={(v) => form.setData('notify_ai_completion', v)} />
            </div>

            <div className="divider" />

            <div className="space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[.25em] text-primary/80">Communications</h3>
                <Toggle label="Marketing Emails" checked={form.data.marketing_emails} onChange={(v) => form.setData('marketing_emails', v)} />
                <Toggle label="Product Updates" checked={form.data.product_updates} onChange={(v) => form.setData('product_updates', v)} />
                <Toggle label="Tips & Tutorials" checked={form.data.tips_and_tutorials} onChange={(v) => form.setData('tips_and_tutorials', v)} />
                <Toggle label="Community Digest" checked={form.data.community_digest} onChange={(v) => form.setData('community_digest', v)} />
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn btn-primary rounded-xl" disabled={form.processing}>
                    {form.processing ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Notifications'}
                </button>
            </div>
        </form>
    );
}

function EditorSection({ preferences, options }: { preferences: Record<string, unknown>; options: Record<string, Record<string, string>> }) {
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
        form.put('/account/preferences');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-start gap-2 rounded-2xl bg-warning/10 p-3 text-sm text-warning">
                <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                <span>Editor settings are saved but not yet applied to the editor interface. This will be connected in a future update.</span>
            </div>

            <Select label="Default Editor Mode" name="default_editor_mode" options={options.editor_mode} value={form.data.default_editor_mode} onChange={(e) => form.setData('default_editor_mode', e.target.value)} />
            <Toggle label="Auto-Save" description="Automatically save your work" checked={form.data.auto_save} onChange={(v) => form.setData('auto_save', v)} />
            {form.data.auto_save && (
                <Select label="Auto-Save Interval" name="auto_save_interval" options={Object.fromEntries(Object.entries(options.auto_save_interval).map(([k, v]) => [k, v]))} value={form.data.auto_save_interval.toString()} onChange={(e) => form.setData('auto_save_interval', parseInt(e.target.value))} />
            )}
            <Toggle label="Spell Check" checked={form.data.spell_check} onChange={(v) => form.setData('spell_check', v)} />
            <Toggle label="Show Word Count" checked={form.data.show_word_count} onChange={(v) => form.setData('show_word_count', v)} />
            <Toggle label="Show Reading Time" checked={form.data.show_reading_time} onChange={(v) => form.setData('show_reading_time', v)} />
            <Select label="Default Note Visibility" name="default_note_visibility" options={options.note_visibility} value={form.data.default_note_visibility} onChange={(e) => form.setData('default_note_visibility', e.target.value)} />

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn btn-primary rounded-xl" disabled={form.processing}>
                    {form.processing ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Editor Settings'}
                </button>
            </div>
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
    const form = useForm({
        screen_reader_mode: preferences.screen_reader_mode as boolean,
        high_contrast: preferences.high_contrast as boolean,
        keyboard_shortcuts: preferences.keyboard_shortcuts as boolean,
        focus_indicators: preferences.focus_indicators as string,
        dyslexia_friendly_font: preferences.dyslexia_friendly_font as boolean,
        reduced_motion: preferences.reduced_motion as boolean,
    });

    function save(key: string, value: string | number | boolean | null) {
        router.put('/account/preferences', { [key]: value }, {
            preserveScroll: true, preserveState: true, preserveUrl: true, only: ['auth'],
        });
    }

    if (subsection === 'visual') {
        return (
            <div className="space-y-6">
                <Toggle
                    label="High Contrast"
                    description="Boost contrast for better visibility"
                    checked={form.data.high_contrast}
                    onChange={(v) => {
                        form.setData('high_contrast', v);
                        applyViewPreferences({ high_contrast: v });
                        save('high_contrast', v);
                    }}
                />
                <Select
                    label="Focus Indicators"
                    name="focus_indicators"
                    options={options.focus_indicators}
                    value={form.data.focus_indicators}
                    onChange={(e) => {
                        form.setData('focus_indicators', e.target.value);
                        applyViewPreferences({ focus_indicators: e.target.value });
                        save('focus_indicators', e.target.value);
                    }}
                />
                <Toggle
                    label="Dyslexia-Friendly Font"
                    description="Use a font designed for easier reading (Atkinson Hyperlegible)"
                    checked={form.data.dyslexia_friendly_font}
                    onChange={(v) => {
                        form.setData('dyslexia_friendly_font', v);
                        applyViewPreferences({ dyslexia_friendly_font: v });
                        save('dyslexia_friendly_font', v);
                    }}
                />
            </div>
        );
    }

    if (subsection === 'motion') {
        return (
            <div className="space-y-6">
                <Toggle
                    label="Reduce Motion"
                    description="Minimize animations and transitions across the app"
                    checked={form.data.reduced_motion}
                    onChange={(v) => {
                        form.setData('reduced_motion', v);
                        applyViewPreferences({ reduced_motion: v });
                        save('reduced_motion', v);
                    }}
                />
                <p className="text-xs text-base-content/50">
                    Your operating system&apos;s reduce-motion setting is also respected automatically.
                </p>
            </div>
        );
    }

    // subsection === 'assistive'
    return (
        <div className="space-y-6">
            <Toggle
                label="Screen Reader Mode"
                description="Optimize the interface for screen readers"
                checked={form.data.screen_reader_mode}
                onChange={(v) => { form.setData('screen_reader_mode', v); save('screen_reader_mode', v); }}
            />
            <Toggle
                label="Keyboard Shortcuts"
                description="Enable keyboard shortcuts for common actions"
                checked={form.data.keyboard_shortcuts}
                onChange={(v) => { form.setData('keyboard_shortcuts', v); save('keyboard_shortcuts', v); }}
            />
        </div>
    );
}
