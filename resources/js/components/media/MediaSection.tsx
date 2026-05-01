import { useState, useEffect, useCallback } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import ImageUploader from './ImageUploader';
import GalleryGrid from './GalleryGrid';
import type { MediaItem, MediaModelType } from '@alexandria/types/media';

interface MediaSectionProps {
    modelType: MediaModelType;
    modelId: number;
    /**
     * Render gallery alongside page_image + banner. Adds a gallery click-tile
     * (in compact mode) or an inline gallery card (in default mode).
     */
    showGallery?: boolean;
    /**
     * Sidebar mode used by EntryForm. Renders ONLY the gallery click-tile
     * — page image + banner move into the modal so the sidebar stays small.
     * Implies showGallery=true.
     */
    compact?: boolean;
    onMediaChanged?: () => void;
}

export default function MediaSection({ modelType, modelId, showGallery = false, compact = false, onMediaChanged }: MediaSectionProps) {
    // Compact mode always shows the gallery tile.
    const galleryEnabled = showGallery || compact;
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadCollection, setUploadCollection] = useState<'page_image' | 'banner' | 'gallery' | null>(null);
    const [galleryModalOpen, setGalleryModalOpen] = useState(false);

    const fetchMedia = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/${modelType}/${modelId}/media`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (res.ok) setMedia(await res.json());
        } finally {
            setLoading(false);
        }
    }, [modelType, modelId]);

    useEffect(() => { void fetchMedia(); }, [fetchMedia]);

    const pageImage = media.find((m) => m.collection === 'page_image');
    const banner = media.find((m) => m.collection === 'banner');
    const galleryImages = media.filter((m) => m.collection === 'gallery');

    async function removeMedia(mediaId: number) {
        if (!confirm('Remove this image?')) return;
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        await fetch(`/api/v1/${modelType}/${modelId}/media/${mediaId}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrfToken },
            credentials: 'same-origin',
        });
        void fetchMedia();
        onMediaChanged?.();
    }

    function handleUploaded() {
        setUploadCollection(null);
        void fetchMedia();
        onMediaChanged?.();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-md" />
            </div>
        );
    }

    const pageImageCard = (
        <div className="rounded-xl border border-base-content/10 bg-base-200 p-5">
            <div className="flex items-start gap-5">
                {pageImage ? (
                    <img
                        src={pageImage.conversions.square ?? pageImage.original_url}
                        alt={pageImage.alt_text ?? ''}
                        className="h-24 w-24 flex-shrink-0 rounded-xl object-cover shadow-sm"
                    />
                ) : (
                    <button
                        onClick={() => setUploadCollection('page_image')}
                        className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-base-content/15 transition-colors hover:border-primary/30 hover:bg-base-300/40"
                    >
                        <div className="text-center">
                            <i className="fa-solid fa-plus text-lg text-base-content/20" />
                            <p className="mt-1 text-[10px] text-base-content/30">Upload</p>
                        </div>
                    </button>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <i className="fa-solid fa-image text-primary/60" />
                        Page Image
                    </h3>
                    <p className="mt-0.5 text-xs text-base-content/50">
                        Square thumbnail shown across the site.
                    </p>
                    {pageImage?.alt_text && (
                        <p className="mt-2 text-xs text-base-content/40">Alt: {pageImage.alt_text}</p>
                    )}
                    {pageImage && (
                        <div className="mt-3 flex gap-2">
                            <button onClick={() => setUploadCollection('page_image')} className="btn btn-ghost btn-xs">Change</button>
                            <button onClick={() => void removeMedia(pageImage.id)} className="btn btn-ghost btn-xs text-error">Remove</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const bannerCard = (
        <div className="rounded-xl border border-base-content/10 bg-base-200 p-5">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <i className="fa-solid fa-panorama text-secondary/60" />
                Banner
            </h3>
            <p className="mb-3 text-xs text-base-content/50">
                Wide hero image used on pages and listings (approx. 1920×400).
            </p>
            {banner ? (
                <div className="space-y-3">
                    <img
                        src={banner.conversions.desktop ?? banner.original_url}
                        alt={banner.alt_text ?? ''}
                        className="aspect-[1920/400] w-full rounded-lg object-cover shadow-sm"
                    />
                    {banner.alt_text && <p className="text-xs text-base-content/40">Alt: {banner.alt_text}</p>}
                    <div className="flex gap-2">
                        <button onClick={() => setUploadCollection('banner')} className="btn btn-ghost btn-xs">Change</button>
                        <button onClick={() => void removeMedia(banner.id)} className="btn btn-ghost btn-xs text-error">Remove</button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setUploadCollection('banner')}
                    className="flex aspect-[1920/400] w-full items-center justify-center rounded-lg border-2 border-dashed border-base-content/15 transition-colors hover:border-secondary/30 hover:bg-base-300/40"
                >
                    <div className="text-center">
                        <i className="fa-solid fa-plus text-lg text-base-content/20" />
                        <p className="mt-1 text-xs text-base-content/30">Upload Banner</p>
                    </div>
                </button>
            )}
        </div>
    );

    const galleryButton = galleryEnabled ? (
        <button
            type="button"
            onClick={() => setGalleryModalOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-base-content/10 bg-base-200 p-4 text-left transition-colors hover:border-accent/30 hover:bg-base-300/40"
        >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15">
                <i className="fa-solid fa-images text-accent" />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Gallery</h3>
                <p className="text-xs text-base-content/50">
                    {galleryImages.length === 0
                        ? 'No images — click to add'
                        : `${galleryImages.length} image${galleryImages.length === 1 ? '' : 's'} — click to manage`}
                </p>
            </div>
            <i className="fa-solid fa-arrow-right text-xs text-base-content/30" />
        </button>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Compact mode (sidebar): only the gallery tile shows here.
                Page image + banner live inside the modal so the narrow
                sidebar stays clean. Default mode renders everything inline. */}
            {!compact && pageImageCard}
            {!compact && bannerCard}
            {galleryButton}

            {/* Gallery modal — wide layout. In compact mode it ALSO carries
                page image + banner alongside the gallery grid (so the
                sidebar tile is the single entry point to all media for
                the entry). In non-compact mode it's gallery-only since
                page+banner are already inline. */}
            {galleryModalOpen && (
                <Modal open={true} onClose={() => setGalleryModalOpen(false)} maxWidth="max-w-6xl">
                    <div className="p-6">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/20">
                                    <i className="fa-solid fa-photo-film text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Media</h3>
                                    <p className="text-xs text-base-content/40">
                                        {galleryImages.length} gallery image{galleryImages.length === 1 ? '' : 's'} attached
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setUploadCollection('gallery')}
                                className="btn btn-primary btn-sm gap-1.5"
                            >
                                <i className="fa-solid fa-plus text-xs" /> Add Image
                            </button>
                        </div>

                        {compact ? (
                            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                                <div>
                                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">Gallery</h4>
                                    <GalleryGrid
                                        images={galleryImages}
                                        modelType={modelType}
                                        modelId={modelId}
                                        onChanged={() => { void fetchMedia(); onMediaChanged?.(); }}
                                    />
                                </div>
                                <div className="space-y-4">
                                    {pageImageCard}
                                    {bannerCard}
                                </div>
                            </div>
                        ) : (
                            <GalleryGrid
                                images={galleryImages}
                                modelType={modelType}
                                modelId={modelId}
                                onChanged={() => { void fetchMedia(); onMediaChanged?.(); }}
                            />
                        )}
                    </div>
                </Modal>
            )}

            {/* Upload Modal */}
            {uploadCollection && (
                <Modal open={true} onClose={() => setUploadCollection(null)} maxWidth="max-w-lg">
                    <div className="p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                                <i className="fa-solid fa-cloud-arrow-up text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold">
                                    Upload {uploadCollection === 'page_image' ? 'Page Image' : uploadCollection === 'banner' ? 'Banner' : 'Gallery Image'}
                                </h3>
                                <p className="text-xs text-base-content/40">JPEG, PNG, or WebP</p>
                            </div>
                        </div>
                        <ImageUploader
                            modelType={modelType}
                            modelId={modelId}
                            collection={uploadCollection}
                            onUploaded={handleUploaded}
                            onClose={() => setUploadCollection(null)}
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
}
