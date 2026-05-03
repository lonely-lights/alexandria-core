import { router } from '@inertiajs/react';

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
            className="group flex aspect-[1/1] w-full flex-col overflow-hidden rounded-xl border border-base-content/10 bg-base-200 text-left transition-all hover:border-primary/30 hover:shadow-md"
        >
            <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-base-300/40">
                {src ? (
                    <img
                        src={src}
                        alt={entry.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <i className={`${iconClass} text-4xl text-base-content/20`} aria-hidden="true" />
                )}
            </div>
            <div className="border-t border-base-content/5 bg-base-100/80 px-3 py-2">
                <p className="truncate text-sm font-medium text-base-content">{entry.name}</p>
            </div>
        </button>
    );
}
