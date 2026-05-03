import { useState, useEffect } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import { useDateFormatters } from '@alexandria/lib/formatDate';

export interface CalcDetailItem {
    name: string;
    detail: string | null;
    url?: string | null;
    start?: string | null;
    end?: string | null;
    intensity?: number | null;
}

export function CalcDetailModal({ entryName, colLabel, calcKey, entryId, onClose }: {
    entryName: string;
    colLabel: string;
    calcKey: string;
    entryId: number;
    onClose: () => void;
}) {
    const [items, setItems] = useState<CalcDetailItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { fmtDate } = useDateFormatters();

    useEffect(() => {
        fetch(`/api/v1/entries/${entryId}/calculated/${encodeURIComponent(calcKey)}`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => { setItems(data.items ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [entryId, calcKey]);

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <div className="flex items-center justify-between bg-base-300 px-5 py-3">
                <div>
                    <h3 className="text-sm font-semibold">{colLabel}</h3>
                    <p className="text-xs text-base-content/50">{entryName}</p>
                </div>
                <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="loading loading-spinner loading-sm text-base-content/30" />
                    </div>
                ) : items.length === 0 ? (
                    <p className="py-6 text-center text-sm italic text-base-content/30">No data</p>
                ) : (
                    <div className="space-y-1">
                        {items.map((item, i) => {
                            const hasDates = item.start !== undefined && item.start !== null;

                            return (
                                <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-base-200/50">
                                    {hasDates && (
                                        <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${item.end ? 'bg-base-content/20' : 'bg-success'}`} />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        {item.url ? (
                                            <a href={item.url} className="text-sm font-medium text-primary hover:underline">{item.name}</a>
                                        ) : (
                                            <p className="text-sm font-medium">{item.name}</p>
                                        )}
                                        {hasDates && (
                                            <p className="text-xs text-base-content/40">
                                                {item.end
                                                    ? `${fmtDate(item.start)} — ${fmtDate(item.end)}`
                                                    : `Since ${fmtDate(item.start)}`
                                                }
                                            </p>
                                        )}
                                        {item.detail && (
                                            <p className="text-xs text-base-content/50">{item.detail}</p>
                                        )}
                                    </div>
                                    {item.intensity != null && (
                                        <span className="badge badge-sm badge-primary flex-shrink-0">{item.intensity}/10</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between border-t border-base-content/10 px-5 py-3">
                <p className="text-xs text-base-content/40">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                <button type="button" onClick={onClose} className="btn btn-ghost btn-sm rounded-xl">Close</button>
            </div>
        </Modal>
    );
}
