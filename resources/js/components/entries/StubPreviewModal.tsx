import { useState, useEffect } from 'react';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import type { EntryPreview } from '@alexandria/types/projects';
import { stripWikiMarkup } from '@alexandria/lib/stripWikiMarkup';

interface StubPreviewModalProps {
    entryId: number | null;
    open: boolean;
    onClose: () => void;
}

export default function StubPreviewModal({ entryId, open, onClose }: StubPreviewModalProps) {
    const [preview, setPreview] = useState<EntryPreview | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !entryId) return;

        setLoading(true);
        setPreview(null);

        fetch(`/api/v1/entries/${entryId}/preview`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.id) setPreview(data as EntryPreview);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [entryId, open]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
            {loading && (
                <>
                    <ModalHeader title="Loading..." onClose={onClose} />
                    <div className="flex items-center justify-center p-8">
                        <span className="loading loading-spinner loading-md" />
                    </div>
                </>
            )}

            {!loading && preview && (
                <>
                    <ModalHeader title={preview.name} onClose={onClose} />
                    <div className="px-6 py-4">
                        {/* Blueprint badge */}
                        {preview.blueprint_name && (
                            <div className="mb-3">
                                <span className="badge badge-ghost badge-sm gap-1">
                                    {preview.blueprint_icon && (
                                        <i className={`${preview.blueprint_icon.includes(' ') ? preview.blueprint_icon : 'fa-solid ' + preview.blueprint_icon} text-[10px] fa-fw`} />
                                    )}
                                    {preview.blueprint_name}
                                </span>
                                <span className="badge badge-warning badge-sm ml-1">Stub</span>
                            </div>
                        )}

                        {/* Thumbnail + Summary */}
                        <div className="flex gap-4">
                            {preview.thumbnail_url && (
                                <img
                                    src={preview.thumbnail_url}
                                    alt={preview.name}
                                    className="h-20 w-20 flex-shrink-0 rounded-xl object-cover shadow-md"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                {preview.summary ? (
                                    <p className="text-sm leading-relaxed text-base-content/70">
                                        {stripWikiMarkup(preview.summary)}
                                    </p>
                                ) : (
                                    <p className="text-sm italic text-base-content/30">No summary yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Attributes */}
                        {preview.attributes.length > 0 && (
                            <div className="mt-4 space-y-1 rounded-xl bg-base-300/50 p-3">
                                {preview.attributes.map((attr, i) => (
                                    <div key={i} className="flex gap-3 text-sm">
                                        <span className="w-[38.2%] flex-shrink-0 font-medium text-base-content/50">
                                            {attr.label}
                                        </span>
                                        <span className="text-base-content/80">{attr.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {!loading && !preview && (
                <>
                    <ModalHeader title="Not Found" onClose={onClose} />
                    <div className="p-6 text-center text-sm text-base-content/50">
                        Could not load entry data.
                    </div>
                </>
            )}
        </Modal>
    );
}
