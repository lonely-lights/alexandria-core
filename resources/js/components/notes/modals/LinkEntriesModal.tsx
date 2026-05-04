import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Modal from '@alexandria/components/ui/Modal';

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

    // Refetch from page 1 when filters change (search or blueprint
    // filter). Loading additional pages is handled separately below.
    useEffect(() => {
        if (!open) return;
        setPage(1);
        void loadPage(1, /* append */ false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, debouncedSearch, blueprintFilter]);

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
                <div className="flex items-start justify-between border-b border-base-300 px-5 py-4">
                    <div>
                        <h2 className="text-base font-bold">Link Entries</h2>
                        <p className="mt-0.5 text-xs text-base-content/40">
                            Attach entries to <span className="font-medium">{notebookTitle}</span>
                        </p>
                    </div>
                    <button type="button" onClick={handleClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Selected summary */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 border-b border-base-300 px-5 py-2">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-base-content/40">
                            {selectedIds.length} selected
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="ml-auto text-[10px] font-medium text-base-content/40 hover:text-error"
                        >
                            Clear selection
                        </button>
                    </div>
                )}

                {/* Search */}
                <div className="border-b border-base-300 px-5 py-3">
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-base-content/20" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search entries..."
                            autoFocus
                            className="input input-bordered h-8 min-h-0 w-full rounded-xl pl-9 text-sm"
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
                                        className={`btn btn-xs gap-1.5 rounded-full ${
                                            active
                                                ? 'btn-primary'
                                                : 'btn-ghost border border-base-content/15'
                                        }`}
                                    >
                                        <i className={`${icon} text-[9px]`} />
                                        {bp.name}
                                        <span className="text-[10px] opacity-70">{bp.entry_count}</span>
                                    </button>
                                );
                            })}
                            {blueprintFilter.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setBlueprintFilter([])}
                                    className="btn btn-xs gap-1.5 rounded-full btn-ghost text-base-content/40 hover:text-error"
                                >
                                    <i className="fa-solid fa-xmark text-[9px]" />
                                    Clear
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* List */}
                <div ref={listRef} className="flex-1 overflow-y-auto">
                    {entries.length === 0 && !loading ? (
                        <div className="py-10 text-center text-xs text-base-content/40">
                            {debouncedSearch || blueprintFilter.length > 0
                                ? 'No entries match your filters'
                                : 'No entries in this project yet'}
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
                                            className="sticky top-0 z-10 flex items-center gap-2 border-y border-base-content/5 bg-base-200/80 px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/50 backdrop-blur-sm"
                                        >
                                            <i className={`${icon} text-[10px]`} />
                                            {entry.blueprint_name ?? 'Unknown'}
                                        </div>,
                                    );
                                }
                                const isSelected = selectedIds.includes(entry.id);
                                rows.push(
                                    <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() => toggleEntry(entry.id)}
                                        className={`flex w-full items-center gap-3 px-5 py-2 text-left text-sm transition-colors hover:bg-base-200/40 ${
                                            isSelected ? 'bg-primary/5' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            className="checkbox checkbox-xs checkbox-primary"
                                        />
                                        <span className={`flex-1 truncate ${isSelected ? 'font-medium text-primary' : ''}`}>
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
                        <div ref={sentinelRef} className="flex items-center justify-center py-4 text-xs text-base-content/30">
                            {loading ? <span className="loading loading-spinner loading-xs" /> : 'Scroll for more'}
                        </div>
                    )}
                    {loading && entries.length === 0 && (
                        <div className="flex items-center justify-center py-10">
                            <span className="loading loading-spinner loading-sm text-primary" />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-base-300 px-5 py-3">
                    <span className="text-[11px] text-base-content/40">
                        {total > 0 ? `${entries.length} of ${total} shown` : ''}
                    </span>
                    <button onClick={handleClose} className="btn btn-primary btn-sm rounded-xl text-xs">
                        Done
                    </button>
                </div>
            </div>
        </Modal>
    );
}
