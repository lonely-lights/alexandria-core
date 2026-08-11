import { useState, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';

import ThemePresetPicker from '@alexandria/components/theming/ThemePresetPicker';
import TokenOverrideEditor from '@alexandria/components/theming/TokenOverrideEditor';
import useT from '@alexandria/hooks/useT';
import type { ThemeOverridePatch } from '@alexandria/lib/themeOverride';
import { projectUrl } from '@alexandria/lib/urls';
import type { ProjectDetail } from '@alexandria/types/projects';

/**
 * Project Settings → Theme tab — Stage 8b M1.B + M1.C + M2.
 *
 * Two layered surfaces:
 *   - Preset picker (M1.B) — picks the base theme via ThemePresetPicker
 *   - Fine-tune token editor (M1.C) — sparse DeepPartial<ThemeTokens>
 *     overrides layered on top, with live preview through the cascade
 *
 * Both surfaces save through PATCH /p/{slug}/theme. The picker passes
 * `theme_preset_slug`; the editor passes `theme_override`. Both pass
 * the OTHER field's current value verbatim so the unchanged side is
 * preserved.
 */

const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const fineTuneDividerStyle: CSSProperties = {
    borderColor:
        'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

export default function ThemeSection({
    project,
}: {
    project: ProjectDetail;
}) {
    const t = useT();
    const [editorOpen, setEditorOpen] = useState(false);

    function applyPreset(slug: string | null) {
        router.patch(
            `${projectUrl(project.slug)}/theme`,
            {
                theme_preset_slug: slug,
                theme_override: project.theme_override,
            } as Record<string, FormDataConvertible>,
            { preserveScroll: true },
        );
    }

    function saveOverride(next: ThemeOverridePatch | null) {
        router.patch(
            `${projectUrl(project.slug)}/theme`,
            {
                theme_preset_slug: project.theme_preset_slug,
                theme_override: next as Record<string, unknown> | null,
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

            <ThemePresetPicker
                activeSlug={project.theme_preset_slug}
                onPick={applyPreset}
                inheritLabelKey="projects.settings_tab.theme.inherit_user"
                inheritHintKey="projects.settings_tab.theme.inherit_hint"
            />

            {/* Fine-tune disclosure — Stage 8b M1.C.1 */}
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
                    {t('projects.settings_tab.theme.fine_tune.title')}
                </button>
                <p className="ml-5 mt-1 text-xs" style={subtleText}>
                    {t('projects.settings_tab.theme.fine_tune.subtitle')}
                </p>
                {editorOpen && (
                    <div className="mt-4">
                        <TokenOverrideEditor
                            initialOverride={
                                (project.theme_override as ThemeOverridePatch | null) ??
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
