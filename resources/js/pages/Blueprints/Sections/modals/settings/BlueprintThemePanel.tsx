import { useState, type CSSProperties } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';

import ThemePresetPicker, {
    getPresetName,
} from '@alexandria/components/theming/ThemePresetPicker';
import TokenOverrideEditor from '@alexandria/components/theming/TokenOverrideEditor';
import useT from '@alexandria/hooks/useT';
import type { ThemeOverridePatch } from '@alexandria/lib/themeOverride';
import type { BlueprintDetail } from '@alexandria/types/blueprints';

/**
 * Page-level project shape (read from currentProject shared prop) —
 * used for the M4.4 inheritance hint that surfaces what preset the
 * blueprint is inheriting when no override is set.
 */
interface SharedProjectThemeProps {
    currentProject?: { theme_preset_slug?: string | null } | null;
    [key: string]: unknown;
}

/**
 * Blueprint Settings Modal → Theme panel — Stage 8b M2.
 *
 * Per-blueprint preset + token override layered on top of the project
 * cascade for the CONTENT area only. Chrome (navbar, sidebar) stays at
 * project scope per the project_chrome_themed_at_project_scope memory.
 *
 * Surface mirrors Project Settings → Theme (same picker + same fine-
 * tune editor) — the only differences are the API endpoint, the
 * inherit-button copy, and the parent scope being project vs user.
 */

const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const fineTuneDividerStyle: CSSProperties = {
    borderColor:
        'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

interface BlueprintThemePanelProps {
    project: { slug: string };
    blueprint: BlueprintDetail;
}

export default function BlueprintThemePanel({
    project,
    blueprint,
}: BlueprintThemePanelProps) {
    const t = useT();
    const page = usePage<SharedProjectThemeProps>();
    const [editorOpen, setEditorOpen] = useState(false);

    // M4.4 — when the blueprint inherits, surface which preset the
    // project is currently set to (or "Default" if the project also
    // inherits all the way up).
    const projectPresetSlug = page.props.currentProject?.theme_preset_slug ?? null;
    const inheritedFromText = t(
        'blueprints.bp_settings.theme.inheriting_from',
    ).replace(':preset', getPresetName(t, projectPresetSlug));

    function applyPreset(slug: string | null) {
        router.patch(
            `/p/${project.slug}/${blueprint.slug}/theme`,
            {
                theme_preset_slug: slug,
                theme_override: blueprint.theme_override,
            } as Record<string, FormDataConvertible>,
            { preserveScroll: true },
        );
    }

    function saveOverride(next: ThemeOverridePatch | null) {
        router.patch(
            `/p/${project.slug}/${blueprint.slug}/theme`,
            {
                theme_preset_slug: blueprint.theme_preset_slug ?? null,
                theme_override: next as Record<string, unknown> | null,
            } as Record<string, FormDataConvertible>,
            { preserveScroll: true },
        );
    }

    return (
        <div className="space-y-6 p-5">
            <p className="text-sm" style={subtleText}>
                {t('blueprints.bp_settings.theme.subtitle')}
            </p>

            <ThemePresetPicker
                activeSlug={blueprint.theme_preset_slug}
                onPick={applyPreset}
                inheritLabelKey="blueprints.bp_settings.theme.inherit_project"
                inheritHintKey="blueprints.bp_settings.theme.inherit_hint"
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
                    {t('blueprints.bp_settings.theme.fine_tune.title')}
                </button>
                <p className="ml-5 mt-1 text-xs" style={subtleText}>
                    {t('blueprints.bp_settings.theme.fine_tune.subtitle')}
                </p>
                {editorOpen && (
                    <div className="mt-4">
                        <TokenOverrideEditor
                            initialOverride={
                                (blueprint.theme_override as ThemeOverridePatch | null) ??
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
