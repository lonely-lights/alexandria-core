/**
 * Entries ribbon context — the host-defined Ctx the Show page threads
 * through `<Ribbon setKey="entries">` (Stage 11 Slice 4, Task 3).
 *
 * Navigation state (activeTab + data presence flags) drives the View
 * tab's toggle controls; the actions object wires File-tab commands
 * back to the Show page's React state.
 */

export type EntryTab =
    | 'overview'
    | 'structure'
    | 'attributes'
    | 'relationships'
    | 'connections'
    | 'mentions'
    | 'mentioned_in'
    | 'media'
    | 'history'
    | 'timeline';

export interface EntriesRibbonContext {
    /** Currently active section tab — drives active-state on View controls. */
    activeTab: EntryTab;
    /** Presence flags control visibility of conditional navigation controls. */
    hasChildren: boolean;
    hasTimelineEvents: boolean;
    hasConnections: boolean;
    hasAttributes: boolean;
    hasRelationships: boolean;
    hasMentions: boolean;
    hasMentionedIn: boolean;
    hasHistory: boolean;
    /** Inertia href for the edit page (built once in Show, passed through context). */
    editHref: string;
    /** Whether the blueprint has tree view enabled — controls visibility of the View-in-Tree goto link. */
    showTreeView: boolean;
    /** Pre-computed "All {plural}" label for the goto group (e.g. "All Characters"). */
    allEntriesLabel: string;
    actions: {
        /** Switch the visible content tab. */
        setTab(tab: EntryTab): void;
        /** Open the Entry Settings modal (theme override panel). */
        openSettings(): void;
        /** Navigate to the entry edit page. */
        editEntry(): void;
        /** Open the delete confirmation modal. */
        deleteEntry(): void;
        /** Navigate to the blueprint index page (all entries listing). */
        goToBlueprint(): void;
        /** Navigate to the blueprint tree view (/blueprint-index#tree). */
        goToTree(): void;
    };
}
