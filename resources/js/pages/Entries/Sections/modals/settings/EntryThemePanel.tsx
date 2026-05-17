import { useState, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';

import ThemePresetPicker from '@alexandria/components/theming/ThemePresetPicker';
import TokenOverrideEditor from '@alexandria/components/theming/TokenOverrideEditor';
import useT from '@alexandria/hooks/useT';
import type { ThemeOverridePatch } from '@alexandria/lib/themeOverride';
import type { EntryShowEntry } from '@alexandria/pages/Entries/Show';

/**
 * Entry Settings Modal → Theme panel — Stage 8b M3.
 *
 * Per-entry preset + token override layered on top of the project +
 * blueprint cascade for the CONTENT area only. Chrome (navbar,
 * sidebar) stays at project scope per the
 * project_chrome_themed_at_project_scope memory.
 *
 * Surface mirrors Project Settings → Theme and Blueprint Settings →
 * Theme (same picker + same fine-tune editor) — the only differences
 * are the API endpoint, the inherit-button copy ("Inherit blueprint
 * theme"), and the parent scope being blueprint vs project/user.
 */

const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const fineTuneDividerStyle: CSSProperties = {
    borderColor:
        'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

interface EntryThemePanelProps {
    project: { slug: string };
    blueprint: { slug: string };
    entry: EntryShowEntry;
}

export default function EntryThemePanel({
    project,
    blueprint,
    entry,
}: EntryThemePanelProps) {
    const t = useT();
    const [editorOpen, setEditorOpen] = useState(false);

    function applyPreset(slug: string | null) {
        router.patch(
            `/p/${project.slug}/${blueprint.slug}/${entry.slug}/theme`,
            {
                theme_preset_slug: slug,
                theme_override: entry.theme_override,
            } as Record<string, FormDataConvertible>,
            { preserveScroll: true },
        );
    }

    function saveOverride(next: ThemeOverridePatch | null) {
        router.patch(
            `/p/${project.slug}/${blueprint.slug}/${entry.slug}/theme`,
            {
                theme_preset_slug: entry.theme_preset_slug ?? null,
                theme_override: next as Record<string, unknown> | null,
            } as Record<string, FormDataConvertible>,
            { preserveScroll: true },
        );
    }

    return (
        <div className="space-y-6 p-5">
            <p className="text-sm" style={subtleText}>
                {t('entries.entry_settings.theme.subtitle')}
            </p>

            <ThemePresetPicker
                activeSlug={entry.theme_preset_slug}
                onPick={applyPreset}
                inheritLabelKey="entries.entry_settings.theme.inherit_blueprint"
                inheritHintKey="entries.entry_settings.theme.inherit_hint"
            />

            {/* Fine-tune disclosure */}
            <div className="border-t pt-6" style={fineTuneDividerStyle}>
                <button
                    type="button"
                    onClick={() => setEditorOpen((open) => !open)}
                    aria-expanded={editorOpen}
                    className="flex items-center gap-2 text-sm font-semibold"
                >
                    <i
                        className={`fa-solid fa-chevron-right text-xs ${editorOpen ? 'rotate-90' : ''} transition-transform`}
                        aria-hidden="true"
                    />
                    {t('entries.entry_settings.theme.fine_tune.title')}
                </button>
                <p className="ml-5 mt-1 text-xs" style={subtleText}>
                    {t('entries.entry_settings.theme.fine_tune.subtitle')}
                </p>
                {editorOpen && (
                    <div className="mt-4">
                        <TokenOverrideEditor
                            initialOverride={
                                (entry.theme_override as ThemeOverridePatch | null) ??
                                null
                            }
                            onSave={saveOverride}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
