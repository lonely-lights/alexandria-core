import {
    type CSSProperties,
    type ReactNode,
    useState,
    useEffect,
    useCallback,
} from "react";
import useT from "@alexandria/hooks/useT";
import Modal from "@alexandria/components/ui/Modal";
import ImageUploader from "./ImageUploader";
import GalleryGrid from "./GalleryGrid";
import type { MediaItem, MediaModelType } from "@alexandria/types/media";

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
    /**
     * Consumer-owned replacement for the default page-image card. Used by
     * richer products without copying the complete Entry page from core.
     */
    pageImageSlot?: ReactNode;
    onMediaChanged?: () => void;
}

/* ── Theme-token style recipes ────────────────────────────────────
 * MediaSection has three media-type accents (page_image=primary,
 * banner=secondary, gallery=accent). The shared card chrome lives
 * here; per-type hover tints derive from the brand palette. */

const cardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-200)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "all var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const dashedDropStyle: CSSProperties = {
    border: "2px dashed color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "all var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

function iconWrapStyle(
    brand: "primary" | "secondary" | "accent",
    strength: number,
): CSSProperties {
    return {
        background: `color-mix(in srgb, var(--theme-brand-${brand}-500) ${strength}%, transparent)`,
        borderRadius: "9999px",
    };
}

function iconWrapSquareStyle(
    brand: "primary" | "secondary" | "accent",
    strength: number,
): CSSProperties {
    return {
        background: `color-mix(in srgb, var(--theme-brand-${brand}-500) ${strength}%, transparent)`,
        borderRadius: "var(--theme-radius-card)",
    };
}

const primaryHalfStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)",
};
const secondaryHalfStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-brand-secondary-500) 60%, transparent)",
};
const accentStyle: CSSProperties = { color: "var(--theme-brand-accent-500)" };
const primaryStyle: CSSProperties = { color: "var(--theme-brand-primary-500)" };

const helperStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const helperFainterStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const helperSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const helperGhostStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
};

const errorTextStyle: CSSProperties = {
    color: "var(--theme-status-error-stroke)",
};

const ghostBtnStyle: CSSProperties = {
    borderRadius: "var(--theme-radius-button)",
};

export default function MediaSection({
    modelType,
    modelId,
    showGallery = false,
    compact = false,
    pageImageSlot,
    onMediaChanged,
}: MediaSectionProps) {
    const t = useT();
    // Compact mode always shows the gallery tile.
    const galleryEnabled = showGallery || compact;
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadCollection, setUploadCollection] = useState<
        "page_image" | "banner" | "gallery" | null
    >(null);
    const [galleryModalOpen, setGalleryModalOpen] = useState(false);

    const fetchMedia = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/${modelType}/${modelId}/media`, {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            });
            if (res.ok) setMedia(await res.json());
        } finally {
            setLoading(false);
        }
    }, [modelType, modelId]);

    useEffect(() => {
        void fetchMedia();
    }, [fetchMedia]);

    const pageImage = media.find((m) => m.collection === "page_image");
    const banner = media.find((m) => m.collection === "banner");
    const galleryImages = media.filter((m) => m.collection === "gallery");

    async function removeMedia(mediaId: number) {
        if (!confirm(t("entries.media.confirm.remove_image"))) return;
        const csrfToken =
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? "";
        await fetch(`/api/v1/${modelType}/${modelId}/media/${mediaId}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-TOKEN": csrfToken,
            },
            credentials: "same-origin",
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
                <i
                    className="fa-solid fa-circle-notch fa-spin text-base"
                    style={helperFainterStyle}
                />
            </div>
        );
    }

    const pageImageCard = (
        <div className="p-5" style={cardStyle}>
            <div className="flex items-start gap-5">
                {pageImage ? (
                    <img
                        src={
                            pageImage.conversions.square ??
                            pageImage.original_url
                        }
                        alt={pageImage.alt_text ?? ""}
                        className="h-24 w-24 flex-shrink-0 rounded-xl object-cover shadow-sm"
                    />
                ) : (
                    <button
                        onClick={() => setUploadCollection("page_image")}
                        className="alex-row flex h-24 w-24 flex-shrink-0 items-center justify-center"
                        style={dashedDropStyle}
                    >
                        <div className="text-center">
                            <i
                                className="fa-solid fa-plus text-lg"
                                style={helperGhostStyle}
                            />
                            <p
                                className="mt-1 text-[10px]"
                                style={helperSoftStyle}
                            >
                                Upload
                            </p>
                        </div>
                    </button>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <i
                            className="fa-solid fa-image"
                            style={primaryHalfStyle}
                        />
                        {t("entries.media.page_image.title")}
                    </h3>
                    <p className="mt-0.5 text-xs" style={helperStyle}>
                        {t("entries.media.page_image.subtitle")}
                    </p>
                    {pageImage?.alt_text && (
                        <p className="mt-2 text-xs" style={helperFainterStyle}>
                            {t("entries.media.alt_prefix").replace(
                                ":text",
                                pageImage.alt_text,
                            )}
                        </p>
                    )}
                    {pageImage && (
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() =>
                                    setUploadCollection("page_image")
                                }
                                className="alex-btn alex-btn--ghost inline-flex items-center px-2 py-1 text-xs"
                                style={ghostBtnStyle}
                            >
                                {t("entries.media.action.change")}
                            </button>
                            <button
                                onClick={() => void removeMedia(pageImage.id)}
                                className="alex-btn alex-btn--ghost inline-flex items-center px-2 py-1 text-xs"
                                style={{ ...ghostBtnStyle, ...errorTextStyle }}
                            >
                                {t("common.remove")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const bannerCard = (
        <div className="p-5" style={cardStyle}>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <i
                    className="fa-solid fa-panorama"
                    style={secondaryHalfStyle}
                />
                {t("entries.media.banner.title")}
            </h3>
            <p className="mb-3 text-xs" style={helperStyle}>
                {t("entries.media.banner.subtitle")}
            </p>
            {banner ? (
                <div className="space-y-3">
                    <img
                        src={banner.conversions.desktop ?? banner.original_url}
                        alt={banner.alt_text ?? ""}
                        className="aspect-[1920/400] w-full rounded-lg object-cover shadow-sm"
                    />
                    {banner.alt_text && (
                        <p className="text-xs" style={helperFainterStyle}>
                            {t("entries.media.alt_prefix").replace(
                                ":text",
                                banner.alt_text,
                            )}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setUploadCollection("banner")}
                            className="alex-btn alex-btn--ghost inline-flex items-center px-2 py-1 text-xs"
                            style={ghostBtnStyle}
                        >
                            {t("entries.media.action.change")}
                        </button>
                        <button
                            onClick={() => void removeMedia(banner.id)}
                            className="alex-btn alex-btn--ghost inline-flex items-center px-2 py-1 text-xs"
                            style={{ ...ghostBtnStyle, ...errorTextStyle }}
                        >
                            {t("common.remove")}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setUploadCollection("banner")}
                    className="alex-row flex aspect-[1920/400] w-full items-center justify-center"
                    style={dashedDropStyle}
                >
                    <div className="text-center">
                        <i
                            className="fa-solid fa-plus text-lg"
                            style={helperGhostStyle}
                        />
                        <p className="mt-1 text-xs" style={helperSoftStyle}>
                            {t("entries.media.banner.upload")}
                        </p>
                    </div>
                </button>
            )}
        </div>
    );

    const galleryButton = galleryEnabled ? (
        <button
            type="button"
            data-media-gallery-trigger
            onClick={() => setGalleryModalOpen(true)}
            className="alex-row flex w-full items-center gap-3 p-4 text-left"
            style={cardStyle}
        >
            <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center"
                style={iconWrapSquareStyle("accent", 15)}
            >
                <i className="fa-solid fa-images" style={accentStyle} />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">
                    {t("entries.media.gallery.title")}
                </h3>
                <p className="text-xs" style={helperStyle}>
                    {galleryImages.length === 0
                        ? t("entries.media.gallery.empty")
                        : t(
                              galleryImages.length === 1
                                  ? "entries.media.gallery.summary.singular"
                                  : "entries.media.gallery.summary.plural",
                          ).replace(":count", String(galleryImages.length))}
                </p>
            </div>
            <i
                className="fa-solid fa-arrow-right text-xs"
                style={helperSoftStyle}
            />
        </button>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Compact mode (sidebar): only the gallery tile shows here.
                Page image + banner live inside the modal so the narrow
                sidebar stays clean. Default mode renders everything inline. */}
            {!compact && (pageImageSlot ?? pageImageCard)}
            {!compact && bannerCard}
            {galleryButton}

            {/* Gallery modal — wide layout. In compact mode it ALSO carries
                page image + banner alongside the gallery grid (so the
                sidebar tile is the single entry point to all media for
                the entry). In non-compact mode it's gallery-only since
                page+banner are already inline. */}
            {galleryModalOpen && (
                <Modal
                    open={true}
                    onClose={() => setGalleryModalOpen(false)}
                    maxWidth="max-w-6xl"
                >
                    <div className="min-h-0 overflow-y-auto p-6">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                                    style={iconWrapStyle("accent", 20)}
                                >
                                    <i
                                        className="fa-solid fa-photo-film"
                                        style={accentStyle}
                                    />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">
                                        {t("entries.media.modal.title")}
                                    </h3>
                                    <p
                                        className="text-xs"
                                        style={helperFainterStyle}
                                    >
                                        {t(
                                            galleryImages.length === 1
                                                ? "entries.media.modal.subtitle.singular"
                                                : "entries.media.modal.subtitle.plural",
                                        ).replace(
                                            ":count",
                                            String(galleryImages.length),
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setUploadCollection("gallery")}
                                className="alex-btn alex-btn--primary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
                                style={ghostBtnStyle}
                            >
                                <i className="fa-solid fa-plus text-xs" />{" "}
                                {t("entries.media.modal.add_image")}
                            </button>
                        </div>

                        {compact ? (
                            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                                <div>
                                    <h4
                                        className="mb-2 text-xs font-semibold uppercase tracking-wider"
                                        style={helperStyle}
                                    >
                                        {t("entries.media.gallery.title")}
                                    </h4>
                                    <GalleryGrid
                                        images={galleryImages}
                                        modelType={modelType}
                                        modelId={modelId}
                                        onChanged={() => {
                                            void fetchMedia();
                                            onMediaChanged?.();
                                        }}
                                    />
                                </div>
                                <div className="space-y-4">
                                    {pageImageSlot ?? pageImageCard}
                                    {bannerCard}
                                </div>
                            </div>
                        ) : (
                            <GalleryGrid
                                images={galleryImages}
                                modelType={modelType}
                                modelId={modelId}
                                onChanged={() => {
                                    void fetchMedia();
                                    onMediaChanged?.();
                                }}
                            />
                        )}
                    </div>
                </Modal>
            )}

            {/* Upload Modal */}
            {uploadCollection && (
                <Modal
                    open={true}
                    onClose={() => setUploadCollection(null)}
                    maxWidth="max-w-lg"
                >
                    <div className="p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                                style={iconWrapStyle("primary", 20)}
                            >
                                <i
                                    className="fa-solid fa-cloud-arrow-up"
                                    style={primaryStyle}
                                />
                            </div>
                            <div>
                                <h3 className="font-bold">
                                    {t("entries.media.upload.title").replace(
                                        ":type",
                                        uploadCollection === "page_image"
                                            ? t(
                                                  "entries.media.upload.types.page_image",
                                              )
                                            : uploadCollection === "banner"
                                              ? t(
                                                    "entries.media.upload.types.banner",
                                                )
                                              : t(
                                                    "entries.media.upload.types.gallery_image",
                                                ),
                                    )}
                                </h3>
                                <p
                                    className="text-xs"
                                    style={helperFainterStyle}
                                >
                                    {t("entries.media.upload.formats")}
                                </p>
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
