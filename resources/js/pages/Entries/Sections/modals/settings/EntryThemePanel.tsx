import { useState, type CSSProperties } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';

import ThemePresetPicker, {
    getPresetName,
} from '@alexandria/components/theming/ThemePresetPicker';
import TokenOverrideEditor from '@alexandria/components/theming/TokenOverrideEditor';
import useT from '@alexandria/hooks/useT';
import type { ThemeOverridePatch } from '@alexandria/lib/themeOverride';
import type { EntryShowEntry } from '@alexandria/pages/Entries/Show';

/**
 * Page-level theme shape (read from currentProject + blueprint shared
 * props) — used for the M4.4 inheritance hint that walks up the
 * cascade to find which parent scope the entry is inheriting from.
 */
interface SharedCascadeThemeProps {
    currentProject?: { theme_preset_slug?: string | null } | null;
    blueprint?: { theme_preset_slug?: string | null } | null;
    [key: string]: unknown;
}

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
    const page = usePage<SharedCascadeThemeProps>();
    const [editorOpen, setEditorOpen] = useState(false);

    // M4.4 — walk up the cascade to find the active parent preset.
    // Blueprint preset takes precedence over project; if both are
    // null we fall back to "Default" (account-level user preference,
    // which isn't yet surfaced server-side).
    const blueprintPresetSlug = page.props.blueprint?.theme_preset_slug ?? null;
    const projectPresetSlug = page.props.currentProject?.theme_preset_slug ?? null;
    const parentSlug = blueprintPresetSlug ?? projectPresetSlug;
    const parentScope = blueprintPresetSlug
        ? 'blueprint'
        : projectPresetSlug
          ? 'project'
          : 'default';
    const inheritedFromText = t(
        `entries.entry_settings.theme.inheriting_from_${parentScope}`,
    ).replace(':preset', getPresetName(t, parentSlug));

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
                inheritedFromText={inheritedFromText}
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
