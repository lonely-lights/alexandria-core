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

import ContinuousFlow, { type ActiveScene } from './Flow/ContinuousFlow';
import FlowToggle from './Flow/FlowToggle';
import { flowUrl, parseSceneFragment } from './Flow/flowUrl';
import { readViewMode, writeViewMode, type WorkspaceViewMode } from './Flow/viewMode';
import ExportFdxModal from './Fdx/ExportFdxModal';
import { importFdx } from './Fdx/importFdx';
import HistoryPanel from './Revisions/HistoryPanel';
import MarkRevisionModal from './Revisions/MarkRevisionModal';
import AddSectionModal from './Sections/AddSectionModal';
import ManuscriptEditor, {
    PRINT_LAYOUT_STORAGE_KEY,
    readPrintLayoutPreference,
} from './Sections/ManuscriptEditor';
import KanbanView from './Kanban/KanbanView';
import OutlineSidebar from './Outline/OutlineSidebar';
import OutlineView from './Outline/OutlineView';
import type { OutlineBeat } from './Outline/outlineTypes';
import { readShowPlan, writeShowPlan } from './Outline/planPrefs';
import { clampFontSize, readFontSize, writeFontSize } from './fontSize';
import {
    normalizePageDisplay,
    readPageDisplay,
    writePageDisplay,
    type PageDisplayMode,
} from './pageDisplay';
import {
    MARGIN_X_EVENT,
    normalizeMarginXIn,
    readMarginXIn,
    writeMarginXIn,
    type MarginXEventDetail,
} from './pageMargins';
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
import { worksBase, workUrl } from '@alexandria/lib/urls';

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
    beats: OutlineBeat[];
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
        linked_entry: { id: number; name: string } | null;
    };
    structureBlueprint: { id: number; name: string } | null;
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
    const { project, work, structureBlueprint, sections, currentSection, pins, types, lengthPlans, can } = pageProps;

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
    const [showPlan, setShowPlan] = useState(readShowPlan);
    const [pageDisplay, setPageDisplayState] = useState<PageDisplayMode>(readPageDisplay);
    const [paperColor, setPaperColor] = useState(readPaperColorPreference);
    const [zoom, setZoom] = useState(readZoomPreference);
    const [fontSize, setFontSize] = useState(readFontSize);
    const [marginXIn, setMarginXIn] = useState<number>(readMarginXIn);
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

    // FDX gateway (Task 5) — export options modal trigger + import error
    // surface. No established toast idiom lives in this desk (the closest
    // precedent, WorkSettingsModal's entryLinkError, is local state + an
    // inline notice, not a global toast) — this mirrors that: a dismissible
    // inline banner under the ribbon, not `useToastContext`.
    const [fdxExportOpen, setFdxExportOpen] = useState(false);
    const [fdxImportError, setFdxImportError] = useState<string | null>(null);

    // Mark-revision dialog (Stage 9) — `lockedSection: null` is the File-menu
    // entry point (scope picker unlocked); a SectionNode is the Navigator
    // row menu's entry point (scope locked to that row). `historyRefreshSignal`
    // bumps after a successful mark so an already-open History panel refetches.
    const [markRevisionRequest, setMarkRevisionRequest] = useState<{ lockedSection: SectionNode | null } | null>(null);
    const [historyRefreshSignal, setHistoryRefreshSignal] = useState(0);

    // Ribbon editor bridge — populated by whichever editor is mounted
    // (via useImperativeHandle); editorTick bumps on its state changes
    // so ribbon control predicates re-read it.
    const bridgeRef = useRef<WritingEditorBridge | null>(null);
    const [editorTick, setEditorTick] = useState(0);

    const handleEditorStateChange = useCallback(() => {
        setEditorTick((tick) => tick + 1);
    }, []);

    /* ── Continuous flow (spec 2026-08-08) ──
       In continuous mode the whole work streams through one scrollport,
       so "the current section" stops being the server-rendered prop and
       becomes wherever the reader has scrolled to. `effectiveSection` is
       that answer; in focus mode it IS `currentSection`, so every
       consumer below reads the same name in both views. */
    const [viewMode, setViewMode] = useState<WorkspaceViewMode>(() =>
        readViewMode(work.id),
    );
    const [activeScene, setActiveScene] = useState<ActiveScene | null>(() =>
        currentSection === null
            ? null
            : {
                  section: currentSection,
                  sceneIndex:
                      typeof window === 'undefined'
                          ? null
                          : parseSceneFragment(window.location.hash),
              },
    );

    const effectiveSection =
        viewMode === 'continuous' ? (activeScene?.section ?? currentSection) : currentSection;

    /* Margin drags arrive as window events from the ruler (six layers
       below — an event beats threading a callback down through all of
       them). Live drags update state only; the pointer-up commit
       persists. */
    useEffect(() => {
        function handleMarginX(event: Event) {
            const detail = (event as CustomEvent<MarginXEventDetail>).detail;
            const next = normalizeMarginXIn(detail?.marginXIn);

            setMarginXIn(next);

            if (detail?.commit) {
                writeMarginXIn(next);
            }
        }

        window.addEventListener(MARGIN_X_EVENT, handleMarginX);

        return () => window.removeEventListener(MARGIN_X_EVENT, handleMarginX);
    }, []);

    /* Focus mode is a reset to just-the-text: the Navigator layer and
       the right rail render pushed back, without touching their stored
       open/closed preferences — continuous (and outline) restore them
       as they were. */
    const chromeVisible = viewMode !== 'focus';

    /* Narrowed dependency values, extracted to plain identifiers so the
       hook dep arrays stay simple expressions. These MUST stay in the
       deps of anything reading effectiveSection: without them the notes
       button and the ribbon keep tracking the scene the reader left. */
    const effectiveSectionId = effectiveSection?.id ?? null;
    const effectiveSectionTitle = effectiveSection?.title ?? null;
    const effectiveSectionFormat = effectiveSection?.format ?? null;
    const activeSceneSlug = activeScene?.section.slug ?? null;
    const currentSectionId = currentSection?.id ?? null;
    const currentSectionSlug = currentSection?.slug ?? null;

    // Imperative scroll-to-section, filled in by ContinuousFlow so the
    // Navigator can move the scrollport instead of navigating away.
    const scrollToSlugRef = useRef<((slug: string) => void) | null>(null);

    // One bridge per mounted editor. The ribbon binds to the active
    // scene's, held in a ref so a bridge report never has to invalidate
    // the callback the editors are subscribed through.
    const bridgesRef = useRef(new Map<number, WritingEditorBridge | null>());
    const activeSectionIdRef = useRef<number | null>(currentSection?.id ?? null);

    const handleActiveSceneChange = useCallback(
        (active: ActiveScene) => {
            setActiveScene(active);
            activeSectionIdRef.current = active.section.id;
            bridgeRef.current = bridgesRef.current.get(active.section.id) ?? null;

            // A bridge swap IS a state change for every editorTick
            // consumer: without this, tick-gated panels (craft's
            // staleness gate, the comment rail's re-anchor pass) keep
            // showing the outgoing section after a scroll-driven
            // section change — scrolling produces no editor
            // transaction, so nothing else bumps the tick. DEFERRED a
            // frame on purpose: craft's gate arms itself with whatever
            // tick accompanies the section-change render, so a
            // synchronous bump is swallowed as the arming value — the
            // release tick must arrive in a LATER render. The bridge is
            // already correct here (bridgesRef swap above), so the
            // deferred re-read analyzes the right section.
            requestAnimationFrame(() => handleEditorStateChange());

            // Scroll must never be a visit: an Inertia request per scene
            // would re-render the desk out from under the reader. The
            // existing state object rides along — nulling it would strip
            // Inertia's page snapshot off this history entry and turn a
            // later back-button press into a full reload.
            window.history.replaceState(
                window.history.state,
                '',
                flowUrl(project.slug, work.slug, active.section.slug, active.sceneIndex),
            );
        },
        [project.slug, work.slug, handleEditorStateChange],
    );

    /** A null bridge means that editor just unmounted (scrolled out of the
     *  hydrated window, or the view mode swapped underneath it). */
    const handleBridgeChange = useCallback(
        (sectionId: number, bridge: WritingEditorBridge | null) => {
            bridgesRef.current.set(sectionId, bridge);

            if (activeSectionIdRef.current === sectionId) {
                bridgeRef.current = bridge;
            }
        },
        [],
    );

    const switchViewMode = useCallback(
        (next: WorkspaceViewMode) => {
            if (next === viewMode) {
                return;
            }

            writeViewMode(work.id, next);
            setViewMode(next);

            // Focus mode edits whatever the server rendered, so hand it
            // the scene the reader was actually on before it takes over.
            const slug = activeSceneSlug ?? currentSectionSlug;

            if (next === 'continuous') {
                // Whatever the flow last reported is a section from the
                // PREVIOUS mount; focus mode may have navigated since.
                // Drop it and let the remounting flow report afresh.
                setActiveScene(null);
                activeSectionIdRef.current = currentSectionId;
            }

            // Outline AND board edits (add/rename/reparent/delete
            // sections, drag reorder) save through their own plain
            // fetch, not an Inertia visit — the server-rendered
            // `sections` tree the Navigator/other views read never
            // hears about them. Leaving either structural view is the
            // one moment that MUST catch it up.
            const leavingStructuralView =
                (viewMode === 'outline' || viewMode === 'kanban') && next !== 'outline' && next !== 'kanban';

            if (next === 'focus' && slug !== null) {
                router.visit(flowUrl(project.slug, work.slug, slug), {
                    only: leavingStructuralView ? ['currentSection', 'sections'] : ['currentSection'],
                    preserveState: true,
                    preserveScroll: true,
                });
            } else if (leavingStructuralView) {
                router.reload({ only: ['sections', 'currentSection'] });
            }
        },
        [viewMode, work.id, activeSceneSlug, currentSectionId, currentSectionSlug, project.slug, work.slug],
    );

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
     *  the work itself when no section is active (e.g., empty work) —
     *  works hold notes directly, so the drawer stays inside the
     *  manuscript instead of widening to the whole project. */
    const handleNotesClick = useCallback(() => {
        if (effectiveSectionId !== null) {
            openNotesDrawer({
                projectId: project.id,
                projectSlug: project.slug,
                contextType: 'work_section',
                contextId: effectiveSectionId,
                contextLabel: effectiveSectionTitle ?? '',
            });
        } else {
            openNotesDrawer({
                projectId: project.id,
                projectSlug: project.slug,
                contextType: 'work',
                contextId: work.id,
                contextLabel: work.title,
            });
        }
    }, [project.id, project.slug, work.id, work.title, effectiveSectionId, effectiveSectionTitle]);

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
            effectiveSection?.format === 'prose'
                ? extractSectionOutline(effectiveSection.content)
                : [],
        );
        if (effectiveSection?.format !== 'screenplay') {
            setScreenplaySceneLinks([]);
            if (work.format !== 'screenplay' && linkedPanelTab === 'scene-links') {
                setLinkedPanelTab('browse');
            }
        }
    }, [effectiveSection?.id, effectiveSection?.content, effectiveSection?.format, linkedPanelTab, work.format]);

    /* Clear transient comment state when the active section changes. */
    useEffect(() => {
        setPendingCommentAnchor(null);
        setHighlightCommentId(null);
    }, [effectiveSection?.id]);

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

    const toggleShowPlan = useCallback(() => {
        setShowPlan((prev) => {
            const next = !prev;
            writeShowPlan(next);
            return next;
        });
    }, []);

    const updatePageDisplay = useCallback((value: string) => {
        const next = normalizePageDisplay(value);
        setPageDisplayState(next);
        writePageDisplay(next);
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

    // The combo hands over whatever the writer typed, so the clamp to a
    // legible range lives here rather than in the ribbon framework.
    const updateFontSize = useCallback((value: string) => {
        const next = clampFontSize(value);
        setFontSize(next);
        writeFontSize(next);
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
        // In the flow the section is already on screen — jumping to it is
        // a scroll, not a navigation.
        if (viewMode === 'continuous' && scrollToSlugRef.current !== null) {
            scrollToSlugRef.current(slug);

            return;
        }

        router.visit(workUrl(project.slug, work.slug, slug), {
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

        router.delete(`${worksBase(project.slug, work.slug)}/sections/${deleteTarget.id}`, {
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
            format: (effectiveSectionFormat ?? work.format) === 'screenplay' ? 'screenplay' : 'prose',
            canUpdate: can.update,
            panelOpen,
            sceneLinksPanelOpen: panelOpen && panelMode === 'linked' && linkedPanelTab === 'scene-links',
            viewMode,
            printLayout,
            showPlan,
            pageDisplay,
            paperColor,
            zoom,
            fontSize,
            hasSection: effectiveSectionId !== null,
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
                setViewMode: switchViewMode,
                togglePrintLayout,
                toggleShowPlan,
                setPageDisplay: updatePageDisplay,
                setPaperColor: updatePaperColor,
                setZoom: updateZoom,
                setFontSize: updateFontSize,
                openSettings: () => setSettingsOpen(true),
                openReports: () => router.visit(`${worksBase(projectSlug, workSlug)}/reports`),
                addSection: () => setAddTarget({ parentId: null }),
                addInside: () => {
                    if (effectiveSectionId !== null) {
                        setAddTarget({ parentId: effectiveSectionId });
                    }
                },
                deleteSection: () => {
                    if (effectiveSectionId === null) {
                        return;
                    }

                    const node = findSectionNode(sections, effectiveSectionId);

                    if (node !== null) {
                        setDeleteTarget(node);
                    }
                },
                // works.update requires title + status (logline nullable,
                // type/length_plan `sometimes`) — the minimum valid payload.
                setStatus: (value: string) =>
                    router.put(
                        workUrl(projectSlug, workSlug),
                        { title: work.title, status: value },
                        { preserveScroll: true },
                    ),
                goToIndex: () => router.visit(worksBase(projectSlug)),
                goToDashboard: () => router.visit('/writing'),
                openExportFdx: () => setFdxExportOpen(true),
                importFdx: () => {
                    setFdxImportError(null);
                    importFdx(projectSlug, (message) => setFdxImportError(message ?? t('writing.fdx.import_failed')));
                },
                openMarkRevision: () => setMarkRevisionRequest({ lockedSection: null }),
            },
            workStatus: work.status,
        };
    }, [project.slug, work.slug, work.format, work.title, work.status, can.update, panelOpen, panelMode, linkedPanelTab, viewMode, printLayout, showPlan, pageDisplay, paperColor, zoom, fontSize, effectiveSectionFormat, effectiveSectionId, sections, editorTick, togglePanel, toggleSceneLinksPanel, switchViewMode, togglePrintLayout, toggleShowPlan, updatePageDisplay, updatePaperColor, updateZoom, updateFontSize, t]);

    const workWords = liveWorkWords ?? work.word_count;

    // Current-section live counts for the status bar — server-confirmed
    // autosave values overlay the Inertia props (same freshness as the
    // Navigator rows; the old SectionChrome footer read the autosave
    // hook directly, the bar assembles from the existing onCounts flow).
    const sectionWords =
        effectiveSection !== null
            ? (liveCounts[effectiveSection.id] ?? effectiveSection.word_count)
            : 0;
    const sectionPages =
        effectiveSection !== null ? (livePages[effectiveSection.id] ?? null) : null;

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
                    '--alex-writing-font-size': `${fontSize}pt`,
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

                {/* FDX import error — Task 5. No toast idiom exists in this
                    desk (see the fdxImportError declaration above), so this
                    mirrors WorkSettingsModal's entryLinkError pattern: a
                    dismissible inline notice instead of a global toast. */}
                {fdxImportError && (
                    <div
                        className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 text-sm"
                        style={{
                            background: 'var(--theme-status-error-subtle)',
                            color: 'var(--theme-status-error-stroke)',
                        }}
                    >
                        <span className="flex items-center gap-2">
                            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                            {fdxImportError}
                        </span>
                        <button
                            type="button"
                            onClick={() => setFdxImportError(null)}
                            aria-label="Dismiss"
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
                        >
                            <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                        </button>
                    </div>
                )}

                <div className="writing-workspace-body relative flex min-h-0 flex-1">
                    {/* Navigator — pushed back entirely in focus mode:
                        focus is "just the text" (owner ruling 2026-08-09).
                        Also absent in outline and board mode: each of
                        those panes IS the section map at full width, so
                        the floating Sections layer would only duplicate
                        it and collide with the wider layout (owner,
                        2026-08-28). Stored open/closed preferences are
                        untouched either way, so returning to continuous
                        restores what was open. */}
                    {chromeVisible && viewMode !== 'outline' && viewMode !== 'kanban' && (
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
                                currentSection={effectiveSection}
                                currentSlug={effectiveSection?.slug ?? null}
                                canUpdate={can.update}
                                onSelect={selectSection}
                                onRequestAdd={(parentId) => setAddTarget({ parentId })}
                                onRequestDelete={setDeleteTarget}
                                onRequestMarkRevision={(node) => setMarkRevisionRequest({ lockedSection: node })}
                                liveCounts={liveCounts}
                                currentOutline={currentOutline}
                            />
                        </nav>
                    </div>
                    )}

                    {/* Editor pane — the frame itself never scrolls; the
                        editor's content wrapper (focus mode) or the flow's
                        own scrollport (continuous mode) does. The view
                        toggle floats over whichever is mounted. */}
                    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                        {sections.length > 0 && (
                            <div className="absolute right-4 top-2 z-10">
                                <FlowToggle mode={viewMode} onChange={switchViewMode} />
                            </div>
                        )}
                        {viewMode === 'outline' ? (
                            <OutlineView
                                projectSlug={project.slug}
                                workSlug={work.slug}
                                canUpdate={can.update}
                                onNavigate={selectSection}
                            />
                        ) : viewMode === 'kanban' ? (
                            <KanbanView
                                projectSlug={project.slug}
                                workSlug={work.slug}
                                canUpdate={can.update}
                                onNavigate={selectSection}
                            />
                        ) : viewMode === 'continuous' && sections.length > 0 ? (
                            <ContinuousFlow
                                project={project}
                                work={work}
                                sections={sections}
                                initialSection={currentSection}
                                canUpdate={can.update}
                                printLayout={printLayout}
                                showPlan={showPlan}
                                pageDisplay={pageDisplay}
                                marginXIn={marginXIn}
                                onCounts={handleCounts}
                                onActiveSceneChange={handleActiveSceneChange}
                                onBridgeChange={handleBridgeChange}
                                onEditorStateChange={handleEditorStateChange}
                                onOutlineChange={setCurrentOutline}
                                onSceneLinksChange={setScreenplaySceneLinks}
                                onEntryLinkSelect={handleEntryLinkSelect}
                                onAddComment={handleAddComment}
                                scrollToSlugRef={scrollToSlugRef}
                            />
                        ) : currentSection !== null ? (
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
                                    showPlan={showPlan}
                                    marginXIn={marginXIn}
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
                                    showPlan={showPlan}
                                    pageDisplay={pageDisplay}
                                    marginXIn={marginXIn}
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
                    {chromeVisible && panelOpen && (
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
                                        currentSection={effectiveSection}
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
                                        work={work}
                                        currentSection={effectiveSection}
                                        sections={sections}
                                    />
                                )}
                                {panelMode === 'outline' && (
                                    <OutlineSidebar
                                        projectSlug={project.slug}
                                        workSlug={work.slug}
                                        currentSectionId={effectiveSectionId}
                                        canUpdate={can.update}
                                        onNavigate={selectSection}
                                    />
                                )}
                                {panelMode === 'history' && (
                                    <HistoryPanel
                                        projectSlug={project.slug}
                                        workSlug={work.slug}
                                        currentSection={effectiveSection}
                                        canUpdate={can.update}
                                        refreshSignal={historyRefreshSignal}
                                    />
                                )}
                                {panelMode === 'comments' && (
                                    <CommentRail
                                        workSlug={work.slug}
                                        projectSlug={project.slug}
                                        sectionId={effectiveSection?.id ?? null}
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
                                            currentSection={effectiveSection}
                                            editorBridge={bridgeRef.current}
                                            bridgeSectionId={
                                                viewMode === 'continuous'
                                                    ? effectiveSectionId !== null &&
                                                      bridgesRef.current.get(effectiveSectionId)
                                                        ? effectiveSectionId
                                                        : null
                                                    : bridgeRef.current !== null
                                                      ? currentSectionId
                                                      : null
                                            }
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
                    hasSection={effectiveSection !== null}
                    sectionWords={sectionWords}
                    sectionTarget={effectiveSection?.target_words ?? null}
                    sectionPages={sectionPages}
                    sectionFormat={effectiveSection?.format ?? null}
                />
            </div>

            {settingsOpen && (
                <WorkSettingsModal
                    project={project}
                    work={work}
                    types={types}
                    lengthPlans={lengthPlans}
                    structureBlueprint={structureBlueprint}
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

            {fdxExportOpen && (
                <ExportFdxModal
                    projectSlug={project.slug}
                    workSlug={work.slug}
                    onClose={() => setFdxExportOpen(false)}
                />
            )}

            {markRevisionRequest !== null && (
                <MarkRevisionModal
                    projectSlug={project.slug}
                    workSlug={work.slug}
                    sections={sections}
                    currentSection={effectiveSection}
                    lockedSection={markRevisionRequest.lockedSection}
                    onClose={() => setMarkRevisionRequest(null)}
                    onMarked={() => setHistoryRefreshSignal((n) => n + 1)}
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
