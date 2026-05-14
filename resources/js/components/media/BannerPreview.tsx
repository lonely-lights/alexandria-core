import { useState, type CSSProperties } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import Button from '@alexandria/components/ui/Button';

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

const emptyStateStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '4rem 0',
    textAlign: 'center',
    borderRadius: 'var(--theme-radius-card)',
    border: `2px dashed color-mix(in srgb, var(--theme-base-content) 20%, transparent)`,
};

const previewBackdropStyle: CSSProperties = {
    overflow: 'hidden',
    borderRadius: 'var(--theme-radius-input)',
    background: 'var(--theme-base-200)',
};

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
            <div style={emptyStateStyle}>
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
                    <div className="aspect-[1920/400]" style={previewBackdropStyle}>
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
                    <div className="aspect-[800/600]" style={previewBackdropStyle}>
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
                <Button variant="outline" size="sm" onClick={onChanged}>
                    Change
                </Button>
                <Button variant="ghost" size="sm" onClick={onChanged}>
                    Adjust Crop
                </Button>
                <Button variant="danger" size="sm" loading={isRemoving} onClick={handleRemove}>
                    Remove
                </Button>
            </div>
        </div>
    );
}
