import type { ViewSettingsProps } from '../types';
import { GALLERY_SORTS, defaultGalleryConfig, type GalleryConfig, type GallerySort } from './types';

const SORT_LABELS: Record<GallerySort, string> = {
    name: 'Name (A→Z)',
    updated_at: 'Recently updated',
    created_at: 'Recently created',
};

export default function GalleryPanel({ value, onChange }: ViewSettingsProps) {
    const config = (value.config as unknown as GalleryConfig) ?? defaultGalleryConfig();

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
                    className="checkbox checkbox-primary checkbox-sm"
                />
                <span className="text-sm">Enable Gallery view</span>
            </label>

            <div>
                <label className="mb-1 block text-xs font-semibold text-base-content/60">Sort by</label>
                <select
                    value={config.sort}
                    onChange={(e) => update({ sort: e.target.value as GallerySort })}
                    className="select select-bordered select-sm w-full max-w-xs"
                >
                    {GALLERY_SORTS.map((sort) => (
                        <option key={sort} value={sort}>{SORT_LABELS[sort]}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
