import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import useEntitlements from '@alexandria/hooks/useEntitlements';
import type { ScreenplaySceneLink } from '@alexandria/editor/screenplay/sceneLinks';
import AppLayout, { SIDEBAR_TOGGLE_EVENT } from '@alexandria/layouts/AppLayout';
import { openNotesDrawer } from '@alexandria/components/notes/NotesDrawer';
import Ribbon from '@alexandria/ribbon/Ribbon';
import type { RibbonGates } from '@alexandria/ribbon/types';
import LogoMark from '@alexandria/components/brand/LogoMark';
import CompactUserMenu from '@alexandria/components/navigation/CompactUserMenu';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';

import AddSectionModal from './Sections/AddSectionModal';
import ManuscriptEditor, {
    PRINT_LAYOUT_STORAGE_KEY,
    readPrintLayoutPreference,
} from './Sections/ManuscriptEditor';
import Navigator from './Sections/Navigator';
import CommentRail from './Sections/CommentRail';
import PanelModeSwitcher from './Sections/PanelModeSwitcher';
import ReferencePanel, { type EntryCard } from './Sections/ReferencePanel';
import SidebarNotesPanel from './Sections/SidebarNotesPanel';
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
import { type PanelMode, readPanelMode, writePanelMode } from './panelMode';
import { getSidebarModes, subscribeSidebarModes } from './sidebarModeRegistry';
import { resolveGate } from '@alexandria/ribbon/ribbonGates';

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
export const PAPER_COLOR_STORAGE_KEY = 'alexandria.writing.paper_color';
export const STRUCTURE_OPEN_STORAGE_KEY = 'alexandria.writing.structure_open';
export const ZOOM_STORAGE_KEY = 'alexandria.writing.zoom';
const LEGACY_NEUTRAL_PAPER_STORAGE_KEY = 'alexandria.writing.neutral_paper';
const LEGACY_NEUTRAL_CHROME_STORAGE_KEY = 'alexandria.writing.neutral_chrome';
const DEFAULT_ZOOM = '100';
const ZOOM_VALUES = new Set(['75', '90', '100', '110', '125', '150']);
const DEFAULT_PAPER_COLOR = 'white';
const PAPER_COLOR_VALUES = new Set(['theme', 'white', 'ivory', 'cream', 'gray']);
const PAPER_COLOR_OPTIONS = ['theme', 'white', 'ivory', 'cream', 'gray'];
const PAPER_COLOR_SWATCHES: Record<string, { background: string; border: string }> = {
    theme: {
        background: 'var(--theme-surface-card)',
        border: 'color-mix(in srgb, var(--theme-base-content) 16%, transparent)',
    },
    white: { background: '#ffffff', border: '#d8dee8' },
    ivory: { background: '#fffaf0', border: '#eadfcb' },
    cream: { background: '#fdf6e3', border: '#e8dcc4' },
    gray: { background: '#f8fafc', border: '#d8dee8' },
};

function readPanelOpenPreference(): boolean {
    try {
        return localStorage.getItem(PANEL_OPEN_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

function readPaperColorPreference(): string {
    try {
        const stored = localStorage.getItem(PAPER_COLOR_STORAGE_KEY);

        if (stored !== null && PAPER_COLOR_VALUES.has(stored)) {
            return stored;
        }

        const legacyPaper = localStorage.getItem(LEGACY_NEUTRAL_PAPER_STORAGE_KEY);

        if (legacyPaper !== null && PAPER_COLOR_VALUES.has(legacyPaper)) {
            return legacyPaper;
        }

        return localStorage.getItem(LEGACY_NEUTRAL_CHROME_STORAGE_KEY) === 'false'
            ? 'theme'
            : DEFAULT_PAPER_COLOR;
    } catch {
        return DEFAULT_PAPER_COLOR;
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
    const entitlements = useEntitlements();
    const pageProps = usePage<WorkspaceProps>().props;
    const { project, work, sections, currentSection, pins, types, lengthPlans, can } = pageProps;

    // WorkspaceProps uses `[key: string]: unknown` for the Inertia shared
    // bag, so `auth` is not strongly typed here — cast narrowly.
    const currentUserId =
        (pageProps as { auth?: { user?: { id: number } } }).auth?.user?.id ?? 0;

    // Build ribbon gates: permission map from the page `can` prop +
    // entitlement keys normalised by useEntitlements() (truthy keys only).
    const writingGates: RibbonGates = {
        can: { 'work.update': can.update },
        entitlements,
    };

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

    // Comment rail state (Stage 11.5 Task 3) — includes snapshotted text for anchor_text (F1)
    const [pendingCommentAnchor, setPendingCommentAnchor] = useState<{ from: number; to: number; text: string } | null>(null);
    const [highlightCommentId, setHighlightCommentId] = useState<number | null>(null);

    // Subscribe to sidebar mode registry — re-renders when packages register
    // new modes at boot (useSyncExternalStore is safe for concurrent mode).
    const registeredModes = useSyncExternalStore(subscribeSidebarModes, getSidebarModes);

    const [panelOpen, setPanelOpen] = useState(readPanelOpenPreference);
    // Per-work panel mode (Linked items · Notes · Comments + registered modes);
    // persisted to localStorage keyed by work id (Task 4). Separate from the
    // linked-mode's internal tab (linkedPanelTab).
    // allowedIds = registered modes whose gate currently resolves to 'visible';
    // a stored id that is unknown or locked falls back to 'linked'.
    const [panelMode, setPanelMode] = useState<PanelMode>(() => {
        const initAllowedIds = getSidebarModes()
            .filter((m) => resolveGate(m.requires, writingGates) === 'visible')
            .map((m) => m.id);
        return readPanelMode(work.id, initAllowedIds);
    });
    const [linkedPanelTab, setLinkedPanelTab] = useState(() =>
        work.format === 'screenplay' ? 'scene-links' : 'browse',
    );
    const [structureOpen, setStructureOpen] = useState(readStructureOpenPreference);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [paperModalOpen, setPaperModalOpen] = useState(false);
    const [printLayout, setPrintLayout] = useState(readPrintLayoutPreference);
    const [paperColor, setPaperColor] = useState(readPaperColorPreference);
    const [zoom, setZoom] = useState(readZoomPreference);
    const [currentOutline, setCurrentOutline] = useState<SectionOutlineItem[]>(() =>
        currentSection?.format === 'prose' ? extractSectionOutline(currentSection.content) : [],
    );
    const [screenplaySceneLinks, setScreenplaySceneLinks] = useState<ScreenplaySceneLink[]>([]);
    const [sceneLinksFocusSignal, setSceneLinksFocusSignal] = useState(0);

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

    const handleEntryLinkSelect = useCallback(() => {
        setPanelOpen(true);
        setPanelMode('linked');
        writePanelMode(work.id, 'linked');
        setLinkedPanelTab('scene-links');
        setSceneLinksFocusSignal((signal) => signal + 1);
        try {
            localStorage.setItem(PANEL_OPEN_STORAGE_KEY, 'true');
        } catch {
            // Persistence is best-effort; private-mode failures are fine.
        }
    }, [work.id]);

    /** Open the notes drawer scoped to the current section; fall back to
     *  project scope when no section is active (e.g., empty work). */
    const handleNotesClick = useCallback(() => {
        if (currentSection !== null) {
            openNotesDrawer({
                projectId: project.id,
                projectSlug: project.slug,
                contextType: 'work_section',
                contextId: currentSection.id,
                contextLabel: currentSection.title,
            });
        } else {
            openNotesDrawer({
                projectId: project.id,
                projectSlug: project.slug,
                contextType: 'project',
                contextId: project.id,
                contextLabel: project.name,
            });
        }
    }, [project.id, project.slug, project.name, currentSection]);

    const toggleSceneLinksPanel = useCallback(() => {
        setPanelOpen((prev) => {
            const shouldClose = prev && panelMode === 'linked' && linkedPanelTab === 'scene-links';
            const next = !shouldClose;

            if (next) {
                setPanelMode('linked');
                writePanelMode(work.id, 'linked');
                setLinkedPanelTab('scene-links');
                setSceneLinksFocusSignal((signal) => signal + 1);
            }

            try {
                localStorage.setItem(PANEL_OPEN_STORAGE_KEY, String(next));
            } catch {
                // Persistence is best-effort; private-mode failures are fine.
            }

            return next;
        });
    }, [panelMode, linkedPanelTab, work.id]);

    // Toggle the comment rail panel on/off. When already in comments mode,
    // closes the panel; otherwise opens and switches to comments mode.
    const toggleCommentsPanel = useCallback(() => {
        if (panelOpen && panelMode === 'comments') {
            setPanelOpen(false);
            try {
                localStorage.setItem(PANEL_OPEN_STORAGE_KEY, 'false');
            } catch {
                // Best-effort.
            }
        } else {
            setPanelOpen(true);
            setPanelMode('comments');
            writePanelMode(work.id, 'comments');
            try {
                localStorage.setItem(PANEL_OPEN_STORAGE_KEY, 'true');
            } catch {
                // Best-effort.
            }
        }
    }, [panelOpen, panelMode, work.id]);

    // Fired by editor floating button — opens the sidebar in comments mode.
    const handleAddComment = useCallback((anchor: { from: number; to: number; text: string }) => {
        setPendingCommentAnchor(anchor);
        setPanelOpen(true);
        setPanelMode('comments');
        writePanelMode(work.id, 'comments');
        try {
            localStorage.setItem(PANEL_OPEN_STORAGE_KEY, 'true');
        } catch {
            // Best-effort.
        }
    }, [work.id]);

    // Listen for mark-click events from the editor (click on a comment-mark
    // span) → open comment rail and highlight the matching card.
    useEffect(() => {
        function handleCommentAnchorClick(e: Event) {
            const detail = (e as CustomEvent<{ commentId: number } | null>).detail;
            if (!detail) return;
            const id = detail.commentId;
            if (isFinite(id)) {
                setPanelOpen(true);
                setPanelMode('comments');
                writePanelMode(work.id, 'comments');
                setHighlightCommentId(id);
                try {
                    localStorage.setItem(PANEL_OPEN_STORAGE_KEY, 'true');
                } catch {
                    // Best-effort.
                }
            }
        }
        window.addEventListener('alexandria:comment-anchor-click', handleCommentAnchorClick);
        return () => window.removeEventListener('alexandria:comment-anchor-click', handleCommentAnchorClick);
    }, [work.id]);

    useEffect(() => {
        setCurrentOutline(
            currentSection?.format === 'prose'
                ? extractSectionOutline(currentSection.content)
                : [],
        );
        if (currentSection?.format !== 'screenplay') {
            setScreenplaySceneLinks([]);
            if (work.format !== 'screenplay' && linkedPanelTab === 'scene-links') {
                setLinkedPanelTab('browse');
            }
        }
    }, [currentSection?.id, currentSection?.content, currentSection?.format, linkedPanelTab, work.format]);

    /* Clear transient comment state when the active section changes. */
    useEffect(() => {
        setPendingCommentAnchor(null);
        setHighlightCommentId(null);
    }, [currentSection?.id]);

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

    const updatePaperColor = useCallback((value: string) => {
        const next = PAPER_COLOR_VALUES.has(value) ? value : DEFAULT_PAPER_COLOR;
        setPaperColor(next);
        try {
            localStorage.setItem(PAPER_COLOR_STORAGE_KEY, next);
            localStorage.removeItem(LEGACY_NEUTRAL_PAPER_STORAGE_KEY);
            localStorage.removeItem(LEGACY_NEUTRAL_CHROME_STORAGE_KEY);
        } catch {
            // Persistence is best-effort; private-mode failures are fine.
        }
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
            sceneLinksPanelOpen: panelOpen && panelMode === 'linked' && linkedPanelTab === 'scene-links',
            printLayout,
            paperColor,
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
                toggleSceneLinksPanel,
                togglePrintLayout,
                setPaperColor: updatePaperColor,
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
        panelMode,
        linkedPanelTab,
        printLayout,
        paperColor,
        zoom,
        currentSection,
        sections,
        editorTick,
        togglePanel,
        toggleSceneLinksPanel,
        togglePrintLayout,
        updatePaperColor,
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
                className="writing-workspace-shell flex flex-col"
                data-writing-paper-color={paperColor}
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
                        gates={writingGates}
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
                                <Tooltip content={t('ribbon.search')}>
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
                                </Tooltip>
                                <Tooltip content={t('writing.ribbon.paper_color')}>
                                    <button
                                        type="button"
                                        onClick={() => setPaperModalOpen(true)}
                                        aria-label={t('writing.ribbon.paper_color')}
                                        aria-pressed={paperColor !== 'theme'}
                                        data-writing-paper-select="true"
                                        className={`alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs ${paperColor !== 'theme' ? 'alex-toolbar-btn--active' : ''}`}
                                    >
                                        <i className="fa-solid fa-file-lines" aria-hidden="true" />
                                    </button>
                                </Tooltip>
                                {can.update && (
                                    <Tooltip content={t('writing.settings.title')}>
                                        <button
                                            type="button"
                                            onClick={() => setSettingsOpen(true)}
                                            aria-label={t('writing.settings.title')}
                                            data-writing-work-settings
                                            className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                        >
                                            <i className="fa-solid fa-gear" aria-hidden="true" />
                                        </button>
                                    </Tooltip>
                                )}
                                <Tooltip content={t('writing.comments.toggle_button')}>
                                    <button
                                        type="button"
                                        onClick={toggleCommentsPanel}
                                        aria-label={t('writing.comments.toggle_button')}
                                        aria-pressed={panelOpen && panelMode === 'comments'}
                                        data-writing-comments-toggle
                                        className={`alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs ${panelOpen && panelMode === 'comments' ? 'alex-toolbar-btn--active' : ''}`}
                                    >
                                        <i className="fa-solid fa-comment-dots" aria-hidden="true" />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('ribbon.account')}>
                                    <span className="inline-flex">
                                        <CompactUserMenu ariaLabel={t('ribbon.account')} size={36} />
                                    </span>
                                </Tooltip>
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
                                work={work}
                                sections={sections}
                                currentSection={currentSection}
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
                                    onSceneLinksChange={setScreenplaySceneLinks}
                                    onEntryLinkSelect={handleEntryLinkSelect}
                                    enableComments={can.update}
                                    onAddComment={handleAddComment}
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
                                    onOutlineChange={setCurrentOutline}
                                    enableComments={can.update}
                                    onAddComment={handleAddComment}
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

                    {/* Right rail — multi-purpose sidebar (Stage 11.5 Task 4).
                        Mode switcher (Linked items · Notes · Comments) sits at
                        the top; content below is keyed by panelMode. The xl:
                        responsive gate stays on top of the user toggle. */}
                    {panelOpen && (
                        <aside
                            className="hidden min-h-0 w-80 shrink-0 border-l xl:flex xl:flex-col"
                            style={{ borderColor: paneBorderColor }}
                        >
                            <PanelModeSwitcher
                                mode={panelMode}
                                onChange={(mode) => {
                                    setPanelMode(mode);
                                    writePanelMode(work.id, mode);
                                }}
                                can={{ 'work.update': can.update }}
                            />
                            <div className="min-h-0 flex-1">
                                {panelMode === 'linked' && (
                                    <ReferencePanel
                                        project={project}
                                        work={work}
                                        currentSection={currentSection}
                                        pins={pins}
                                        canUpdate={can.update}
                                        saveSignal={saveSignal}
                                        sceneLinks={screenplaySceneLinks}
                                        sceneLinksFocusSignal={sceneLinksFocusSignal}
                                        activeTab={linkedPanelTab}
                                        onActiveTabChange={setLinkedPanelTab}
                                        onSelect={selectSection}
                                    />
                                )}
                                {panelMode === 'notes' && (
                                    <SidebarNotesPanel
                                        projectId={project.id}
                                        projectSlug={project.slug}
                                        currentSection={currentSection}
                                        sections={sections}
                                    />
                                )}
                                {panelMode === 'comments' && (
                                    <CommentRail
                                        workSlug={work.slug}
                                        projectSlug={project.slug}
                                        sectionId={currentSection?.id ?? null}
                                        editorBridge={bridgeRef.current}
                                        editorTick={editorTick}
                                        currentUserId={currentUserId}
                                        canUpdate={can.update}
                                        pendingAnchor={pendingCommentAnchor}
                                        onComposerDismiss={() => setPendingCommentAnchor(null)}
                                        highlightCommentId={highlightCommentId}
                                        onHighlightHandled={() => setHighlightCommentId(null)}
                                    />
                                )}
                                {registeredModes.map((m) =>
                                    m.id === panelMode ? (
                                        <m.component
                                            key={m.id}
                                            project={project}
                                            work={work}
                                            currentSection={currentSection}
                                            editorBridge={bridgeRef.current}
                                            editorTick={editorTick}
                                            canUpdate={can.update}
                                        />
                                    ) : null,
                                )}
                            </div>
                        </aside>
                    )}

                    <WorkspaceAppRail
                        projectSlug={project.slug}
                        workSlug={work.slug}
                        onNotesClick={handleNotesClick}
                    />
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

            <Modal
                open={paperModalOpen}
                onClose={() => setPaperModalOpen(false)}
                maxWidth="max-w-sm"
            >
                <ModalHeader
                    title={t('writing.ribbon.paper_color')}
                    onClose={() => setPaperModalOpen(false)}
                />
                <div className="grid gap-2 p-4">
                    {PAPER_COLOR_OPTIONS.map((value) => {
                        const selected = value === paperColor;
                        const swatch = PAPER_COLOR_SWATCHES[value];

                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => {
                                    updatePaperColor(value);
                                    setPaperModalOpen(false);
                                }}
                                className="alex-row flex items-center gap-3 px-3 py-2 text-left text-sm"
                                data-writing-paper-option={value}
                                style={{
                                    borderRadius: 'var(--theme-radius-button)',
                                    background: selected
                                        ? 'var(--theme-brand-primary-highlight-bg)'
                                        : 'transparent',
                                    color: selected
                                        ? 'var(--theme-brand-primary-highlight-fg)'
                                        : 'var(--theme-base-content)',
                                }}
                                aria-pressed={selected}
                            >
                                <span
                                    className="h-6 w-6 shrink-0"
                                    style={{
                                        background: swatch.background,
                                        border: `1px solid ${swatch.border}`,
                                        borderRadius: 'var(--theme-radius-button)',
                                        boxShadow: '0 1px 4px rgb(0 0 0 / 0.12)',
                                    }}
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1">
                                    {t(`writing.ribbon.paper_${value}`)}
                                </span>
                                {selected && (
                                    <i className="fa-solid fa-check text-xs" aria-hidden="true" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </Modal>

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
