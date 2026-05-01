/* ── BannerPreview ── */

import { useState } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

interface BannerData {
    id: number;
    original_url: string;
    conversions: Record<string, string>;
    alt_text: string | null;
}

interface BannerPreviewProps {
    banner: BannerData | null;
    modelType: 'projects' | 'blueprints' | 'entries';
    modelId: number;
    onChanged: () => void;
}

export default function BannerPreview({ banner, modelType, modelId, onChanged }: BannerPreviewProps) {
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = async () => {
        if (!banner) { return; }
        if (!window.confirm('Remove this banner? This cannot be undone.')) { return; }

        setIsRemoving(true);

        try {
            await fetch(`/api/v1/${modelType}/${modelId}/media/${banner.id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: csrfHeaders(),
            });
            onChanged();
        } finally {
            setIsRemoving(false);
        }
    };

    if (!banner) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-base-content/20 py-16 text-center">
                <p className="text-sm opacity-50">No banner uploaded</p>
                <p className="text-xs opacity-40">Upload a banner image to get started</p>
            </div>
        );
    }

    const desktopUrl = banner.conversions['desktop'] ?? banner.original_url;
    const mobileUrl = banner.conversions['mobile'] ?? banner.original_url;

    return (
        <div className="flex flex-col gap-4">
            {/* Previews */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {/* Desktop preview */}
                <div className="flex flex-1 flex-col gap-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide opacity-60">Desktop</p>
                    <div className="aspect-[1920/400] overflow-hidden rounded-lg bg-base-200">
                        <img
                            src={desktopUrl}
                            alt={banner.alt_text ?? 'Banner desktop preview'}
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>

                {/* Mobile preview */}
                <div className="flex w-full flex-col gap-1.5 sm:w-40">
                    <p className="text-xs font-medium uppercase tracking-wide opacity-60">Mobile</p>
                    <div className="aspect-[800/600] overflow-hidden rounded-lg bg-base-200">
                        <img
                            src={mobileUrl}
                            alt={banner.alt_text ?? 'Banner mobile preview'}
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={onChanged}
                >
                    Change
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={onChanged}
                >
                    Adjust Crop
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-ghost text-error hover:bg-error/10"
                    disabled={isRemoving}
                    onClick={handleRemove}
                >
                    {isRemoving && <span className="loading loading-spinner loading-xs" />}
                    Remove
                </button>
            </div>
        </div>
    );
}
