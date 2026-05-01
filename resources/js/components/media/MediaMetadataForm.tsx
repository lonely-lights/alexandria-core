/* ── MediaMetadataForm ── */

import { useEffect, useState } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

interface MediaMetadataFormProps {
    media: { id: number; alt_text: string | null; caption: string | null };
    modelType: 'projects' | 'blueprints' | 'entries';
    modelId: number;
    onSaved: () => void;
}

const ALT_TEXT_MAX = 1000;

export default function MediaMetadataForm({ media, modelType, modelId, onSaved }: MediaMetadataFormProps) {
    const [altText, setAltText] = useState(media.alt_text ?? '');
    const [caption, setCaption] = useState(media.caption ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setAltText(media.alt_text ?? '');
        setCaption(media.caption ?? '');
    }, [media.id, media.alt_text, media.caption]);

    const handleSave = async () => {
        if (!altText.trim()) {
            setError('Alt text is required.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/v1/${modelType}/${modelId}/media/${media.id}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: csrfHeaders(),
                body: JSON.stringify({ alt_text: altText, caption }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setError(data?.message ?? 'Failed to save metadata.');
                return;
            }

            onSaved();
        } catch {
            setError('An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const altTextRemaining = ALT_TEXT_MAX - altText.length;

    return (
        <div className="flex flex-col gap-3">
            {/* Alt text */}
            <div className="form-control gap-1">
                <label className="label py-0">
                    <span className="label-text font-medium">Alt text <span className="text-error">*</span></span>
                    <span className={`label-text-alt ${altTextRemaining < 0 ? 'text-error' : 'opacity-50'}`}>
                        {altText.length}/{ALT_TEXT_MAX}
                    </span>
                </label>
                <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    placeholder="Describe the image for screen readers"
                    value={altText}
                    maxLength={ALT_TEXT_MAX}
                    onChange={(e) => setAltText(e.target.value)}
                />
            </div>

            {/* Caption */}
            <div className="form-control gap-1">
                <label className="label py-0">
                    <span className="label-text font-medium">Caption</span>
                    <span className="label-text-alt opacity-50">Optional</span>
                </label>
                <textarea
                    className="textarea textarea-bordered textarea-sm w-full resize-none"
                    placeholder="Add a caption..."
                    rows={2}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                />
            </div>

            {error && (
                <p className="text-xs text-error">{error}</p>
            )}

            <button
                type="button"
                className="btn btn-primary btn-sm self-end"
                disabled={isSaving || altTextRemaining < 0}
                onClick={handleSave}
            >
                {isSaving && <span className="loading loading-spinner loading-xs" />}
                Save
            </button>
        </div>
    );
}
