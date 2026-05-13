import type { CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import type { ViewSettingsProps } from '../types';
import { GALLERY_SORTS, defaultGalleryConfig, type GalleryConfig, type GallerySort } from './types';

const labelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const selectStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    color: 'var(--theme-base-content)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.875rem',
};

export default function GalleryPanel({ value, onChange }: ViewSettingsProps) {
    const t = useT();
    const config = (value.config as unknown as GalleryConfig) ?? defaultGalleryConfig();

    const sortLabels: Record<GallerySort, string> = {
        name: t('views.gallery.sort.name'),
        updated_at: t('views.gallery.sort.updated_at'),
        created_at: t('views.gallery.sort.created_at'),
    };

    function update(next: Partial<GalleryConfig>) {
        onChange({
            ...value,
            config: { ...config, ...next } as unknown as Record<string, unknown>,
        });
    }

    return (
        <div className="space-y-4 p-4">
            <label className="flex cursor-pointer items-center gap-3">
                <input
                    type="checkbox"
                    checked={value.enabled}
                    onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
                    className="alex-checkbox"
                />
                <span className="text-sm">{t('views.gallery.enable')}</span>
            </label>

            <div>
                <label className="mb-1 block text-xs font-semibold" style={labelStyle}>{t('views.gallery.sort_by')}</label>
                <select
                    value={config.sort}
                    onChange={(e) => update({ sort: e.target.value as GallerySort })}
                    className="w-full max-w-xs"
                    style={selectStyle}
                >
                    {GALLERY_SORTS.map((sort) => (
                        <option key={sort} value={sort}>{sortLabels[sort]}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
