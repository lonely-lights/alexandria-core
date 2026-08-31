import { router, usePage } from '@inertiajs/react';
import { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import RuledCursiveBg from '@alexandria/components/backgrounds/RuledCursiveBg';
import ActionButton from '@alexandria/components/ui/ActionButton';
import IconTile from '@alexandria/components/ui/IconTile';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import useT from '@alexandria/hooks/useT';
import { useVisitedTabs } from '@alexandria/hooks/useVisitedTabs';
import { projectUrl } from '@alexandria/lib/urls';
import DashboardView from './Sections/DashboardView';
import NotesView from './Sections/NotesView';
import NotebooksView from './Sections/NotebooksView';
import NoteModal from './Sections/NoteModal';
import SortingHistoryModal from '@alexandria/components/notes/modals/SortingHistoryModal';
import ImportModal from '@alexandria/components/notes/modals/ImportModal';
import NotebookFormModal from '@alexandria/components/notes/modals/NotebookFormModal';
import type { NotesDashboardProps, NoteStatusFilter } from '@alexandria/types/notes-dashboard';

type View = 'dashboard' | 'notes' | 'notebooks';

/** Notes tab rendering mode: List is the classic table (NotesView), Grid
 * is the Google Keep-style masonry board (owner ruling, 2026-08-31: Notes
 * Keep graduated from a standalone trial page into a real dashboard view). */
type NotesTabViewMode = 'list' | 'grid';

/** Dashboard base-scope filter: 'all' is the whole-project aggregate
 * (default, owner ruling 2026-08-31), 'root' narrows to the unsorted
 * inbox (the pre-ruling default). */
type NotesScope = 'all' | 'root';

interface NotesDashboardSlotProps {
    /**
     * App-supplied Grid view for the Notes tab (owner ruling, 2026-08-31).
     * Core ships no grid renderer of its own, the masonry-grid components
     * (Notes Keep) live app-side, so the Grid toggle only renders when a
     * consumer supplies this slot. Receives the current scope filter so
     * List and Grid stay in sync on which corpus they're showing.
     */
    gridView?: (ctx: { scope: NotesScope }) => ReactNode;
}

/**
 * Initial active tab. A real hash always wins (deep links like
 * `#notebooks`); otherwise a `?view=grid` or `?view=list` query param
 * (the notes.keep redirect, and the drawer's grid-view opener) lands the
 * user straight on the Notes tab so the requested view mode is visible.
 */
function initialActiveView(): View {
    const hash = window.location.hash.slice(1);
    if (hash === 'notes' || hash === 'notebooks' || hash === 'dashboard') {
        return hash;
    }
    const queryView = new URLSearchParams(window.location.search).get('view');
    return queryView === 'grid' || queryView === 'list' ? 'notes' : 'dashboard';
}

export default function NotesDashboard({ gridView }: NotesDashboardSlotProps = {}) {
    const props = usePage<NotesDashboardProps>().props;
    const { project, stats, recentNotes } = props;
    const t = useT();

    // Below 1024px the breadcrumb strip can't hold the 3 view tabs +
    // overflow menu + the breadcrumb itself, so we collapse the tab
    // pills into the existing overflow menu (same trick we used on
    // Projects Show).
    const isMobileNotesDashboard = useMediaQuery('(max-width: 1023px)');
    const [activeView, setActiveView] = useState<View>(initialActiveView);

    // Notes tab view mode (List/Grid) + base-scope filter (All/Root).
    // View mode is persisted per project (house idiom: `namespace:id`
    // localStorage key, matching e.g. the writing structure tree's
    // expanded-node persistence); `?view=` in the URL overrides it for
    // this load without clobbering the stored preference for next time.
    // Scope resets to 'all' every load by design: the owner ruling makes
    // 'all' the default, so a stale 'root' filter must never persist
    // silently across sessions.
    const viewStorageKey = `alexandria.notes.dashboard-view:${project.id}`;
    const [notesViewMode, setNotesViewModeState] = useState<NotesTabViewMode>(() => {
        const queryView = new URLSearchParams(window.location.search).get('view');
        if (queryView === 'grid' || queryView === 'list') return queryView;
        try {
            const stored = window.localStorage.getItem(viewStorageKey);
            if (stored === 'grid' || stored === 'list') return stored;
        } catch {
            // localStorage disabled / quota-full, fall back to List.
        }
        return 'list';
    });
    const [notesScope, setNotesScope] = useState<NotesScope>('all');

    function setNotesViewMode(mode: NotesTabViewMode): void {
        setNotesViewModeState(mode);
        try {
            window.localStorage.setItem(viewStorageKey, mode);
        } catch {
            // ignore, state already updated, persistence is best-effort
        }
    }

    const [initialStatusFilter, setInitialStatusFilter] = useState<NoteStatusFilter | null>(null);
    const [initialQuickFilter, setInitialQuickFilter] = useState<string | null>(null);
    // Deep link from the command palette's Notes results:
    // /notes/{slug}?search=<term>#notes pre-fills the Notes tab search.
    const [initialSearch] = useState<string | null>(
        () => new URLSearchParams(window.location.search).get('search'),
    );
    const [showCreate, setShowCreate] = useState(false);
    const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null);
    // Bumps on every notebook-tile click so NotesView re-applies the
    // filter even when the user clicks the same notebook twice in a
    // row (between manual filter clears).
    const [notebookSelectionNonce, setNotebookSelectionNonce] = useState(0);
    // Sorting History + Import modals live here (not inside NotesView)
    // so the overflow menu can open them from any tab — the menu items
    // are universal, not Notes-tab-scoped.
    const [showSortingHistory, setShowSortingHistory] = useState(false);
    const [showImport, setShowImport] = useState(false);
    // Bumped after an import completes so NotesView refetches its list
    // when the user lands on/returns to it.
    const [notesRefetchNonce, setNotesRefetchNonce] = useState(0);
    // "New Notebook" lives at the page level so users can create one
    // from any tab. Bumping `notebooksRefetchNonce` tells NotebooksView
    // to refetch the next time it mounts / is already mounted.
    const [showNotebookForm, setShowNotebookForm] = useState(false);
    const [notebooksRefetchNonce, setNotebooksRefetchNonce] = useState(0);

    useEffect(() => {
        window.location.hash = activeView === 'dashboard' ? '' : `#${activeView}`;
    }, [activeView]);

    // Tab views are lazy-mounted on first visit and then kept mounted
    // (with visibility toggled) so tab-switching preserves their state
    // — no refetches, filter resets, or loading flashes when the user
    // returns to a tab they've already opened.
    const visited = useVisitedTabs(activeView);

    /**
     * Refresh post-save without a full page navigation. Inertia partial
     * reload pulls fresh `stats` + `recentNotes` props from the server
     * (so the Dashboard tab reflects the new universe), and bumping the
     * notesRefetchNonce tells NotesView to re-run its local API fetch
     * (its data isn't an Inertia prop, so the partial reload doesn't
     * touch it directly). NotebooksView gets bumped too in case a tag
     * change touched a notebook membership. Scroll position, mounted
     * tab states, and modal animations all survive — full-page reload
     * was burning all of that.
     */
    const refreshAfterSave = useCallback(() => {
        router.reload({ only: ['stats', 'recentNotes'] });
        setNotesRefetchNonce((n) => n + 1);
        setNotebooksRefetchNonce((n) => n + 1);
    }, []);

    function navigateToNotes(statusFilter?: NoteStatusFilter, quickFilter?: string): void {
        setInitialStatusFilter(statusFilter ?? null);
        setInitialQuickFilter(quickFilter ?? null);
        setActiveView('notes');
    }

    return (
        <AppLayout
            title={t('notes.page.title')}
            immersive
            // Wire the bottom-right FAB to the real New Note / New
            // Notebook actions. AppLayout already renders the FAB as
            // a slide-up modal chooser when there's >1 action — exactly
            // the "tap +, pick Note or Notebook, route from there" flow.
            // On mobile we also hide the page-header buttons so the
            // FAB is the single canonical add-new entry point.
            fabActions={[
                {
                    label: t('notes.action.new_note'),
                    description: t('notes.action.new_note_description'),
                    icon: 'fa-solid fa-note-sticky',
                    onClick: () => setShowCreate(true),
                },
                {
                    label: t('notes.action.new_notebook'),
                    description: t('notes.action.new_notebook_description'),
                    icon: 'fa-solid fa-book-medical',
                    onClick: () => setShowNotebookForm(true),
                },
            ]}
        >
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: projectUrl(project.slug) },
                    { label: t('notes.page.breadcrumb') },
                ]}
                actions={
                    // Hidden on mobile — FAB chooser owns the add-new
                    // affordance there. Desktop keeps the discoverable
                    // inline buttons.
                    <div className="hidden items-center gap-2 sm:flex">
                        <ActionButton
                            icon="fa-solid fa-plus"
                            label={t('notes.action.new_note')}
                            size="md"
                            className="paper-action"
                            onClick={() => setShowCreate(true)}
                        />
                        {/* Secondary action — dashed outline, paints from
                            --theme-brand-primary-* via .alex-btn--outline
                            so it tracks the active preset. Visible on
                            every tab; opens the notebook form modal at
                            the page level. */}
                        <button
                            type="button"
                            onClick={() => setShowNotebookForm(true)}
                            className="alex-btn alex-btn--outline"
                            style={{
                                borderRadius: 'var(--theme-radius-button)',
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.875rem',
                                gap: '0.375rem',
                            }}
                            aria-label={t('notes.action.new_notebook')}
                        >
                            <i className="fa-solid fa-book-medical text-xs" />
                            {/* Label hides below sm: — the + New Note
                                primary button already takes a chunk of
                                the row, and the icon alone is enough
                                signal for the secondary action. */}
                            <span className="hidden sm:inline">{t('notes.action.new_notebook')}</span>
                        </button>
                    </div>
                }
                tabs={
                    <>
                        {/* Inline tab pills — desktop only. Mobile
                            collapses them into the overflow menu below
                            so the breadcrumb strip stays readable at
                            375px (was: breadcrumb + 3 pills + ⋮ all
                            jostling for ~343px). */}
                        {!isMobileNotesDashboard && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setActiveView('dashboard')}
                                    className={`alex-notes-tab ${activeView === 'dashboard' ? 'alex-notes-tab--active' : ''}`}
                                >
                                    <i className="fa-solid fa-gauge text-xs" />
                                    {t('notes.tab.dashboard')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveView('notes')}
                                    className={`alex-notes-tab ${activeView === 'notes' ? 'alex-notes-tab--active' : ''}`}
                                >
                                    <i className="fa-solid fa-sticky-note text-xs" />
                                    {t('notes.tab.notes')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveView('notebooks')}
                                    className={`alex-notes-tab ${activeView === 'notebooks' ? 'alex-notes-tab--active' : ''}`}
                                >
                                    <i className="fa-solid fa-book text-xs" />
                                    {t('notes.tab.notebooks')}
                                </button>
                            </>
                        )}
                        {/* Overflow menu — universal actions available
                            from any tab. Lives in the tabs bar so there's
                            one canonical entry point whether the user is
                            on Dashboard, Notes, or Notebooks.
                            On mobile the three view tabs prepend here so
                            users can still switch views. */}
                        <DropdownMenu
                            align="right"
                            trigger={
                                <button
                                    type="button"
                                    aria-label={t('notes.action.more_aria')}
                                    className="alex-notes-overflow-trigger"
                                >
                                    <i className="fa-solid fa-ellipsis-vertical text-xs" />
                                </button>
                            }
                            items={[
                                ...(isMobileNotesDashboard ? [
                                    { label: t('notes.tab.dashboard'), icon: 'fa-gauge', onClick: () => setActiveView('dashboard') },
                                    { label: t('notes.tab.notes'), icon: 'fa-sticky-note', onClick: () => setActiveView('notes') },
                                    { label: t('notes.tab.notebooks'), icon: 'fa-book', onClick: () => setActiveView('notebooks') },
                                    { divider: true as const },
                                ] : []),
                                {
                                    label: t('notes.action.sorting_history'),
                                    icon: 'fa-route',
                                    onClick: () => setShowSortingHistory(true),
                                },
                                {
                                    label: t('notes.action.import_notes'),
                                    icon: 'fa-file-import',
                                    onClick: () => setShowImport(true),
                                },
                            ]}
                        />
                    </>
                }
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <IconTile
                        icon="fa-solid fa-sticky-note"
                        color="secondary"
                        variant="solid"
                        animation="beat-fade"
                        // Mobile uses the `sm` (32×32, smaller icon)
                        // preset so the tile doesn't claim a quarter
                        // of the hero row alongside a 24px heading.
                        size={isMobileNotesDashboard ? 'sm' : 'lg'}
                        animationStyle={{
                            // Slow, subtle — "the notes are alive" ambient pulse,
                            // not attention-grabbing shake.
                            '--fa-animation-duration': '2.5s',
                            '--fa-beat-fade-opacity': '0.8',
                            '--fa-beat-fade-scale': '1.075',
                        } as CSSProperties}
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight">{t('notes.page.heading')}</h1>
                        <p
                            className="mt-1 text-xs sm:text-sm"
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}
                        >
                            {t('notes.page.tagline').replace(':project', project.name)}
                        </p>
                    </div>
                </div>
            </PageHeader>

            {/* Tight top + extra bottom padding so list content scrolls
                under the navbar's backdrop-blur at the top edge and the
                BottomNav (on mobile) at the bottom edge — gives the page
                a layered, edges-tucked-under-chrome feel.

                Wrapper carries the ruled-paper motif: full-width so the
                notebook lines extend edge-to-edge behind the constrained
                container. Scoped to tf themes; no-op elsewhere. */}
            <div className="relative min-h-[calc(100vh-var(--navbar-height,3.5rem))]">
                {/* Lines + cursive rendered as a single SVG pattern so
                    their positions share one coordinate system. The whole
                    pattern is rotated -23° via patternTransform, so the
                    tilt + line rhythm + text baselines are all locked
                    together — no drift, no percentage math.

                    Wrapped in .cursive-overlay so it only renders on TF
                    themes (scoping lives in thought-fragments.css). */}
                {/* Top band only — 2/3 viewport tall with a
                    fade-to-transparent mask so the pattern dissolves
                    into the page. The parent's min-height still keeps
                    the full gradient visible on sparse pages. */}
                <div className="cursive-overlay bg-fade-out pointer-events-none absolute inset-x-0 top-0 h-[66vh] overflow-hidden" aria-hidden="true">
                    <RuledCursiveBg />
                </div>

                <div className="relative container mx-auto max-w-7xl px-4 pt-4 pb-32 lg:pb-8">
                    {/* Each tab is mounted on first visit and hidden (not
                        unmounted) when the user switches away, so its
                        loaded data and scroll position survive. `hidden`
                        also keeps its subtree out of the accessibility
                        tree while inactive. */}
                    {visited.has('dashboard') && (
                        <div hidden={activeView !== 'dashboard'}>
                            <DashboardView
                                projectId={project.id}
                                stats={stats}
                                recentNotes={recentNotes}
                                onNavigate={navigateToNotes}
                                onNoteSaved={refreshAfterSave}
                            />
                        </div>
                    )}
                    {visited.has('notes') && (
                        <div hidden={activeView !== 'notes'}>
                            {/* View mode (List/Grid) + base-scope (All/Root)
                                controls. The Grid toggle only renders when a
                                consumer supplies the gridView slot, since a
                                bare core install has no grid renderer to switch
                                to. Scope always renders; it governs both
                                List (server-side, via NotesView's `scope`
                                prop) and Grid (passed straight through to
                                the slot) so switching views mid-filter
                                doesn't silently change the corpus. */}
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pt-4">
                                {gridView && (
                                    <div className="inline-flex items-center gap-1" role="group" aria-label={t('notes.view.grid_aria')}>
                                        <button
                                            type="button"
                                            onClick={() => setNotesViewMode('list')}
                                            className={`alex-notes-tab alex-notes-tab--icon-only ${notesViewMode === 'list' ? 'alex-notes-tab--active' : ''}`}
                                            aria-label={t('notes.view.list_aria')}
                                            aria-pressed={notesViewMode === 'list'}
                                            title={t('notes.view.list')}
                                        >
                                            <i className="fa-solid fa-list text-xs" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNotesViewMode('grid')}
                                            className={`alex-notes-tab alex-notes-tab--icon-only ${notesViewMode === 'grid' ? 'alex-notes-tab--active' : ''}`}
                                            aria-label={t('notes.view.grid_aria')}
                                            aria-pressed={notesViewMode === 'grid'}
                                            title={t('notes.view.grid')}
                                        >
                                            <i className="fa-solid fa-table-cells-large text-xs" aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                                <div className="ml-auto inline-flex items-center gap-1" role="group" aria-label={t('notes.scope.group_aria')}>
                                    <button
                                        type="button"
                                        onClick={() => setNotesScope('all')}
                                        className={`alex-notes-tab ${notesScope === 'all' ? 'alex-notes-tab--active' : ''}`}
                                        aria-label={t('notes.scope.all_aria')}
                                        aria-pressed={notesScope === 'all'}
                                    >
                                        {t('notes.scope.all')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNotesScope('root')}
                                        className={`alex-notes-tab ${notesScope === 'root' ? 'alex-notes-tab--active' : ''}`}
                                        aria-label={t('notes.scope.root_aria')}
                                        aria-pressed={notesScope === 'root'}
                                    >
                                        {t('notes.scope.root')}
                                    </button>
                                </div>
                            </div>

                            {notesViewMode === 'grid' && gridView ? (
                                gridView({ scope: notesScope })
                            ) : (
                                <NotesView
                                    projectId={project.id}
                                    initialStatusFilter={initialStatusFilter}
                                    initialQuickFilter={initialQuickFilter}
                                    initialSearch={initialSearch}
                                    initialNotebookId={activeNotebookId}
                                    notebookSelectionNonce={notebookSelectionNonce}
                                    refetchNonce={notesRefetchNonce}
                                    scope={notesScope}
                                />
                            )}
                        </div>
                    )}
                    {visited.has('notebooks') && (
                        <div hidden={activeView !== 'notebooks'}>
                            <NotebooksView
                                projectId={project.id}
                                refetchNonce={notebooksRefetchNonce}
                                onSelectNotebook={(id) => {
                                    setActiveNotebookId(id);
                                    setNotebookSelectionNonce((n) => n + 1);
                                    setActiveView('notes');
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <NoteModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                note={null}
                projectId={project.id}
                mode="create"
                onSaved={() => { setShowCreate(false); refreshAfterSave(); }}
            />

            {/* CommandPalette + Cmd-K wiring lives in AppLayout — it
                mounts a single globally-scoped palette whenever there's
                a currentProject in shared props, listens for the
                `alexandria-core:command-palette-toggle` event (the
                navbar + bottom-nav search buttons both dispatch it),
                and binds Cmd/Ctrl+K. Per-page mounts would stack
                duplicate palettes that both open on the same event. */}

            {/* Universal Sorting History + Import modals — openable from
                the overflow menu regardless of which tab is active. */}
            <SortingHistoryModal
                open={showSortingHistory}
                onClose={() => setShowSortingHistory(false)}
                projectId={project.id}
                projectSlug={project.slug}
            />
            <ImportModal
                open={showImport}
                onClose={() => setShowImport(false)}
                projectId={project.id}
                contextType="project"
                contextId={project.id}
                onComplete={() => {
                    setShowImport(false);
                    // Switch to Notes view so the user immediately sees
                    // what came in, and bump the nonce so the list
                    // refetches if the user was already there.
                    setActiveView('notes');
                    setNotesRefetchNonce((n) => n + 1);
                }}
            />

            {/* Create-only notebook modal — universal across tabs.
                NotebooksView still mounts its own instance in edit mode
                (triggered by the tile overflow menu), but create is
                promoted to this page level. */}
            <NotebookFormModal
                open={showNotebookForm}
                onClose={() => setShowNotebookForm(false)}
                projectId={project.id}
                notebook={null}
                onSaved={() => {
                    // Tell NotebooksView to refetch so the new notebook
                    // appears whether the user is on the tab now or lands
                    // on it later.
                    setNotebooksRefetchNonce((n) => n + 1);
                }}
            />
        </AppLayout>
    );
}
