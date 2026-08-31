import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { NotebookData } from '@alexandria/components/notes/modals/NotebookSelectorModal';
import type { NoteQuickFilter, NoteStatusFilter } from '@alexandria/types/notes-dashboard';

export interface NotesFilterState {
    statusFilter: NoteStatusFilter;
    setStatusFilter: (value: NoteStatusFilter) => void;
    quickFilter: NoteQuickFilter;
    setQuickFilter: (value: NoteQuickFilter) => void;
    creatorIds: number[];
    setCreatorIds: Dispatch<SetStateAction<number[]>>;
    notebookFilters: number[];
    setNotebookFilters: Dispatch<SetStateAction<number[]>>;
    notebooks: NotebookData[];
    fetchNotebooks: () => Promise<void>;
    showFilterModal: boolean;
    setShowFilterModal: (value: boolean) => void;
    hasActiveFilters: boolean;
    activeFilterCount: number;
    clearAll: () => void;
}

/**
 * Shared status/quick-filter/author/notebook filter state for the Notes
 * Dashboard's List and Grid views (owner ruling, 2026-08-31 toolbar
 * unification). Each view owns its OWN instance — filters don't survive a
 * List<->Grid switch, only search does (that's lifted separately to
 * NotesDashboard) — but both instances behave identically and both feed
 * the same NotesFilterModal / NotesFilterChips components, so the two
 * views stay behaviorally in sync without literally sharing one state
 * object across an unmount/remount boundary.
 */
export function useNotesFilterState(
    projectId: number,
    initialNotebookId?: number | null,
): NotesFilterState {
    const [statusFilter, setStatusFilter] = useState<NoteStatusFilter>('active');
    const [quickFilter, setQuickFilter] = useState<NoteQuickFilter>('all');
    const [creatorIds, setCreatorIds] = useState<number[]>([]);
    const [notebookFilters, setNotebookFilters] = useState<number[]>(
        initialNotebookId ? [initialNotebookId] : [],
    );
    const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
    const [showFilterModal, setShowFilterModal] = useState(false);

    const fetchNotebooks = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/projects/${projectId}/notebooks`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            if (res.ok) setNotebooks(await res.json());
        } catch {
            /* ignore — the picker just shows an empty list */
        }
    }, [projectId]);

    useEffect(() => {
        void fetchNotebooks();
    }, [fetchNotebooks]);

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

    const clearAll = useCallback(() => {
        setStatusFilter('active');
        setQuickFilter('all');
        setCreatorIds([]);
        setNotebookFilters([]);
    }, []);

    return {
        statusFilter,
        setStatusFilter,
        quickFilter,
        setQuickFilter,
        creatorIds,
        setCreatorIds,
        notebookFilters,
        setNotebookFilters,
        notebooks,
        fetchNotebooks,
        showFilterModal,
        setShowFilterModal,
        hasActiveFilters,
        activeFilterCount,
        clearAll,
    };
}
