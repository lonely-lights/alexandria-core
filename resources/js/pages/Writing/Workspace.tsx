import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import useEntitlements from '@alexandria/hooks/useEntitlements';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import type { ScreenplaySceneLink } from '@alexandria/editor/screenplay/sceneLinks';
import AppLayout, { SIDEBAR_TOGGLE_EVENT } from '@alexandria/layouts/AppLayout';
import { openNotesDrawer } from '@alexandria/components/notes/NotesDrawer';
import Ribbon from '@alexandria/ribbon/Ribbon';
import type { RibbonGates } from '@alexandria/ribbon/types';
import LogoLockup from '@alexandria/components/brand/LogoLockup';
import CompactUserMenu from '@alexandria/components/navigation/CompactUserMenu';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import {
    applyViewPreferences,
    VIEW_PREFERENCES_CHANGED_EVENT,
    type ViewPreferences,
} from '@alexandria/lib/applyViewPreferences';
import { patchCachedPreferences } from '@alexandria/pages/Settings/settingsCache';

import ContinuousFlow, { type ActiveScene } from './Flow/ContinuousFlow';
import FlowToggle from './Flow/FlowToggle';
import { flowUrl, parseSceneFragment } from './Flow/flowUrl';
import { readViewMode, writeViewMode, type WorkspaceViewMode } from './Flow/viewMode';
import ExportFdxModal from './Fdx/ExportFdxModal';
import { importFdx } from './Fdx/importFdx';
import HistoryPanel from './Revisions/HistoryPanel';
import MarkRevisionModal from './Revisions/MarkRevisionModal';
import MarkThreadModal, { type ThreadAnchor, type ThreadSectionRef } from './Threads/MarkThreadModal';
import ThreadsPanel from './Threads/ThreadsPanel';
import type { PatternThread } from './Threads/threadApi';
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
import MobileWritingChrome from './Mobile/MobileWritingChrome';
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
import SectionSettingsModal from './Sections/SectionSettingsModal';
import { readStructureOpen, writeStructureOpen } from './Sections/structureOpen';
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
import { aiBase, notesUrl, projectUrl, worksBase, workUrl } from '@alexandria/lib/urls';
import { useJsonFetch } from '@alexandria/lib/fetchJson';

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
    can: { update: boolean; delete: boolean };
    [key: string]: unknown;
}

/** Persisted reference-panel visibility (desktop only — the xl: gate still applies). */
export const PANEL_OPEN_STORAGE_KEY = 'alexandria.writing.panel_open';
export const PAPER_COLOR_STORAGE_KEY = 'alexandria.writing.paper_color';
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

    const sharedShowSectionTypeLabels =
        (pageProps as { auth?: { preferences?: { show_section_type_labels?: boolean } } })
            .auth?.preferences?.show_section_type_labels ?? true;

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
    const desktopPanelAvailable = useMediaQuery('(min-width: 1280px)');
    const [mobileKeyboardVisible, setMobileKeyboardVisible] = useState(false);
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
    const [structureOpen, setStructureOpen] = useState(() => readStructureOpen(work.id));
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sectionSettingsOpen, setSectionSettingsOpen] = useState(false);
    const [showSectionTypeLabels, setShowSectionTypeLabels] = useState(sharedShowSectionTypeLabels);
    const [sectionSettingsSaving, setSectionSettingsSaving] = useState(false);
    const [sectionSettingsError, setSectionSettingsError] = useState<string | null>(null);
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

    // Named delete-impact (Devices & Tropes rework-6) — fetched fresh
    // each time the confirm modal opens so the counts can never go stale
    // between opening the modal and clicking confirm.
    const deleteImpactUrl = deleteTarget !== null
        ? `${worksBase(project.slug, work.slug)}/sections/${deleteTarget.id}/delete-impact`
        : null;
    const { data: deleteImpact, loading: deleteImpactLoading } = useJsonFetch<{
        title: string;
        descendant_sections: number;
        notes: number;
    }>(deleteImpactUrl);

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
    // Mutes the account tooltip while its dropdown is open (the menu
    // renders inside the tooltip trigger subtree).
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [historyRefreshSignal, setHistoryRefreshSignal] = useState(0);

    // Mark-thread dialog (Devices & Tropes Task 5) — `lockedSection: null`
    // is the File-menu entry point (mark lands on the current section);
    // Kanban/outline row menus pass that row's `{id, title}` (they don't
    // hold the nested section tree); the editor selection bubble passes
    // `anchor` alongside whichever entry point opened it. `lockedThread`
    // (Task 6) is non-null when ThreadsPanel/ThreadDetailModal request an
    // additional mark on an ALREADY-selected thread — MarkThreadModal
    // skips its picker step entirely in that case.
    const [markThreadRequest, setMarkThreadRequest] = useState<{
        lockedSection: ThreadSectionRef | null;
        anchor: ThreadAnchor | null;
        lockedThread: PatternThread | null;
    } | null>(null);
    // Bumped after a mark is added (via the shared MarkThreadModal, from
    // any entry point) so an already-open Threads panel/detail modal
    // refetches.
    const [threadsRefreshSignal, setThreadsRefreshSignal] = useState(0);

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

    useEffect(() => {
        setShowSectionTypeLabels(sharedShowSectionTypeLabels);
    }, [sharedShowSectionTypeLabels]);

    useEffect(() => {
        function handleViewPreferenceChange(event: Event) {
            const detail = (event as CustomEvent<ViewPreferences>).detail;

            if (detail.show_section_type_labels !== undefined) {
                setShowSectionTypeLabels(detail.show_section_type_labels);
            }
        }

        window.addEventListener(VIEW_PREFERENCES_CHANGED_EVENT, handleViewPreferenceChange);

        return () => window.removeEventListener(VIEW_PREFERENCES_CHANGED_EVENT, handleViewPreferenceChange);
    }, []);

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

    // Fired by the editor's "Mark device" floating bubble (Devices &
    // Tropes Task 5) — opens MarkThreadModal with the captured selection
    // as the mark's anchor. Unlike the comment bubble, there's no
    // section choice here: the mark always lands on whichever section
    // is being edited, so `lockedSection` is set even from this
    // "unlocked" entry point's perspective (the thread PICKER still runs;
    // only the mark's section is fixed).
    const handleMarkThreadFromSelection = useCallback(
        (selectionAnchor: { from: number; to: number; text: string }) => {
            if (effectiveSectionId === null || effectiveSectionTitle === null) {
                return;
            }

            setMarkThreadRequest({
                lockedSection: { id: effectiveSectionId, title: effectiveSectionTitle },
                anchor: { text: selectionAnchor.text, offsetHint: selectionAnchor.from },
                lockedThread: null,
            });
        },
        [effectiveSectionId, effectiveSectionTitle],
    );

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
            writeStructureOpen(work.id, next);
            return next;
        });
    }, [work.id]);

    const openSectionSettings = useCallback(() => {
        setSectionSettingsError(null);
        setSectionSettingsOpen(true);
    }, []);

    const updateShowSectionTypeLabels = useCallback(
        async (value: boolean) => {
            const previous = showSectionTypeLabels;
            const restorePreviousSetting = () => {
                setShowSectionTypeLabels(previous);
                applyViewPreferences({
                    show_section_type_labels: previous,
                });
                setSectionSettingsError(t('writing.workspace.section_settings_save_failed'));
            };

            setSectionSettingsError(null);
            setSectionSettingsSaving(true);
            setShowSectionTypeLabels(value);
            applyViewPreferences({ show_section_type_labels: value });

            try {
                const response = await fetch('/account/preferences', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Silent': 'true',
                        ...csrfHeaders(),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        show_section_type_labels: value,
                    }),
                });

                if (!response.ok) {
                    restorePreviousSetting();

                    return;
                }

                patchCachedPreferences({ show_section_type_labels: value });
            } catch {
                restorePreviousSetting();
            } finally {
                setSectionSettingsSaving(false);
            }
        },
        [showSectionTypeLabels, t],
    );

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
                openSectionSettings,
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
                openMarkThread: () => setMarkThreadRequest({ lockedSection: null, anchor: null, lockedThread: null }),
            },
            workStatus: work.status,
        };
    }, [project.slug, work.slug, work.format, work.title, work.status, can.update, panelOpen, panelMode, linkedPanelTab, viewMode, printLayout, showPlan, pageDisplay, paperColor, zoom, fontSize, effectiveSectionFormat, effectiveSectionId, sections, editorTick, togglePanel, toggleSceneLinksPanel, switchViewMode, togglePrintLayout, toggleShowPlan, updatePageDisplay, updatePaperColor, updateZoom, updateFontSize, openSectionSettings, t]);

    const workWords = liveWorkWords ?? work.word_count;

    const mobileDestinations = [
        {
            id: 'project',
            label: t('writing.rail.project_home'),
            icon: 'fa-solid fa-globe',
            href: projectUrl(project.slug),
        },
        {
            id: 'notes',
            label: t('writing.rail.notes'),
            icon: 'fa-solid fa-note-sticky',
            href: notesUrl(project.slug),
        },
        {
            id: 'ai',
            label: t('writing.rail.ai'),
            icon: 'fa-solid fa-wand-magic-sparkles',
            href: aiBase(project.slug),
        },
        {
            id: 'reports',
            label: t('writing.rail.reports'),
            icon: 'fa-solid fa-chart-simple',
            href: `${worksBase(project.slug, work.slug)}/reports`,
        },
    ];

    function renderCompanionContent() {
        return (
            <>
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
                {panelMode === 'threads' && (
                    <ThreadsPanel
                        projectSlug={project.slug}
                        workId={work.id}
                        sections={sections}
                        currentSection={effectiveSection}
                        canUpdate={can.update}
                        refreshSignal={threadsRefreshSignal}
                        onRequestAddMark={(thread) =>
                            setMarkThreadRequest({ lockedSection: null, anchor: null, lockedThread: thread })
                        }
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
                {registeredModes.map((mode) =>
                    mode.id === panelMode ? (
                        <mode.component
                            key={mode.id}
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
            </>
        );
    }

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
        // The mobile dock uses its guarded peek presentation here: the
        // collapsed Writing handle cannot navigate, while one deliberate
        // reveal exposes Settings and the other global destinations. Peek
        // mode overlays rather than re-growing this viewport-exact surface.
        <AppLayout
            title={`${work.title} - ${project.name}`}
            navbar={false}
            immersive
            fabActions={null}
            bottomNavPresentation="peek"
            bottomNavActiveTabId="writing"
            bottomNavHidden={mobileKeyboardVisible}
        >
            {/* The workspace IS the viewport — only the editor desk
                (and the side rails internally) scroll, so the window
                never grows a second scrollbar. Height/overflow are
                INLINE on purpose: `h-svh` was a first-use utility in
                the vendor path and Tailwind's source scan missed it in
                some dev pipelines (vendor/ is .gitignored) — inline
                styles can't be skipped by a CSS generator. */}
            <div
                className="writing-workspace-shell flex flex-col"
                data-writing-paper-color={paperColor}
                style={{
                    height: '100svh',
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
                <div className="hidden shrink-0 lg:block" style={ribbonShellStyle}>
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
                                className="inline-flex shrink-0 cursor-pointer items-center justify-center self-stretch"
                                style={{ color: 'var(--theme-base-content)' }}
                            >
                                {/* Same interactive lockup as the navbar
                                    (owner, 2026-08-31): wave on hover,
                                    one-shot jump on click — the click
                                    still opens the sidebar via the
                                    wrapping button. Mark-only, sized to
                                    the corner's negative space. */}
                                <LogoLockup
                                    size="md"
                                    markSize={44}
                                    showWordmark={false}
                                    wordmarkText="Alexandria"
                                    interactive
                                />
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
                                <Tooltip content={t('ribbon.account')} disabled={accountMenuOpen}>
                                    <span className="inline-flex">
                                        <CompactUserMenu
                                            ariaLabel={t('ribbon.account')}
                                            size={36}
                                            onOpenChange={setAccountMenuOpen}
                                        />
                                    </span>
                                </Tooltip>
                            </>
                        }
                    />
                </div>

                <MobileWritingChrome
                    workTitle={work.title}
                    sectionTitle={effectiveSection?.title ?? null}
                    viewMode={viewMode}
                    context={ribbonCtx}
                    gates={writingGates}
                    destinations={mobileDestinations}
                    onCompanionModeChange={(mode) => {
                        setPanelMode(mode);
                        writePanelMode(work.id, mode);
                        if (mode === 'linked' && work.format === 'screenplay') {
                            setLinkedPanelTab('scene-links');
                        }
                    }}
                    onAddComment={handleAddComment}
                    onMarkThread={handleMarkThreadFromSelection}
                    onKeyboardVisibilityChange={setMobileKeyboardVisible}
                    renderStructure={(close) => (
                        <Navigator
                            showHeader={false}
                            projectSlug={project.slug}
                            workSlug={work.slug}
                            work={work}
                            sections={sections}
                            currentSection={effectiveSection}
                            currentSlug={effectiveSection?.slug ?? null}
                            canUpdate={can.update}
                            onSelect={(slug) => {
                                close();
                                selectSection(slug);
                            }}
                            onRequestAdd={(parentId) => setAddTarget({ parentId })}
                            onRequestDelete={setDeleteTarget}
                            onRequestSettings={openSectionSettings}
                            onRequestMarkRevision={(node) =>
                                setMarkRevisionRequest({ lockedSection: node })
                            }
                            liveCounts={liveCounts}
                            currentOutline={currentOutline}
                            showSectionTypeLabels={showSectionTypeLabels}
                        />
                    )}
                    renderCompanions={() => (
                        <div className="flex h-full min-h-0 flex-col">
                            <PanelModeSwitcher
                                mode={panelMode}
                                presentation="labeled"
                                onChange={(mode) => {
                                    setPanelMode(mode);
                                    writePanelMode(work.id, mode);
                                }}
                                can={{ 'work.update': can.update }}
                            />
                            <div className="min-h-0 flex-1">{renderCompanionContent()}</div>
                        </div>
                    )}
                />

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
                    {/* Sections binder — pushed back entirely in focus mode:
                        focus is "just the text" (owner ruling 2026-08-09).
                        Also absent in outline and board mode: each of
                        those panes IS the section map at full width, so
                        a docked binder would only duplicate it and
                        collide with the wider layout (owner, 2026-08-28).
                        Stored open/closed preferences are untouched
                        either way, so returning to continuous restores
                        what was open.

                        Docked left column at the workspace's xl layout
                        breakpoint (owner ruling 2026-08-29: sections must
                        be "very present on this page", not hidden behind
                        a floating chevron) — the manuscript reflows
                        beside it via the normal flex row below. Below xl
                        the open panel floats over the manuscript instead
                        (position swaps in CSS; see
                        .writing-workspace-binder-panel in
                        manuscript.css), anchored where the collapsed
                        rail sits rather than the old chevron's own
                        floating position. Navigator itself always stays
                        mounted (only the rail button unmounts) so its
                        expand/collapse tree state survives a collapse
                        toggle. */}
                    {chromeVisible && viewMode !== 'outline' && viewMode !== 'kanban' && (
                    <div
                        className="writing-workspace-binder hidden lg:flex lg:min-h-0 lg:shrink-0"
                        data-open={structureOpen ? 'true' : 'false'}
                    >
                        {/* Rail + panel both stay mounted; data-open on the
                            root drives the CSS width/fade animation between
                            them (owner ruling, 2026-08-31 review). */}
                        <div className="writing-workspace-binder-rail flex flex-col items-center gap-2 py-2">
                                <Tooltip content={t('writing.workspace.show_sections')} placement="right">
                                    <button
                                        type="button"
                                        className="writing-workspace-structure-toggle alex-toolbar-btn"
                                        data-writing-structure-toggle
                                        aria-label={t('writing.workspace.show_sections')}
                                        aria-expanded={structureOpen}
                                        onClick={toggleStructure}
                                    >
                                        <i className="fa-solid fa-list-ul" aria-hidden="true" />
                                    </button>
                                </Tooltip>
                            </div>
                        <div
                            className="writing-workspace-binder-panel flex w-72 min-h-0 flex-col"
                            data-open={structureOpen ? 'true' : 'false'}
                        >
                            {/* Navigator owns the single SECTIONS header
                                row now (owner review, 2026-08-31 — the
                                doubled label is gone); the collapse toggle
                                rides in as its headerTrailing so it sits
                                right of the tree actions. */}
                            <nav className="writing-workspace-section-pane min-h-0 flex-1 overflow-hidden">
                                <Navigator
                                    headerTrailing={
                                        <button
                                            type="button"
                                            className="writing-workspace-structure-toggle alex-toolbar-btn"
                                            data-writing-structure-toggle
                                            aria-label={t('writing.workspace.hide_sections')}
                                            title={t('writing.workspace.hide_sections')}
                                            aria-expanded={structureOpen}
                                            onClick={toggleStructure}
                                        >
                                            <i className="fa-solid fa-angles-left" aria-hidden="true" />
                                        </button>
                                    }
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
                                    onRequestSettings={openSectionSettings}
                                    onRequestMarkRevision={(node) => setMarkRevisionRequest({ lockedSection: node })}
                                    liveCounts={liveCounts}
                                    currentOutline={currentOutline}
                                    showSectionTypeLabels={showSectionTypeLabels}
                                />
                            </nav>
                        </div>
                    </div>
                    )}

                    {/* Editor pane — the frame itself never scrolls; the
                        editor's content wrapper (focus mode) or the flow's
                        own scrollport (continuous mode) does. The view
                        toggle floats over whichever is mounted. */}
                    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                        {sections.length > 0 && (
                            <div className="absolute right-4 top-2 z-10 hidden lg:block">
                                <FlowToggle mode={viewMode} onChange={switchViewMode} />
                            </div>
                        )}
                        {viewMode === 'outline' ? (
                            <OutlineView
                                projectSlug={project.slug}
                                workSlug={work.slug}
                                canUpdate={can.update}
                                onNavigate={selectSection}
                                onRequestMarkThread={(row) =>
                                    setMarkThreadRequest({ lockedSection: row, anchor: null, lockedThread: null })
                                }
                            />
                        ) : viewMode === 'kanban' ? (
                            <KanbanView
                                projectSlug={project.slug}
                                workSlug={work.slug}
                                workId={work.id}
                                canUpdate={can.update}
                                onNavigate={selectSection}
                                onRequestMarkThread={(row) =>
                                    setMarkThreadRequest({ lockedSection: row, anchor: null, lockedThread: null })
                                }
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
                                onMarkThread={handleMarkThreadFromSelection}
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
                                    enableMarkThread={can.update}
                                    onMarkThread={handleMarkThreadFromSelection}
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
                                    enableMarkThread={can.update}
                                    onMarkThread={handleMarkThreadFromSelection}
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
                    {chromeVisible && panelOpen && desktopPanelAvailable && (
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
                                {renderCompanionContent()}
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
                    mobileHidden={mobileKeyboardVisible}
                />
            </div>

            {settingsOpen && (
                <WorkSettingsModal
                    project={project}
                    work={work}
                    types={types}
                    lengthPlans={lengthPlans}
                    structureBlueprint={structureBlueprint}
                    canDelete={can.delete}
                    onClose={() => setSettingsOpen(false)}
                />
            )}

            <SectionSettingsModal
                open={sectionSettingsOpen}
                showSectionTypeLabels={showSectionTypeLabels}
                saving={sectionSettingsSaving}
                error={sectionSettingsError}
                onShowSectionTypeLabelsChange={(value) => {
                    void updateShowSectionTypeLabels(value);
                }}
                onClose={() => setSectionSettingsOpen(false)}
            />

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

            {markThreadRequest !== null && (
                <MarkThreadModal
                    projectSlug={project.slug}
                    workId={work.id}
                    sections={sections}
                    currentSection={
                        effectiveSection !== null
                            ? { id: effectiveSection.id, title: effectiveSection.title }
                            : null
                    }
                    lockedSection={markThreadRequest.lockedSection}
                    lockedThread={markThreadRequest.lockedThread}
                    anchor={markThreadRequest.anchor}
                    onClose={() => setMarkThreadRequest(null)}
                    onMarked={() => setThreadsRefreshSignal((n) => n + 1)}
                />
            )}

            <ConfirmModal
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={t('writing.workspace.delete_confirm_title')}
                message={
                    deleteTarget !== null && (
                        <div className="flex flex-col gap-2">
                            <p>
                                <strong>{deleteTarget.title}</strong>
                                {deleteTarget.label && ` · ${deleteTarget.label}`}
                            </p>
                            <p>{t('writing.workspace.delete_confirm_body')}</p>
                            {deleteImpactLoading ? (
                                <p
                                    className="italic"
                                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}
                                >
                                    {t('writing.workspace.delete_impact_loading')}
                                </p>
                            ) : (
                                deleteImpact !== null && (
                                    <ul className="list-disc pl-4">
                                        {deleteImpact.descendant_sections > 0 && (
                                            <li>
                                                {(deleteImpact.descendant_sections === 1
                                                    ? t('writing.workspace.delete_impact_sections.singular')
                                                    : t('writing.workspace.delete_impact_sections.plural')
                                                ).replace(':count', String(deleteImpact.descendant_sections))}
                                            </li>
                                        )}
                                        {deleteImpact.notes > 0 && (
                                            <li>
                                                {(deleteImpact.notes === 1
                                                    ? t('writing.workspace.delete_impact_notes.singular')
                                                    : t('writing.workspace.delete_impact_notes.plural')
                                                ).replace(':count', String(deleteImpact.notes))}
                                            </li>
                                        )}
                                    </ul>
                                )
                            )}
                            <p
                                className="text-xs"
                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)' }}
                            >
                                {t('writing.workspace.delete_confirm_recycle_note')}
                            </p>
                        </div>
                    )
                }
                confirmLabel={t('writing.workspace.delete_confirm_action')}
                variant="danger"
                loading={deleting || deleteImpactLoading}
            />
        </AppLayout>
    );
}
