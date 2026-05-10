import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import Modal from '@alexandria/components/ui/Modal';
import { triggerPageTransition } from '@alexandria/components/ui/PageTransition';
import useT from '@alexandria/hooks/useT';

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

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const subtleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

const headerIconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-status-info-stroke) 20%, transparent)',
    color: 'var(--theme-status-info-stroke)',
    borderRadius: '9999px',
};

const tableContainerStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const theadStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const rowBorder: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const linkBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

export default function SortingHistoryModal({ open, onClose, projectId, projectSlug, blueprintId, blueprintSlug }: SortingHistoryModalProps) {
    const t = useT();
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

    const colCount = blueprintId ? 5 : 4;

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-6xl">
            <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center" style={headerIconWrapStyle}>
                        <i className="fa-solid fa-clock-rotate-left text-sm" />
                    </div>
                    <h3 className="font-bold">{t('notes.sorting_history.title')}</h3>
                </div>

                {/* Table */}
                <div className="max-h-[60vh] overflow-y-auto" style={tableContainerStyle}>
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10" style={theadStyle}>
                            <tr>
                                <th className="w-1/4 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={subtleText}>
                                    {t('notes.sorting_history.column.title')}
                                </th>
                                <th className="w-2/5 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={subtleText}>
                                    {t('notes.sorting_history.column.preview')}
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={subtleText}>
                                    {t('notes.sorting_history.column.sorted_to')}
                                </th>
                                {blueprintId && (
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={subtleText}>
                                        {t('notes.sorting_history.column.entry')}
                                    </th>
                                )}
                                <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider" style={subtleText}>
                                    {t('notes.sorting_history.column.sorted_at')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={colCount} className="py-8 text-center">
                                        <i
                                            className="fa-solid fa-circle-notch fa-spin text-lg"
                                            style={subtleText}
                                            aria-hidden="true"
                                        />
                                    </td>
                                </tr>
                            )}
                            {!loading && records.length === 0 && (
                                <tr>
                                    <td colSpan={colCount} className="py-8 text-center text-sm" style={fadedText}>
                                        {t('notes.sorting_history.empty')}
                                    </td>
                                </tr>
                            )}
                            {!loading && records.map((record, idx) => (
                                <tr
                                    key={record.note_id}
                                    className="alex-notes-table-row"
                                    style={idx === records.length - 1 ? undefined : rowBorder}
                                >
                                    <td className="px-3 py-2 font-medium">
                                        <span className="line-clamp-1">{record.title}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className="line-clamp-1 text-xs" style={subtleText}>
                                            {record.text_preview}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
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
                                                    className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium cursor-pointer"
                                                    style={linkBadgeStyle}
                                                >
                                                    {bp.name}
                                                    <i className="fa-solid fa-arrow-up-right-from-square ml-1.5 text-[9px] opacity-50" />
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    {blueprintId && (
                                        <td className="px-3 py-2">
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
                                                        className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium cursor-pointer"
                                                        style={linkBadgeStyle}
                                                        title={entry.action === 'copied'
                                                            ? t('notes.sorting_history.entry.copied')
                                                            : t('notes.sorting_history.entry.transferred')}
                                                    >
                                                        {entry.action === 'copied' && (
                                                            <i className="fa-solid fa-copy mr-1 text-[9px] opacity-50" />
                                                        )}
                                                        {entry.name}
                                                        <i className="fa-solid fa-arrow-up-right-from-square ml-1.5 text-[9px] opacity-50" />
                                                    </button>
                                                ))}
                                                {(!record.entries || record.entries.length === 0) && (
                                                    <span className="text-xs" style={microText}>
                                                        {t('notes.sorting_history.empty_cell')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs" style={fadedText}>
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
                        <span className="text-xs" style={fadedText}>
                            {t('notes.sorting_history.page_of')
                                .replace(':current', String(page))
                                .replace(':last', String(totalPages))}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                className="alex-pagination-btn"
                                disabled={page <= 1}
                                onClick={() => goToPage(page - 1)}
                                aria-label={t('common.pagination.previous')}
                            >
                                <i className="fa-solid fa-angle-left text-xs" />
                            </button>
                            <button
                                className="alex-pagination-btn"
                                disabled={page >= totalPages}
                                onClick={() => goToPage(page + 1)}
                                aria-label={t('common.pagination.next')}
                            >
                                <i className="fa-solid fa-angle-right text-xs" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
