import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Pagination from '@alexandria/components/ui/Pagination';
import Modal from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import TagPickerModal from '@alexandria/components/notes/modals/TagPickerModal';
import LinkMoveModal from '@alexandria/components/notes/modals/LinkMoveModal';
import HistoryModal from '@alexandria/components/notes/modals/HistoryModal';
import NotebookSelectorModal, { type NotebookData } from '@alexandria/components/notes/modals/NotebookSelectorModal';
import SearchableMultiSelectModal, { type SearchableItem } from '@alexandria/components/ui/SearchableMultiSelectModal';
import EntryLink from '@alexandria/components/entries/EntryLink';
import { NOTE_COLORS } from '@alexandria/lib/noteColors';
import { useNoteActions } from '@alexandria/hooks/useNoteActions';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { useDateFormatters } from '@alexandria/lib/formatDate';
import { applyViewPreferences } from '@alexandria/lib/applyViewPreferences';
import { createColumnPersistence } from '@alexandria/lib/persistedColumns';
import { useSortableReorder } from '@alexandria/hooks/useSortableReorder';
import type {
    Note,
    NoteCreator,
    NoteQuickFilter,
    NoteSortKey,
    NoteStatusFilter,
    NotesListResponse,
    SortDir,
} from '@alexandria/types/notes-dashboard';
import NoteModal from './NoteModal';

interface NotesViewProps {
    projectId: number;
    initialStatusFilter: NoteStatusFilter | null;
    initialQuickFilter: string | null;
    initialNotebookId?: number | null;
    // Bumped on every notebook-tile click in the Notebooks tab so this
    // view re-applies the filter even when the id hasn't changed.
    notebookSelectionNonce?: number;
    // Bumped by the parent after an external action (e.g., import
    // complete) to force a data refetch on the next render.
    refetchNonce?: number;
    // Optional context scoping — when rendered inside the Notes drawer
    // for a blueprint or entry, these narrow the list to notes
    // attached to that specific notable instead of the whole project.
    contextType?: 'project' | 'blueprint' | 'entry';
    contextId?: number;
}

// `preview` was a standalone column; it's now rendered inline under
// the title inside the title cell (so removing it from the column list).
// `notebook` is a separate column from `location` so users can toggle
// each independently. Date columns (`created_at`, `updated_at`,
// `note_date`) each have a per-column "include time" toggle rather than
// a duplicate column — the toggle lives in the column-config modal.
const ALL_COLUMNS = ['checkbox', 'title', 'status', 'location', 'notebook', 'created_at', 'author', 'updated_at', 'note_date', 'tags'] as const;
type ColumnKey = (typeof ALL_COLUMNS)[number];
const DEFAULT_COLUMNS: ColumnKey[] = ['checkbox', 'title', 'location', 'notebook', 'created_at', 'author'];

const COLUMN_LABELS: Record<ColumnKey, string> = {
    checkbox: '',
    title: 'Title',
    status: 'Status',
    location: 'Location',
    notebook: 'Notebook',
    created_at: 'Created',
    author: 'Author',
    updated_at: 'Updated',
    note_date: 'Note Date',
    tags: 'Tags',
};

// Header labels — same labels; "Include time" is a per-column toggle
// rather than a distinct header.
const COLUMN_HEADERS: Record<ColumnKey, string> = { ...COLUMN_LABELS };

// Columns that support the "Include time" toggle in the column picker.
const TIMEABLE_COLUMNS: readonly ColumnKey[] = ['created_at', 'updated_at', 'note_date'] as const;

// Minimum widths by column so horizontal scroll kicks in gracefully
// instead of fields collapsing. Title uses max-w-0 + w-full elsewhere
// to greedily fill, so its min-w anchors the starting size.
const MIN_COL_WIDTHS: Partial<Record<ColumnKey, string>> = {
    title: 'min-w-[240px]',
    status: 'min-w-[110px]',
    location: 'min-w-[160px]',
    notebook: 'min-w-[160px]',
    created_at: 'min-w-[120px]',
    updated_at: 'min-w-[120px]',
    note_date: 'min-w-[120px]',
    author: 'min-w-[140px]',
    tags: 'min-w-[180px]',
};

const NON_SORTABLE: ColumnKey[] = ['checkbox', 'location', 'notebook', 'tags'];

// Persisted "include time" flag per timeable column. Separate from
// column visibility so toggling time on/off doesn't disturb column
// order or presence.
const SHOW_TIME_KEY = 'notes-table-show-time';
function loadShowTime(): Record<string, boolean> {
    try {
        const raw = localStorage.getItem(SHOW_TIME_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}
function saveShowTime(v: Record<string, boolean>): void {
    try { localStorage.setItem(SHOW_TIME_KEY, JSON.stringify(v)); } catch {
        // quota or disabled — surfacing this would be noise. Fail silently.
    }
}

// One-time migration from the previous two-column-per-date scheme
// (`updated_at_time`, `note_date_time`). Runs at module load; idempotent
// since it only rewrites when legacy keys are present.
(function migrateLegacyTimeColumns(): void {
    try {
        const raw = localStorage.getItem('notes-table-columns');
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const stringCols = parsed.filter((c): c is string => typeof c === 'string');
        const legacyMap: Record<string, ColumnKey> = {
            updated_at_time: 'updated_at',
            note_date_time: 'note_date',
        };
        if (!stringCols.some((c) => c in legacyMap)) return;

        const showTime = loadShowTime();
        const migrated: string[] = [];
        for (const c of stringCols) {
            if (c in legacyMap) {
                const base = legacyMap[c];
                showTime[base] = true;
                if (!migrated.includes(base)) migrated.push(base);
            } else if (!migrated.includes(c)) {
                migrated.push(c);
            }
        }
        localStorage.setItem('notes-table-columns', JSON.stringify(migrated));
        saveShowTime(showTime);
    } catch {
        // If migration fails, the standard load() filters unknown keys
        // out silently — the user just loses the legacy column.
    }
})();

const { load: loadColumns, save: saveColumns } = createColumnPersistence<ColumnKey>(
    'notes-table-columns',
    ALL_COLUMNS,
    DEFAULT_COLUMNS,
);



function smartDate(dateStr: string | null, fmtDate: (v: string | null) => string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return fmtDate(dateStr);
}

export default function NotesView({ projectId, initialStatusFilter, initialQuickFilter, initialNotebookId, notebookSelectionNonce, refetchNonce, contextType, contextId }: NotesViewProps) {
    const { fmtDate, fmtTime } = useDateFormatters();
    const [data, setData] = useState<NotesListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<NoteStatusFilter>(initialStatusFilter ?? 'active');
    const [quickFilter, setQuickFilter] = useState<NoteQuickFilter>((initialQuickFilter as NoteQuickFilter) || 'all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortKey, setSortKey] = useState<NoteSortKey>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [creatorIds, setCreatorIds] = useState<number[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const pagePrefs = (usePage().props as { auth?: { preferences?: { compact_mode?: boolean } } }).auth?.preferences;
    const [compact, setCompactState] = useState<boolean>(() => Boolean(pagePrefs?.compact_mode));

    // Shared per-note actions (pin, title, categorize, routing,
    // history, tags) — DRYed out of this component in favor of the
    // hook so the drawer + modal + dashboard all call the same
    // implementations.
    const noteActions = useNoteActions(projectId);
    const toast = useToastContext();

    function setCompact(value: boolean): void {
        // 1. Update local state immediately so the checkbox flips without
        //    waiting on the round-trip.
        setCompactState(value);
        // 2. Apply the data-attr so the app's compact CSS rules kick in
        //    across all data-compact-scoped utilities immediately.
        applyViewPreferences({ compact_mode: value });
        // 3. Persist quietly in the background — plain fetch bypasses
        //    Inertia's redirect cycle, X-Silent tells the controller to
        //    skip the flash message, so no toast appears.
        fetch('/account/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Silent': 'true',
                ...csrfHeaders(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({ compact_mode: value }),
        }).catch(() => { /* silent failure — next page load will correct */ });
    }
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [columns, setColumns] = useState<ColumnKey[]>(loadColumns);
    const [showTimeFor, setShowTimeForState] = useState<Record<string, boolean>>(loadShowTime);

    function toggleShowTime(col: ColumnKey): void {
        setShowTimeForState((prev) => {
            const next = { ...prev, [col]: !prev[col] };
            saveShowTime(next);
            return next;
        });
    }
    const [modalNote, setModalNote] = useState<Note | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'create'>('view');
    const [showModal, setShowModal] = useState(false);

    // Feature modals
    const [tagNoteId, setTagNoteId] = useState<number | null>(null);
    const [tagNoteTags, setTagNoteTags] = useState<string[]>([]);
    const [linkAction, setLinkAction] = useState<{ noteId: number; action: 'link' | 'move' | 'copy' } | null>(null);
    const [historyNoteId, setHistoryNoteId] = useState<number | null>(null);
    const [historyRecords, setHistoryRecords] = useState<Array<{ id: number; previous_title: string | null; previous_text: string | null; previous_note_date: string | null; created_at: string | null; user: { name: string; display_name: string | null } | null }>>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showNotebooks, setShowNotebooks] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showAuthorPicker, setShowAuthorPicker] = useState(false);
    const [showNotebookPicker, setShowNotebookPicker] = useState(false);
    const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
    const [notebookNoteId, setNotebookNoteId] = useState<number | null>(null);
    const [notebookFilters, setNotebookFilters] = useState<number[]>(initialNotebookId ? [initialNotebookId] : []);

    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const sortableRef = useRef<HTMLDivElement>(null);

    // Parent bumps this after external actions (e.g., import complete)
    // to force a data refetch. The `> 0` guard avoids the initial-mount
    // firing; the real fetchData effect already runs on mount.
    useEffect(() => {
        if (refetchNonce && refetchNonce > 0) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetchNonce]);

    function reorderColumns(oldIdx: number, newIdx: number): void {
        // The column-manager modal filters out `checkbox` before rendering
        // the draggable list, so the oldIdx/newIdx that SortableJS reports
        // are relative to the FILTERED list — not the full `columns`
        // array. Reorder within the filtered slice and re-attach checkbox
        // at the front if it was present.
        setColumns((prev) => {
            const hasCheckbox = prev[0] === 'checkbox';
            const draggable = hasCheckbox ? prev.slice(1) : [...prev];
            const [moved] = draggable.splice(oldIdx, 1);
            draggable.splice(newIdx, 0, moved);
            const next = (hasCheckbox ? ['checkbox', ...draggable] : draggable) as ColumnKey[];
            saveColumns(next);
            return next;
        });
    }

    useSortableReorder(sortableRef, reorderColumns, showColumnMenu);

    // Sync props
    useEffect(() => {
        if (initialStatusFilter) {
            setStatusFilter(initialStatusFilter);
            setPage(1);
        }
    }, [initialStatusFilter]);

    useEffect(() => {
        setQuickFilter((initialQuickFilter as NoteQuickFilter) || 'all');
        setPage(1);
    }, [initialQuickFilter]);

    // Apply a notebook filter whenever the parent signals a tile click
    // (either a new id OR the same id re-clicked via the nonce bump).
    // Necessary because NotesView stays mounted across tab switches,
    // so the useState initializer only runs on the very first mount.
    useEffect(() => {
        if (initialNotebookId) {
            setNotebookFilters([initialNotebookId]);
            setPage(1);
        }
    }, [initialNotebookId, notebookSelectionNonce]);

    // Debounce search
    useEffect(() => {
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    // Fetch data
    const fetchData = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            per_page: '25',
            status: statusFilter,
            sort: sortKey,
            direction: sortDir,
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (creatorIds.length > 0) params.set('creator_id', creatorIds.join(','));
        if (quickFilter) params.set('quick_filter', quickFilter);
        if (notebookFilters.length > 0) params.set('notebook_id', notebookFilters.join(','));
        // Optional notable scope — the drawer passes blueprint/entry to
        // narrow the list; the dashboard omits these and gets the full
        // project aggregate.
        if (contextType && contextType !== 'project' && contextId) {
            params.set('context_type', contextType);
            params.set('context_id', String(contextId));
        }

        fetch(`/api/v1/projects/${projectId}/notes/dashboard-list?${params.toString()}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((json: NotesListResponse) => setData(json))
            .finally(() => setLoading(false));
    // Arrays as deps — since we always replace (never mutate) the array,
    // referential equality is a safe change signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, page, statusFilter, debouncedSearch, sortKey, sortDir, creatorIds, quickFilter, notebookFilters, contextType, contextId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const notes = data?.notes;
    const creators: NoteCreator[] = data?.creators ?? [];
    const cellPadding = compact ? 'px-4 py-2' : 'px-4 py-3';

    // Sort handler
    const handleSort = (key: NoteSortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
        setPage(1);
    };

    // Filter helpers — count selected notebooks + authors individually
    // so the Filters-button badge reflects how many filters are in play
    // when users pick more than one from either list.
    const hasActiveFilters =
        statusFilter !== 'active' ||
        quickFilter !== 'all' ||
        creatorIds.length > 0 ||
        notebookFilters.length > 0;
    const activeFilterCount =
        (statusFilter !== 'active' ? 1 : 0) +
        (quickFilter !== 'all' ? 1 : 0) +
        creatorIds.length +
        notebookFilters.length;

    // Column toggle
    function toggleColumn(col: ColumnKey) {
        const updated = columns.includes(col) ? columns.filter((c) => c !== col) : [...columns, col];
        setColumns(updated);
        saveColumns(updated);
    }

    // Selection helpers
    const allOnPage = notes?.data.map((n) => n.id) ?? [];
    const allSelected = allOnPage.length > 0 && allOnPage.every((id) => selectedIds.has(id));

    function toggleSelectAll() {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allOnPage));
        }
    }

    function toggleSelectOne(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    // Bulk actions
    async function bulkAction(action: string) {
        await fetch(`/api/v1/projects/${projectId}/notes/bulk-action`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ action, note_ids: [...selectedIds] }),
        });
        setSelectedIds(new Set());
        fetchData();
    }

    async function bulkCategorize() {
        const ctxType = contextType === 'blueprint' ? 'blueprint' : 'project';
        const ctxId = contextType === 'blueprint' && contextId ? contextId : projectId;
        const ids = [...selectedIds];
        setData((prev) => prev ? {
            ...prev,
            notes: {
                ...prev.notes,
                data: prev.notes.data.map((n) =>
                    selectedIds.has(n.id) ? { ...n, ai_notes: { ...(n.ai_notes ?? {}), status: 'processing' } } : n
                ),
            },
        } : prev);
        const res = await fetch(`/api/v1/projects/${projectId}/notes/batch-categorize`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({
                note_ids: ids,
                context_type: ctxType,
                context_id: ctxId,
            }),
        });
        if (res.ok) {
            const label = ctxType === 'blueprint' ? 'Generating commands' : 'Routing to blueprints';
            toast.show(label, { type: 'info', description: `${ids.length} note(s) processing in the background...` });
        } else {
            toast.show('Categorization failed', { type: 'danger', description: 'The request could not be queued.' });
        }
        setSelectedIds(new Set());
        fetchData();
    }

    // ── Row actions ──

    async function togglePin(noteId: number) {
        await noteActions.togglePin(noteId);
        fetchData();
    }

    async function generateTitle(noteId: number) {
        await noteActions.generateTitle(noteId);
        fetchData();
    }

    async function handleTagToggle(tag: string, currentlySelected: boolean) {
        if (!tagNoteId) return;
        if (currentlySelected) await noteActions.removeTag(tagNoteId, tag);
        else await noteActions.addTag(tagNoteId, tag);
    }

    async function handleTagCreate(tag: string) {
        if (!tagNoteId) return;
        await noteActions.addTag(tagNoteId, tag);
    }

    async function openHistory(noteId: number) {
        setHistoryNoteId(noteId);
        setHistoryLoading(true);
        setHistoryRecords([]);
        try {
            setHistoryRecords(await noteActions.fetchHistory(noteId));
        } finally {
            setHistoryLoading(false);
        }
    }

    async function categorizeNote(noteId: number) {
        const ctxType = contextType === 'blueprint' ? 'blueprint' : 'project';
        const ctxId = contextType === 'blueprint' && contextId ? contextId : projectId;
        setData((prev) => prev ? {
            ...prev,
            notes: {
                ...prev.notes,
                data: prev.notes.data.map((n) =>
                    n.id === noteId ? { ...n, ai_notes: { ...(n.ai_notes ?? {}), status: 'processing' } } : n
                ),
            },
        } : prev);
        const ok = await noteActions.categorize(noteId, { contextType: ctxType, contextId: ctxId });
        if (ok) {
            const label = ctxType === 'blueprint' ? 'Generating commands' : 'Routing to blueprints';
            toast.show(label, { type: 'info', description: 'Note processing in the background...' });
        } else {
            toast.show('Categorization failed', { type: 'danger', description: 'The request could not be queued.' });
        }
        fetchData();
    }

    async function approveRouting(noteId: number) {
        await noteActions.approveRouting(noteId);
        fetchData();
    }

    async function rejectRouting(noteId: number) {
        await noteActions.rejectRouting(noteId);
        fetchData();
    }

    async function fetchNotebooks() {
        try {
            const res = await fetch(`/api/v1/projects/${projectId}/notebooks`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (res.ok) setNotebooks(await res.json());
        } catch { /* ignore */ }
    }

    // Load notebooks once on mount so the filter dropdown has options
    // the moment the Filters modal opens. fetchNotebooks is also still
    // called lazily in openNotebookPicker to pick up new notebooks
    // created during the session.
    useEffect(() => {
        void fetchNotebooks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    function openNotebookPicker(noteId: number) {
        setNotebookNoteId(noteId);
        void fetchNotebooks();
        setShowNotebooks(true);
    }

    async function addNoteToNotebook(notebookId: number) {
        if (!notebookNoteId) return;
        await fetch(`/api/v1/projects/${projectId}/notebooks/${notebookId}/notes`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ note_id: notebookNoteId }),
        });
        setShowNotebooks(false);
        setNotebookNoteId(null);
    }

    // Status filter change
    function handleStatusChange(s: NoteStatusFilter) {
        setStatusFilter(s);
        setQuickFilter('all');
        setPage(1);
        setSelectedIds(new Set());
    }

    // Quick filter toggle
    function handleQuickFilter(qf: NoteQuickFilter) {
        setQuickFilter((prev) => (prev === qf ? 'all' : qf));
        setPage(1);
        setSelectedIds(new Set());
    }

    // Sortable column key mapping
    function sortKeyForColumn(col: ColumnKey): NoteSortKey | null {
        if (NON_SORTABLE.includes(col)) return null;
        if (col === 'author') return null;
        if (col === 'title') return 'title';
        if (col === 'status') return 'status';
        if (col === 'created_at') return 'created_at';
        if (col === 'updated_at') return 'updated_at';
        if (col === 'note_date') return 'note_date';
        return null;
    }

    // AI status from ai_notes
    function aiStatus(note: Note): { label: string; class: string; spin?: boolean } | null {
        if (!note.ai_notes) return null;
        const status = note.ai_notes.processing_status as string | undefined;
        if (status === 'processing') return { label: 'Processing', class: 'badge-info', spin: true };
        if (status === 'routed') return { label: 'Routed', class: 'badge-warning' };
        if (status === 'error') return { label: 'Error', class: 'badge-error' };
        return null;
    }

    const statusOptions: { value: NoteStatusFilter; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
        { value: 'trashed', label: 'Trashed' },
    ];

    return (
        <div className="flex flex-col gap-8 pt-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search notes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input input-bordered input-sm w-56 rounded-xl"
                />

                {/* Filter button */}
                <Tooltip content="Filters" placement="bottom">
                    <button
                        type="button"
                        onClick={() => setShowFilterModal(true)}
                        className={`btn btn-xs gap-1.5 rounded-xl ${hasActiveFilters ? 'btn-secondary' : 'btn-ghost'}`}
                    >
                        <i className="fa-solid fa-filter text-[10px]" />
                        Filters
                        {hasActiveFilters && (
                            <span className="badge badge-xs badge-secondary">{activeFilterCount}</span>
                        )}
                    </button>
                </Tooltip>

                {/* Active filter chips — sit to the right of the Filters
                    button so the user reads left→right: "manage filters,
                    here's what's active." All chips use `btn btn-xs`
                    styling so their height matches the Filters button
                    exactly; `rounded-full` + subtle border distinguishes
                    them as dismissable pills. Hover shifts to error red
                    to hint the click removes the filter. */}
                {/* One chip per selected notebook — lookup the title from
                    the already-fetched notebooks list so the chip shows
                    the actual name rather than "Notebook (3)". */}
                {notebookFilters.map((nbId) => {
                    const nb = notebooks.find((n) => n.id === nbId);
                    return (
                        <button
                            key={`nb-chip-${nbId}`}
                            type="button"
                            onClick={() => { setNotebookFilters((prev) => prev.filter((id) => id !== nbId)); setPage(1); }}
                            className="btn btn-xs gap-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:border-error/40 hover:bg-error/10 hover:text-error"
                        >
                            <i className="fa-solid fa-book text-[9px]" />
                            {nb?.title ?? `Notebook #${nbId}`}
                            <i className="fa-solid fa-xmark text-[9px]" />
                        </button>
                    );
                })}
                {statusFilter !== 'active' && (
                    <button
                        type="button"
                        onClick={() => handleStatusChange('active')}
                        className="btn btn-xs gap-1.5 rounded-full border border-base-content/20 bg-base-content/5 capitalize hover:border-error/40 hover:bg-error/10 hover:text-error"
                    >
                        {statusFilter}
                        <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                )}
                {quickFilter !== 'all' && (
                    <button
                        type="button"
                        onClick={() => handleQuickFilter('all' as NoteQuickFilter)}
                        className="btn btn-xs gap-1.5 rounded-full border border-base-content/20 bg-base-content/5 capitalize hover:border-error/40 hover:bg-error/10 hover:text-error"
                    >
                        {quickFilter.replace('_', ' ')}
                        <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                )}
                {/* One chip per selected author — look up display name. */}
                {creatorIds.map((cid) => {
                    const c = creators.find((cc) => cc.id === cid);
                    return (
                        <button
                            key={`author-chip-${cid}`}
                            type="button"
                            onClick={() => { setCreatorIds((prev) => prev.filter((id) => id !== cid)); setPage(1); }}
                            className="btn btn-xs gap-1.5 rounded-full border border-base-content/20 bg-base-content/5 hover:border-error/40 hover:bg-error/10 hover:text-error"
                        >
                            <i className="fa-solid fa-user text-[9px]" />
                            {c?.name ?? `Author #${cid}`}
                            <i className="fa-solid fa-xmark text-[9px]" />
                        </button>
                    );
                })}

                {/* Author dropdown (kept for filter modal reference) */}
                {/* Right side controls */}

                {/* Empty Trash */}
                {statusFilter === 'trashed' && notes && notes.total > 0 && (
                    <button
                        type="button"
                        onClick={async () => {
                            if (!confirm(`Permanently delete all ${notes.total} trashed notes?`)) return;
                            const ids = notes.data.map((n) => n.id);
                            await fetch(`/api/v1/projects/${projectId}/notes/bulk-action`, {
                                method: 'POST',
                                headers: csrfHeaders(),
                                credentials: 'same-origin',
                                body: JSON.stringify({ action: 'force_delete', note_ids: ids }),
                            });
                            fetchData();
                        }}
                        className="btn btn-error btn-xs rounded-lg gap-1"
                    >
                        <i className="fa-solid fa-trash text-[10px]" /> Empty Trash
                    </button>
                )}

                <div className="ml-auto flex items-center gap-3">
                    <Tooltip content="Compact rows (also updates your Appearance preference)" placement="bottom">
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-base-content/70">
                            <input
                                type="checkbox"
                                checked={compact}
                                onChange={(e) => setCompact(e.target.checked)}
                                className={`toggle toggle-sm ${compact ? 'toggle-primary' : ''}`}
                            />
                            Compact
                        </label>
                    </Tooltip>

                    <Tooltip content="Configure columns" placement="bottom">
                        <button
                            type="button"
                            onClick={() => setShowColumnMenu(true)}
                            className="btn btn-ghost btn-xs btn-square rounded-lg"
                        >
                            <i className="fa-solid fa-table-columns text-xs" />
                        </button>
                    </Tooltip>

                </div>
            </div>

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    <div className="ml-2 flex gap-1.5">
                        {(statusFilter === 'active' || statusFilter === 'all') && (
                            <button type="button" onClick={() => bulkAction('archive')} className="btn btn-ghost btn-xs rounded-md">
                                Archive
                            </button>
                        )}
                        {(statusFilter === 'active' || statusFilter === 'archived' || statusFilter === 'all') && (
                            <button type="button" onClick={() => bulkAction('trash')} className="btn btn-ghost btn-xs rounded-md">
                                Move to Trash
                            </button>
                        )}
                        {statusFilter === 'archived' && (
                            <button type="button" onClick={() => bulkAction('unarchive')} className="btn btn-ghost btn-xs rounded-md">
                                Unarchive
                            </button>
                        )}
                        {statusFilter === 'trashed' && (
                            <button type="button" onClick={() => bulkAction('restore')} className="btn btn-ghost btn-xs rounded-md">
                                Restore
                            </button>
                        )}
                        {statusFilter === 'active' && (
                            <button type="button" onClick={bulkCategorize} className="btn btn-ghost btn-xs rounded-md">
                                Categorize
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        className="btn btn-ghost btn-xs ml-auto rounded-md"
                    >
                        Clear Selection
                    </button>
                </div>
            )}

            {/* Table — outer owns the paper-board shadow, inner owns
                the background + overflow so the pseudo-shadow can
                paint behind without being covered by the bg. */}
            <div
                className={`paper-board rounded-xl border border-base-300/50 transition-opacity duration-300 ${loading && data ? 'animate-pulse opacity-50' : 'opacity-100'}`}
            >
                <div className="overflow-hidden bg-base-200 shadow-sm" style={{ borderRadius: 'inherit' }}>
                <div className="overflow-x-auto" style={{ borderRadius: 'inherit' }}>
                    <table className="paper-table w-full">
                        <thead>
                            <tr className="border-b border-base-300/50 bg-base-200/50">
                                {columns.map((col) => {
                                    const sk = sortKeyForColumn(col);
                                    const isSortable = sk !== null;

                                    if (col === 'checkbox') {
                                        return (
                                            <th key={col} className="w-10 px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={toggleSelectAll}
                                                    className="checkbox checkbox-xs"
                                                />
                                            </th>
                                        );
                                    }

                                    const minW = MIN_COL_WIDTHS[col] ?? '';
                                    return (
                                        <th
                                            key={col}
                                            onClick={isSortable ? () => handleSort(sk) : undefined}
                                            className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-base-content/50 ${minW} ${isSortable ? 'cursor-pointer select-none transition-colors hover:text-base-content/80' : ''}`}
                                        >
                                            {COLUMN_HEADERS[col]}
                                            {isSortable && sortKey === sk && (
                                                <i
                                                    className={`fa-solid fa-chevron-${sortDir === 'asc' ? 'up' : 'down'} ml-1 text-[9px] text-primary`}
                                                />
                                            )}
                                        </th>
                                    );
                                })}
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-base-content/50">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-200">
                            {loading && !data && (
                                <tr>
                                    {/* +1 covers the Actions column at the far right — without it
                                        the last column keeps the container bg, breaking the
                                        paper-card tint across the row. */}
                                    <td colSpan={columns.length + 1} className="px-4 py-16 text-center">
                                        <span className="loading loading-spinner loading-lg text-primary" />
                                        <p className="mt-3 text-sm font-medium text-base-content/60">Loading notes…</p>
                                    </td>
                                </tr>
                            )}
                            {!loading && (!notes?.data || notes.data.length === 0) && (
                                <tr>
                                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-sm text-base-content/50">
                                        No notes found.
                                    </td>
                                </tr>
                            )}
                            {notes?.data.map((note) => (
                                <tr
                                    key={note.id}
                                    className="cursor-pointer transition-colors hover:bg-base-200/30"
                                    onClick={() => {
                                        setModalNote(note);
                                        setModalMode('view');
                                        setShowModal(true);
                                    }}
                                >
                                    {columns.map((col) => {
                                        if (col === 'checkbox') {
                                            return (
                                                <td key={col} className={`w-10 ${cellPadding}`} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(note.id)}
                                                        onChange={() => toggleSelectOne(note.id)}
                                                        className="checkbox checkbox-xs"
                                                    />
                                                </td>
                                            );
                                        }

                                        return (
                                            <td
                                                key={col}
                                                /* Title column takes the remaining horizontal space after
                                                   all other (content-sized) columns claim theirs. The
                                                   `max-w-0 w-full` combo is the canonical trick for a
                                                   truncating table cell: max-width:0 stops it from
                                                   expanding to fit its text, width:100% fills the leftover
                                                   space, and the inner `truncate` clips against that. */
                                                className={col === 'title' ? `${cellPadding} ${MIN_COL_WIDTHS.title ?? ''} w-full max-w-0` : `${cellPadding} ${MIN_COL_WIDTHS[col] ?? ''}`}
                                            >
                                                {col === 'title' && (
                                                    <div className="min-w-0">
                                                        <span className="flex items-center gap-2 text-base font-semibold leading-tight">
                                                            {note.color && NOTE_COLORS[note.color] && (
                                                                <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: NOTE_COLORS[note.color] }} />
                                                            )}
                                                            {note.is_pinned && (
                                                                <i
                                                                    className="fa-solid fa-thumbtack flex-shrink-0 text-[11px] text-primary"
                                                                    title="Pinned"
                                                                    aria-label="Pinned"
                                                                />
                                                            )}
                                                            <span className="truncate">{note.title || 'Untitled'}</span>
                                                        </span>
                                                        {note.text && (
                                                            <p className="mt-0.5 truncate text-xs leading-snug text-base-content/50">
                                                                {note.text.replace(/\s+/g, ' ').trim()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {col === 'status' && (
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        <span
                                                            className={`badge badge-sm ${note.status === 'active' ? 'badge-neutral' : 'badge-ghost'}`}
                                                        >
                                                            {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                                                        </span>
                                                        {(() => {
                                                            const ai = aiStatus(note);
                                                            if (!ai) return null;
                                                            return (
                                                                <span className={`badge badge-sm ${ai.class}`}>
                                                                    {ai.spin && (
                                                                        <span className="loading loading-spinner loading-xs mr-1" />
                                                                    )}
                                                                    {ai.label}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                                {col === 'location' && (() => {
                                                    // Location column renders only blueprint/entry attachments.
                                                    // Notebook memberships live in their own column below so
                                                    // users can toggle each independently. Project-type
                                                    // locations are filtered because every note belongs to
                                                    // the project by definition.
                                                    //
                                                    // Entry badges are wrapped in EntryLink so hovering one
                                                    // surfaces the same preview card used on Blueprint/
                                                    // Entry pages. Blueprint badges are plain <a> links —
                                                    // there's no blueprint-preview endpoint today, so no
                                                    // hover card to show. stopPropagation prevents the row
                                                    // click (which opens the note modal) from firing.
                                                    //
                                                    // flex-wrap on the container allows multiple badges to
                                                    // STACK onto new lines, but whitespace-nowrap on each
                                                    // badge keeps its own text on a single line.
                                                    const locs = (note.locations ?? []).filter((loc) => loc.type === 'blueprint' || loc.type === 'entry');
                                                    const baseBadge = 'badge badge-sm whitespace-nowrap transition-colors cursor-pointer';
                                                    return (
                                                        <div
                                                            className="flex flex-wrap gap-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {locs.map((loc, i) => {
                                                                const cls = `${baseBadge} ${loc.type === 'blueprint' ? 'badge-secondary hover:badge-secondary/80' : 'badge-ghost hover:bg-base-content/10'}`;
                                                                const content = (
                                                                    <>
                                                                        {loc.icon && <i className={`${loc.icon} mr-1 text-[10px]`} />}
                                                                        {loc.name}
                                                                    </>
                                                                );
                                                                if (loc.type === 'entry' && loc.url) {
                                                                    return (
                                                                        <EntryLink
                                                                            key={`entry-${loc.id}-${i}`}
                                                                            entryId={loc.id}
                                                                            href={loc.url}
                                                                            className={cls}
                                                                        >
                                                                            {content}
                                                                        </EntryLink>
                                                                    );
                                                                }
                                                                if (loc.url) {
                                                                    return (
                                                                        <a
                                                                            key={`${loc.type}-${loc.id}-${i}`}
                                                                            href={loc.url}
                                                                            className={cls}
                                                                        >
                                                                            {content}
                                                                        </a>
                                                                    );
                                                                }
                                                                return (
                                                                    <span
                                                                        key={`${loc.type}-${loc.id}-${i}`}
                                                                        className={`badge badge-sm whitespace-nowrap ${loc.type === 'blueprint' ? 'badge-secondary' : 'badge-ghost'}`}
                                                                    >
                                                                        {content}
                                                                    </span>
                                                                );
                                                            })}
                                                            {locs.length === 0 && (
                                                                <span className="text-xs text-base-content/30">--</span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                {col === 'notebook' && (() => {
                                                    const notebooks = (note.locations ?? []).filter((loc) => loc.type === 'notebook');
                                                    return (
                                                        <div className="flex flex-wrap gap-1">
                                                            {notebooks.map((nb, i) => (
                                                                <span
                                                                    key={`notebook-${nb.id}-${i}`}
                                                                    className="badge badge-sm whitespace-nowrap border-0 bg-primary font-medium text-primary-content"
                                                                >
                                                                    <i className={`${nb.icon ?? 'fa-solid fa-book'} mr-1 text-[10px]`} />
                                                                    {nb.name}
                                                                </span>
                                                            ))}
                                                            {notebooks.length === 0 && (
                                                                <span className="text-xs text-base-content/30">--</span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                {col === 'created_at' && (
                                                    showTimeFor.created_at ? (
                                                        note.created_at ? (
                                                            <div className="whitespace-nowrap text-xs leading-tight text-base-content/70">
                                                                <span className="block font-semibold">{fmtDate(note.created_at)}</span>
                                                                <span className="mt-0.5 block text-base-content/50">{fmtTime(note.created_at)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-base-content/30">--</span>
                                                        )
                                                    ) : (
                                                        <span className="whitespace-nowrap text-xs text-base-content/70">
                                                            {smartDate(note.created_at, fmtDate)}
                                                        </span>
                                                    )
                                                )}
                                                {col === 'author' && (
                                                    <span className="whitespace-nowrap text-xs text-base-content/70">
                                                        {note.creator?.display_name ?? note.creator?.name ?? 'System'}
                                                    </span>
                                                )}
                                                {col === 'updated_at' && (
                                                    showTimeFor.updated_at ? (
                                                        note.updated_at ? (
                                                            <div className="whitespace-nowrap text-xs leading-tight text-base-content/70">
                                                                <span className="block font-semibold">{fmtDate(note.updated_at)}</span>
                                                                <span className="mt-0.5 block text-base-content/50">{fmtTime(note.updated_at)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-base-content/30">--</span>
                                                        )
                                                    ) : (
                                                        <span className="whitespace-nowrap text-xs text-base-content/70">
                                                            {smartDate(note.updated_at, fmtDate)}
                                                        </span>
                                                    )
                                                )}
                                                {col === 'note_date' && (
                                                    showTimeFor.note_date ? (
                                                        note.note_date ? (
                                                            <div className="whitespace-nowrap text-xs leading-tight text-base-content/70">
                                                                <span className="block font-semibold">{fmtDate(note.note_date)}</span>
                                                                <span className="mt-0.5 block text-base-content/50">{fmtTime(note.note_date)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-base-content/30">--</span>
                                                        )
                                                    ) : (
                                                        <span className="whitespace-nowrap text-xs text-base-content/70">
                                                            {note.note_date
                                                                ? fmtDate(note.note_date)
                                                                : <span className="text-base-content/30">--</span>}
                                                        </span>
                                                    )
                                                )}
                                                {col === 'tags' && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {note.tags?.map((tag) => (
                                                            <span key={tag} className="badge badge-ghost badge-sm whitespace-nowrap">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                    {/* Row actions */}
                                    <td className={`${cellPadding} text-right`} onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu items={[
                                            { label: note.is_pinned ? 'Unpin' : 'Pin', icon: 'fa-thumbtack', onClick: () => void togglePin(note.id) },
                                            { label: 'Generate Title', icon: 'fa-wand-magic-sparkles', onClick: () => void generateTitle(note.id) },
                                            { label: 'Tags', icon: 'fa-tag', onClick: () => { setTagNoteId(note.id); setTagNoteTags(note.tags ?? []); } },
                                            { label: 'Add to Notebook', icon: 'fa-book', onClick: () => openNotebookPicker(note.id) },
                                            { label: 'Categorize (AI)', icon: 'fa-bolt', onClick: () => void categorizeNote(note.id) },
                                            { divider: true },
                                            { label: 'History', icon: 'fa-clock-rotate-left', onClick: () => void openHistory(note.id) },
                                            { divider: true },
                                            { label: 'Link to...', icon: 'fa-link', onClick: () => setLinkAction({ noteId: note.id, action: 'link' }) },
                                            { label: 'Move to...', icon: 'fa-right-from-bracket', onClick: () => setLinkAction({ noteId: note.id, action: 'move' }) },
                                            { label: 'Copy to...', icon: 'fa-copy', onClick: () => setLinkAction({ noteId: note.id, action: 'copy' }) },
                                            ...(note.ai_notes && typeof (note.ai_notes as Record<string, unknown>).routing_count === 'number' ? [
                                                { divider: true as const },
                                                { label: 'Approve Routing', icon: 'fa-check', onClick: () => void approveRouting(note.id) },
                                                { label: 'Reject Routing', icon: 'fa-xmark', onClick: () => void rejectRouting(note.id) },
                                            ] : []),
                                        ]} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {notes && notes.last_page > 1 && (
                    <div className="border-t border-base-300/50 p-3">
                        <Pagination
                            currentPage={notes.current_page}
                            lastPage={notes.last_page}
                            from={notes.from}
                            to={notes.to}
                            total={notes.total}
                            onPageChange={setPage}
                        />
                    </div>
                )}
                </div>
            </div>

            {/* Note Modal */}
            <NoteModal
                open={showModal}
                onClose={() => setShowModal(false)}
                note={modalNote}
                projectId={projectId}
                mode={modalMode}
                onRefresh={fetchData}
                onSaved={() => {
                    setShowModal(false);
                    fetchData();
                }}
            />

            {/* Column Config Modal */}
            <Modal open={showColumnMenu} onClose={() => setShowColumnMenu(false)} maxWidth="max-w-sm">
                <div className="p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                            <i className="fa-solid fa-table-columns text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold">Configure Columns</h3>
                            <p className="text-xs text-base-content/40">Toggle and drag to reorder</p>
                        </div>
                    </div>

                    {/* Active columns — draggable. Date columns get an
                        inline "Include time" checkbox; toggling it
                        doesn't reorder or remove the column — just flips
                        whether the cell shows date-only or date + time. */}
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-base-content/50">Active Columns</p>
                    <div ref={sortableRef} className="mb-3 space-y-1">
                        {columns.filter((c) => c !== 'checkbox').map((col) => {
                            const isTimeable = TIMEABLE_COLUMNS.includes(col);
                            return (
                                <div
                                    key={col}
                                    data-col={col}
                                    className="flex items-center gap-2 rounded-lg border border-base-300/50 bg-base-100 px-3 py-2"
                                >
                                    <i className="drag-handle fa-solid fa-grip-vertical cursor-grab text-xs text-base-content/30 active:cursor-grabbing" />
                                    <span className="flex-1 text-sm">{COLUMN_LABELS[col]}</span>
                                    {isTimeable && (
                                        <label
                                            className="flex cursor-pointer items-center gap-1.5 text-[11px] text-base-content/50"
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-xs checkbox-primary"
                                                checked={Boolean(showTimeFor[col])}
                                                onChange={() => toggleShowTime(col)}
                                            />
                                            Include time
                                        </label>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => toggleColumn(col)}
                                        className="btn btn-ghost btn-xs btn-circle text-base-content/30 hover:text-error"
                                    >
                                        <i className="fa-solid fa-xmark text-[10px]" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Available columns — not active */}
                    {ALL_COLUMNS.filter((c) => c !== 'checkbox' && !columns.includes(c)).length > 0 && (
                        <>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-base-content/50">Available</p>
                            <div className="space-y-1">
                                {ALL_COLUMNS.filter((c) => c !== 'checkbox' && !columns.includes(c)).map((col) => (
                                    <button
                                        key={col}
                                        type="button"
                                        onClick={() => toggleColumn(col)}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-base-content/50 transition-colors hover:bg-base-200/50"
                                    >
                                        <i className="fa-solid fa-plus text-[10px] text-primary/60" />
                                        {COLUMN_LABELS[col]}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Tag Picker Modal */}
            <TagPickerModal
                open={tagNoteId !== null}
                onClose={() => { setTagNoteId(null); fetchData(); }}
                projectId={projectId}
                noteTags={tagNoteTags}
                onToggle={handleTagToggle}
                onCreate={handleTagCreate}
            />

            {/* Link/Move/Copy Modal */}
            {linkAction && (
                <LinkMoveModal
                    open={true}
                    onClose={() => setLinkAction(null)}
                    projectId={projectId}
                    noteId={linkAction.noteId}
                    action={linkAction.action}
                    onComplete={() => { setLinkAction(null); fetchData(); }}
                />
            )}

            {/* History Modal */}
            <HistoryModal
                open={historyNoteId !== null}
                onClose={() => setHistoryNoteId(null)}
                historyRecords={historyRecords}
                historyLoading={historyLoading}
                projectId={projectId}
                noteId={historyNoteId}
            />

            {/* Notebook Picker */}
            <NotebookSelectorModal
                open={showNotebooks}
                onClose={() => { setShowNotebooks(false); setNotebookNoteId(null); }}
                notebooks={notebooks}
                activeNotebookId={null}
                onSelectNotebook={() => {}}
                onNewNotebook={async () => {
                    const name = prompt('Notebook name:');
                    if (!name) return;
                    await fetch(`/api/v1/projects/${projectId}/notebooks`, {
                        method: 'POST',
                        headers: csrfHeaders(),
                        credentials: 'same-origin',
                        body: JSON.stringify({ title: name }),
                    });
                    void fetchNotebooks();
                }}
                onLinkNotebook={(nbId) => void addNoteToNotebook(nbId)}
                onMoveNotebook={(nbId) => void addNoteToNotebook(nbId)}
            />

            {/* Author picker — opened from the filter modal trigger.
                Items are the already-fetched `creators` list so we don't
                need a separate endpoint. */}
            <SearchableMultiSelectModal
                open={showAuthorPicker}
                onClose={() => setShowAuthorPicker(false)}
                title="Filter by Author"
                subtitle="Select one or more authors to filter by"
                items={creators.map((c): SearchableItem => ({ id: c.id, label: c.name, icon: 'fa-solid fa-user' }))}
                selectedIds={creatorIds}
                onToggle={(id, next) => {
                    const numId = Number(id);
                    setCreatorIds((prev) => next ? [...prev, numId] : prev.filter((x) => x !== numId));
                    setPage(1);
                }}
                onClear={() => { setCreatorIds([]); setPage(1); }}
                emptyLabel="No authors yet"
                searchPlaceholder="Search authors..."
            />

            {/* Notebook picker */}
            <SearchableMultiSelectModal
                open={showNotebookPicker}
                onClose={() => setShowNotebookPicker(false)}
                title="Filter by Notebook"
                subtitle="Select one or more notebooks to filter by"
                items={notebooks.map((nb): SearchableItem => ({
                    id: nb.id,
                    label: nb.title,
                    icon: nb.icon ?? 'fa-solid fa-book',
                    color: nb.color,
                    count: nb.notes_count,
                }))}
                selectedIds={notebookFilters}
                onToggle={(id, next) => {
                    const numId = Number(id);
                    setNotebookFilters((prev) => next ? [...prev, numId] : prev.filter((x) => x !== numId));
                    setPage(1);
                }}
                onClear={() => { setNotebookFilters([]); setPage(1); }}
                emptyLabel="No notebooks yet"
                searchPlaceholder="Search notebooks..."
            />

            {/* Filter Modal */}
            <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)} maxWidth="max-w-lg">
                <div className="p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20">
                            <i className="fa-solid fa-filter text-secondary" />
                        </div>
                        <div>
                            <h3 className="font-bold">Filters</h3>
                            <p className="text-xs text-base-content/40">Narrow down your notes</p>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="mb-4">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-base-content/50">Status</label>
                        <div className="flex flex-wrap gap-1">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { handleStatusChange(opt.value); }}
                                    className={`btn btn-sm rounded-lg ${statusFilter === opt.value ? 'btn-primary' : 'btn-ghost'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="mb-4">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-base-content/50">Quick Filters</label>
                        <div className="flex flex-wrap gap-1">
                            <button type="button" onClick={() => handleQuickFilter('uncategorized')} className={`btn btn-sm rounded-lg ${quickFilter === 'uncategorized' ? 'btn-warning' : 'btn-ghost'}`}>
                                <i className="fa-solid fa-inbox text-xs" /> Uncategorized
                            </button>
                            <button type="button" onClick={() => handleQuickFilter('pending_routing')} className={`btn btn-sm rounded-lg ${quickFilter === 'pending_routing' ? 'btn-info' : 'btn-ghost'}`}>
                                <i className="fa-solid fa-route text-xs" /> Pending
                            </button>
                            <button type="button" onClick={() => handleQuickFilter('pinned')} className={`btn btn-sm rounded-lg ${quickFilter === 'pinned' ? 'btn-primary' : 'btn-ghost'}`}>
                                <i className="fa-solid fa-thumbtack text-xs" /> Pinned
                            </button>
                        </div>
                    </div>

                    {/* Author + Notebook — each opens a dedicated
                        searchable picker modal (same pattern as Tags),
                        so long lists stay usable and selected entries
                        show as chips at the top of the picker. The
                        trigger summarizes the current selection so the
                        user can see the state without opening it. */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-base-content/50">Author</label>
                            <button
                                type="button"
                                onClick={() => setShowAuthorPicker(true)}
                                className="flex w-full items-center justify-between gap-2 rounded-xl border border-base-content/15 bg-base-100 px-3 py-2 text-left text-sm hover:border-primary/40 hover:bg-base-200/50"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <i className="fa-solid fa-user text-[11px] text-base-content/40" />
                                    <span className="truncate">
                                        {creatorIds.length === 0
                                            ? 'All Authors'
                                            : creatorIds.length === 1
                                                ? (creators.find((c) => c.id === creatorIds[0])?.name ?? '1 selected')
                                                : `${creatorIds.length} selected`}
                                    </span>
                                </span>
                                <i className="fa-solid fa-chevron-right text-[10px] text-base-content/30" />
                            </button>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-base-content/50">Notebook</label>
                            <button
                                type="button"
                                onClick={() => setShowNotebookPicker(true)}
                                className="flex w-full items-center justify-between gap-2 rounded-xl border border-base-content/15 bg-base-100 px-3 py-2 text-left text-sm hover:border-primary/40 hover:bg-base-200/50"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <i className="fa-solid fa-book text-[11px] text-base-content/40" />
                                    <span className="truncate">
                                        {notebookFilters.length === 0
                                            ? 'All Notebooks'
                                            : notebookFilters.length === 1
                                                ? (notebooks.find((n) => n.id === notebookFilters[0])?.title ?? '1 selected')
                                                : `${notebookFilters.length} selected`}
                                    </span>
                                </span>
                                <i className="fa-solid fa-chevron-right text-[10px] text-base-content/30" />
                            </button>
                        </div>
                    </div>

                    {/* Clear all */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                handleStatusChange('active');
                                setCreatorIds([]);
                                setQuickFilter('all');
                                setNotebookFilters([]);
                                setPage(1);
                            }}
                            className="btn btn-ghost btn-sm w-full rounded-lg text-error"
                        >
                            <i className="fa-solid fa-xmark text-xs" /> Clear All Filters
                        </button>
                    )}
                </div>
            </Modal>
        </div>
    );
}
