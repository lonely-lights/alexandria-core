import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { type MediaItem } from '@alexandria/types/media';

interface ImageUploaderProps {
    modelType: 'projects' | 'blueprints' | 'entries';
    modelId: number;
    collection: 'page_image' | 'banner' | 'gallery';
    onUploaded: (media: MediaItem) => void;
    onClose?: () => void;
    maxSizeKb?: number;
}

export default function ImageUploader({
    modelType,
    modelId,
    collection,
    onUploaded,
    onClose,
    maxSizeKb = 10240,
}: ImageUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [altText, setAltText] = useState('');
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);

    const applyFile = useCallback(
        (selected: File) => {
            setError(null);

            if (selected.size > maxSizeKb * 1024) {
                setError(`File exceeds the ${maxSizeKb} KB size limit.`);
                return;
            }

            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        },
        [maxSizeKb],
    );

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (selected) {
            applyFile(selected);
        }
    }

    function handleDragOver(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragOver(true);
    }

    function handleDragLeave(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragOver(false);
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragOver(false);

        const dropped = e.dataTransfer.files[0];
        if (dropped) {
            applyFile(dropped);
        }
    }

    async function handleUpload() {
        if (!file || !altText.trim() || uploading) {
            return;
        }

        setUploading(true);
        setError(null);

        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        const formData = new FormData();
        formData.append('image', file);
        formData.append('alt_text', altText.trim());
        if (caption.trim()) {
            formData.append('caption', caption.trim());
        }

        try {
            const res = await fetch(`/api/v1/${modelType}/${modelId}/media/${collection}`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: formData,
            });

            if (res.status === 201) {
                const media = (await res.json()) as MediaItem;
                onUploaded(media);
            } else {
                const data = await res.json().catch(() => ({})) as { message?: string };
                setError(data.message ?? `Upload failed (HTTP ${res.status})`);
            }
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setUploading(false);
        }
    }

    const canUpload = Boolean(file && altText.trim() && !uploading);

    return (
        <div className="flex flex-col gap-4">
            {/* Drop zone */}
            <div
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed py-8 text-center cursor-pointer transition-colors ${
                    isDragOver
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-base-300 hover:border-primary/30 hover:bg-base-200/20'
                }`}
            >
                {preview ? (
                    <div className="flex flex-col items-center gap-2 px-4">
                        <img
                            src={preview}
                            alt="Preview"
                            className="mx-auto max-h-40 max-w-full rounded-lg object-contain"
                        />
                        <p className="text-xs text-base-content/40">{file?.name}</p>
                        <p className="text-xs text-primary/60">Click to replace</p>
                    </div>
                ) : (
                    <>
                        <i className="fa-solid fa-cloud-upload mb-2 text-2xl text-base-content/15" />
                        <p className="text-sm text-base-content/40">
                            Drag &amp; drop an image, or click to browse
                        </p>
                        <p className="mt-1 text-xs text-base-content/25">
                            JPEG, PNG, WebP — max {maxSizeKb >= 1024 ? `${Math.round(maxSizeKb / 1024)} MB` : `${maxSizeKb} KB`}
                        </p>
                    </>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {/* Alt text */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-base-content/60">
                        Alt Text <span className="text-error">*</span>
                    </label>
                    <span className={`text-xs ${altText.length > 1000 ? 'text-error' : 'text-base-content/30'}`}>
                        {altText.length}/1000
                    </span>
                </div>
                <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    maxLength={1000}
                    placeholder="Describe the image for screen readers…"
                    className="input input-bordered w-full rounded-xl"
                />
            </div>

            {/* Caption */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-base-content/60">
                    Caption <span className="text-base-content/25">(optional)</span>
                </label>
                <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption…"
                    className="input input-bordered w-full rounded-xl"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={uploading}
                        className="btn btn-ghost rounded-xl"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => void handleUpload()}
                    disabled={!canUpload}
                    className="btn btn-primary rounded-xl"
                >
                    {uploading ? <span className="loading loading-spinner loading-sm" /> : 'Upload'}
                </button>
            </div>
        </div>
    );
}
