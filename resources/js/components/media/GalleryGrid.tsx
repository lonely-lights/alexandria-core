import { useState, type CSSProperties } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import MediaMetadataForm from './MediaMetadataForm';

interface GalleryImage {
    id: number;
    original_url: string;
    conversions: Record<string, string>;
    alt_text: string | null;
    caption: string | null;
}

interface GalleryGridProps {
    images: GalleryImage[];
    modelType: 'projects' | 'blueprints' | 'entries';
    modelId: number;
    onChanged: () => void;
}

const emptyStateStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 0',
    textAlign: 'center',
    borderRadius: 'var(--theme-radius-card)',
    border: '2px dashed color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const tileBaseStyle: CSSProperties = {
    position: 'relative',
    aspectRatio: '1 / 1',
    overflow: 'hidden',
    borderRadius: 'var(--theme-radius-input)',
    background: 'var(--theme-base-200)',
    transition: 'box-shadow var(--theme-motion-duration-fast, 150ms) ease',
};

const tileActiveStyle: CSSProperties = {
    boxShadow: '0 0 0 2px var(--theme-brand-primary-500)',
};

const tileIdleStyle: CSSProperties = {
    boxShadow: '0 0 0 2px transparent',
};

const overlayStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    background: 'color-mix(in srgb, var(--theme-base-300) 80%, transparent)',
};

const overlayBtnBase: CSSProperties = {
    width: '7rem',
    padding: '0.25rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--theme-radius-button)',
    background: 'transparent',
    color: 'var(--theme-base-content)',
    transition: 'background var(--theme-motion-duration-fast, 150ms) ease',
};

const overlayBtnDangerStyle: CSSProperties = {
    ...overlayBtnBase,
    background: 'var(--theme-status-error-stroke)',
    color: 'var(--theme-status-error-content, white)',
};

const altCaptionOverlayStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    background: 'color-mix(in srgb, var(--theme-base-300) 70%, transparent)',
    padding: '0.125rem 0.375rem',
    fontSize: '0.625rem',
    color: 'var(--theme-base-content)',
};

const editPanelStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-card)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'var(--theme-base-200)',
    padding: '1rem',
};

const closeBtnStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.5rem',
    height: '1.5rem',
    border: 'none',
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    cursor: 'pointer',
    fontSize: '0.875rem',
};

const spinnerStyle: CSSProperties = {
    fontSize: '0.625rem',
};

export default function GalleryGrid({ images, modelType, modelId, onChanged }: GalleryGridProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [promotingId, setPromotingId] = useState<{ id: number; target: 'page_image' | 'banner' } | null>(null);

    const thumbnailUrl = (image: GalleryImage): string =>
        image.conversions['gallery_thumb'] ?? image.conversions['thumb'] ?? image.original_url;

    const handleDelete = async (image: GalleryImage) => {
        if (!window.confirm('Delete this image? This cannot be undone.')) {
            return;
        }

        setDeletingId(image.id);

        try {
            await fetch(`/api/v1/${modelType}/${modelId}/media/${image.id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: csrfHeaders(),
            });
            onChanged();
        } finally {
            setDeletingId(null);
        }
    };

    const handlePromote = async (image: GalleryImage, target: 'page_image' | 'banner') => {
        setPromotingId({ id: image.id, target });

        try {
            await fetch(`/api/v1/${modelType}/${modelId}/media/${image.id}/promote`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: csrfHeaders(),
                body: JSON.stringify({ target }),
            });
            onChanged();
        } finally {
            setPromotingId(null);
        }
    };

    const editingImage = images.find((img) => img.id === editingId) ?? null;

    if (images.length === 0) {
        return (
            <div style={emptyStateStyle}>
                <p className="text-sm opacity-50">No images</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {images.map((image) => {
                    const isPromotingPage = promotingId?.id === image.id && promotingId?.target === 'page_image';
                    const isPromotingBanner = promotingId?.id === image.id && promotingId?.target === 'banner';
                    const isDeleting = deletingId === image.id;
                    const isEditing = editingId === image.id;

                    return (
                        <div
                            key={image.id}
                            className="group"
                            style={{ ...tileBaseStyle, ...(isEditing ? tileActiveStyle : tileIdleStyle) }}
                        >
                            <img
                                src={thumbnailUrl(image)}
                                alt={image.alt_text ?? ''}
                                className="h-full w-full object-cover"
                            />

                            {/* Hover overlay */}
                            <div
                                className="opacity-0 transition-opacity group-hover:opacity-100"
                                style={overlayStyle}
                            >
                                <button
                                    type="button"
                                    className="alex-gallery-overlay-btn"
                                    style={overlayBtnBase}
                                    disabled={isPromotingPage}
                                    onClick={() => handlePromote(image, 'page_image')}
                                    title="Use this image as the entry's page image"
                                >
                                    {isPromotingPage
                                        ? <i className="fa-solid fa-circle-notch fa-spin" style={spinnerStyle} />
                                        : 'Use as page'}
                                </button>
                                <button
                                    type="button"
                                    className="alex-gallery-overlay-btn"
                                    style={overlayBtnBase}
                                    disabled={isPromotingBanner}
                                    onClick={() => handlePromote(image, 'banner')}
                                    title="Use this image as the entry's banner"
                                >
                                    {isPromotingBanner
                                        ? <i className="fa-solid fa-circle-notch fa-spin" style={spinnerStyle} />
                                        : 'Use as banner'}
                                </button>
                                <button
                                    type="button"
                                    className="alex-gallery-overlay-btn"
                                    style={overlayBtnBase}
                                    onClick={() => setEditingId(isEditing ? null : image.id)}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    style={overlayBtnDangerStyle}
                                    disabled={isDeleting}
                                    onClick={() => handleDelete(image)}
                                >
                                    {isDeleting
                                        ? <i className="fa-solid fa-circle-notch fa-spin" style={spinnerStyle} />
                                        : 'Delete'}
                                </button>
                            </div>

                            {/* Alt text overlay at bottom */}
                            {image.alt_text && (
                                <div
                                    className="opacity-0 transition-opacity group-hover:opacity-100"
                                    style={altCaptionOverlayStyle}
                                >
                                    {image.alt_text}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Expanded metadata form */}
            {editingImage && (
                <div style={editPanelStyle}>
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-medium">Edit image metadata</p>
                        <button
                            type="button"
                            style={closeBtnStyle}
                            onClick={() => setEditingId(null)}
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                    <MediaMetadataForm
                        media={editingImage}
                        modelType={modelType}
                        modelId={modelId}
                        onSaved={() => {
                            setEditingId(null);
                            onChanged();
                        }}
                    />
                </div>
            )}
        </div>
    );
}
