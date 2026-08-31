export interface NotesDashboardProps {
    project: {
        id: number;
        name: string;
        slug: string;
        can: {
            update: boolean;
        };
    };
    stats: NotesDashboardStats;
    recentNotes: Note[];
    [key: string]: unknown;
}

export interface NotesDashboardStats {
    active: number;
    archived: number;
    trashed: number;
    total: number;
    uncategorized: number;
    pending_routing: number;
    pinned: number;
}

/**
 * Canonical Note shape used across the Notes surface — drawer, dashboard
 * list, note modal, note card, anywhere. This replaced the earlier
 * `DashboardNote` + `NoteData` pair (see DRAWER_REDESIGN_PLAN.md §3.2).
 *
 * Field notes:
 * - `locations` is optional — the drawer's older list endpoint may not
 *   populate it; the dashboard endpoints always do.
 * - `creator.display_name` is nullable because system-authored notes
 *   may not have one.
 */
export interface Note {
    id: number;
    title: string;
    text: string;
    note_date: string | null;
    status: string;
    is_pinned: boolean;
    color: string | null;
    ai_notes: Record<string, unknown> | null;
    tags: string[];
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
    creator: {
        id: number;
        name: string;
        display_name: string | null;
    } | null;
    locations?: NoteLocation[];
    links?: NoteLinkPreview[];
}


export interface NoteLinkPreview {
    id: number;
    url: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    favicon_url: string | null;
    site_name: string | null;
    status: 'pending' | 'fetched' | 'failed';
}

export interface NoteLocation {
    /**
     * `work` / `work_section` locations come from notes attached to a
     * manuscript or one of its sections — see NotesDashboardController.
     */
    type: 'project' | 'blueprint' | 'entry' | 'notebook' | 'work' | 'work_section';
    id: number;
    name: string;
    slug?: string;
    icon?: string | null;
    /** Direct URL to the linked model's show page, when available. */
    url?: string | null;
    processing_status?: string | null;
}

export interface NotesListResponse {
    notes: PaginatedNotes;
    creators: NoteCreator[];
}

export interface PaginatedNotes {
    data: Note[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    per_page: number;
    /** True when current_page < last_page. Drives incremental-load UI
     * (e.g. the Notes Dashboard's Grid view, owner ruling 2026-08-31). */
    has_more: boolean;
}

export interface NoteCreator {
    id: number;
    name: string;
}

export type NoteStatusFilter = 'active' | 'archived' | 'trashed' | 'all';

export type NoteSortKey = 'created_at' | 'updated_at' | 'note_date' | 'title' | 'status';

export type SortDir = 'asc' | 'desc';

export type NoteQuickFilter = 'all' | 'pinned' | 'uncategorized' | 'pending_routing';
