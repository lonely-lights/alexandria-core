import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import { usePage } from "@inertiajs/react";
import Pagination from "@alexandria/components/ui/Pagination";
import Modal from "@alexandria/components/ui/Modal";
import Tooltip from "@alexandria/components/ui/Tooltip";
import DropdownMenu from "@alexandria/components/ui/DropdownMenu";
import TagPickerModal from "@alexandria/components/notes/modals/TagPickerModal";
import LinkMoveModal from "@alexandria/components/notes/modals/LinkMoveModal";
import HistoryModal from "@alexandria/components/notes/modals/HistoryModal";
import NotebookSelectorModal, {
    type NotebookData,
} from "@alexandria/components/notes/modals/NotebookSelectorModal";
import SearchableMultiSelectModal, {
    type SearchableItem,
} from "@alexandria/components/ui/SearchableMultiSelectModal";
import EntryLink from "@alexandria/components/entries/EntryLink";
import { NOTE_COLORS } from "@alexandria/lib/noteColors";
import { useNoteActions } from "@alexandria/hooks/useNoteActions";
import { useToastContext } from "@alexandria/components/ui/ToastProvider";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import { useDateFormatters } from "@alexandria/lib/formatDate";
import { applyViewPreferences } from "@alexandria/lib/applyViewPreferences";
import { createColumnPersistence } from "@alexandria/lib/persistedColumns";
import { useSortableReorder } from "@alexandria/hooks/useSortableReorder";
import useMediaQuery from "@alexandria/hooks/useMediaQuery";
import useT, { type Translator } from "@alexandria/hooks/useT";
import type {
    Note,
    NoteCreator,
    NoteQuickFilter,
    NoteSortKey,
    NoteStatusFilter,
    NotesListResponse,
    SortDir,
} from "@alexandria/types/notes-dashboard";
import NoteModal from "./NoteModal";

interface NotesViewProps {
    projectId: number;
    initialStatusFilter: NoteStatusFilter | null;
    initialQuickFilter: string | null;
    /** Pre-fills the search box (command-palette deep link). */
    initialSearch?: string | null;
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
    contextType?: "project" | "blueprint" | "entry" | "work_section" | "work";
    contextId?: number;
}

// `preview` was a standalone column; it's now rendered inline under
// the title inside the title cell (so removing it from the column list).
// `notebook` is a separate column from `location` so users can toggle
// each independently. Date columns (`created_at`, `updated_at`,
// `note_date`) each have a per-column "include time" toggle rather than
// a duplicate column — the toggle lives in the column-config modal.
const ALL_COLUMNS = [
    "checkbox",
    "title",
    "status",
    "location",
    "notebook",
    "created_at",
    "author",
    "updated_at",
    "note_date",
    "tags",
] as const;
type ColumnKey = (typeof ALL_COLUMNS)[number];
const DEFAULT_COLUMNS: ColumnKey[] = [
    "checkbox",
    "title",
    "location",
    "notebook",
    "created_at",
    "author",
];

// Columns that support the "Include time" toggle in the column picker.
const TIMEABLE_COLUMNS: readonly ColumnKey[] = [
    "created_at",
    "updated_at",
    "note_date",
] as const;

// Minimum widths by column so horizontal scroll kicks in gracefully
// instead of fields collapsing. Title uses max-w-0 + w-full elsewhere
// to greedily fill, so its min-w anchors the starting size.
const MIN_COL_WIDTHS: Partial<Record<ColumnKey, string>> = {
    title: "min-w-[240px]",
    status: "min-w-[110px]",
    location: "min-w-[160px]",
    notebook: "min-w-[160px]",
    created_at: "min-w-[120px]",
    updated_at: "min-w-[120px]",
    note_date: "min-w-[120px]",
    author: "min-w-[140px]",
    tags: "min-w-[180px]",
};

const NON_SORTABLE: ColumnKey[] = ["checkbox", "location", "notebook", "tags"];

// Persisted "include time" flag per timeable column. Separate from
// column visibility so toggling time on/off doesn't disturb column
// order or presence.
const SHOW_TIME_KEY = "notes-table-show-time";
function loadShowTime(): Record<string, boolean> {
    try {
        const raw = localStorage.getItem(SHOW_TIME_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}
function saveShowTime(v: Record<string, boolean>): void {
    try {
        localStorage.setItem(SHOW_TIME_KEY, JSON.stringify(v));
    } catch {
        // quota or disabled — surfacing this would be noise. Fail silently.
    }
}

// One-time migration from the previous two-column-per-date scheme
// (`updated_at_time`, `note_date_time`). Runs at module load; idempotent
// since it only rewrites when legacy keys are present.
(function migrateLegacyTimeColumns(): void {
    try {
        const raw = localStorage.getItem("notes-table-columns");
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const stringCols = parsed.filter(
            (c): c is string => typeof c === "string",
        );
        const legacyMap: Record<string, ColumnKey> = {
            updated_at_time: "updated_at",
            note_date_time: "note_date",
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
        localStorage.setItem("notes-table-columns", JSON.stringify(migrated));
        saveShowTime(showTime);
    } catch {
        // If migration fails, the standard load() filters unknown keys
        // out silently — the user just loses the legacy column.
    }
})();

const { load: loadColumns, save: saveColumns } =
    createColumnPersistence<ColumnKey>(
        "notes-table-columns",
        ALL_COLUMNS,
        DEFAULT_COLUMNS,
    );

/**
 * Smart-date formatter — under-1-minute returns "just now"; sub-hour
 * returns "Nm ago"; sub-day returns "Nh ago"; sub-week returns "Nd ago";
 * older falls through to the configured fmtDate. Buckets are localised
 * via the t.notes.list.date.* keys; the count placeholder is interpolated
 * in JS since useT() is lookup-only.
 */
function smartDate(
    dateStr: string | null,
    fmtDate: (v: string | null) => string,
    t: Translator,
): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("notes.list.date.just_now");
    if (mins < 60)
        return t("notes.list.date.minutes_ago").replace(":count", String(mins));
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return t("notes.list.date.hours_ago").replace(":count", String(hrs));
    const days = Math.floor(hrs / 24);
    if (days < 7)
        return t("notes.list.date.days_ago").replace(":count", String(days));
    return fmtDate(dateStr);
}

const fadedText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const microText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const muteText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};
const subtleText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

export default function NotesView({
    projectId,
    initialStatusFilter,
    initialQuickFilter,
    initialSearch,
    initialNotebookId,
    notebookSelectionNonce,
    refetchNonce,
    contextType,
    contextId,
}: NotesViewProps) {
    const t = useT();
    const { fmtDate, fmtTime } = useDateFormatters();
    const [data, setData] = useState<NotesListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<NoteStatusFilter>(
        initialStatusFilter ?? "active",
    );
    const [quickFilter, setQuickFilter] = useState<NoteQuickFilter>(
        (initialQuickFilter as NoteQuickFilter) || "all",
    );
    // Both seeded from initialSearch so a deep-linked search applies on
    // the FIRST fetch instead of after the debounce round-trip.
    const [search, setSearch] = useState(initialSearch ?? "");
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch ?? "");
    const [sortKey, setSortKey] = useState<NoteSortKey>("created_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [creatorIds, setCreatorIds] = useState<number[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const pagePrefs = (
        usePage().props as {
            auth?: { preferences?: { compact_mode?: boolean } };
        }
    ).auth?.preferences;
    const [compact, setCompactState] = useState<boolean>(() =>
        Boolean(pagePrefs?.compact_mode),
    );

    // Shared per-note actions (pin, title, categorize, routing,
    // history, tags) — DRYed out of this component in favor of the
    // hook so the drawer + modal + dashboard all call the same
    // implementations.
    const noteActions = useNoteActions(projectId);
    const toast = useToastContext();

    // Column labels resolved against t.notes.list.column.* — recomputed
    // inside render so locale switches at runtime repaint the headers.
    const columnLabels: Record<ColumnKey, string> = {
        checkbox: "",
        title: t("notes.list.column.title"),
        status: t("notes.list.column.status"),
        location: t("notes.list.column.location"),
        notebook: t("notes.list.column.notebook"),
        created_at: t("notes.list.column.created_at"),
        author: t("notes.list.column.author"),
        updated_at: t("notes.list.column.updated_at"),
        note_date: t("notes.list.column.note_date"),
        tags: t("notes.list.column.tags"),
    };

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
        fetch("/account/preferences", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-Silent": "true",
                ...csrfHeaders(),
            },
            credentials: "same-origin",
            body: JSON.stringify({ compact_mode: value }),
        }).catch(() => {
            /* silent failure — next page load will correct */
        });
    }
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [columns, setColumns] = useState<ColumnKey[]>(loadColumns);
    // On phone-sized viewports, drop every column except checkbox +
    // title at render time. Location / notebook / dates / tags etc.
    // can't fit in a 343px-wide drawer table — the LOCATION column
    // gets clipped and shows "--" for most rows anyway. We DON'T mutate
    // the persisted column list, so the user's desktop preference
    // returns intact when the viewport widens.
    const isMobileTable = useMediaQuery("(max-width: 1023px)");
    const effectiveColumns: ColumnKey[] = isMobileTable
        ? columns.filter((c) => c === "checkbox" || c === "title")
        : columns;
    const [showTimeFor, setShowTimeForState] =
        useState<Record<string, boolean>>(loadShowTime);

    function toggleShowTime(col: ColumnKey): void {
        setShowTimeForState((prev) => {
            const next = { ...prev, [col]: !prev[col] };
            saveShowTime(next);
            return next;
        });
    }
    const [modalNote, setModalNote] = useState<Note | null>(null);
    const [modalMode, setModalMode] = useState<"view" | "create">("view");
    const [showModal, setShowModal] = useState(false);

    // Feature modals
    const [tagNoteId, setTagNoteId] = useState<number | null>(null);
    const [tagNoteTags, setTagNoteTags] = useState<string[]>([]);
    const [linkAction, setLinkAction] = useState<{
        noteId: number;
        action: "link" | "move" | "copy";
    } | null>(null);
    const [historyNoteId, setHistoryNoteId] = useState<number | null>(null);
    const [historyRecords, setHistoryRecords] = useState<
        Array<{
            id: number;
            previous_title: string | null;
            previous_text: string | null;
            previous_note_date: string | null;
            created_at: string | null;
            user: { name: string; display_name: string | null } | null;
        }>
    >([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showNotebooks, setShowNotebooks] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showAuthorPicker, setShowAuthorPicker] = useState(false);
    const [showNotebookPicker, setShowNotebookPicker] = useState(false);
    const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
    const [notebookNoteId, setNotebookNoteId] = useState<number | null>(null);
    const [notebookFilters, setNotebookFilters] = useState<number[]>(
        initialNotebookId ? [initialNotebookId] : [],
    );

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
            const hasCheckbox = prev[0] === "checkbox";
            const draggable = hasCheckbox ? prev.slice(1) : [...prev];
            const [moved] = draggable.splice(oldIdx, 1);
            draggable.splice(newIdx, 0, moved);
            const next = (
                hasCheckbox ? ["checkbox", ...draggable] : draggable
            ) as ColumnKey[];
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
        setQuickFilter((initialQuickFilter as NoteQuickFilter) || "all");
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
            per_page: "25",
            status: statusFilter,
            sort: sortKey,
            direction: sortDir,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (creatorIds.length > 0)
            params.set("creator_id", creatorIds.join(","));
        if (quickFilter) params.set("quick_filter", quickFilter);
        if (notebookFilters.length > 0)
            params.set("notebook_id", notebookFilters.join(","));
        // Optional notable scope — the drawer passes blueprint/entry to
        // narrow the list; the dashboard omits these and gets the full
        // project aggregate.
        if (contextType && contextType !== "project" && contextId) {
            params.set("context_type", contextType);
            params.set("context_id", String(contextId));
        }

        fetch(
            `/api/v1/projects/${projectId}/notes/dashboard-list?${params.toString()}`,
            {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            },
        )
            .then((res) => res.json())
            .then((json: NotesListResponse) => setData(json))
            .finally(() => setLoading(false));
        // Arrays as deps — since we always replace (never mutate) the array,
        // referential equality is a safe change signal.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        projectId,
        page,
        statusFilter,
        debouncedSearch,
        sortKey,
        sortDir,
        creatorIds,
        quickFilter,
        notebookFilters,
        contextType,
        contextId,
    ]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const notes = data?.notes;
    const creators: NoteCreator[] = data?.creators ?? [];
    // Mobile-first density (phone walkthrough, 2026-08-26): small screens
    // tighten padding so more rows fit; sm:+ keeps the desktop rhythm.
    const cellPadding = compact
        ? "px-3 py-1.5 sm:px-4 sm:py-2"
        : "px-3 py-2 sm:px-4 sm:py-3";

    // Sort handler
    const handleSort = (key: NoteSortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
        setPage(1);
    };

    // Filter helpers — count selected notebooks + authors individually
    // so the Filters-button badge reflects how many filters are in play
    // when users pick more than one from either list.
    const hasActiveFilters =
        statusFilter !== "active" ||
        quickFilter !== "all" ||
        creatorIds.length > 0 ||
        notebookFilters.length > 0;
    const activeFilterCount =
        (statusFilter !== "active" ? 1 : 0) +
        (quickFilter !== "all" ? 1 : 0) +
        creatorIds.length +
        notebookFilters.length;

    // Column toggle
    function toggleColumn(col: ColumnKey) {
        const updated = columns.includes(col)
            ? columns.filter((c) => c !== col)
            : [...columns, col];
        setColumns(updated);
        saveColumns(updated);
    }

    // Selection helpers
    const allOnPage = notes?.data.map((n) => n.id) ?? [];
    const allSelected =
        allOnPage.length > 0 && allOnPage.every((id) => selectedIds.has(id));

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
            method: "POST",
            headers: csrfHeaders(),
            credentials: "same-origin",
            body: JSON.stringify({ action, note_ids: [...selectedIds] }),
        });
        setSelectedIds(new Set());
        fetchData();
    }

    async function bulkCategorize() {
        const ctxType = contextType === "blueprint" ? "blueprint" : "project";
        const ctxId =
            contextType === "blueprint" && contextId ? contextId : projectId;
        const ids = [...selectedIds];
        setData((prev) =>
            prev
                ? {
                      ...prev,
                      notes: {
                          ...prev.notes,
                          data: prev.notes.data.map((n) =>
                              selectedIds.has(n.id)
                                  ? {
                                        ...n,
                                        ai_notes: {
                                            ...(n.ai_notes ?? {}),
                                            status: "processing",
                                        },
                                    }
                                  : n,
                          ),
                      },
                  }
                : prev,
        );
        const res = await fetch(
            `/api/v1/projects/${projectId}/notes/batch-categorize`,
            {
                method: "POST",
                headers: csrfHeaders(),
                credentials: "same-origin",
                body: JSON.stringify({
                    note_ids: ids,
                    context_type: ctxType,
                    context_id: ctxId,
                }),
            },
        );
        if (res.ok) {
            const label =
                ctxType === "blueprint"
                    ? t("notes.list.toast.generating_commands")
                    : t("notes.list.toast.routing_to_blueprints");
            const desc = t("notes.list.toast.notes_processing").replace(
                ":count",
                String(ids.length),
            );
            toast.show(label, { type: "info", description: desc });
        } else {
            toast.show(t("notes.list.toast.categorize_failed"), {
                type: "danger",
                description: t("notes.list.toast.categorize_failed_desc"),
            });
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
        const ctxType = contextType === "blueprint" ? "blueprint" : "project";
        const ctxId =
            contextType === "blueprint" && contextId ? contextId : projectId;
        setData((prev) =>
            prev
                ? {
                      ...prev,
                      notes: {
                          ...prev.notes,
                          data: prev.notes.data.map((n) =>
                              n.id === noteId
                                  ? {
                                        ...n,
                                        ai_notes: {
                                            ...(n.ai_notes ?? {}),
                                            status: "processing",
                                        },
                                    }
                                  : n,
                          ),
                      },
                  }
                : prev,
        );
        const ok = await noteActions.categorize(noteId, {
            contextType: ctxType,
            contextId: ctxId,
        });
        if (ok) {
            const label =
                ctxType === "blueprint"
                    ? t("notes.list.toast.generating_commands")
                    : t("notes.list.toast.routing_to_blueprints");
            toast.show(label, {
                type: "info",
                description: t("notes.list.toast.note_processing"),
            });
        } else {
            toast.show(t("notes.list.toast.categorize_failed"), {
                type: "danger",
                description: t("notes.list.toast.categorize_failed_desc"),
            });
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
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            });
            if (res.ok) setNotebooks(await res.json());
        } catch {
            /* ignore */
        }
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
        await fetch(
            `/api/v1/projects/${projectId}/notebooks/${notebookId}/notes`,
            {
                method: "POST",
                headers: csrfHeaders(),
                credentials: "same-origin",
                body: JSON.stringify({ note_id: notebookNoteId }),
            },
        );
        setShowNotebooks(false);
        setNotebookNoteId(null);
    }

    // Status filter change
    function handleStatusChange(s: NoteStatusFilter) {
        setStatusFilter(s);
        setQuickFilter("all");
        setPage(1);
        setSelectedIds(new Set());
    }

    // Quick filter toggle
    function handleQuickFilter(qf: NoteQuickFilter) {
        setQuickFilter((prev) => (prev === qf ? "all" : qf));
        setPage(1);
        setSelectedIds(new Set());
    }

    // Sortable column key mapping
    function sortKeyForColumn(col: ColumnKey): NoteSortKey | null {
        if (NON_SORTABLE.includes(col)) return null;
        if (col === "author") return null;
        if (col === "title") return "title";
        if (col === "status") return "status";
        if (col === "created_at") return "created_at";
        if (col === "updated_at") return "updated_at";
        if (col === "note_date") return "note_date";
        return null;
    }

    /**
     * AI status from ai_notes — returns label + theme-token-derived
     * background/foreground colors so the badge reads correctly across
     * presets. spin=true triggers an inline FA spinner before the label.
     */
    function aiStatus(
        note: Note,
    ): { label: string; bg: string; color: string; spin?: boolean } | null {
        if (!note.ai_notes) return null;
        const status = note.ai_notes.processing_status as string | undefined;
        if (status === "processing") {
            return {
                label: t("notes.list.ai_status.processing"),
                bg: "var(--theme-status-info-stroke)",
                color: "var(--theme-status-info-content)",
                spin: true,
            };
        }
        if (status === "routed") {
            return {
                label: t("notes.list.ai_status.routed"),
                bg: "var(--theme-status-warning-stroke)",
                color: "var(--theme-status-warning-content)",
            };
        }
        if (status === "error") {
            return {
                label: t("notes.list.ai_status.error"),
                bg: "var(--theme-status-error-stroke)",
                color: "var(--theme-status-error-content)",
            };
        }
        return null;
    }

    const statusOptions: { value: NoteStatusFilter; label: string }[] = [
        { value: "all", label: t("notes.list.status.all") },
        { value: "active", label: t("notes.list.status.active") },
        { value: "archived", label: t("notes.list.status.archived") },
        { value: "trashed", label: t("notes.list.status.trashed") },
    ];

    /* ── Reusable styles ────────────────────────────────────────────── */

    const searchInputStyle: CSSProperties = {
        background: "var(--theme-base-surface)",
        border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
        borderRadius: "var(--theme-radius-input)",
        color: "var(--theme-base-content)",
    };

    const filtersBtnStyle: CSSProperties = {
        background: hasActiveFilters
            ? "var(--theme-brand-secondary-500)"
            : "transparent",
        color: hasActiveFilters
            ? "var(--theme-brand-secondary-content)"
            : "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
        borderRadius: "var(--theme-radius-button)",
    };

    // paper-board owns the offset bevel shadow on tf themes — no extra
    // centered box-shadow here, otherwise the warm `--tf-tape-shadow`
    // bevel gets crowded by a generic elevation glow.
    const tableWrapperStyle: CSSProperties = {
        borderRadius: "var(--theme-radius-card)",
        border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    };

    const tableInnerStyle: CSSProperties = {
        borderRadius: "inherit",
        background: "var(--theme-base-surface)",
    };

    const tableHeaderRowStyle: CSSProperties = {
        background:
            "color-mix(in srgb, var(--theme-base-content) 4%, transparent)",
        borderBottom:
            "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    };

    const tableHeaderCellStyle: CSSProperties = {
        color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    };

    const bulkBarStyle: CSSProperties = {
        borderRadius: "var(--theme-radius-card)",
        border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent)",
        background:
            "color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)",
    };

    return (
        <div
            className={`flex flex-col pt-4 ${isMobileTable ? "gap-3 text-[13px]" : "gap-8"}`}
        >
            {/* Filter bar. Mobile shrinks the search input + tightens gaps
                so Search / Filters / Compact fit on a single row at 375px.
                The columns config gear is mobile-hidden (the persisted
                column list is overridden by effectiveColumns there
                anyway, so the gear has nothing to configure that the
                user can see). */}
            <div
                className={`flex items-center ${isMobileTable ? "gap-2" : "flex-wrap gap-2"}`}
            >
                {/* Search */}
                <input
                    type="text"
                    placeholder={t("notes.list.search_placeholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`px-3 py-1.5 text-xs sm:text-sm ${isMobileTable ? "min-w-0 flex-1" : "w-56"}`}
                    style={searchInputStyle}
                />

                {/* Filter button */}
                <Tooltip
                    content={t("notes.list.filters.tooltip")}
                    placement="bottom"
                >
                    <button
                        type="button"
                        onClick={() => setShowFilterModal(true)}
                        className="inline-flex flex-shrink-0 items-center gap-1.5 px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-xs"
                        style={filtersBtnStyle}
                    >
                        <i className="fa-solid fa-filter text-[10px]" />
                        {t("notes.list.filters.button")}
                        {hasActiveFilters && (
                            <span
                                className="inline-flex items-center px-1.5 py-0 text-[10px] font-semibold"
                                style={{
                                    background:
                                        "color-mix(in srgb, var(--theme-brand-secondary-content) 20%, transparent)",
                                    color: "var(--theme-brand-secondary-content)",
                                    borderRadius: "var(--theme-radius-badge)",
                                }}
                            >
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </Tooltip>

                {/* Active filter chips — sit to the right of the Filters
                    button so the user reads left→right: "manage filters,
                    here's what's active." `.alex-notes-filter-chip` is a
                    dismissable pill; hover shifts to error red to hint
                    the click removes the filter. The `--brand` modifier
                    is for notebook chips (primary tint at rest), the
                    plain class is for status/quick/author chips. */}
                {notebookFilters.map((nbId) => {
                    const nb = notebooks.find((n) => n.id === nbId);
                    return (
                        <button
                            key={`nb-chip-${nbId}`}
                            type="button"
                            onClick={() => {
                                setNotebookFilters((prev) =>
                                    prev.filter((id) => id !== nbId),
                                );
                                setPage(1);
                            }}
                            className="alex-notes-filter-chip alex-notes-filter-chip--brand"
                        >
                            <i className="fa-solid fa-book text-[9px]" />
                            {nb?.title ??
                                t("notes.list.chip.notebook_fallback").replace(
                                    ":id",
                                    String(nbId),
                                )}
                            <i className="fa-solid fa-xmark text-[9px]" />
                        </button>
                    );
                })}
                {statusFilter !== "active" && (
                    <button
                        type="button"
                        onClick={() => handleStatusChange("active")}
                        className="alex-notes-filter-chip"
                    >
                        {statusFilter}
                        <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                )}
                {quickFilter !== "all" && (
                    <button
                        type="button"
                        onClick={() =>
                            handleQuickFilter("all" as NoteQuickFilter)
                        }
                        className="alex-notes-filter-chip"
                    >
                        {quickFilter.replace("_", " ")}
                        <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                )}
                {creatorIds.map((cid) => {
                    const c = creators.find((cc) => cc.id === cid);
                    return (
                        <button
                            key={`author-chip-${cid}`}
                            type="button"
                            onClick={() => {
                                setCreatorIds((prev) =>
                                    prev.filter((id) => id !== cid),
                                );
                                setPage(1);
                            }}
                            className="alex-notes-filter-chip"
                        >
                            <i className="fa-solid fa-user text-[9px]" />
                            {c?.name ??
                                t("notes.list.chip.author_fallback").replace(
                                    ":id",
                                    String(cid),
                                )}
                            <i className="fa-solid fa-xmark text-[9px]" />
                        </button>
                    );
                })}

                {/* Empty Trash */}
                {statusFilter === "trashed" && notes && notes.total > 0 && (
                    <button
                        type="button"
                        onClick={async () => {
                            const confirmMsg = t(
                                "notes.list.empty_trash.confirm",
                            ).replace(":count", String(notes.total));
                            if (!confirm(confirmMsg)) return;
                            const ids = notes.data.map((n) => n.id);
                            await fetch(
                                `/api/v1/projects/${projectId}/notes/bulk-action`,
                                {
                                    method: "POST",
                                    headers: csrfHeaders(),
                                    credentials: "same-origin",
                                    body: JSON.stringify({
                                        action: "force_delete",
                                        note_ids: ids,
                                    }),
                                },
                            );
                            fetchData();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                        style={{
                            background: "var(--theme-status-error-stroke)",
                            color: "var(--theme-status-error-content)",
                            borderRadius: "var(--theme-radius-button)",
                        }}
                    >
                        <i className="fa-solid fa-trash text-[10px]" />{" "}
                        {t("notes.list.empty_trash.label")}
                    </button>
                )}

                <div
                    className={`ml-auto flex flex-shrink-0 items-center ${isMobileTable ? "gap-2" : "gap-3"}`}
                >
                    <Tooltip
                        content={t("notes.list.compact.tooltip")}
                        placement="bottom"
                    >
                        <label
                            className="flex cursor-pointer items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs"
                            style={muteText}
                        >
                            <input
                                type="checkbox"
                                checked={compact}
                                onChange={(e) => setCompact(e.target.checked)}
                                className="alex-toggle"
                            />
                            {t("notes.list.compact.label")}
                        </label>
                    </Tooltip>

                    {/* Columns gear is desktop-only — on mobile the
                        effectiveColumns filter overrides the persisted
                        list to title-only, so the gear has nothing to
                        toggle the user can see. */}
                    {!isMobileTable && (
                        <Tooltip
                            content={t("notes.list.config_columns.tooltip")}
                            placement="bottom"
                        >
                            <button
                                type="button"
                                onClick={() => setShowColumnMenu(true)}
                                className="alex-notes-icon-btn"
                                aria-label={t(
                                    "notes.list.config_columns.tooltip",
                                )}
                            >
                                <i className="fa-solid fa-table-columns text-xs" />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
                <div
                    className="flex items-center gap-2 px-4 py-2"
                    style={bulkBarStyle}
                >
                    <span className="text-sm font-medium">
                        {t("notes.list.bulk.selected").replace(
                            ":count",
                            String(selectedIds.size),
                        )}
                    </span>
                    <div className="ml-2 flex gap-1.5">
                        {(statusFilter === "active" ||
                            statusFilter === "all") && (
                            <button
                                type="button"
                                onClick={() => bulkAction("archive")}
                                className="alex-notes-bulk-btn"
                            >
                                {t("notes.list.bulk.archive")}
                            </button>
                        )}
                        {(statusFilter === "active" ||
                            statusFilter === "archived" ||
                            statusFilter === "all") && (
                            <button
                                type="button"
                                onClick={() => bulkAction("trash")}
                                className="alex-notes-bulk-btn"
                            >
                                {t("notes.list.bulk.move_to_trash")}
                            </button>
                        )}
                        {statusFilter === "archived" && (
                            <button
                                type="button"
                                onClick={() => bulkAction("unarchive")}
                                className="alex-notes-bulk-btn"
                            >
                                {t("notes.list.bulk.unarchive")}
                            </button>
                        )}
                        {statusFilter === "trashed" && (
                            <button
                                type="button"
                                onClick={() => bulkAction("restore")}
                                className="alex-notes-bulk-btn"
                            >
                                {t("notes.list.bulk.restore")}
                            </button>
                        )}
                        {statusFilter === "active" && (
                            <button
                                type="button"
                                onClick={bulkCategorize}
                                className="alex-notes-bulk-btn"
                            >
                                {t("notes.list.bulk.categorize")}
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        className="alex-notes-bulk-btn ml-auto"
                    >
                        {t("notes.list.bulk.clear_selection")}
                    </button>
                </div>
            )}

            {/* Table — outer carries the panel chrome (paper-board on tf
                themes, base shadow + stroke elsewhere); inner owns the
                background + overflow so nothing leaks past the rounded
                corners. */}
            <div
                className={`paper-board transition-opacity duration-300 ${loading && data ? "animate-pulse opacity-50" : "opacity-100"}`}
                style={tableWrapperStyle}
            >
                <div className="overflow-hidden" style={tableInnerStyle}>
                    <div
                        className="overflow-x-auto"
                        style={{ borderRadius: "inherit" }}
                    >
                        <table className="paper-table w-full">
                            <thead>
                                <tr style={tableHeaderRowStyle}>
                                    {effectiveColumns.map((col) => {
                                        const sk = sortKeyForColumn(col);
                                        const isSortable = sk !== null;

                                        if (col === "checkbox") {
                                            return (
                                                <th
                                                    key={col}
                                                    className="w-10 px-4 py-3"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={
                                                            toggleSelectAll
                                                        }
                                                        className="alex-checkbox"
                                                    />
                                                </th>
                                            );
                                        }

                                        const minW = MIN_COL_WIDTHS[col] ?? "";
                                        return (
                                            <th
                                                key={col}
                                                onClick={
                                                    isSortable
                                                        ? () => handleSort(sk)
                                                        : undefined
                                                }
                                                className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider sm:px-4 sm:py-3 ${minW} ${isSortable ? "alex-notes-table-header-sortable cursor-pointer select-none" : ""}`}
                                                style={tableHeaderCellStyle}
                                            >
                                                {columnLabels[col]}
                                                {isSortable &&
                                                    sortKey === sk && (
                                                        <i
                                                            className={`fa-solid fa-chevron-${sortDir === "asc" ? "up" : "down"} ml-1 text-[9px]`}
                                                            style={{
                                                                color: "var(--theme-brand-primary-500)",
                                                            }}
                                                        />
                                                    )}
                                            </th>
                                        );
                                    })}
                                    <th
                                        className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider sm:px-4 sm:py-3"
                                        style={tableHeaderCellStyle}
                                    >
                                        {t("notes.list.column.actions")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && !data && (
                                    <tr>
                                        <td
                                            colSpan={
                                                effectiveColumns.length + 1
                                            }
                                            className="px-4 py-16 text-center"
                                        >
                                            <i
                                                className="fa-solid fa-circle-notch fa-spin text-3xl"
                                                style={{
                                                    color: "var(--theme-brand-primary-500)",
                                                }}
                                                aria-hidden="true"
                                            />
                                            <p
                                                className="mt-3 text-sm font-medium"
                                                style={{
                                                    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
                                                }}
                                            >
                                                {t("notes.list.loading")}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                                {!loading &&
                                    (!notes?.data ||
                                        notes.data.length === 0) && (
                                        <tr>
                                            <td
                                                colSpan={
                                                    effectiveColumns.length + 1
                                                }
                                                className="px-4 py-12 text-center text-sm"
                                                style={fadedText}
                                            >
                                                {t("notes.list.no_results")}
                                            </td>
                                        </tr>
                                    )}
                                {notes?.data.map((note, rowIdx) => (
                                    <tr
                                        key={note.id}
                                        className="alex-notes-table-row cursor-pointer"
                                        style={{
                                            borderTop:
                                                rowIdx === 0
                                                    ? "none"
                                                    : "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
                                        }}
                                        onClick={() => {
                                            setModalNote(note);
                                            setModalMode("view");
                                            setShowModal(true);
                                        }}
                                    >
                                        {effectiveColumns.map((col) => {
                                            if (col === "checkbox") {
                                                return (
                                                    <td
                                                        key={col}
                                                        className={`w-10 ${cellPadding}`}
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(
                                                                note.id,
                                                            )}
                                                            onChange={() =>
                                                                toggleSelectOne(
                                                                    note.id,
                                                                )
                                                            }
                                                            className="alex-checkbox"
                                                        />
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td
                                                    key={col}
                                                    className={
                                                        col === "title"
                                                            ? `${cellPadding} ${MIN_COL_WIDTHS.title ?? ""} w-full max-w-0`
                                                            : `${cellPadding} ${MIN_COL_WIDTHS[col] ?? ""}`
                                                    }
                                                >
                                                    {col === "title" && (
                                                        <div className="min-w-0">
                                                            <span className="flex items-center gap-2 text-sm font-semibold leading-tight sm:text-base">
                                                                {note.color &&
                                                                    NOTE_COLORS[
                                                                        note
                                                                            .color
                                                                    ] && (
                                                                        <span
                                                                            className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    NOTE_COLORS[
                                                                                        note
                                                                                            .color
                                                                                    ],
                                                                            }}
                                                                        />
                                                                    )}
                                                                {note.is_pinned && (
                                                                    <i
                                                                        className="fa-solid fa-thumbtack flex-shrink-0 text-[11px]"
                                                                        style={{
                                                                            color: "var(--theme-brand-primary-500)",
                                                                        }}
                                                                        title={t(
                                                                            "notes.list.tooltip.pinned",
                                                                        )}
                                                                        aria-label={t(
                                                                            "notes.list.tooltip.pinned",
                                                                        )}
                                                                    />
                                                                )}
                                                                <span className="truncate">
                                                                    {note.title ||
                                                                        t(
                                                                            "notes.list.untitled",
                                                                        )}
                                                                </span>
                                                            </span>
                                                            {note.text && (
                                                                <p
                                                                    className="mt-0.5 truncate text-[11px] leading-snug sm:text-xs"
                                                                    style={
                                                                        fadedText
                                                                    }
                                                                >
                                                                    {note.text
                                                                        .replace(
                                                                            /\s+/g,
                                                                            " ",
                                                                        )
                                                                        .trim()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {col === "status" && (
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            <span
                                                                className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium"
                                                                style={{
                                                                    background:
                                                                        note.status ===
                                                                        "active"
                                                                            ? "color-mix(in srgb, var(--theme-base-content) 15%, transparent)"
                                                                            : "color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
                                                                    color: "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
                                                                    borderRadius:
                                                                        "var(--theme-radius-badge)",
                                                                }}
                                                            >
                                                                {note.status
                                                                    .charAt(0)
                                                                    .toUpperCase() +
                                                                    note.status.slice(
                                                                        1,
                                                                    )}
                                                            </span>
                                                            {(() => {
                                                                const ai =
                                                                    aiStatus(
                                                                        note,
                                                                    );
                                                                if (!ai)
                                                                    return null;
                                                                return (
                                                                    <span
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                                                                        style={{
                                                                            background:
                                                                                ai.bg,
                                                                            color: ai.color,
                                                                            borderRadius:
                                                                                "var(--theme-radius-badge)",
                                                                        }}
                                                                    >
                                                                        {ai.spin && (
                                                                            <i className="fa-solid fa-circle-notch fa-spin text-[9px]" />
                                                                        )}
                                                                        {
                                                                            ai.label
                                                                        }
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                    {col === "location" &&
                                                        (() => {
                                                            // Location column renders blueprint/entry attachments plus
                                                            // the writing ones (work / work_section). Notebook
                                                            // memberships live in their own column below so users can
                                                            // toggle each independently. Project-type locations are
                                                            // filtered because every note belongs to the project by
                                                            // definition.
                                                            const locs = (
                                                                note.locations ??
                                                                []
                                                            ).filter(
                                                                (loc) =>
                                                                    loc.type ===
                                                                        "blueprint" ||
                                                                    loc.type ===
                                                                        "entry" ||
                                                                    loc.type ===
                                                                        "work" ||
                                                                    loc.type ===
                                                                        "work_section",
                                                            );
                                                            const blueprintBadgeStyle: CSSProperties =
                                                                {
                                                                    background:
                                                                        "color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)",
                                                                    color: "var(--theme-brand-secondary-500)",
                                                                    border: "1px solid color-mix(in srgb, var(--theme-brand-secondary-500) 30%, transparent)",
                                                                    borderRadius:
                                                                        "var(--theme-radius-badge)",
                                                                };
                                                            const entryBadgeStyle: CSSProperties =
                                                                {
                                                                    background:
                                                                        "color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
                                                                    color: "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
                                                                    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
                                                                    borderRadius:
                                                                        "var(--theme-radius-badge)",
                                                                };
                                                            // Writing locations ship no icon of their own — the
                                                            // feather is the same mark the drawer's Locations
                                                            // modal and the link modal use for work targets.
                                                            const writingBadgeStyle: CSSProperties =
                                                                {
                                                                    background:
                                                                        "color-mix(in srgb, var(--theme-brand-primary-500) 14%, transparent)",
                                                                    color: "var(--theme-brand-primary-500)",
                                                                    border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 28%, transparent)",
                                                                    borderRadius:
                                                                        "var(--theme-radius-badge)",
                                                                };
                                                            const baseClass =
                                                                "inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-[11px] font-medium cursor-pointer";
                                                            return (
                                                                <div
                                                                    className="flex flex-wrap gap-1"
                                                                    onClick={(
                                                                        e,
                                                                    ) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    {locs.map(
                                                                        (
                                                                            loc,
                                                                            i,
                                                                        ) => {
                                                                            const isWriting =
                                                                                loc.type ===
                                                                                    "work" ||
                                                                                loc.type ===
                                                                                    "work_section";
                                                                            const style =
                                                                                loc.type ===
                                                                                "blueprint"
                                                                                    ? blueprintBadgeStyle
                                                                                    : isWriting
                                                                                      ? writingBadgeStyle
                                                                                      : entryBadgeStyle;
                                                                            const icon =
                                                                                loc.icon ??
                                                                                (isWriting
                                                                                    ? "fa-solid fa-feather"
                                                                                    : null);
                                                                            const content =
                                                                                (
                                                                                    <>
                                                                                        {icon && (
                                                                                            <i
                                                                                                className={`${icon} text-[10px]`}
                                                                                            />
                                                                                        )}
                                                                                        {
                                                                                            loc.name
                                                                                        }
                                                                                    </>
                                                                                );
                                                                            if (
                                                                                loc.type ===
                                                                                    "entry" &&
                                                                                loc.url
                                                                            ) {
                                                                                return (
                                                                                    <EntryLink
                                                                                        key={`entry-${loc.id}-${i}`}
                                                                                        entryId={
                                                                                            loc.id
                                                                                        }
                                                                                        href={
                                                                                            loc.url
                                                                                        }
                                                                                        className={
                                                                                            baseClass
                                                                                        }
                                                                                        style={
                                                                                            style
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            content
                                                                                        }
                                                                                    </EntryLink>
                                                                                );
                                                                            }
                                                                            if (
                                                                                loc.url
                                                                            ) {
                                                                                return (
                                                                                    <a
                                                                                        key={`${loc.type}-${loc.id}-${i}`}
                                                                                        href={
                                                                                            loc.url
                                                                                        }
                                                                                        className={
                                                                                            baseClass
                                                                                        }
                                                                                        style={
                                                                                            style
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            content
                                                                                        }
                                                                                    </a>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <span
                                                                                    key={`${loc.type}-${loc.id}-${i}`}
                                                                                    className={
                                                                                        baseClass
                                                                                    }
                                                                                    style={
                                                                                        style
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        content
                                                                                    }
                                                                                </span>
                                                                            );
                                                                        },
                                                                    )}
                                                                    {locs.length ===
                                                                        0 && (
                                                                        <span
                                                                            className="text-xs"
                                                                            style={
                                                                                microText
                                                                            }
                                                                        >
                                                                            {t(
                                                                                "notes.list.empty_cell",
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    {col === "notebook" &&
                                                        (() => {
                                                            const notebookLocs =
                                                                (
                                                                    note.locations ??
                                                                    []
                                                                ).filter(
                                                                    (loc) =>
                                                                        loc.type ===
                                                                        "notebook",
                                                                );
                                                            return (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {notebookLocs.map(
                                                                        (
                                                                            nb,
                                                                            i,
                                                                        ) => (
                                                                            <span
                                                                                key={`notebook-${nb.id}-${i}`}
                                                                                className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-[11px] font-medium"
                                                                                style={{
                                                                                    background:
                                                                                        "var(--theme-brand-primary-500)",
                                                                                    color: "var(--theme-brand-primary-content)",
                                                                                    borderRadius:
                                                                                        "var(--theme-radius-badge)",
                                                                                }}
                                                                            >
                                                                                <i
                                                                                    className={`${nb.icon ?? "fa-solid fa-book"} text-[10px]`}
                                                                                />
                                                                                {
                                                                                    nb.name
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                                    {notebookLocs.length ===
                                                                        0 && (
                                                                        <span
                                                                            className="text-xs"
                                                                            style={
                                                                                microText
                                                                            }
                                                                        >
                                                                            {t(
                                                                                "notes.list.empty_cell",
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    {col === "created_at" &&
                                                        (showTimeFor.created_at ? (
                                                            note.created_at ? (
                                                                <div
                                                                    className="whitespace-nowrap text-xs leading-tight"
                                                                    style={
                                                                        muteText
                                                                    }
                                                                >
                                                                    <span className="block font-semibold">
                                                                        {fmtDate(
                                                                            note.created_at,
                                                                        )}
                                                                    </span>
                                                                    <span
                                                                        className="mt-0.5 block"
                                                                        style={
                                                                            fadedText
                                                                        }
                                                                    >
                                                                        {fmtTime(
                                                                            note.created_at,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span
                                                                    className="text-xs"
                                                                    style={
                                                                        microText
                                                                    }
                                                                >
                                                                    {t(
                                                                        "notes.list.empty_cell",
                                                                    )}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span
                                                                className="whitespace-nowrap text-xs"
                                                                style={muteText}
                                                            >
                                                                {smartDate(
                                                                    note.created_at,
                                                                    fmtDate,
                                                                    t,
                                                                )}
                                                            </span>
                                                        ))}
                                                    {col === "author" && (
                                                        <span
                                                            className="whitespace-nowrap text-xs"
                                                            style={muteText}
                                                        >
                                                            {note.creator
                                                                ?.display_name ??
                                                                note.creator
                                                                    ?.name ??
                                                                t(
                                                                    "notes.list.system_author",
                                                                )}
                                                        </span>
                                                    )}
                                                    {col === "updated_at" &&
                                                        (showTimeFor.updated_at ? (
                                                            note.updated_at ? (
                                                                <div
                                                                    className="whitespace-nowrap text-xs leading-tight"
                                                                    style={
                                                                        muteText
                                                                    }
                                                                >
                                                                    <span className="block font-semibold">
                                                                        {fmtDate(
                                                                            note.updated_at,
                                                                        )}
                                                                    </span>
                                                                    <span
                                                                        className="mt-0.5 block"
                                                                        style={
                                                                            fadedText
                                                                        }
                                                                    >
                                                                        {fmtTime(
                                                                            note.updated_at,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span
                                                                    className="text-xs"
                                                                    style={
                                                                        microText
                                                                    }
                                                                >
                                                                    {t(
                                                                        "notes.list.empty_cell",
                                                                    )}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span
                                                                className="whitespace-nowrap text-xs"
                                                                style={muteText}
                                                            >
                                                                {smartDate(
                                                                    note.updated_at,
                                                                    fmtDate,
                                                                    t,
                                                                )}
                                                            </span>
                                                        ))}
                                                    {col === "note_date" &&
                                                        (showTimeFor.note_date ? (
                                                            note.note_date ? (
                                                                <div
                                                                    className="whitespace-nowrap text-xs leading-tight"
                                                                    style={
                                                                        muteText
                                                                    }
                                                                >
                                                                    <span className="block font-semibold">
                                                                        {fmtDate(
                                                                            note.note_date,
                                                                        )}
                                                                    </span>
                                                                    <span
                                                                        className="mt-0.5 block"
                                                                        style={
                                                                            fadedText
                                                                        }
                                                                    >
                                                                        {fmtTime(
                                                                            note.note_date,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span
                                                                    className="text-xs"
                                                                    style={
                                                                        microText
                                                                    }
                                                                >
                                                                    {t(
                                                                        "notes.list.empty_cell",
                                                                    )}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span
                                                                className="whitespace-nowrap text-xs"
                                                                style={muteText}
                                                            >
                                                                {note.note_date ? (
                                                                    fmtDate(
                                                                        note.note_date,
                                                                    )
                                                                ) : (
                                                                    <span
                                                                        style={
                                                                            microText
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "notes.list.empty_cell",
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ))}
                                                    {col === "tags" && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {note.tags?.map(
                                                                (tag) => (
                                                                    <span
                                                                        key={
                                                                            tag
                                                                        }
                                                                        className="inline-flex items-center whitespace-nowrap px-2 py-0.5 text-[11px] font-medium"
                                                                        style={{
                                                                            background:
                                                                                "color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
                                                                            color: "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
                                                                            borderRadius:
                                                                                "var(--theme-radius-badge)",
                                                                        }}
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        {/* Row actions */}
                                        <td
                                            className={`${cellPadding} text-right`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <DropdownMenu
                                                items={[
                                                    {
                                                        label: note.is_pinned
                                                            ? t(
                                                                  "notes.list.row.unpin",
                                                              )
                                                            : t(
                                                                  "notes.list.row.pin",
                                                              ),
                                                        icon: "fa-thumbtack",
                                                        onClick: () =>
                                                            void togglePin(
                                                                note.id,
                                                            ),
                                                    },
                                                    {
                                                        label: t(
                                                            "notes.list.row.generate_title",
                                                        ),
                                                        icon: "fa-wand-magic-sparkles",
                                                        onClick: () =>
                                                            void generateTitle(
                                                                note.id,
                                                            ),
                                                    },
                                                    {
                                                        label: t(
                                                            "notes.list.row.tags",
                                                        ),
                                                        icon: "fa-tag",
                                                        onClick: () => {
                                                            setTagNoteId(
                                                                note.id,
                                                            );
                                                            setTagNoteTags(
                                                                note.tags ?? [],
                                                            );
                                                        },
                                                    },
                                                    {
                                                        label: t(
                                                            "notes.list.row.add_to_notebook",
                                                        ),
                                                        icon: "fa-book",
                                                        onClick: () =>
                                                            openNotebookPicker(
                                                                note.id,
                                                            ),
                                                    },
                                                    {
                                                        label: t(
                                                            "notes.list.row.categorize_ai",
                                                        ),
                                                        icon: "fa-bolt",
                                                        onClick: () =>
                                                            void categorizeNote(
                                                                note.id,
                                                            ),
                                                    },
                                                    { divider: true },
                                                    {
                                                        label: t(
                                                            "notes.list.row.history",
                                                        ),
                                                        icon: "fa-clock-rotate-left",
                                                        onClick: () =>
                                                            void openHistory(
                                                                note.id,
                                                            ),
                                                    },
                                                    { divider: true },
                                                    {
                                                        label: t(
                                                            "notes.list.row.link_to",
                                                        ),
                                                        icon: "fa-link",
                                                        onClick: () =>
                                                            setLinkAction({
                                                                noteId: note.id,
                                                                action: "link",
                                                            }),
                                                    },
                                                    {
                                                        label: t(
                                                            "notes.list.row.move_to",
                                                        ),
                                                        icon: "fa-right-from-bracket",
                                                        onClick: () =>
                                                            setLinkAction({
                                                                noteId: note.id,
                                                                action: "move",
                                                            }),
                                                    },
                                                    {
                                                        label: t(
                                                            "notes.list.row.copy_to",
                                                        ),
                                                        icon: "fa-copy",
                                                        onClick: () =>
                                                            setLinkAction({
                                                                noteId: note.id,
                                                                action: "copy",
                                                            }),
                                                    },
                                                    ...(note.ai_notes &&
                                                    typeof (
                                                        note.ai_notes as Record<
                                                            string,
                                                            unknown
                                                        >
                                                    ).routing_count === "number"
                                                        ? [
                                                              {
                                                                  divider:
                                                                      true as const,
                                                              },
                                                              {
                                                                  label: t(
                                                                      "notes.list.row.approve_routing",
                                                                  ),
                                                                  icon: "fa-check",
                                                                  onClick: () =>
                                                                      void approveRouting(
                                                                          note.id,
                                                                      ),
                                                              },
                                                              {
                                                                  label: t(
                                                                      "notes.list.row.reject_routing",
                                                                  ),
                                                                  icon: "fa-xmark",
                                                                  onClick: () =>
                                                                      void rejectRouting(
                                                                          note.id,
                                                                      ),
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {notes && notes.last_page > 1 && (
                        <div
                            className="p-3"
                            style={{
                                borderTop:
                                    "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                            }}
                        >
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
            <Modal
                open={showColumnMenu}
                onClose={() => setShowColumnMenu(false)}
                maxWidth="max-w-sm"
            >
                <div className="p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                                background:
                                    "color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)",
                            }}
                        >
                            <i
                                className="fa-solid fa-table-columns"
                                style={{
                                    color: "var(--theme-brand-primary-500)",
                                }}
                            />
                        </div>
                        <div>
                            <h3 className="font-bold">
                                {t("notes.list.config_columns.title")}
                            </h3>
                            <p className="text-xs" style={subtleText}>
                                {t("notes.list.config_columns.subtitle")}
                            </p>
                        </div>
                    </div>

                    {/* Active columns — draggable. Date columns get an
                        inline "Include time" checkbox; toggling it
                        doesn't reorder or remove the column — just flips
                        whether the cell shows date-only or date + time. */}
                    <p
                        className="mb-1 text-xs font-semibold uppercase tracking-wider"
                        style={fadedText}
                    >
                        {t("notes.list.config_columns.active_heading")}
                    </p>
                    <div ref={sortableRef} className="mb-3 space-y-1">
                        {columns
                            .filter((c) => c !== "checkbox")
                            .map((col) => {
                                const isTimeable =
                                    TIMEABLE_COLUMNS.includes(col);
                                return (
                                    <div
                                        key={col}
                                        data-col={col}
                                        className="flex items-center gap-2 px-3 py-2"
                                        style={{
                                            background:
                                                "var(--theme-base-surface)",
                                            border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
                                            borderRadius:
                                                "var(--theme-radius-button)",
                                        }}
                                    >
                                        <i
                                            className="drag-handle fa-solid fa-grip-vertical cursor-grab text-xs active:cursor-grabbing"
                                            style={microText}
                                        />
                                        <span className="flex-1 text-sm">
                                            {columnLabels[col]}
                                        </span>
                                        {isTimeable && (
                                            <label
                                                className="flex cursor-pointer items-center gap-1.5 text-[11px]"
                                                style={fadedText}
                                                onMouseDown={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="alex-checkbox"
                                                    checked={Boolean(
                                                        showTimeFor[col],
                                                    )}
                                                    onChange={() =>
                                                        toggleShowTime(col)
                                                    }
                                                />
                                                {t(
                                                    "notes.list.config_columns.include_time",
                                                )}
                                            </label>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => toggleColumn(col)}
                                            className="alex-notes-icon-btn alex-notes-icon-btn--danger"
                                            aria-label={t(
                                                "notes.list.config_columns.subtitle",
                                            )}
                                        >
                                            <i className="fa-solid fa-xmark text-[10px]" />
                                        </button>
                                    </div>
                                );
                            })}
                    </div>

                    {/* Available columns — not active */}
                    {ALL_COLUMNS.filter(
                        (c) => c !== "checkbox" && !columns.includes(c),
                    ).length > 0 && (
                        <>
                            <p
                                className="mb-1 text-xs font-semibold uppercase tracking-wider"
                                style={fadedText}
                            >
                                {t(
                                    "notes.list.config_columns.available_heading",
                                )}
                            </p>
                            <div className="space-y-1">
                                {ALL_COLUMNS.filter(
                                    (c) =>
                                        c !== "checkbox" &&
                                        !columns.includes(c),
                                ).map((col) => (
                                    <button
                                        key={col}
                                        type="button"
                                        onClick={() => toggleColumn(col)}
                                        className="alex-notes-bulk-btn flex w-full items-center gap-2 px-3 py-2 text-sm"
                                        style={fadedText}
                                    >
                                        <i
                                            className="fa-solid fa-plus text-[10px]"
                                            style={{
                                                color: "color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)",
                                            }}
                                        />
                                        {columnLabels[col]}
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
                onClose={() => {
                    setTagNoteId(null);
                    fetchData();
                }}
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
                    onComplete={() => {
                        setLinkAction(null);
                        fetchData();
                    }}
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
                onClose={() => {
                    setShowNotebooks(false);
                    setNotebookNoteId(null);
                }}
                notebooks={notebooks}
                activeNotebookId={null}
                onSelectNotebook={() => {}}
                onNewNotebook={async () => {
                    const name = prompt(
                        t("notes.list.notebook_picker.prompt_name"),
                    );
                    if (!name) return;
                    await fetch(`/api/v1/projects/${projectId}/notebooks`, {
                        method: "POST",
                        headers: csrfHeaders(),
                        credentials: "same-origin",
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
                title={t("notes.list.author_picker.title")}
                subtitle={t("notes.list.author_picker.subtitle")}
                items={creators.map((c): SearchableItem => ({
                    id: c.id,
                    label: c.name,
                    icon: "fa-solid fa-user",
                }))}
                selectedIds={creatorIds}
                onToggle={(id, next) => {
                    const numId = Number(id);
                    setCreatorIds((prev) =>
                        next
                            ? [...prev, numId]
                            : prev.filter((x) => x !== numId),
                    );
                    setPage(1);
                }}
                onClear={() => {
                    setCreatorIds([]);
                    setPage(1);
                }}
                emptyLabel={t("notes.list.author_picker.empty")}
                searchPlaceholder={t("notes.list.author_picker.search")}
            />

            {/* Notebook picker */}
            <SearchableMultiSelectModal
                open={showNotebookPicker}
                onClose={() => setShowNotebookPicker(false)}
                title={t("notes.list.notebook_picker.title")}
                subtitle={t("notes.list.notebook_picker.subtitle")}
                items={notebooks.map((nb): SearchableItem => ({
                    id: nb.id,
                    label: nb.title,
                    icon: nb.icon ?? "fa-solid fa-book",
                    color: nb.color,
                    count: nb.notes_count,
                }))}
                selectedIds={notebookFilters}
                onToggle={(id, next) => {
                    const numId = Number(id);
                    setNotebookFilters((prev) =>
                        next
                            ? [...prev, numId]
                            : prev.filter((x) => x !== numId),
                    );
                    setPage(1);
                }}
                onClear={() => {
                    setNotebookFilters([]);
                    setPage(1);
                }}
                emptyLabel={t("notes.list.notebook_picker.empty")}
                searchPlaceholder={t("notes.list.notebook_picker.search")}
            />

            {/* Filter Modal */}
            <Modal
                open={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                maxWidth="max-w-lg"
            >
                <div className="p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                                background:
                                    "color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)",
                            }}
                        >
                            <i
                                className="fa-solid fa-filter"
                                style={{
                                    color: "var(--theme-brand-secondary-500)",
                                }}
                            />
                        </div>
                        <div>
                            <h3 className="font-bold">
                                {t("notes.list.filter_modal.title")}
                            </h3>
                            <p className="text-xs" style={subtleText}>
                                {t("notes.list.filter_modal.subtitle")}
                            </p>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="mb-4">
                        <label
                            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                            style={fadedText}
                        >
                            {t("notes.list.filter_modal.status_label")}
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        handleStatusChange(opt.value);
                                    }}
                                    className={`alex-notes-quick-chip ${statusFilter === opt.value ? "alex-notes-quick-chip--active" : ""}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="mb-4">
                        <label
                            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                            style={fadedText}
                        >
                            {t("notes.list.filter_modal.quick_label")}
                        </label>
                        <div className="flex flex-wrap gap-1">
                            <button
                                type="button"
                                onClick={() =>
                                    handleQuickFilter("uncategorized")
                                }
                                className={`alex-notes-quick-chip alex-notes-quick-chip--warning ${quickFilter === "uncategorized" ? "alex-notes-quick-chip--active" : ""}`}
                            >
                                <i className="fa-solid fa-inbox text-xs" />{" "}
                                {t("notes.list.quick.uncategorized")}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    handleQuickFilter("pending_routing")
                                }
                                className={`alex-notes-quick-chip alex-notes-quick-chip--info ${quickFilter === "pending_routing" ? "alex-notes-quick-chip--active" : ""}`}
                            >
                                <i className="fa-solid fa-route text-xs" />{" "}
                                {t("notes.list.quick.pending")}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickFilter("pinned")}
                                className={`alex-notes-quick-chip ${quickFilter === "pinned" ? "alex-notes-quick-chip--active" : ""}`}
                            >
                                <i className="fa-solid fa-thumbtack text-xs" />{" "}
                                {t("notes.list.quick.pinned")}
                            </button>
                        </div>
                    </div>

                    {/* Author + Notebook — each opens a dedicated
                        searchable picker modal (same pattern as Tags),
                        so long lists stay usable and selected entries
                        show as chips at the top of the picker. */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                        <div>
                            <label
                                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                                style={fadedText}
                            >
                                {t("notes.list.filter_modal.author_label")}
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowAuthorPicker(true)}
                                className="alex-notes-facet-trigger flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                                style={{
                                    borderRadius: "var(--theme-radius-input)",
                                }}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <i
                                        className="fa-solid fa-user text-[11px]"
                                        style={subtleText}
                                    />
                                    <span className="truncate">
                                        {creatorIds.length === 0
                                            ? t(
                                                  "notes.list.filter_modal.all_authors",
                                              )
                                            : creatorIds.length === 1
                                              ? (creators.find(
                                                    (c) =>
                                                        c.id === creatorIds[0],
                                                )?.name ??
                                                t(
                                                    "notes.list.filter_modal.one_selected",
                                                ))
                                              : t(
                                                    "notes.list.filter_modal.n_selected",
                                                ).replace(
                                                    ":count",
                                                    String(creatorIds.length),
                                                )}
                                    </span>
                                </span>
                                <i
                                    className="fa-solid fa-chevron-right text-[10px]"
                                    style={microText}
                                />
                            </button>
                        </div>
                        <div>
                            <label
                                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                                style={fadedText}
                            >
                                {t("notes.list.filter_modal.notebook_label")}
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowNotebookPicker(true)}
                                className="alex-notes-facet-trigger flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                                style={{
                                    borderRadius: "var(--theme-radius-input)",
                                }}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <i
                                        className="fa-solid fa-book text-[11px]"
                                        style={subtleText}
                                    />
                                    <span className="truncate">
                                        {notebookFilters.length === 0
                                            ? t(
                                                  "notes.list.filter_modal.all_notebooks",
                                              )
                                            : notebookFilters.length === 1
                                              ? (notebooks.find(
                                                    (n) =>
                                                        n.id ===
                                                        notebookFilters[0],
                                                )?.title ??
                                                t(
                                                    "notes.list.filter_modal.one_selected",
                                                ))
                                              : t(
                                                    "notes.list.filter_modal.n_selected",
                                                ).replace(
                                                    ":count",
                                                    String(
                                                        notebookFilters.length,
                                                    ),
                                                )}
                                    </span>
                                </span>
                                <i
                                    className="fa-solid fa-chevron-right text-[10px]"
                                    style={microText}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Clear all */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                handleStatusChange("active");
                                setCreatorIds([]);
                                setQuickFilter("all");
                                setNotebookFilters([]);
                                setPage(1);
                            }}
                            className="alex-notes-bulk-btn flex w-full items-center justify-center gap-1.5 py-2"
                            style={{
                                color: "var(--theme-status-error-stroke)",
                            }}
                        >
                            <i className="fa-solid fa-xmark text-xs" />{" "}
                            {t("notes.list.filter_modal.clear_all")}
                        </button>
                    )}
                </div>
            </Modal>
        </div>
    );
}
