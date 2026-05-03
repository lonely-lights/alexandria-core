/**
 * Stored in a BlueprintViewEntry's `config` when Kanban is enabled.
 * Matches the spec at docs/todo/kanban-view.md.
 */
export interface KanbanConfig {
    /** Name of the field on this blueprint whose values become the
        columns. Must be a single-select list-type field for Phase 1. */
    group_field_name: string | null;
    /** Sort order within each column. Default: 'sort_order'. */
    column_sort: 'sort_order' | 'name' | 'updated_at' | 'created_at';
    /** Which additional fields render on the card body (max ~3). */
    card_fields: string[];
    /** Show the entry's thumbnail on the card. */
    show_thumbnails: boolean;
}

/**
 * Shape returned by the kanban endpoint for a single column + its entries.
 * `key` is the raw field value (or null for Unassigned); `label` is the
 * user-facing label (same as key for plain strings; name for entry_reference
 * values).
 */
export interface KanbanColumnData {
    key: string | null;
    label: string;
    entries: KanbanCardData[];
}

/**
 * Minimal data the Kanban card renders. Summary comes pre-rendered so
 * wiki markup displays without a second parse pass on the client.
 */
export interface KanbanCardData {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    summary: string | null;
    summary_html: string | null;
    thumbnail_url: string | null;
    sort_order: number;
}

/** Sensible default for a fresh Kanban view. */
export function defaultKanbanConfig(): KanbanConfig {
    return {
        group_field_name: null,
        column_sort: 'sort_order',
        card_fields: [],
        show_thumbnails: false,
    };
}
