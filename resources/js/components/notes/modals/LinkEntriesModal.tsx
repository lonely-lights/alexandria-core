import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

interface PickerEntry {
    id: number;
    name: string;
    blueprint_id: number;
    blueprint_name: string | null;
    blueprint_icon: string | null;
}

interface PickerBlueprint {
    id: number;
    name: string;
    icon: string | null;
    entry_count: number;
}

interface LinkEntriesModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    notebookTitle: string;
    /** Seed selection — entries already linked to the notebook. */
    initialSelectedIds: number[];
    /** Fired on close with the final selection so the caller can diff + persist. */
    onCommit: (selectedIds: number[]) => void;
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

const sectionBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const sectionBorderTopStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.75rem 0.375rem 2.25rem',
};

const facetActiveStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

const facetIdleStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
};

const blueprintHeaderStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    backdropFilter: 'blur(4px)',
};

const rowSelectedStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
};

/**
 * Notebook ↔ Entry linker. Paginates the project's entries server-side
 * (40 per page by default), with a search input and a blueprint
 * multi-select chip row that acts as a facet filter. Entries render
 * grouped by blueprint — the server sorts by blueprint name + entry
 * name, so the client groups simply by watching for blueprint_id
 * transitions between rows.
 *
 * Selection state is local; committing happens on close (via onCommit)
 * so the caller can diff against the initial set and issue link/unlink
 * writes in one pass.
 */
export default function LinkEntriesModal({
    open,
    onClose,
    projectId,
    notebookTitle,
    initialSelectedIds,
    onCommit,
}: LinkEntriesModalProps) {
    const t = useT();
    const [entries, setEntries] = useState<PickerEntry[]>([]);
    const [blueprints, setBlueprints] = useState<PickerBlueprint[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [blueprintFilter, setBlueprintFilter] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset everything whenever the modal reopens — stale entries/page
    // from a previous notebook's flow would be confusing.
    useEffect(() => {
        if (!open) return;
        setEntries([]);
        setBlueprints([]);
        setSelectedIds(initialSelectedIds);
        setBlueprintFilter([]);
        setSearch('');
        setDebouncedSearch('');
        setPage(1);
        setLastPage(1);
        setTotal(0);
    }, [open, initialSelectedIds]);

    // 200ms debounce on search input so keystrokes don't spam the API.
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), 200);
        return () => clearTimeout(id);
    }, [search]);

    const loadPage = useCallback(
        async (targetPage: number, append: boolean): Promise<void> => {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(targetPage),
                per_page: '40',
            });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (blueprintFilter.length > 0) params.set('blueprint_ids', blueprintFilter.join(','));

            const res = await fetch(
                `/api/v1/projects/${projectId}/notebooks/available-entries?${params.toString()}`,
                { headers: { Accept: 'application/json' }, credentials: 'same-origin' },
            ).catch(() => null);
            setLoading(false);
            if (!res?.ok) return;

            const data = await res.json();
            setEntries((prev) => (append ? [...prev, ...(data.entries ?? [])] : data.entries ?? []));
            setLastPage(data.last_page ?? 1);
            setTotal(data.total ?? 0);
            // Blueprint facets are only sent on page 1; keep whatever
            // we have after that.
            if (Array.isArray(data.blueprints) && data.blueprints.length > 0) {
                setBlueprints(data.blueprints);
            }
        },
        [projectId, debouncedSearch, blueprintFilter],
    );

    // Refetch from page 1 when filters change (search or blueprint
    // filter). Loading additional pages is handled separately below.
    useEffect(() => {
        if (!open) return;
        setPage(1);
        void loadPage(1, /* append */ false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, debouncedSearch, blueprintFilter]);

    // IntersectionObserver-driven "load more" — a sentinel at the bottom
    // of the list fires a next-page fetch as it scrolls into view. Much
    // smoother than a manual button for long lists.
    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const sentinel = sentinelRef.current;
        const root = listRef.current;
        if (!sentinel || !root) return;

        const observer = new IntersectionObserver(
            (ents) => {
                if (!ents[0]?.isIntersecting || loading) return;
                if (page >= lastPage) return;
                const next = page + 1;
                setPage(next);
                void loadPage(next, true);
            },
            { root, rootMargin: '100px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [open, page, lastPage, loading, loadPage]);

    function toggleEntry(id: number): void {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }
    function toggleBlueprint(id: number): void {
        setBlueprintFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function handleClose(): void {
        onCommit(selectedIds);
        onClose();
    }

    return (
        <Modal open={open} onClose={handleClose} maxWidth="max-w-xl">
            <div className="flex max-h-[80vh] flex-col">
                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4" style={sectionBorderStyle}>
                    <div>
                        <h2 className="text-base font-bold">{t('notes.link_entries.title')}</h2>
                        <p className="mt-0.5 text-xs" style={fadedText}>
                            {(() => {
                                const [before, after = ''] = t('notes.link_entries.subtitle').split(':notebook');
                                return (
                                    <>
                                        {before}
                                        <span className="font-medium">{notebookTitle}</span>
                                        {after}
                                    </>
                                );
                            })()}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="alex-notes-modal-icon-btn"
                        aria-label={t('notes.modal.tooltip.close')}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Selected summary */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 px-5 py-2" style={sectionBorderStyle}>
                        <span className="text-[10px] font-medium uppercase tracking-wider" style={fadedText}>
                            {t('notes.link_entries.selected_count').replace(':count', String(selectedIds.length))}
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="ml-auto text-[10px] font-medium"
                            style={fadedText}
                        >
                            {t('notes.link_entries.clear_selection')}
                        </button>
                    </div>
                )}

                {/* Search */}
                <div className="px-5 py-3" style={sectionBorderStyle}>
                    <div className="relative">
                        <i
                            className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                            style={microText}
                            aria-hidden="true"
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('notes.link_entries.search_placeholder')}
                            autoFocus
                            className="w-full text-sm"
                            style={inputStyle}
                        />
                    </div>

                    {/* Blueprint facet chips */}
                    {blueprints.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                            {blueprints.map((bp) => {
                                const active = blueprintFilter.includes(bp.id);
                                const icon = bp.icon
                                    ? (bp.icon.includes(' ') ? bp.icon : `fa-solid ${bp.icon}`)
                                    : 'fa-solid fa-cube';
                                return (
                                    <button
                                        key={bp.id}
                                        type="button"
                                        onClick={() => toggleBlueprint(bp.id)}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium"
                                        style={active ? facetActiveStyle : facetIdleStyle}
                                    >
                                        <i className={`${icon} text-[9px]`} aria-hidden="true" />
                                        {bp.name}
                                        <span className="text-[10px] opacity-70">{bp.entry_count}</span>
                                    </button>
                                );
                            })}
                            {blueprintFilter.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setBlueprintFilter([])}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium"
                                    style={{ ...facetIdleStyle, color: 'var(--theme-status-error-stroke)' }}
                                >
                                    <i className="fa-solid fa-xmark text-[9px]" aria-hidden="true" />
                                    {t('notes.link_entries.filter.clear')}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* List */}
                <div ref={listRef} className="flex-1 overflow-y-auto">
                    {entries.length === 0 && !loading ? (
                        <div className="py-10 text-center text-xs" style={fadedText}>
                            {debouncedSearch || blueprintFilter.length > 0
                                ? t('notes.link_entries.empty.filtered')
                                : t('notes.link_entries.empty.none')}
                        </div>
                    ) : (
                        (() => {
                            // Render with a blueprint-name subheader whenever
                            // the blueprint_id changes from the previous row.
                            // Since the server sorts by blueprint then name,
                            // all rows in a blueprint arrive contiguously.
                            const rows: ReactNode[] = [];
                            let currentBpId: number | null = null;
                            for (const entry of entries) {
                                if (entry.blueprint_id !== currentBpId) {
                                    currentBpId = entry.blueprint_id;
                                    const icon = entry.blueprint_icon
                                        ? (entry.blueprint_icon.includes(' ') ? entry.blueprint_icon : `fa-solid ${entry.blueprint_icon}`)
                                        : 'fa-solid fa-cube';
                                    rows.push(
                                        <div
                                            key={`bp-${entry.blueprint_id}`}
                                            className="sticky top-0 z-10 flex items-center gap-2 px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                            style={blueprintHeaderStyle}
                                        >
                                            <i className={`${icon} text-[10px]`} aria-hidden="true" />
                                            {entry.blueprint_name ?? t('notes.link_entries.unknown_blueprint')}
                                        </div>,
                                    );
                                }
                                const isSelected = selectedIds.includes(entry.id);
                                rows.push(
                                    <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() => toggleEntry(entry.id)}
                                        className="alex-notes-tag-row flex w-full items-center gap-3 px-5 py-2 text-left text-sm"
                                        style={isSelected ? rowSelectedStyle : undefined}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            className="alex-checkbox"
                                        />
                                        <span
                                            className="flex-1 truncate"
                                            style={isSelected ? { fontWeight: 500, color: 'var(--theme-brand-primary-500)' } : undefined}
                                        >
                                            {entry.name}
                                        </span>
                                    </button>,
                                );
                            }
                            return rows;
                        })()
                    )}

                    {/* Sentinel for infinite scroll */}
                    {page < lastPage && (
                        <div ref={sentinelRef} className="flex items-center justify-center py-4 text-xs" style={microText}>
                            {loading
                                ? <i className="fa-solid fa-circle-notch fa-spin text-xs" aria-hidden="true" />
                                : t('notes.link_entries.scroll_for_more')}
                        </div>
                    )}
                    {loading && entries.length === 0 && (
                        <div className="flex items-center justify-center py-10">
                            <i
                                className="fa-solid fa-circle-notch fa-spin text-sm"
                                style={{ color: 'var(--theme-brand-primary-500)' }}
                                aria-hidden="true"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3" style={sectionBorderTopStyle}>
                    <span className="text-[11px]" style={labelText}>
                        {total > 0
                            ? t('notes.link_entries.shown_of_total')
                                .replace(':shown', String(entries.length))
                                .replace(':total', String(total))
                            : ''}
                    </span>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="alex-btn alex-btn--primary"
                        style={{ borderRadius: 'var(--theme-radius-button)', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                    >
                        {t('notes.link_entries.done')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
