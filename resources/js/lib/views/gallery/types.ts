/**
 * Gallery view config — stored on a BlueprintViewEntry's `config` field
 * when Gallery is enabled. See docs/superpowers/plans/2026-04-22-wave-1.5-media-gallery.md.
 *
 * Intentionally minimal per Wave 1.5 spec: enable + sort only.
 * Per-tile sizing, meta-line, and filters are out of scope.
 */

export const GALLERY_SORTS = ['name', 'updated_at', 'created_at'] as const;

export type GallerySort = (typeof GALLERY_SORTS)[number];

export interface GalleryConfig {
    sort: GallerySort;
}

export function defaultGalleryConfig(): GalleryConfig {
    return { sort: 'name' };
}
