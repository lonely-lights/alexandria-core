import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

/**
 * Preset cards + inherit-cascade button. Stage 8b M2 extraction —
 * shared between Project Settings → Theme tab and the Blueprint
 * Settings modal's Theme panel. (M3 will reuse it again for Entry.)
 *
 * Each scope has the same UX:
 *   - Two preset cards (default + cyberpunk) with palette swatches
 *   - Active card gets a primary-tinted border + "Active" pill
 *   - When a preset is currently set, a Reset button below clears
 *     back to the parent scope (user / project / blueprint)
 *
 * The only per-scope differences are the inherit-button copy
 * ("Inherit user theme" vs "Inherit project theme") and what the
 * caller does in `onPick` (call PATCH to the right endpoint).
 *
 * Preset metadata is duplicated from the alexandria-app theming
 * module's PRESETS registry — core can't import from app. The
 * signature hex values mirror each preset's actual brand colors so
 * the swatches preview the real palette without importing the
 * preset definition itself. Keep in sync if a preset's signature
 * colors change.
 */

interface PresetMeta {
    slug: string;
    nameKey: string;
    descriptionKey: string;
    /** Three signature colors painted as preview swatches. */
    swatches: [string, string, string];
}

const PRESETS: PresetMeta[] = [
    {
        slug: 'default',
        nameKey: 'projects.settings_tab.theme.preset.default.name',
        descriptionKey: 'projects.settings_tab.theme.preset.default.description',
        swatches: ['#b27306', '#8dbfa3', '#d87b5a'],
    },
    {
        slug: 'cyberpunk',
        nameKey: 'projects.settings_tab.theme.preset.cyberpunk.name',
        descriptionKey:
            'projects.settings_tab.theme.preset.cyberpunk.description',
        swatches: ['#ff00aa', '#00d4ff', '#aaff00'],
    },
];

interface ThemePresetPickerProps {
    /** Currently-set preset slug at this scope, or null if inheriting. */
    activeSlug: string | null | undefined;
    /** Called when the user picks a preset or clicks Reset (null). */
    onPick: (slug: string | null) => void;
    /** Translation key for the Reset button label (varies by scope). */
    inheritLabelKey: string;
    /** Translation key for the helper text next to the Reset button. */
    inheritHintKey: string;
}

const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const microText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const presetCardBaseStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    transition:
        'border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), box-shadow var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const presetCardIdleStyle: CSSProperties = {
    ...presetCardBaseStyle,
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const presetCardActiveStyle: CSSProperties = {
    ...presetCardBaseStyle,
    border: '2px solid var(--theme-brand-primary-500)',
    boxShadow:
        '0 0 0 4px color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
};

const activePillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.125rem 0.5rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    borderRadius: 'var(--theme-radius-badge)',
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

const swatchRowStyle: CSSProperties = {
    display: 'flex',
    gap: '0.375rem',
};

const swatchStyle = (color: string): CSSProperties => ({
    width: '1.5rem',
    height: '1.5rem',
    background: color,
    borderRadius: '9999px',
    border: '1px solid color-mix(in srgb, black 10%, transparent)',
});

export default function ThemePresetPicker({
    activeSlug,
    onPick,
    inheritLabelKey,
    inheritHintKey,
}: ThemePresetPickerProps) {
    const t = useT();
    // `null`/`undefined` slug means inheriting — default appears active visually.
    const active = activeSlug ?? 'default';
    const hasOverride = activeSlug !== null && activeSlug !== undefined;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
                {PRESETS.map((preset) => {
                    const isActive = active === preset.slug;
                    return (
                        <button
                            key={preset.slug}
                            type="button"
                            onClick={() => onPick(preset.slug)}
                            disabled={isActive}
                            aria-pressed={isActive}
                            className="flex flex-col gap-3 p-4 text-left"
                            style={
                                isActive
                                    ? presetCardActiveStyle
                                    : presetCardIdleStyle
                            }
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold">
                                        {t(preset.nameKey)}
                                    </h3>
                                    <p
                                        className="mt-0.5 text-xs"
                                        style={subtleText}
                                    >
                                        {t(preset.descriptionKey)}
                                    </p>
                                </div>
                                {isActive && (
                                    <span style={activePillStyle}>
                                        <i
                                            className="fa-solid fa-check text-[8px]"
                                            aria-hidden="true"
                                        />
                                        {t(
                                            'projects.settings_tab.theme.active',
                                        )}
                                    </span>
                                )}
                            </div>
                            <div style={swatchRowStyle}>
                                {preset.swatches.map((color) => (
                                    <span
                                        key={color}
                                        style={swatchStyle(color)}
                                        aria-hidden="true"
                                    />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            {hasOverride && (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onPick(null)}
                        className="alex-btn alex-btn--ghost text-xs"
                    >
                        <i
                            className="fa-solid fa-rotate-left mr-1.5"
                            aria-hidden="true"
                        />
                        {t(inheritLabelKey)}
                    </button>
                    <p className="text-xs" style={microText}>
                        {t(inheritHintKey)}
                    </p>
                </div>
            )}
        </div>
    );
}
