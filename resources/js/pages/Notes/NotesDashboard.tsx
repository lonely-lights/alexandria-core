import { usePage } from '@inertiajs/react';
import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import ActionButton from '@alexandria/components/ui/ActionButton';
import CommandPalette from '@alexandria/components/search/CommandPalette';
import { projectSearch } from '@alexandria/lib/projectSearch';
import IconTile from '@alexandria/components/ui/IconTile';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import useT from '@alexandria/hooks/useT';
import { useCmdK } from '@alexandria/hooks/useCmdK';
import DashboardView from './Sections/DashboardView';
import NotesView from './Sections/NotesView';
import NotebooksView from './Sections/NotebooksView';
import NoteModal from './Sections/NoteModal';
import SortingHistoryModal from '@alexandria/components/notes/modals/SortingHistoryModal';
import ImportModal from '@alexandria/components/notes/modals/ImportModal';
import NotebookFormModal from '@alexandria/components/notes/modals/NotebookFormModal';
import type { NotesDashboardProps, NoteStatusFilter } from '@alexandria/types/notes-dashboard';

type View = 'dashboard' | 'notes' | 'notebooks';

function viewFromHash(): View {
    const hash = window.location.hash.slice(1) as View;
    const valid: View[] = ['dashboard', 'notes', 'notebooks'];
    return valid.includes(hash) ? hash : 'dashboard';
}

export default function NotesDashboard() {
    const props = usePage().props as unknown as NotesDashboardProps;
    const { project, stats, recentNotes } = props;
    const t = useT();

    const [activeView, setActiveView] = useState<View>(viewFromHash);
    const [initialStatusFilter, setInitialStatusFilter] = useState<NoteStatusFilter | null>(null);
    const [initialQuickFilter, setInitialQuickFilter] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null);
    // Bumps on every notebook-tile click so NotesView re-applies the
    // filter even when the user clicks the same notebook twice in a
    // row (between manual filter clears).
    const [notebookSelectionNonce, setNotebookSelectionNonce] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);
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
    const [visited, setVisited] = useState<Set<View>>(() => new Set([viewFromHash()]));
    useEffect(() => {
        if (visited.has(activeView)) return;
        setVisited((prev) => {
            const next = new Set(prev);
            next.add(activeView);
            return next;
        });
    }, [activeView, visited]);

    useCmdK(useCallback(() => setSearchOpen(true), []));

    function navigateToNotes(statusFilter?: NoteStatusFilter, quickFilter?: string): void {
        setInitialStatusFilter(statusFilter ?? null);
        setInitialQuickFilter(quickFilter ?? null);
        setActiveView('notes');
    }

    return (
        <AppLayout title={t('notes.page.title')} immersive onSearchToggle={() => setSearchOpen(true)}>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: t('notes.page.breadcrumb') },
                ]}
                actions={
                    <div className="flex items-center gap-2">
                        <ActionButton
                            icon="fa-solid fa-plus"
                            label={t('notes.action.new_note')}
                            size="md"
                            className="paper-action"
                            onClick={() => setShowCreate(true)}
                        />
                        {/* Secondary action — dashed outline, matches the
                            "See how it works" CTA on the Welcome page so
                            the two share a visual language. Visible on
                            every tab; opens the notebook form modal
                            which lives at this page level. */}
                        <button
                            type="button"
                            onClick={() => setShowNotebookForm(true)}
                            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)' }}
                        >
                            <span
                                className="btn-dashed px-5 py-3"
                                style={{ borderRadius: 'var(--theme-radius-button)' }}
                            >
                                <i className="fa-solid fa-book-medical mr-1.5 text-xs" />
                                {t('notes.action.new_notebook')}
                            </span>
                        </button>
                    </div>
                }
                tabs={
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
                        {/* Overflow menu — universal actions available
                            from any tab. Lives in the tabs bar so there's
                            one canonical entry point whether the user is
                            on Dashboard, Notes, or Notebooks. */}
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
                <div className="flex items-center gap-4">
                    <IconTile
                        icon="fa-solid fa-sticky-note"
                        color="secondary"
                        variant="solid"
                        animation="beat-fade"
                        animationStyle={{
                            // Slow, subtle — "the notes are alive" ambient pulse,
                            // not attention-grabbing shake.
                            '--fa-animation-duration': '2.5s',
                            '--fa-beat-fade-opacity': '0.8',
                            '--fa-beat-fade-scale': '1.075',
                        } as CSSProperties}
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">{t('notes.page.heading')}</h1>
                        <p
                            className="mt-1 text-sm"
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
                                onNoteSaved={() => window.location.reload()}
                            />
                        </div>
                    )}
                    {visited.has('notes') && (
                        <div hidden={activeView !== 'notes'}>
                            <NotesView
                                projectId={project.id}
                                initialStatusFilter={initialStatusFilter}
                                initialQuickFilter={initialQuickFilter}
                                initialNotebookId={activeNotebookId}
                                notebookSelectionNonce={notebookSelectionNonce}
                                refetchNonce={notesRefetchNonce}
                            />
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
                onSaved={() => { setShowCreate(false); window.location.reload(); }}
            />

            <CommandPalette
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                onSearch={projectSearch(project.slug)}
            />

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

/**
 * Notebook-paper background — SVG pattern combining the ruled lines and
 * decorative cursive phrases in one coordinate system. patternTransform
 * rotates the whole pattern 23° counterclockwise so lines and text tilt
 * together; baselines sit exactly on their lines because both are
 * authored in the same tile.
 *
 * Tile dimensions (960 × 448, pre-rotation):
 * - 16 ruled lines every 28px
 * - 10 cursive phrases spread across varied x positions — a wide tile
 *   with staggered x's breaks up the column-stacking that a small tile
 *   produces when it repeats.
 * - A <g> inside the pattern is animated with SMIL, slowly translating
 *   along the pattern's x-axis (which, post-rotation, is the direction
 *   of the ruled lines). Translating by one full tile width loops
 *   seamlessly because the next tile is identical.
 */
// Begin-time offsets (seconds) for each phrase's fade cycle. Chosen so
// the 10 fades feel independent rather than metronomic — no two phrases
// start their visible window at the same instant, and the stagger spans
// the full 36s cycle so at any moment roughly half the phrases are
// visible while the others are resting.
const PHRASE_FADE_OFFSETS = [0, 12, 5, 28, 17, 3, 22, 9, 31, 14];

function RuledCursiveBg() {
    const lines = Array.from({ length: 16 }, (_, i) => (i + 1) * 28);
    // [x, baselineY, phrase]. y values shifted up 2px from each line's
    // y so the baseline sits just above the ruled line, not flush on it.
    const phrases: Array<[number, number, string]> = [
        [40,   54, 'every idea a home'],
        [540, 110, 'characters remember'],
        [180, 166, 'worlds grow'],
        [720, 222, 'drafts upon drafts'],
        [60,  278, 'keep writing'],
        [420, 334, 'the margins are yours'],
        [800, 390, 'one note at a time'],
        [140, 446, 'nothing gets lost'],
        [600,  82, 'a story has thousands'],
        [280, 250, 'pages of wonder'],
    ];

    return (
        <svg
            className="h-full w-full"
            style={{ color: 'var(--theme-base-content)' }}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern
                    id="ruled-cursive"
                    patternUnits="userSpaceOnUse"
                    width="960"
                    height="448"
                    patternTransform="rotate(-23)"
                >
                    {/* Static ruled lines — stable backdrop. Dashed +
                        low opacity so they read as light pencil rule
                        marks rather than hard printed lines. */}
                    {lines.map((y) => (
                        <line
                            key={`line-${y}`}
                            x1="0" y1={y} x2="960" y2={y}
                            stroke="currentColor"
                            strokeOpacity="0.05"
                            strokeWidth="1"
                            strokeDasharray="4 5"
                            strokeLinecap="round"
                        />
                    ))}
                    {/* Cursive phrases fade in/out at staggered times.
                        Each phrase holds its visible state for ~16s and
                        its invisible state for ~14s, with ~3s transitions
                        on each edge. Pre-defined begin offsets space the
                        fades so no two phrases peak at the same moment. */}
                    {phrases.map(([x, y, text], i) => (
                        <text
                            key={`text-${y}-${x}`}
                            x={x} y={y}
                            fontFamily="Caveat, Comic Sans MS, cursive"
                            fontSize="24"
                            fill="currentColor"
                            fillOpacity="0"
                        >
                            <animate
                                attributeName="fill-opacity"
                                values="0; 0.14; 0.14; 0; 0"
                                keyTimes="0; 0.1; 0.55; 0.65; 1"
                                dur="36s"
                                begin={`${PHRASE_FADE_OFFSETS[i]}s`}
                                repeatCount="indefinite"
                            />
                            {text}
                        </text>
                    ))}
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ruled-cursive)" />
        </svg>
    );
}

