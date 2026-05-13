import { router } from '@inertiajs/react';
import type { CSSProperties } from 'react';

export interface GalleryEntry {
    id: number;
    name: string;
    slug: string;
    url: string;
    icon?: string | null;
    effective_page_image_url: string | null;
    gallery_tile_url: string | null;
    created_at_iso?: string | null;
    updated_at_iso?: string | null;
}

interface GalleryTileProps {
    entry: GalleryEntry;
}

const tileStyle: CSSProperties = {
    background: 'var(--theme-base-200)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const imageWellStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-300) 40%, transparent)',
};

const captionStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-100) 80%, transparent)',
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    color: 'var(--theme-base-content)',
};

const placeholderIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

/**
 * Resolve the tile image source via the three-step fallback:
 * effective_page_image → first gallery thumb → null (placeholder).
 */
function resolveTileSource(entry: GalleryEntry): string | null {
    return (
        entry.effective_page_image_url ||
        entry.gallery_tile_url ||
        null
    );
}

export default function GalleryTile({ entry }: GalleryTileProps) {
    const src = resolveTileSource(entry);
    const iconClass = entry.icon
        ? (entry.icon.includes(' ') ? entry.icon : `fa-solid ${entry.icon}`)
        : 'fa-solid fa-cube';

    return (
        <button
            type="button"
            onClick={() => router.visit(entry.url)}
            className="alex-gallery-tile group flex aspect-[1/1] w-full flex-col overflow-hidden text-left"
            style={tileStyle}
        >
            <div className="relative flex flex-1 items-center justify-center overflow-hidden" style={imageWellStyle}>
                {src ? (
                    <img
                        src={src}
                        alt={entry.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <i className={`${iconClass} text-4xl`} style={placeholderIconStyle} aria-hidden="true" />
                )}
            </div>
            <div className="px-3 py-2" style={captionStyle}>
                <p className="truncate text-sm font-medium">{entry.name}</p>
            </div>
        </button>
    );
}
