import { useState, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';

import ThemePresetPicker from '@alexandria/components/theming/ThemePresetPicker';
import TokenOverrideEditor from '@alexandria/components/theming/TokenOverrideEditor';
import useT from '@alexandria/hooks/useT';
import type { ThemeOverridePatch } from '@alexandria/lib/themeOverride';
import type { BlueprintDetail } from '@alexandria/types/blueprints';

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
    const [editorOpen, setEditorOpen] = useState(false);

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
            <div>
                <p className="text-sm" style={subtleText}>
                    {t('blueprints.bp_settings.theme.subtitle')}
                </p>
            </div>

            <ThemePresetPicker
                activeSlug={blueprint.theme_preset_slug}
                onPick={applyPreset}
                inheritLabelKey="blueprints.bp_settings.theme.inherit_project"
                inheritHintKey="blueprints.bp_settings.theme.inherit_hint"
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
