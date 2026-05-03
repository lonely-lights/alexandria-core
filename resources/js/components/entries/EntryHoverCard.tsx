import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import type { EntryPreview } from '@alexandria/types/projects';
import { computeHoverPosition } from '@alexandria/lib/hoverPosition';
import { stripWikiMarkup } from '@alexandria/lib/stripWikiMarkup';

function truncateWords(text: string, max: number): string {
    const words = text.split(/\s+/);
    if (words.length <= max) return text;
    return words.slice(0, max).join(' ') + '...';
}

// Module-level cache — persists across component mounts, one fetch per entry per page session
const previewCache = new Map<number, EntryPreview | 'loading' | 'error'>();

interface EntryHoverCardProps {
    entryId: number;
    triggerRect: DOMRect;
    onEnter?: () => void;
    onClose: () => void;
}

export default function EntryHoverCard({ entryId, triggerRect, onEnter, onClose }: EntryHoverCardProps) {
    const [preview, setPreview] = useState<EntryPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cached = previewCache.get(entryId);

        if (cached && cached !== 'loading' && cached !== 'error') {
            setPreview(cached);
            setLoading(false);
            return;
        }

        if (cached === 'loading') return;

        previewCache.set(entryId, 'loading');

        const fetchPreview = async () => {
            const r = await fetch(`/api/v1/entries/${entryId}/preview`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            }).catch(() => null);

            if (r?.ok) {
                const data = await r.json();
                if (data && data.id && data.name) {
                    previewCache.set(entryId, data as EntryPreview);
                    setPreview(data as EntryPreview);
                } else {
                    previewCache.set(entryId, 'error');
                }
            } else {
                previewCache.set(entryId, 'error');
            }

            setLoading(false);
        };

        fetchPreview().then();
    }, [entryId]);

    // Animate in
    useEffect(() => {
        if (cardRef.current && !loading) {
            gsap.fromTo(cardRef.current,
                { opacity: 0, y: 4, scale: 0.97 },
                { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
            );
        }
    }, [loading]);

    const cardWidth = 288;
    const positionStyle = computeHoverPosition(triggerRect, cardWidth);

    if (loading) {
        return createPortal(
            <div
                className="fixed z-[10000] w-72 rounded-xl border border-base-300 bg-base-200 p-4 shadow-xl"
                style={positionStyle}
            >
                <div className="flex items-center gap-2 text-sm text-base-content/50">
                    <span className="loading loading-spinner loading-xs" />
                    Loading...
                </div>
            </div>,
            document.body,
        );
    }

    if (!preview) return null;

    return createPortal(
        <div
            ref={cardRef}
            className="fixed z-[10000] w-72 rounded-xl border border-base-300 bg-base-200 p-4 shadow-xl"
            style={positionStyle}
            onMouseEnter={onEnter}
            onMouseLeave={onClose}
        >
            {/* Header */}
            <div className="mb-2 flex items-center gap-3">
                {preview.thumbnail_url ? (
                    <img src={preview.thumbnail_url} alt="" className="aspect-square w-10 flex-shrink-0 rounded-lg object-cover" />
                ) : preview.blueprint_icon ? (
                    <div className="flex aspect-square w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-300">
                        <i className={`${preview.blueprint_icon.includes(' ') ? preview.blueprint_icon : 'fa-solid ' + preview.blueprint_icon} text-xs text-base-content/60 fa-fw`} />
                    </div>
                ) : null}
                <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold">{preview.name}</h4>
                    {preview.blueprint_name && (
                        <span className="text-xs text-base-content/50">{preview.blueprint_name}</span>
                    )}
                </div>
            </div>

            {/* Summary */}
            {preview.summary && (
                <p className="mb-2 text-xs leading-relaxed text-base-content/70">
                    {truncateWords(stripWikiMarkup(preview.summary), 100)}
                </p>
            )}

            {/* Footer */}
            <a
                href={preview.url}
                className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
            >
                View entry <i className="fa-solid fa-arrow-right text-[10px]" />
            </a>
        </div>,
        document.body,
    );
}
