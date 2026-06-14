import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import { useTheme } from '@alexandria/hooks/useTheme';
import AppLayout, { SIDEBAR_TOGGLE_EVENT } from '@alexandria/layouts/AppLayout';
import Ribbon from '@alexandria/ribbon/Ribbon';
import LogoMark from '@alexandria/components/brand/LogoMark';
import CompactUserMenu from '@alexandria/components/navigation/CompactUserMenu';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';

import AddSectionModal from './Sections/AddSectionModal';
import ManuscriptEditor, {
    PRINT_LAYOUT_STORAGE_KEY,
    readPrintLayoutPreference,
} from './Sections/ManuscriptEditor';
import Navigator from './Sections/Navigator';
import ReferencePanel, { type EntryCard } from './Sections/ReferencePanel';
import ScreenplayEditor from './Sections/ScreenplayEditor';
import { extractSectionOutline, type SectionOutlineItem } from './Sections/sectionOutline';
import WorkspaceAppRail from './Sections/WorkspaceAppRail';
import WorkSettingsModal, {
    type LengthPlanOption,
    type WorkLengthPlan,
} from './Sections/WorkSettingsModal';
import WorkspaceStatusBar from './Sections/WorkspaceStatusBar';
import type { WritingEditorBridge, WritingRibbonContext } from './ribbon/writingRibbonContext';
import { registerWritingRibbon } from './ribbon/writingRibbonTabs';

/**
 * Writing dashboard → workspace — Stage 8g.1 (ribbon-driven since
 * Ribbon Plan 2 Task 3).
 *
 * The manuscript surface — Word-style anatomy with a fully merged
 * header (Google Docs as the reference): the app navbar is OFF here
 * and the ribbon's tab row IS the app header — logo mark (toggles the
 * app sidebar) · work title · status chip · the four tabs · spacer ·
 * search · user avatar — over a full-height three-pane row — section
 * Navigator (left), editor pane (center), reference rail (right) —
 * over a bottom-attached status bar (breadcrumb, section counts, work
 * progress; see WorkspaceStatusBar). The Workspace owns the ribbon
 * context: workspace state (panel, print layout, work status) plus an
 * editor bridge both editors implement; `editorTick` bumps on editor
 * selection/content changes so control states re-render. The section
 * add/delete modals live here too, shared between the ribbon's
 * Structure tab and the Navigator's hover affordances.
 *
 * The server hydrates the full section tree (titles/slugs only) plus
 * ONE section's content (currentSection); switching sections
 * partial-reloads just that prop.
 */

registerWritingRibbon();

export interface SectionNode {
    id: number;
    title: string;
    slug: string;
    label: string | null;
    position: number;
    word_count: number;
    target_words: number | null;
    has_content: boolean;
    children: SectionNode[];
}

export interface CurrentSection {
    id: number;
    title: string;
    slug: string;
    label: string | null;
    parent_id: number | null;
    format: 'prose' | 'screenplay';
    status: string | null;
    synopsis: string | null;
    content: string | null;
    word_count: number;
    target_words: number | null;
    pov_entry_id: number | null;
    setting_entry_id: number | null;
}

interface WorkspaceProps {
    project: { id: number; name: string; slug: string };
    work: {
        id: number;
        title: string;
        slug: string;
        type: string;
        format: string;
        status: string;
        logline: string | null;
        word_count: number;
        line_count: number;
        target_words: number | null;
        target_pages: number | null;
        page_estimate: number;
        length_plan: WorkLengthPlan | null;
    };
    sections: SectionNode[];
    currentSection: CurrentSection | null;
    pins: EntryCard[];
    types: string[];
    lengthPlans: LengthPlanOption[];
    can: { update: boolean };
    [key: string]: unknown;
}

/** Persisted reference-panel visibility (desktop only — the xl: gate still applies). */
export const PANEL_OPEN_STORAGE_KEY = 'alexandria.writing.panel_open';
export const NEUTRAL_CHROME_STORAGE_KEY = 'alexandria.writing.neutral_chrome';
export const STRUCTURE_OPEN_STORAGE_KEY = 'alexandria.writing.structure_open';
export const ZOOM_STORAGE_KEY = 'alexandria.writing.zoom';
const DEFAULT_ZOOM = '100';
const ZOOM_VALUES = new Set(['75', '90', '100', '110', '125', '150']);

function readPanelOpenPreference(): boolean {
    try {
        return localStorage.getItem(PANEL_OPEN_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

function readNeutralChromePreference(): boolean {
    try {
        return localStorage.getItem(NEUTRAL_CHROME_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

function readStructureOpenPreference(): boolean {
    try {
        return localStorage.getItem(STRUCTURE_OPEN_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

function readZoomPreference(): string {
    try {
        const stored = localStorage.getItem(ZOOM_STORAGE_KEY);

        return stored !== null && ZOOM_VALUES.has(stored) ? stored : DEFAULT_ZOOM;
    } catch {
        return DEFAULT_ZOOM;
    }
}

/** Depth-first lookup in the section tree (ribbon delete targets the current section). */
function findSectionNode(nodes: SectionNode[], id: number): SectionNode | null {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }

        const found = findSectionNode(node.children, id);

        if (found !== null) {
            return found;
        }
    }

    return null;
}

/* ── Theme styles ── */

// The workspace runs navbar-less (merged header) — the ribbon's tab
// row starts at the viewport top. The background matches .ribbon's
// bar tint so shell and ribbon read as one surface.
const ribbonShellStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, var(--theme-base-page))',
};

const mutedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

// The work-status chip — lived in WorkspaceStatusBar until the merged
// header landed; now part of the tab row's leading cluster.
const statusChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
};

const typeChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 700,
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
};

const paneBorderColor = 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)';

export default function Workspace() {
    const t = useT();
    const theme = useTheme();
    const { project, work, sections, currentSection, pins, types, lengthPlans, can } =
        usePage<WorkspaceProps>().props;

    // Server-confirmed counts from autosave responses overlay the
    // Inertia props until the next full prop refresh catches up.
    const [liveCounts, setLiveCounts] = useState<Record<number, number>>({});
    const [liveWorkWords, setLiveWorkWords] = useState<number | null>(null);

    // Server-confirmed page estimates per section (null until the
    // section's first confirmed save — same freshness the old
    // SectionChrome footer had reading the autosave hook directly).
    const [livePages, setLivePages] = useState<Record<number, number | null>>({});

    // Bumped after each confirmed autosave so the reference panel
    // re-fetches the section's server-synced mentions.
    const [saveSignal, setSaveSignal] = useState(0);

    const [panelOpen, setPanelOpen] = useState(readPanelOpenPreference);
    const [structureOpen, setStructureOpen] = useState(readStructureOpenPreference);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [printLayout, setPrintLayout] = useState(readPrintLayoutPreference);
    const [neutralChrome, setNeutralChrome] = useState(readNeutralChromePreference);
    const [zoom, setZoom] = useState(readZoomPreference);
    const [currentOutline, setCurrentOutline] = useState<SectionOutlineItem[]>(() =>
        currentSection?.format === 'prose' ? extractSectionOutline(currentSection.content) : [],
    );

    // Section add/delete modal triggers — shared between the ribbon's
    // Structure tab and the Navigator's hover affordances.
    const [addTarget, setAddTarget] = useState<{ parentId: number | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SectionNode | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Ribbon editor bridge — populated by whichever editor is mounted
    // (via useImperativeHandle); editorTick bumps on its state changes
    // so ribbon control predicates re-read it.
    const bridgeRef = useRef<WritingEditorBridge | null>(null);
    const [editorTick, setEditorTick] = useState(0);

    const handleEditorStateChange = useCallback(() => {
        setEditorTick((tick) => tick + 1);
    }, []);

    useEffect(() => {
        setCurrentOutline(
            currentSection?.format === 'prose'
                ? extractSectionOutline(currentSection.content)
                : [],
        );
    }, [currentSection?.id, currentSection?.content, currentSection?.format]);

    useEffect(() => {
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousHtmlHeight = document.documentElement.style.height;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyHeight = document.body.style.height;
        const previousBodyMaxHeight = document.body.style.maxHeight;
        const previousBodyOverscroll = document.body.style.overscrollBehavior;
        const previousBodyPosition = document.body.style.position;
        const previousBodyInset = document.body.style.inset;
        const previousBodyWidth = document.body.style.width;
        const previousBodyScrollbarGutter = document.body.style.scrollbarGutter;
        const previousHtmlMaxHeight = document.documentElement.style.maxHeight;
        const previousHtmlScrollbarGutter = document.documentElement.style.scrollbarGutter;
        const htmlHadLock = document.documentElement.classList.contains('alex-writing-workspace-lock');
        const bodyHadLock = document.body.classList.contains('alex-writing-workspace-lock');
        const main = document.querySelector<HTMLElement>('main[data-theme-target="content"]');
        const previousMainOverflow = main?.style.overflow ?? '';
        const previousMainHeight = main?.style.height ?? '';
        const previousMainMinHeight = main?.style.minHeight ?? '';

        document.documentElement.classList.add('alex-writing-workspace-lock');
        document.body.classList.add('alex-writing-workspace-lock');
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100dvh';
        document.documentElement.style.maxHeight = '100dvh';
        document.documentElement.style.scrollbarGutter = 'auto';
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100dvh';
        document.body.style.maxHeight = '100dvh';
        document.body.style.overscrollBehavior = 'none';
        document.body.style.position = 'fixed';
        document.body.style.inset = '0';
        document.body.style.width = '100%';
        document.body.style.scrollbarGutter = 'auto';

        if (main) {
            main.style.overflow = 'hidden';
            main.style.height = '100dvh';
            main.style.minHeight = '0';
        }

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.documentElement.style.height = previousHtmlHeight;
            document.documentElement.style.maxHeight = previousHtmlMaxHeight;
            document.documentElement.style.scrollbarGutter = previousHtmlScrollbarGutter;
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.height = previousBodyHeight;
            document.body.style.maxHeight = previousBodyMaxHeight;
            document.body.style.overscrollBehavior = previousBodyOverscroll;
            document.body.style.position = previousBodyPosition;
            document.body.style.inset = previousBodyInset;
            document.body.style.width = previousBodyWidth;
            document.body.style.scrollbarGutter = previousBodyScrollbarGutter;

            if (!htmlHadLock) {
                document.documentElement.classList.remove('alex-writing-workspace-lock');
            }

            if (!bodyHadLock) {
                document.body.classList.remove('alex-writing-workspace-lock');
            }

            if (main) {
                main.style.overflow = previousMainOverflow;
                main.style.height = previousMainHeight;
                main.style.minHeight = previousMainMinHeight;
            }
        };
    }, []);

    const togglePanel = useCallback(() => {
        setPanelOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(PANEL_OPEN_STORAGE_KEY, String(next));
            } catch {
                // Persistence is best-effort; private-mode failures are fine.
            }
            return next;
        });
    }, []);

    const toggleStructure = useCallback(() => {
        setStructureOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(STRUCTURE_OPEN_STORAGE_KEY, String(next));
            } catch {
                // Persistence is best-effort; private-mode failures are fine.
            }
            return next;
        });
    }, []);

    const togglePrintLayout = useCallback(() => {
        setPrintLayout((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(PRINT_LAYOUT_STORAGE_KEY, String(next));
            } catch {
                // Persistence is best-effort; private-mode failures are fine.
            }
            return next;
        });
    }, []);

    const toggleNeutralChrome = useCallback(() => {
        setNeutralChrome((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(NEUTRAL_CHROME_STORAGE_KEY, String(next));
            } catch {
                // Persistence is best-effort; private-mode failures are fine.
            }
            return next;
        });
    }, []);

    const updateZoom = useCallback((value: string) => {
        const next = ZOOM_VALUES.has(value) ? value : DEFAULT_ZOOM;
        setZoom(next);
        try {
            localStorage.setItem(ZOOM_STORAGE_KEY, next);
        } catch {
            // Persistence is best-effort; private-mode failures are fine.
        }
    }, []);

    function selectSection(slug: string) {
        router.visit(`/works/${project.slug}/${work.slug}/${slug}`, {
            only: ['currentSection'],
            preserveState: true,
            preserveScroll: true,
        });
    }

    function handleCounts(sectionId: number, words: number, workWords: number, pages: number | null) {
        setLiveCounts((prev) => ({ ...prev, [sectionId]: words }));
        setLivePages((prev) => ({ ...prev, [sectionId]: pages }));
        setLiveWorkWords(workWords);
        setSaveSignal((prev) => prev + 1);
    }

    function confirmDelete() {
        if (deleteTarget === null) {
            return;
        }

        router.delete(`/works/${project.slug}/${work.slug}/sections/${deleteTarget.id}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    }

    const ribbonCtx = useMemo<WritingRibbonContext>(() => {
        const projectSlug = project.slug;
        const workSlug = work.slug;

        return {
            format: (currentSection?.format ?? work.format) === 'screenplay' ? 'screenplay' : 'prose',
            canUpdate: can.update,
            panelOpen,
            printLayout,
            neutralChrome,
            zoom,
            hasSection: currentSection !== null,
            editorTick,
            // Lazy getter: the bridge lands via useImperativeHandle AFTER
            // this memo runs on mount, so actions/predicates must read the
            // live ref — editorTick re-runs the memo for state freshness,
            // the getter guarantees commands never see a stale null.
            get editor() {
                return bridgeRef.current;
            },
            actions: {
                togglePanel,
                togglePrintLayout,
                toggleNeutralChrome,
                setZoom: updateZoom,
                openSettings: () => setSettingsOpen(true),
                openReports: () => router.visit(`/works/${projectSlug}/${workSlug}/reports`),
                addSection: () => setAddTarget({ parentId: null }),
                addInside: () => {
                    if (currentSection !== null) {
                        setAddTarget({ parentId: currentSection.id });
                    }
                },
                deleteSection: () => {
                    if (currentSection === null) {
                        return;
                    }

                    const node = findSectionNode(sections, currentSection.id);

                    if (node !== null) {
                        setDeleteTarget(node);
                    }
                },
                // works.update requires title + status (logline nullable,
                // type/length_plan `sometimes`) — the minimum valid payload.
                setStatus: (value: string) =>
                    router.put(
                        `/works/${projectSlug}/${workSlug}`,
                        { title: work.title, status: value },
                        { preserveScroll: true },
                    ),
                goToIndex: () => router.visit(`/works/${projectSlug}`),
                goToDashboard: () => router.visit('/writing'),
            },
            workStatus: work.status,
        };
    }, [
        project.slug,
        work.slug,
        work.format,
        work.title,
        work.status,
        can.update,
        panelOpen,
        printLayout,
        neutralChrome,
        zoom,
        currentSection,
        sections,
        editorTick,
        togglePanel,
        togglePrintLayout,
        toggleNeutralChrome,
        updateZoom,
    ]);

    const workWords = liveWorkWords ?? work.word_count;

    // Current-section live counts for the status bar — server-confirmed
    // autosave values overlay the Inertia props (same freshness as the
    // Navigator rows; the old SectionChrome footer read the autosave
    // hook directly, the bar assembles from the existing onCounts flow).
    const sectionWords =
        currentSection !== null
            ? (liveCounts[currentSection.id] ?? currentSection.word_count)
            : 0;
    const sectionPages = currentSection !== null ? (livePages[currentSection.id] ?? null) : null;

    return (
        // navbar={false}: the merged header — the ribbon's tab row IS
        // the app header here (logo → /dashboard, title, status chip,
        // tabs, search, avatar). The CommandPalette still mounts in
        // AppLayout (it's gated on currentProject, not on the navbar),
        // so the header's search button just dispatches the global
        // `alexandria-core:command-palette-toggle` event; Cmd+K keeps
        // working too.
        // bottomNavTabs={null}: the workspace is a viewport-exact app
        // surface — the mobile BottomNav would overlay the status bar
        // and its main-padding would re-grow the document. The status
        // bar's back chevron is the mobile way out.
        <AppLayout
            title={`${work.title} - ${project.name}`}
            navbar={false}
            immersive
            fabActions={null}
            bottomNavTabs={null}
        >
            {/* The workspace IS the viewport — only the editor desk
                (and the side rails internally) scroll, so the window
                never grows a second scrollbar. Height/overflow are
                INLINE on purpose: `h-dvh` was a first-use utility in
                the vendor path and Tailwind's source scan missed it in
                some dev pipelines (vendor/ is .gitignored) — inline
                styles can't be skipped by a CSS generator. */}
            <div
                className={`writing-workspace-shell flex flex-col ${neutralChrome ? 'writing-neutral-chrome' : ''}`}
                data-writing-mode={theme?.mode ?? 'light'}
                style={{
                    height: '100dvh',
                    overflow: 'hidden',
                    '--alex-writing-zoom': `${Number(zoom) / 100}`,
                } as CSSProperties}
            >
                {/* Writing ribbon — the Docs-style split header. Left column:
                    logo mark spanning both rows; main column: title + status
                    chip over the tab strip; right column: search + avatar
                    spanning both rows (breadcrumb + counts/progress live in
                    the status bar). */}
                <div className="shrink-0" style={ribbonShellStyle}>
                    <Ribbon
                        setKey="writing"
                        context={ribbonCtx}
                        bandTabId="edit"
                        leading={
                            /* The logo doubles as the hamburger here — the
                               workspace runs navbar-less, so clicking it
                               slides out the same app sidebar the navbar
                               menu button opens everywhere else. */
                            <button
                                type="button"
                                onClick={() =>
                                    window.dispatchEvent(
                                        new CustomEvent(SIDEBAR_TOGGLE_EVENT),
                                    )
                                }
                                aria-label={t('ribbon.menu')}
                                className="inline-flex shrink-0 cursor-pointer items-center"
                                style={{ color: 'var(--theme-base-content)' }}
                            >
                                <LogoMark size={30} ariaLabel="" />
                            </button>
                        }
                        headerRow={
                            <>
                                <span className="max-w-[12rem] truncate text-base font-semibold md:max-w-[24rem]">
                                    {work.title}
                                </span>
                                <span
                                    className="hidden shrink-0 sm:inline-block"
                                    data-writing-work-type
                                    style={typeChipStyle}
                                >
                                    {t(`writing.types.${work.type}`, work.type)}
                                </span>
                                {/* Chip hides below md — the mobile header keeps
                                    to logo · title / tabs, search · avatar. */}
                                <span
                                    className="hidden shrink-0 md:inline-block"
                                    style={statusChipStyle}
                                >
                                    {t(`writing.statuses.${work.status}`, work.status)}
                                </span>
                            </>
                        }
                        trailing={
                            <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        window.dispatchEvent(
                                            new CustomEvent('alexandria-core:command-palette-toggle'),
                                        )
                                    }
                                    aria-label={t('ribbon.search')}
                                    className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                >
                                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleNeutralChrome}
                                    aria-label={t('writing.ribbon.neutral_chrome')}
                                    title={t('writing.ribbon.neutral_chrome')}
                                    aria-pressed={neutralChrome}
                                    data-writing-neutral-chrome
                                    className={`alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs ${neutralChrome ? 'alex-toolbar-btn--active' : ''}`}
                                >
                                    <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" />
                                </button>
                                {can.update && (
                                    <button
                                        type="button"
                                        onClick={() => setSettingsOpen(true)}
                                        aria-label={t('writing.settings.title')}
                                        title={t('writing.settings.title')}
                                        data-writing-work-settings
                                        className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                    >
                                        <i className="fa-solid fa-gear" aria-hidden="true" />
                                    </button>
                                )}
                                <CompactUserMenu ariaLabel={t('ribbon.account')} size={36} />
                            </>
                        }
                    />
                </div>

                <div className="writing-workspace-body relative flex min-h-0 flex-1">
                    {/* Navigator */}
                    <div className="writing-workspace-structure-layer hidden md:block">
                        <button
                            type="button"
                            className="writing-workspace-structure-toggle alex-toolbar-btn"
                            data-writing-structure-toggle
                            aria-label={
                                structureOpen
                                    ? t('writing.workspace.hide_sections')
                                    : t('writing.workspace.show_sections')
                            }
                            title={
                                structureOpen
                                    ? t('writing.workspace.hide_sections')
                                    : t('writing.workspace.show_sections')
                            }
                            aria-expanded={structureOpen}
                            onClick={toggleStructure}
                        >
                            <i
                                className={`fa-solid ${structureOpen ? 'fa-chevron-up' : 'fa-list-ul'}`}
                                aria-hidden="true"
                            />
                        </button>
                        <nav
                            className="writing-workspace-section-pane writing-workspace-section-pane--floating writing-workspace-scroll overflow-y-auto"
                            data-open={structureOpen ? 'true' : 'false'}
                            aria-hidden={!structureOpen}
                            style={{ borderColor: paneBorderColor }}
                        >
                            <Navigator
                                projectSlug={project.slug}
                                workSlug={work.slug}
                                sections={sections}
                                currentSlug={currentSection?.slug ?? null}
                                canUpdate={can.update}
                                onSelect={selectSection}
                                onRequestAdd={(parentId) => setAddTarget({ parentId })}
                                onRequestDelete={setDeleteTarget}
                                liveCounts={liveCounts}
                                currentOutline={currentOutline}
                            />
                        </nav>
                    </div>

                    {/* Editor pane — the frame itself never scrolls; the
                        editor's content wrapper inside ManuscriptEditor does */}
                    <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        {currentSection !== null ? (
                            currentSection.format === 'screenplay' ? (
                                <ScreenplayEditor
                                    key={currentSection.id}
                                    projectId={project.id}
                                    projectSlug={project.slug}
                                    workSlug={work.slug}
                                    section={currentSection}
                                    canUpdate={can.update}
                                    onCounts={handleCounts}
                                    chrome="none"
                                    printLayout={printLayout}
                                    bridgeRef={bridgeRef}
                                    onStateChange={handleEditorStateChange}
                                    onOutlineChange={setCurrentOutline}
                                />
                            ) : (
                                <ManuscriptEditor
                                    projectId={project.id}
                                    projectSlug={project.slug}
                                    workSlug={work.slug}
                                    section={currentSection}
                                    canUpdate={can.update}
                                    onCounts={handleCounts}
                                    chrome="none"
                                    printLayout={printLayout}
                                    bridgeRef={bridgeRef}
                                    onStateChange={handleEditorStateChange}
                                />
                            )
                        ) : (
                            <div
                                className="flex flex-1 items-center justify-center px-6 text-center text-sm italic"
                                style={mutedText}
                            >
                                {t('writing.workspace.no_section')}
                            </div>
                        )}
                    </section>

                    {/* Right rail — reference panel (Plan 3). The xl: responsive
                        gate stays on top of the user toggle. */}
                    {panelOpen && (
                        <aside
                            className="writing-workspace-scroll hidden min-h-0 w-80 shrink-0 overflow-y-auto border-l xl:block"
                            style={{ borderColor: paneBorderColor }}
                        >
                            <ReferencePanel
                                project={project}
                                work={work}
                                currentSection={currentSection}
                                pins={pins}
                                canUpdate={can.update}
                                saveSignal={saveSignal}
                            />
                        </aside>
                    )}

                    <WorkspaceAppRail projectSlug={project.slug} workSlug={work.slug} />
                </div>

                {/* Bottom-attached status bar — full workspace width */}
                <WorkspaceStatusBar
                    project={project}
                    work={work}
                    workWords={workWords}
                    hasSection={currentSection !== null}
                    sectionWords={sectionWords}
                    sectionTarget={currentSection?.target_words ?? null}
                    sectionPages={sectionPages}
                    sectionFormat={currentSection?.format ?? null}
                />
            </div>

            {settingsOpen && (
                <WorkSettingsModal
                    project={project}
                    work={work}
                    types={types}
                    lengthPlans={lengthPlans}
                    onClose={() => setSettingsOpen(false)}
                />
            )}

            {addTarget !== null && (
                <AddSectionModal
                    projectSlug={project.slug}
                    workSlug={work.slug}
                    parentId={addTarget.parentId}
                    onClose={() => setAddTarget(null)}
                />
            )}

            <ConfirmModal
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={t('writing.workspace.delete_confirm_title')}
                message={t('writing.workspace.delete_confirm_body')}
                confirmLabel={t('writing.workspace.delete_confirm_action')}
                variant="danger"
                loading={deleting}
            />
        </AppLayout>
    );
}
