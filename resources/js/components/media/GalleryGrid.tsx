/* ── GalleryGrid ── */

import { useState } from 'react';
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
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-base-content/20 py-12 text-center">
                <p className="text-sm opacity-50">No images</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {images.map((image) => (
                    <div
                        key={image.id}
                        className={`group relative aspect-square overflow-hidden rounded-lg bg-base-200 ring-2 transition-all ${
                            editingId === image.id ? 'ring-primary' : 'ring-transparent'
                        }`}
                    >
                        <img
                            src={thumbnailUrl(image)}
                            alt={image.alt_text ?? ''}
                            className="h-full w-full object-cover"
                        />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-base-300/80 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost w-28"
                                disabled={promotingId?.id === image.id && promotingId?.target === 'page_image'}
                                onClick={() => handlePromote(image, 'page_image')}
                                title="Use this image as the entry's page image"
                            >
                                {promotingId?.id === image.id && promotingId?.target === 'page_image'
                                    ? <span className="loading loading-spinner loading-xs" />
                                    : 'Use as page'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost w-28"
                                disabled={promotingId?.id === image.id && promotingId?.target === 'banner'}
                                onClick={() => handlePromote(image, 'banner')}
                                title="Use this image as the entry's banner"
                            >
                                {promotingId?.id === image.id && promotingId?.target === 'banner'
                                    ? <span className="loading loading-spinner loading-xs" />
                                    : 'Use as banner'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost w-28"
                                onClick={() => setEditingId(editingId === image.id ? null : image.id)}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                className="btn btn-xs btn-error w-28"
                                disabled={deletingId === image.id}
                                onClick={() => handleDelete(image)}
                            >
                                {deletingId === image.id
                                    ? <span className="loading loading-spinner loading-xs" />
                                    : 'Delete'}
                            </button>
                        </div>

                        {/* Alt text overlay at bottom */}
                        {image.alt_text && (
                            <div className="absolute bottom-0 left-0 right-0 truncate bg-base-300/70 px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                                {image.alt_text}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Expanded metadata form */}
            {editingImage && (
                <div className="rounded-xl border border-base-content/10 bg-base-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-medium">Edit image metadata</p>
                        <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square"
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
