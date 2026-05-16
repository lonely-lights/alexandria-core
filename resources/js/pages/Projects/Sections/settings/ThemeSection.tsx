import type { CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';

import useT from '@alexandria/hooks/useT';
import type { ProjectDetail } from '@alexandria/types/projects';

/**
 * Project Settings → Theme tab — Stage 8b M1.B.
 *
 * Picks the named preset that drives both the chrome cascade
 * (navbar + sidebar) and the content cascade for this project.
 * Token-level overrides (the editor surface) land in M1.C; this
 * milestone ships preset selection only.
 *
 * Preset metadata is duplicated here because presets live in the
 * consumer app's theming module (alexandria-app/resources/js/theming/),
 * not in core. The signature hex values below mirror each preset's
 * actual `brand.primary/secondary/accent` so the swatches preview the
 * real palette without importing the preset itself. Keep in sync if
 * a preset's signature colors change, or refactor to a shared prop in
 * a later milestone.
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

export default function ThemeSection({
    project,
}: {
    project: ProjectDetail;
}) {
    const t = useT();
    // Inactive slug = inherit user-level preset.
    const active = project.theme_preset_slug ?? 'default';

    function applyPreset(slug: string | null) {
        router.patch(
            `/p/${project.slug}/theme`,
            {
                theme_preset_slug: slug,
                // M1.B doesn't touch overrides — those land in M1.C.
                theme_override: project.theme_override,
            } as Record<string, FormDataConvertible>,
            { preserveScroll: true },
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold">
                    {t('projects.settings_tab.theme.title')}
                </h2>
                <p className="text-sm" style={subtleText}>
                    {t('projects.settings_tab.theme.subtitle')}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {PRESETS.map((preset) => {
                    const isActive = active === preset.slug;
                    return (
                        <button
                            key={preset.slug}
                            type="button"
                            onClick={() => applyPreset(preset.slug)}
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

            {project.theme_preset_slug !== null && (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => applyPreset(null)}
                        className="alex-btn alex-btn--ghost text-xs"
                    >
                        <i
                            className="fa-solid fa-rotate-left mr-1.5"
                            aria-hidden="true"
                        />
                        {t('projects.settings_tab.theme.inherit_user')}
                    </button>
                    <p className="text-xs" style={microText}>
                        {t('projects.settings_tab.theme.inherit_hint')}
                    </p>
                </div>
            )}
        </div>
    );
}
