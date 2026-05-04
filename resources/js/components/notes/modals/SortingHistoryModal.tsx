import { useCallback, useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import Modal from '@alexandria/components/ui/Modal';
import { triggerPageTransition } from '@alexandria/components/ui/PageTransition';

interface SortedBlueprint {
    id: number;
    slug: string;
    name: string;
}

interface SortedEntry {
    id: number;
    name: string;
    slug: string;
    action: 'transferred' | 'copied';
    sorted_at: string;
}

interface SortingRecord {
    note_id: number;
    title: string;
    text_preview: string;
    sorted_at: string;
    blueprints: SortedBlueprint[];
    entries?: SortedEntry[];
}

interface SortingHistoryModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    projectSlug: string;
    blueprintId?: number;
    blueprintSlug?: string;
}

const PER_PAGE = 25;

export default function SortingHistoryModal({ open, onClose, projectId, projectSlug, blueprintId, blueprintSlug }: SortingHistoryModalProps) {
    const [records, setRecords] = useState<SortingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchHistory = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(p), per_page: String(PER_PAGE) });
            if (blueprintId) params.set('blueprint_id', String(blueprintId));
            const res = await fetch(
                `/api/v1/projects/${projectId}/notes/sorting-history?${params}`,
                {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                },
            );
            if (res.ok) {
                const data = await res.json();
                setRecords(data.data ?? data);
                setTotalPages(data.last_page ?? 1);
            }
        } finally {
            setLoading(false);
        }
    }, [projectId, blueprintId]);

    useEffect(() => {
        if (open) {
            setPage(1);
            void fetchHistory(1);
        }
    }, [open, fetchHistory]);

    const goToPage = (p: number) => {
        setPage(p);
        void fetchHistory(p);
    };

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-6xl">
            <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-info/20">
                        <i className="fa-solid fa-clock-rotate-left text-sm text-info" />
                    </div>
                    <h3 className="font-bold">Sorting History</h3>
                </div>

                {/* Table */}
                <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-base-content/10">
                    <table className="table-sm table w-full">
                        <thead className="sticky top-0 z-10 bg-base-200">
                            <tr>
                                <th className="w-1/4">Title</th>
                                <th className="w-2/5">Preview</th>
                                <th>Sorted To</th>
                                {blueprintId && <th>Entry</th>}
                                <th className="text-right whitespace-nowrap">Sorted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={blueprintId ? 5 : 4} className="py-8 text-center">
                                        <span className="loading loading-spinner loading-sm" />
                                    </td>
                                </tr>
                            )}
                            {!loading && records.length === 0 && (
                                <tr>
                                    <td colSpan={blueprintId ? 5 : 4} className="py-8 text-center text-sm text-base-content/40">
                                        No sorting history yet
                                    </td>
                                </tr>
                            )}
                            {!loading && records.map((record) => (
                                <tr key={record.note_id} className="hover">
                                    <td className="font-medium">
                                        <span className="line-clamp-1">{record.title}</span>
                                    </td>
                                    <td>
                                        <span className="line-clamp-1 text-xs text-base-content/50">
                                            {record.text_preview}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {record.blueprints.map((bp) => (
                                                <button
                                                    key={bp.id}
                                                    onClick={async () => {
                                                        sessionStorage.setItem('alexandria:open_note', String(record.note_id));
                                                        await triggerPageTransition();
                                                        onClose();
                                                        router.visit(`/p/${projectSlug}/${bp.slug}`);
                                                    }}
                                                    className="badge badge-neutral badge-sm cursor-pointer border-0 py-1 transition-colors hover:badge-primary"
                                                >
                                                    {bp.name}
                                                    <i className="fa-solid fa-arrow-up-right-from-square ml-1.5 text-[9px] opacity-50" />
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    {blueprintId && (
                                        <td>
                                            <div className="flex flex-wrap gap-1">
                                                {(record.entries ?? []).map((entry) => (
                                                    <button
                                                        key={entry.id}
                                                        onClick={async () => {
                                                            sessionStorage.setItem('alexandria:open_note', String(record.note_id));
                                                            await triggerPageTransition();
                                                            onClose();
                                                            router.visit(`/p/${projectSlug}/${blueprintSlug}/${entry.slug}`);
                                                        }}
                                                        className="badge badge-sm cursor-pointer border-0 py-1 transition-colors hover:badge-primary"
                                                        title={entry.action === 'copied' ? 'Copied to entry' : 'Transferred to entry'}
                                                    >
                                                        {entry.action === 'copied' && (
                                                            <i className="fa-solid fa-copy mr-1 text-[9px] opacity-50" />
                                                        )}
                                                        {entry.name}
                                                        <i className="fa-solid fa-arrow-up-right-from-square ml-1.5 text-[9px] opacity-50" />
                                                    </button>
                                                ))}
                                                {(!record.entries || record.entries.length === 0) && (
                                                    <span className="text-xs text-base-content/30">—</span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td className="whitespace-nowrap text-right text-xs text-base-content/40">
                                        {new Date(record.sorted_at).toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-base-content/40">
                            Page {page} of {totalPages}
                        </span>
                        <div className="join">
                            <button
                                className="btn join-item btn-xs"
                                disabled={page <= 1}
                                onClick={() => goToPage(page - 1)}
                            >
                                «
                            </button>
                            <button
                                className="btn join-item btn-xs"
                                disabled={page >= totalPages}
                                onClick={() => goToPage(page + 1)}
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
