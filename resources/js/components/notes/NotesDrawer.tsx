import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { usePage } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import Tooltip from '@alexandria/components/ui/Tooltip';
import Modal from '@alexandria/components/ui/Modal';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { useDrawerHeight, type DrawerHeight } from '@alexandria/hooks/useDrawerHeight';
import { useDrawerMode, type DrawerMode } from '@alexandria/hooks/useDrawerMode';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import { useNoteActions } from '@alexandria/hooks/useNoteActions';
import useT, { type Translator } from '@alexandria/hooks/useT';
import NoteModal from '@alexandria/pages/Notes/Sections/NoteModal';
import NotesView from '@alexandria/pages/Notes/Sections/NotesView';

import type { Note } from '@alexandria/types/notes-dashboard';
import AiStatusFooter from './AiStatusFooter';
import CommandReviewModal from './CommandReviewModal';
import TagPickerModal from './modals/TagPickerModal';
import NotebookSelectorModal, { type NotebookData } from './modals/NotebookSelectorModal';
import HistoryModal, { type HistoryRecord } from './modals/HistoryModal';
import LinkMoveModal from './modals/LinkMoveModal';
import ContextSwitchModal, { type SwitchTarget } from './modals/ContextSwitchModal';
import ImportModal from './modals/ImportModal';
import PromptPreviewModal from './modals/PromptPreviewModal';
import SortingHistoryModal from './modals/SortingHistoryModal';

/* ── Toggle option tables ── */

// Tooltip copy + icons for the height-toggle buttons in the drawer
// header. Labels resolve through useT() at render time.
const HEIGHT_OPTIONS: Array<{ key: DrawerHeight; icon: string; labelKey: string }> = [
    { key: 'partial', icon: 'fa-solid fa-window-minimize', labelKey: 'notes.drawer.height.partial' },
    { key: 'tall', icon: 'fa-solid fa-bars', labelKey: 'notes.drawer.height.tall' },
    { key: 'full', icon: 'fa-solid fa-up-right-and-down-left-from-center', labelKey: 'notes.drawer.height.full' },
];

// Layout mode options — split keeps the inline detail pane; list
// hands deep reading/editing off to the shared NoteModal.
const MODE_OPTIONS: Array<{ key: DrawerMode; icon: string; labelKey: string }> = [
    { key: 'split', icon: 'fa-solid fa-table-columns', labelKey: 'notes.drawer.mode.split' },
    { key: 'list', icon: 'fa-solid fa-list', labelKey: 'notes.drawer.mode.list' },
];

const NOTEBOOK_COLOR_SWATCHES = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

/* ── Types ── */

export interface NotesContext {
    projectId: number;
    projectSlug: string;
    /**
     * `work` scopes the drawer to a manuscript itself (notes on the whole
     * work), `work_section` to one of its sections. Both ride the same
     * context_type/context_id contract as the other scopes — every fetch
     * site passes the value straight through.
     */
    contextType: 'project' | 'blueprint' | 'entry' | 'work_section' | 'work';
    contextId: number;
    contextLabel: string;
    contextSlug?: string;
    preSelectNoteId?: number;
    /**
     * When true, the open animation is skipped (drawer appears instantly).
     * Use ONLY for page-transition paths where the drawer is already
     * contextually expected (e.g. Sorting History → note open). The
     * sidebar-notes-panel note-click path must NOT set this so it animates.
     * Default: false (animate).
     */
    skipAnimation?: boolean;
}

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const subtleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' };

const drawerBgStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
};

const headerStyle: CSSProperties = {
    background: 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent), color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent))',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const segmentedGroupStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-100) 50%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.125rem',
};

function segmentedItemStyle(active: boolean): CSSProperties {
    if (active) {
        return {
            background: 'color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent)',
            color: 'var(--theme-brand-primary-500)',
            borderRadius: 'calc(var(--theme-radius-button) - 0.125rem)',
        };
    }
    return {
        background: 'transparent',
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
        borderRadius: 'calc(var(--theme-radius-button) - 0.125rem)',
    };
}

const closeBtnStyle: CSSProperties = {
    background: 'var(--theme-base-content)',
    color: 'var(--theme-base-100)',
    borderRadius: '9999px',
    padding: '0.375rem 0.875rem',
    fontSize: '0.75rem',
    fontWeight: 500,
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.5rem 0.75rem',
};

const searchInputStyle: CSSProperties = {
    ...inputStyle,
    height: '3rem',
    paddingLeft: '2.5rem',
    borderRadius: '9999px',
};

const circleBtn = (kind: 'import' | 'add' | 'select-on' | 'select-off'): CSSProperties => {
    const base: CSSProperties = {
        width: '3rem',
        height: '3rem',
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    };
    switch (kind) {
        case 'import':
            return {
                ...base,
                background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                color: 'var(--theme-base-content)',
            };
        case 'add':
            return {
                ...base,
                background: 'color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)',
                color: 'var(--theme-brand-primary-content)',
            };
        case 'select-on':
            // Active select-mode state — warning FILL (the bright token
            // warning-content is calibrated against), not warning-stroke:
            // stroke is the dark line color, and stroke bg + near-black
            // content text rendered dark-on-dark (owner report). Subtle
            // ring keeps it secondary in visual weight.
            return {
                ...base,
                background: 'var(--theme-status-warning-fill)',
                color: 'var(--theme-status-warning-content)',
                boxShadow: '0 0 0 2px color-mix(in srgb, var(--theme-status-warning-fill) 35%, transparent)',
            };
        case 'select-off':
            return {
                ...base,
                background: 'color-mix(in srgb, var(--theme-base-content) 18%, transparent)',
                color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
            };
    }
};

const notebookSwitchStyle: CSSProperties = {
    background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 10%, transparent))',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

const tagPillStyle: CSSProperties = {
    background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-primary-500) 25%, transparent), color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent))',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-badge)',
};

const tagAddBtnStyle: CSSProperties = {
    ...tagPillStyle,
    width: '1.75rem',
    height: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    transition: 'background var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

function noteRowStyle(state: 'selected' | 'checked' | 'idle'): CSSProperties {
    const base: CSSProperties = {
        cursor: 'pointer',
        padding: '0.5rem 1rem',
        borderLeft: '4px solid transparent',
        borderRadius: '0.25rem',
        transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    };
    if (state === 'checked') {
        return {
            ...base,
            borderLeftColor: 'var(--theme-brand-secondary-500)',
            background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)',
            boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        };
    }
    if (state === 'selected') {
        return {
            ...base,
            borderLeftColor: 'var(--theme-brand-primary-500)',
            background: 'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)',
            boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        };
    }
    return base;
}

const detailBodyStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    background: 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-base-content) 6%, transparent), color-mix(in srgb, var(--theme-base-content) 3%, transparent))',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: 'inset 0 2px 4px 0 color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
};

const trashedDetailStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-status-error-fill) 15%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const emptyTrashBtnStyle: CSSProperties = {
    background: 'var(--theme-status-error-fill)',
    color: 'var(--theme-status-error-content)',
    borderRadius: 'var(--theme-radius-button)',
    width: '100%',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    fontWeight: 500,
};

const linkPreviewRowStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-input)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
};

const cardHiddenOverflow: CSSProperties = { ...cardStyle, overflow: 'hidden' };

const sectionBorderTopStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const dividerStyle: CSSProperties = {
    height: '1px',
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    margin: '0.75rem 0',
};

const btnSm: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    gap: '0.375rem',
};

const btnXs: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    gap: '0.25rem',
};

const btnSmPill: CSSProperties = {
    ...btnSm,
    borderRadius: '9999px',
};

const btnSuccessFill: CSSProperties = {
    background: 'var(--theme-status-success-fill)',
    color: 'var(--theme-status-success-content)',
};

const btnDangerFill: CSSProperties = {
    background: 'var(--theme-status-error-fill)',
    color: 'var(--theme-status-error-content)',
};

const btnWarningFill: CSSProperties = {
    background: 'var(--theme-status-warning-fill)',
    color: 'var(--theme-status-warning-content)',
};

const btnSecondaryFill: CSSProperties = {
    background: 'var(--theme-brand-secondary-500)',
    color: 'var(--theme-brand-secondary-content)',
};

const btnNeutralFill: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
    color: 'var(--theme-base-100)',
};

const headerIconWrapStyle = (kind: 'primary' | 'secondary' | 'danger'): CSSProperties => {
    if (kind === 'primary') {
        return {
            background: 'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)',
            color: 'var(--theme-brand-primary-500)',
            borderRadius: '9999px',
        };
    }
    if (kind === 'secondary') {
        return {
            background: 'var(--theme-brand-secondary-500)',
            color: 'var(--theme-brand-secondary-content)',
            borderRadius: '9999px',
        };
    }
    return {
        background: 'color-mix(in srgb, var(--theme-status-error-fill) 25%, transparent)',
        color: 'var(--theme-status-error-stroke)',
        borderRadius: '9999px',
    };
};

const categorizeOptionStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const portalMenuStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'var(--theme-base-100)',
    color: 'var(--theme-base-content)',
    boxShadow: '0 10px 20px -5px color-mix(in srgb, var(--theme-base-content) 25%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

const bulkBarStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-card)',
};

/* ── Global event for opening the drawer ── */

const OPEN_EVENT = 'alexandria:open-notes';

export function openNotesDrawer(ctx: NotesContext) {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: ctx }));
}

/* ── Drawer Component ── */

export default function NotesDrawer() {
    const t = useT();

    /* ── Core drawer state ── */
    const [open, setOpen] = useState(false);
    const [context, setContext] = useState<NotesContext | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [currentView, setCurrentView] = useState<'active' | 'archived' | 'trashed'>('active');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    /* ── Height preset (partial | tall | full), persisted ── */
    const { height: drawerHeight, setHeight: setDrawerHeight, className: drawerHeightClass } = useDrawerHeight();

    /* ── Layout mode (split | list), persisted ── */
    const { mode: drawerMode, setMode: setDrawerMode } = useDrawerMode();

    // Below 1024px there isn't room for the two-pane split (375px viewport
    // squeezes the list AND detail into a single column, neither legible).
    // We keep the user's persisted preference intact so it restores when
    // they widen the window, but force `list` at render time on mobile.
    // The mode/height toggles in the header are already `hidden sm:flex`
    // so users don't see the unused split option there.
    const isMobileDrawer = useMediaQuery('(max-width: 1023px)');
    const effectiveDrawerMode: DrawerMode = isMobileDrawer ? 'list' : drawerMode;

    /* ── Shared per-note server actions ── */
    const noteActions = useNoteActions(context?.projectId ?? 0);

    /* ── Unified edit/create modal state ── */
    const [modalMode, setModalMode] = useState<'view' | 'create' | null>(null);
    const [modalNote, setModalNote] = useState<Note | null>(null);

    /* ── Context switcher (drawer header) ── */
    const [showContextSwitch, setShowContextSwitch] = useState(false);
    const openedFromRef = useRef<NotesContext | null>(null);

    /* ── AI title ── */
    const [generatingTitle, setGeneratingTitle] = useState(false);

    /* ── Confirm deletion ── */
    const [confirmAction, setConfirmAction] = useState<{ type: 'trash' | 'force-delete'; noteId: number } | null>(null);

    /* ── History modal ── */
    const [historyNoteId, setHistoryNoteId] = useState<number | null>(null);
    const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    /* ── Tag modal ── */
    const [tagModalNoteId, setTagModalNoteId] = useState<number | null>(null);
    const [noteTags, setNoteTags] = useState<string[]>([]);

    /* ── Link/move/copy modal ── */
    const [linkAction, setLinkAction] = useState<{ noteId: number; action: 'link' | 'move' | 'copy' } | null>(null);

    /* ── Import modal ── */
    const [importModalOpen, setImportModalOpen] = useState(false);

    /* ── Notebook state ── */
    const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
    const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null);
    const [showNewNotebook, setShowNewNotebook] = useState(false);
    const [newNotebookTitle, setNewNotebookTitle] = useState('');
    const [newNotebookColor, setNewNotebookColor] = useState('#6366f1');
    const [newNotebookDesc, setNewNotebookDesc] = useState('');
    const [notebookPickerNoteId, setNotebookPickerNoteId] = useState<number | null>(null);
    const [notebookSelectorOpen, setNotebookSelectorOpen] = useState(false);
    const [notebookLinkAction, setNotebookLinkAction] = useState<{ notebookId: number; action: 'link' | 'move' } | null>(null);

    /* ── AI state ── */
    const [showCategorizeModal, setShowCategorizeModal] = useState(false);
    const [categorizeAutoProcess, setCategorizeAutoProcess] = useState(false);
    const [categorizeWithRelationships, setCategorizeWithRelationships] = useState(false);
    const [showEntryIntegration, setShowEntryIntegration] = useState(false);
    const [integrationInstructions, setIntegrationInstructions] = useState('');
    const [aiProcessing, setAiProcessing] = useState(false);
    const [showPromptPreview, setShowPromptPreview] = useState(false);
    const [promptPreview, setPromptPreview] = useState<{ prompt: string; token_estimate: number } | null>(null);
    const [promptLoading, setPromptLoading] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* ── Multi-select ── */
    const [selectMode, setSelectMode] = useState(false);
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

    function toggleCheck(id: number) {
        setCheckedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function exitSelectMode() {
        setSelectMode(false);
        setCheckedIds(new Set());
    }

    async function batchArchive() {
        if (checkedIds.size === 0) return;
        const action = currentView === 'archived' ? 'unarchive' : 'archive';
        await fetch(`/api/v1/projects/${context?.projectId}/notes/batch-archive`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ note_ids: Array.from(checkedIds), action }),
        });
        exitSelectMode();
        void fetchNotes();
    }

    function handleBulkMove() {
        if (checkedIds.size === 0) return;
        // Use the first checked note ID for the link modal, it'll handle all via batch
        setBulkMoveIds(Array.from(checkedIds));
    }

    const [bulkMoveIds, setBulkMoveIds] = useState<number[] | null>(null);
    const [bulkTagIds, setBulkTagIds] = useState<number[] | null>(null);

    /* ── Locations modal ── */
    const [locationsModalNote, setLocationsModalNote] = useState<Note | null>(null);

    /* ── Command review ── */
    const [showCommandReview, setShowCommandReview] = useState(false);
    const [showSortingHistory, setShowSortingHistory] = useState(false);
    const [commandReviewBatchId, setCommandReviewBatchId] = useState('');

    /* ── Refs & derived ── */
    const pageAuth = (usePage().props as Record<string, unknown>).auth as { user: { id: number } } | null;
    const userId = pageAuth?.user?.id;
    const toast = useToastContext();
    const drawerRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    // Only auto-pick a default selection on the first fetch after the
    // drawer opens. Subsequent refetches (Echo updates, polling, etc.)
    // must not change the user's focus — if the selected note drops out
    // of the list (e.g., gets transferred to an entry mid-session), the
    // UI shows the empty-selection state instead of silently jumping to
    // a different note.
    const hasInitialFetchedRef = useRef(false);

    const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

    /* ══════════════════════════════════════════════
     *  EFFECTS — open/close, Echo, polling, fetch
     * ══════════════════════════════════════════════ */

    // Listen for open events
    const skipAnimationRef = useRef(false);

    useEffect(() => {
        function handleOpen(e: Event) {
            const ctx = (e as CustomEvent<NotesContext>).detail;
            skipAnimationRef.current = ctx.skipAnimation === true;
            setContext(ctx);
            openedFromRef.current = ctx;
            setOpen(true);
            setCurrentView('active');
            setSearch('');
            setSelectedId(ctx.preSelectNoteId ?? null);
            setModalMode(null);
            setModalNote(null);
            // Re-arm the initial-fetch auto-pick so re-opening the drawer
            // (or jumping to a different context) gets a sensible default
            // selection on the next fetch.
            hasInitialFetchedRef.current = false;
        }
        window.addEventListener(OPEN_EVENT, handleOpen);
        return () => window.removeEventListener(OPEN_EVENT, handleOpen);
    }, []);

    // Animate open/close (skip when opening via page transition).
    // useLayoutEffect fires before the browser paints, so GSAP sets the
    // FROM state (y:100% off-screen) before the first visible frame — no
    // flash at the natural position.  This mirrors useFloatingPanel and
    // fixes the "snap" seen when opening from the writing workspace rail
    // (where the body-lock context makes the post-paint delay noticeable).
    useLayoutEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            if (skipAnimationRef.current) {
                if (backdropRef.current) gsap.set(backdropRef.current, { opacity: 1 });
                if (drawerRef.current) gsap.set(drawerRef.current, { y: '0%' });
                skipAnimationRef.current = false;
            } else {
                if (backdropRef.current) gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
                if (drawerRef.current) gsap.fromTo(drawerRef.current, { y: '100%' }, { y: '0%', duration: 0.4, ease: 'power3.out' });
            }
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    // Real-time AI status updates via Echo
    useEffect(() => {
        if (!open || !userId || !window.Echo) return;

        const channel = window.Echo.private(`user.${userId}`);
        channel.listen('.note.ai.status', (data: { note_id: number; status: string; error: string | null; ai_notes: Record<string, unknown> }) => {
            setNotes((prev) => prev.map((n) => n.id === data.note_id ? { ...n, ai_notes: data.ai_notes as Note['ai_notes'] } : n));
            void fetchNotes();

            if (data.status === 'completed') {
                toast.show(t('notes.drawer.toast.ai_completed.title'), {
                    type: 'success',
                    description: t('notes.drawer.toast.ai_completed.desc'),
                });
            } else if (data.status === 'failed') {
                toast.show(t('notes.drawer.toast.ai_failed.title'), {
                    type: 'danger',
                    description: data.error ?? t('notes.drawer.toast.ai_failed.fallback'),
                });
            }
        });

        // Blueprint-context bulk categorize runs the unified workbench
        // batch — surface its completion here too so the drawer resolves
        // without needing the workbench page open.
        channel.listen('.workbench.l2.completed', (data: { notes_processed: number; commands_created: number; error: string | null }) => {
            void fetchNotes();
            if (data.notes_processed > 0) {
                toast.show(t('ai.workbench.creation.run.toast_done_title'), {
                    type: 'success',
                    description: t('ai.workbench.creation.run.toast_done_desc')
                        .replace(':notes', String(data.notes_processed))
                        .replace(':commands', String(data.commands_created)),
                });
            } else {
                toast.show(t('ai.workbench.creation.run.toast_failed_title'), {
                    type: 'danger',
                    description: data.error ?? t('ai.workbench.creation.run.toast_failed_fallback'),
                });
            }
        });

        return () => {
            channel.stopListening('.note.ai.status');
            channel.stopListening('.workbench.l2.completed');
        };
    }, [open, userId]);

    // Polling fallback for when Echo isn't available
    useEffect(() => {
        const hasProcessing = notes.some((n) => (n.ai_notes as Record<string, unknown> | null)?.status === 'processing');
        if (!hasProcessing || !open || !context) {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            return;
        }
        if (!window.Echo) {
            pollRef.current = setInterval(() => void fetchNotes(), 5000);
        }
        return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    }, [notes, open, context]);

    // Fetch notebooks
    useEffect(() => {
        if (!context || !open) return;
        fetch(`/api/v1/projects/${context.projectId}/notebooks`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.ok ? r.json() : [])
            .then(setNotebooks)
            .catch(() => setNotebooks([]));
    }, [context, open]);

    // Fetch notes
    useEffect(() => {
        if (!context || !open) return;
        void fetchNotes();
    }, [context, currentView, search, open, activeNotebookId]);

    /* ══════════════════════════════════════════════
     *  DATA OPERATIONS
     * ══════════════════════════════════════════════ */

    async function fetchNotes() {
        if (!context) return;
        setLoading(true);

        try {
            let data: Note[];

            if (activeNotebookId) {
                const res = await fetch(`/api/v1/projects/${context.projectId}/notebooks/${activeNotebookId}/notes`, {
                    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                });
                data = res.ok ? await res.json() : [];
                if (search) {
                    const s = search.toLowerCase();
                    data = data.filter((n) => n.title.toLowerCase().includes(s) || n.text.toLowerCase().includes(s));
                }
            } else {
                const params = new URLSearchParams({
                    context_type: context.contextType,
                    context_id: String(context.contextId),
                    status: currentView,
                    ...(search ? { search } : {}),
                });
                const res = await fetch(`/api/v1/projects/${context.projectId}/notes?${params}`, {
                    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                });
                data = res.ok ? await res.json() : [];
            }

            setNotes(data);

            // Auto-pick the first note ONLY on the initial fetch after a
            // drawer open. Subsequent refetches (Echo notifications,
            // polling, status updates) must not jump the user's focus —
            // even if the selected note temporarily disappears from the
            // filtered view (e.g., transfer_note moved it under an entry).
            if (!hasInitialFetchedRef.current) {
                hasInitialFetchedRef.current = true;
                if (!selectedId && data.length > 0) setSelectedId(data[0].id);
            }
        } finally {
            setLoading(false);
        }
    }

    /**
     * Re-scope the drawer in place — a full context switch, not a filter:
     * listing, creating, and attaching all follow the new scope via the
     * existing context-keyed fetch effect. Ephemeral by design: closing
     * the drawer forgets the switch (next open scopes to the page).
     */
    function switchContext(target: SwitchTarget) {
        // The pinned Opened-from row renders even when it IS the current
        // context, so picking it must be a no-op — resetting search/view/
        // selection there would look like a random state wipe.
        if (context && target.type === context.contextType && target.id === context.contextId) {
            setShowContextSwitch(false);
            return;
        }

        setContext((prev) => prev === null ? prev : {
            ...prev,
            contextType: target.type,
            contextId: target.id,
            contextLabel: target.label,
            contextSlug: target.slug ?? undefined,
            preSelectNoteId: undefined,
        });
        setSelectedId(null);
        setSearch('');
        setCurrentView('active');
        setActiveNotebookId(null);
        exitSelectMode();
        hasInitialFetchedRef.current = false;
        setShowContextSwitch(false);
    }

    function close() {
        if (backdropRef.current) gsap.to(backdropRef.current, { opacity: 0, duration: 0.2 });
        if (drawerRef.current) gsap.to(drawerRef.current, { y: '100%', duration: 0.3, ease: 'power3.in', onComplete: () => setOpen(false) });
    }

    /* ── Note CRUD ── */

    function startAdding() {
        setModalMode('create');
        setModalNote(null);
    }

    function startEditing() {
        if (!selectedNote) return;
        setModalMode('view');
        setModalNote(selectedNote);
    }

    /**
     * Called when the shared NoteModal finishes saving — refetch the
     * list to surface the create/edit and bump the active notebook's
     * count if relevant.
     */
    async function handleModalSaved() {
        if (!context) return;
        const params = new URLSearchParams({
            context_type: context.contextType,
            context_id: String(context.contextId),
            status: currentView,
            ...(search ? { search } : {}),
        });
        const res = await fetch(`/api/v1/projects/${context.projectId}/notes?${params}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        });
        if (res.ok) {
            const data: Note[] = await res.json();
            setNotes(data);
            if (modalMode === 'create' && activeNotebookId && data.length > notes.length) {
                setNotebooks((prev) => prev.map((nb) => nb.id === activeNotebookId ? { ...nb, notes_count: nb.notes_count + 1 } : nb));
            }
        }
    }

    async function togglePin() {
        if (!context || !selectedNote) return;
        const targetId = selectedNote.id;
        const nextPinned = !selectedNote.is_pinned;
        const ok = await noteActions.togglePin(targetId);
        if (ok) {
            setNotes((prev) => prev.map((n) => n.id === targetId ? { ...n, is_pinned: nextPinned } : n));
        }
    }

    async function generateTitle() {
        if (!context || !selectedNote) return;
        const targetId = selectedNote.id;
        setGeneratingTitle(true);
        try {
            const nextTitle = await noteActions.generateTitle(targetId);
            if (nextTitle !== null) {
                setNotes((prev) => prev.map((n) => n.id === targetId ? { ...n, title: nextTitle } : n));
            }
        } finally {
            setGeneratingTitle(false);
        }
    }

    async function archiveNote() {
        if (!context || !selectedNote) return;
        await fetch(`/api/v1/projects/${context.projectId}/notes/${selectedNote.id}/archive`, {
            method: 'PUT', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
        });
        setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
        setSelectedId(null);
    }

    async function deleteNote(noteId: number) {
        if (!context) return;
        await fetch(`/api/v1/projects/${context.projectId}/notes/${noteId}`, {
            method: 'DELETE', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
        });
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (selectedId === noteId) setSelectedId(null);
        setConfirmAction(null);
    }

    async function restoreNote() {
        if (!context || !selectedNote) return;
        await fetch(`/api/v1/projects/${context.projectId}/notes/${selectedNote.id}/restore`, {
            method: 'POST', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
        });
        setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
        setSelectedId(null);
    }

    async function forceDeleteNote(noteId: number) {
        if (!context) return;
        await fetch(`/api/v1/projects/${context.projectId}/notes/${noteId}/force`, {
            method: 'DELETE', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
        });
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (selectedId === noteId) setSelectedId(null);
        setConfirmAction(null);
    }

    async function emptyTrash() {
        if (!context) return;
        for (const note of notes) {
            await fetch(`/api/v1/projects/${context.projectId}/notes/${note.id}/force`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
        }
        setNotes([]);
        setSelectedId(null);
    }

    /* ── Notebook CRUD ── */

    async function createNotebook() {
        if (!context || !newNotebookTitle.trim()) return;
        const res = await fetch(`/api/v1/projects/${context.projectId}/notebooks`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
            body: JSON.stringify({
                title: newNotebookTitle.trim(),
                description: newNotebookDesc.trim() || null,
                color: newNotebookColor,
                context_type: context.contextType,
                context_id: context.contextId,
            }),
        });
        if (res.ok) {
            const nb = await res.json();
            setNotebooks((prev) => [...prev, nb]);
            setActiveNotebookId(nb.id);
            setShowNewNotebook(false);
            setNewNotebookTitle('');
            setNewNotebookDesc('');
            setNewNotebookColor('#6366f1');
        }
    }

    async function addNoteToNotebook(noteId: number, notebookId: number) {
        if (!context) return;
        await fetch(`/api/v1/projects/${context.projectId}/notebooks/${notebookId}/notes`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
            body: JSON.stringify({ note_id: noteId }),
        });
    }

    /* ── Tags ── */

    async function openTagModal(noteId: number) {
        if (!context) return;
        setTagModalNoteId(noteId);
        const res = await fetch(`/api/v1/projects/${context.projectId}/notes/${noteId}/tags`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
        });
        if (res.ok) setNoteTags(await res.json());
    }

    /* ── History ── */

    async function openHistory(noteId: number) {
        if (!context) return;
        setHistoryNoteId(noteId);
        setHistoryLoading(true);
        setHistoryRecords([]);
        try {
            setHistoryRecords(await noteActions.fetchHistory(noteId));
        } finally {
            setHistoryLoading(false);
        }
    }

    /* ── AI actions ── */

    async function fetchPromptPreview() {
        if (!context || !selectedNote) return;
        setPromptLoading(true);
        setShowPromptPreview(true);
        try {
            const res = await fetch(`/api/v1/projects/${context.projectId}/notes/${selectedNote.id}/prompt-preview?context_type=${context.contextType}&context_id=${context.contextId}&with_relationships=${categorizeWithRelationships ? '1' : '0'}`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (res.ok) {
                setPromptPreview(await res.json());
            }
        } finally {
            setPromptLoading(false);
        }
    }

    async function handleCategorize(mode: 'send' | 'sort') {
        if (!context) return;
        setAiProcessing(true);
        setShowCategorizeModal(false);

        const contextType = mode === 'send' ? 'project' : 'blueprint';
        const contextId = mode === 'send' ? context.projectId : context.contextId;

        const noteIds = checkedIds.size > 0
            ? Array.from(checkedIds)
            : selectedNote ? [selectedNote.id] : [];

        if (noteIds.length === 0) {
            setAiProcessing(false);
            return;
        }

        try {
            if (mode === 'sort') {
                // Blueprint-level (level-2) — single or multi — goes through
                // the unified workbench pipeline: one shared batch, the tuned
                // prompt, review-before-execute. auto/relationships flags are
                // moot on this path (relationship context is always built).
                await fetch(`/api/v1/projects/${context.projectId}/notes/batch-categorize`, {
                    method: 'POST',
                    headers: csrfHeaders(),
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        note_ids: noteIds,
                        context_type: contextType,
                        context_id: contextId,
                    }),
                });
            } else if (noteIds.length > 1) {
                await fetch(`/api/v1/projects/${context.projectId}/notes/batch-categorize`, {
                    method: 'POST',
                    headers: csrfHeaders(),
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        note_ids: noteIds,
                        context_type: contextType,
                        context_id: contextId,
                        auto_process: categorizeAutoProcess,
                        with_relationships: categorizeWithRelationships,
                    }),
                });
            } else {
                await fetch(`/api/v1/projects/${context.projectId}/notes/${noteIds[0]}/categorize`, {
                    method: 'POST',
                    headers: csrfHeaders(),
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        context_type: contextType,
                        context_id: contextId,
                        auto_process: categorizeAutoProcess,
                        with_relationships: categorizeWithRelationships,
                    }),
                });
            }

            setNotes((prev) => prev.map((n) =>
                noteIds.includes(n.id) ? { ...n, ai_notes: { ...n.ai_notes, status: 'processing' } } : n
            ));

            const count = noteIds.length;
            const label = mode === 'send'
                ? t('notes.drawer.toast.routing.label')
                : t('notes.drawer.toast.commands.label');
            const autoLabel = categorizeAutoProcess ? t('notes.drawer.toast.auto.suffix') : '';
            toast.show(`${label}${autoLabel}`, {
                type: 'info',
                description: t('notes.drawer.toast.processing.desc').replace(':count', String(count)),
            });

            if (checkedIds.size > 0) exitSelectMode();
        } finally {
            setAiProcessing(false);
        }
    }

    /* ── AI routing/review handlers ── */

    function approveRouting(selectedSlugs: string[]) {
        if (!context || !selectedNote || selectedSlugs.length === 0) return;
        void fetch(`/api/v1/projects/${context.projectId}/notes/${selectedNote.id}/approve-routing`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ blueprint_slugs: selectedSlugs }),
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                toast.show(
                    t('notes.drawer.toast.routed.label').replace(':count', String(data.blueprint_count)),
                    {
                        type: 'success',
                        description: selectedSlugs.map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase())).join(', '),
                    },
                );
                setSelectedId(null);
                void fetchNotes();
            }
        });
    }

    function rejectRouting() {
        if (!context || !selectedNote) return;
        void fetch(`/api/v1/projects/${context.projectId}/notes/${selectedNote.id}/reject-routing`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
        }).then(() => fetchNotes());
    }

    function reviewCommands() {
        if (!selectedNote) return;
        const batchId = (selectedNote.ai_notes as Record<string, unknown> | null)?.batch_id;
        if (typeof batchId === 'string') {
            setCommandReviewBatchId(batchId);
            setShowCommandReview(true);
        }
    }

    async function triggerEntryIntegration() {
        if (!context || !selectedNote || context.contextType !== 'entry') return;
        setAiProcessing(true);
        try {
            const res = await fetch(`/api/v1/projects/${context.projectId}/notes/${selectedNote.id}/integrate`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ entry_id: context.contextId, instructions: integrationInstructions || null }),
            });
            if (res.ok) {
                const data = await res.json();
                setShowEntryIntegration(false);
                setIntegrationInstructions('');
                if (data.review_url) {
                    window.location.href = data.review_url;
                }
            }
        } finally {
            setAiProcessing(false);
        }
    }

    /* ══════════════════════════════════════════════
     *  RENDER
     * ══════════════════════════════════════════════ */

    if (!open) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                ref={backdropRef}
                className="fixed inset-0 z-40"
                style={{ background: 'color-mix(in srgb, #000 50%, transparent)' }}
                onClick={close}
            />

            {/* Drawer — on mobile we hard-pin to the 'full' preset
                regardless of the persisted partial/tall/full choice
                (the height toggle is hidden below sm: anyway, and the
                shorter presets leave too little room for the notes list
                + filters at phone widths). */}
            <div
                ref={drawerRef}
                data-notes-drawer
                className={`fixed inset-x-0 bottom-0 z-50 flex flex-col transition-[height] duration-300 ease-out ${isMobileDrawer ? 'h-[calc(100vh-var(--navbar-height,3.5rem))]' : drawerHeightClass}`}
                style={drawerBgStyle}
            >

                {/* Header — mobile drops the "Notes for:" prefix and
                    shrinks the title + chrome so the 4 actions fit
                    alongside on a 375px viewport. */}
                <div className={`flex flex-shrink-0 items-center justify-between ${isMobileDrawer ? 'gap-2 px-3 py-2' : 'px-4 py-3'}`} style={headerStyle}>
                    <h3 className={`min-w-0 truncate font-bold ${isMobileDrawer ? 'text-base' : 'text-xl'}`}>
                        {context && (
                            <button
                                type="button"
                                data-drawer-context-switch
                                onClick={() => setShowContextSwitch(true)}
                                className="inline-flex max-w-full items-center gap-1.5 truncate align-middle"
                                aria-label={t('notes.switch.open_aria')}
                            >
                                {!isMobileDrawer && <span>{t('notes.drawer.title.prefix')}</span>}
                                <span className="truncate" style={{ color: 'var(--theme-brand-primary-500)' }}>{context.contextLabel}</span>
                                <i className="fa-solid fa-chevron-down text-[10px]" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }} aria-hidden="true" />
                            </button>
                        )}
                    </h3>
                    <div className={`flex items-center ${isMobileDrawer ? 'gap-1' : 'gap-2'}`}>
                        {/* Layout mode toggle */}
                        <div className="hidden items-center sm:flex" style={segmentedGroupStyle}>
                            {MODE_OPTIONS.map(({ key, icon, labelKey }) => (
                                <Tooltip key={key} content={t(labelKey)} placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setDrawerMode(key)}
                                        className="alex-btn inline-flex items-center justify-center"
                                        style={{
                                            ...segmentedItemStyle(drawerMode === key),
                                            width: '1.75rem',
                                            height: '1.75rem',
                                            padding: 0,
                                        }}
                                        aria-label={t(labelKey)}
                                        aria-pressed={drawerMode === key}
                                    >
                                        <i className={`${icon} text-[10px]`} aria-hidden="true" />
                                    </button>
                                </Tooltip>
                            ))}
                        </div>

                        {/* Height toggle */}
                        <div className="hidden items-center sm:flex" style={segmentedGroupStyle}>
                            {HEIGHT_OPTIONS.map(({ key, icon, labelKey }) => (
                                <Tooltip key={key} content={t(labelKey)} placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setDrawerHeight(key)}
                                        className="alex-btn inline-flex items-center justify-center"
                                        style={{
                                            ...segmentedItemStyle(drawerHeight === key),
                                            width: '1.75rem',
                                            height: '1.75rem',
                                            padding: 0,
                                        }}
                                        aria-label={t(labelKey)}
                                        aria-pressed={drawerHeight === key}
                                    >
                                        <i className={`${icon} text-[10px]`} aria-hidden="true" />
                                    </button>
                                </Tooltip>
                            ))}
                        </div>

                        <Tooltip content={t('notes.drawer.action.sorting_history')} placement="bottom">
                            <button
                                type="button"
                                onClick={() => setShowSortingHistory(true)}
                                className="alex-btn alex-btn--ghost inline-flex items-center"
                                style={btnSm}
                                aria-label={t('notes.drawer.action.sorting_history')}
                            >
                                <i className="fa-solid fa-clock-rotate-left text-xs" aria-hidden="true" />
                                <span className="hidden sm:inline">{t('notes.drawer.action.sorting_history')}</span>
                            </button>
                        </Tooltip>
                        <Tooltip content={t('notes.drawer.action.dashboard_aria')} placement="bottom">
                            <a
                                href={`/notes/${context?.projectSlug ?? ''}`}
                                className="alex-btn alex-btn--ghost inline-flex items-center"
                                style={btnSm}
                                aria-label={t('notes.drawer.action.dashboard_aria')}
                                onClick={close}
                            >
                                <i className="fa-solid fa-arrow-up-right-from-square text-xs" aria-hidden="true" />
                                <span className="hidden sm:inline">{t('notes.drawer.action.dashboard')}</span>
                            </a>
                        </Tooltip>
                        {isMobileDrawer ? (
                            <button
                                type="button"
                                onClick={close}
                                className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                                style={{ ...btnSm, padding: '0.375rem 0.5rem' }}
                                aria-label={t('notes.drawer.action.close')}
                            >
                                <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
                            </button>
                        ) : (
                            <button type="button" onClick={close} style={closeBtnStyle}>
                                {t('notes.drawer.action.close')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Two-panel content. Mobile reduces the surrounding
                    padding + sets a smaller base font-size on the
                    wrapper so descendants without an explicit size
                    inherit the tighter scale. */}
                {effectiveDrawerMode === 'list' && context ? (
                    <div className={`min-h-0 flex-grow overflow-y-auto ${isMobileDrawer ? 'px-3 py-3 text-[13px]' : 'px-4 py-4'}`}>
                        <NotesView
                            projectId={context.projectId}
                            initialStatusFilter="active"
                            initialQuickFilter={null}
                            contextType={context.contextType}
                            contextId={context.contextId}
                        />
                    </div>
                ) : (
                <div className="grid min-h-0 flex-grow grid-cols-1 gap-4 p-6 md:grid-cols-12">

                    {/* ── Left pane: note list ── */}
                    <div
                        className={`flex min-h-0 flex-col ${effectiveDrawerMode === 'split' ? 'pr-2 md:col-span-4' : 'md:col-span-12'}`}
                        style={effectiveDrawerMode === 'split' ? { borderRight: '1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)' } : undefined}
                    >
                        {/* View header + notebook selector */}
                        <h4 className="mb-4 flex items-center justify-between pl-2 text-lg font-bold">
                            <div className="flex items-center gap-2">
                                {activeNotebookId ? (
                                    <>
                                        {(() => {
                                            const nb = notebooks.find((n) => n.id === activeNotebookId);
                                            return nb ? (
                                                <span className="flex items-center gap-2">
                                                    {nb.color && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: nb.color }} />}
                                                    {nb.title}
                                                </span>
                                            ) : t('notes.drawer.view.notebook_fallback');
                                        })()}
                                    </>
                                ) : (
                                    <span>
                                        {currentView === 'archived'
                                            ? t('notes.drawer.view.archived')
                                            : currentView === 'trashed'
                                                ? t('notes.drawer.view.trashed')
                                                : t('notes.drawer.view.active')}
                                    </span>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setNotebookSelectorOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
                                    style={notebookSwitchStyle}
                                >
                                    <i className="fa-solid fa-book text-[10px]" aria-hidden="true" />
                                    {activeNotebookId
                                        ? t('notes.drawer.notebook.button.switch')
                                        : t('notes.drawer.notebook.button.browse')}
                                    {notebooks.length > 0 && (
                                        <span className="text-[9px] opacity-50">{notebooks.length}</span>
                                    )}
                                </button>
                            </div>

                            {!activeNotebookId && (
                                <div className="flex gap-0.5">
                                    {([
                                        { key: 'active' as const, icon: 'fa-folder-open', tooltipKey: 'notes.drawer.view_toggle.active_aria' },
                                        { key: 'archived' as const, icon: 'fa-archive', tooltipKey: 'notes.drawer.view_toggle.archived_aria' },
                                        { key: 'trashed' as const, icon: 'fa-trash', tooltipKey: 'notes.drawer.view_toggle.trashed_aria' },
                                    ]).map(({ key, icon, tooltipKey }) => (
                                        <Tooltip key={key} content={t(tooltipKey)} placement="bottom">
                                            <button
                                                type="button"
                                                onClick={() => { setCurrentView(key); setSelectedId(null); }}
                                                className="alex-notes-modal-icon-btn"
                                                style={currentView === key ? { color: 'var(--theme-brand-primary-500)', background: 'color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent)' } : undefined}
                                                aria-label={t(tooltipKey)}
                                            >
                                                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                            </button>
                                        </Tooltip>
                                    ))}
                                </div>
                            )}
                        </h4>

                        {/* Search + action buttons */}
                        <div className="mb-6 mr-2 flex flex-shrink-0 items-center gap-2">
                            <div className="relative flex-1">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <i className="fa-solid fa-magnifying-glass" style={fadedText} aria-hidden="true" />
                                </span>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('notes.drawer.search_placeholder').replace(':count', String(notes.length))}
                                    className="w-full"
                                    style={searchInputStyle}
                                />
                            </div>
                            <Tooltip content={t('notes.drawer.tooltip.import')} placement="bottom">
                                <button
                                    type="button"
                                    onClick={() => setImportModalOpen(true)}
                                    style={circleBtn('import')}
                                    aria-label={t('notes.drawer.tooltip.import')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5 fill-current" aria-hidden="true">
                                        <path d="M192 96L320 96L320 192C320 227.3 348.7 256 384 256L480 256L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 464L128 464L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 250.5C512 233.5 505.3 217.2 493.3 205.2L370.7 82.7C358.7 70.7 342.5 64 325.5 64L192 64C156.7 64 128 92.7 128 128L128 336L160 336L160 128C160 110.3 174.3 96 192 96zM352 109.3L466.7 224L384 224C366.3 224 352 209.7 352 192L352 109.3zM64 400C64 408.8 71.2 416 80 416L329.4 416L284.7 460.7C278.5 466.9 278.5 477.1 284.7 483.3C290.9 489.5 301.1 489.5 307.3 483.3L379.3 411.3C385.5 405.1 385.5 394.9 379.3 388.7L307.3 316.7C301.1 310.5 290.9 310.5 284.7 316.7C278.5 322.9 278.5 333.1 284.7 339.3L329.4 384L80 384C71.2 384 64 391.2 64 400z" />
                                    </svg>
                                </button>
                            </Tooltip>
                            <Tooltip content={t('notes.drawer.tooltip.add')} placement="bottom">
                                <button
                                    type="button"
                                    onClick={startAdding}
                                    style={circleBtn('add')}
                                    aria-label={t('notes.drawer.tooltip.add')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5 fill-current" aria-hidden="true">
                                        <path d="M160 512L352 512L352 416C352 380.7 380.7 352 416 352L512 352L512 160C512 142.3 497.7 128 480 128L160 128C142.3 128 128 142.3 128 160L128 480C128 497.7 142.3 512 160 512zM384 498.7L498.7 384L416 384C398.3 384 384 398.3 384 416L384 498.7zM160 544C124.7 544 96 515.3 96 480L96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 357.5C544 374.5 537.3 390.8 525.3 402.8L402.7 525.3C390.7 537.3 374.4 544 357.4 544L160 544zM184 432C184 418.7 194.7 408 208 408C221.3 408 232 418.7 232 432C232 445.3 221.3 456 208 456C194.7 456 184 445.3 184 432zM208 232C194.7 232 184 221.3 184 208C184 194.7 194.7 184 208 184C221.3 184 232 194.7 232 208C232 221.3 221.3 232 208 232zM184 320C184 306.7 194.7 296 208 296C221.3 296 232 306.7 232 320C232 333.3 221.3 344 208 344C194.7 344 184 333.3 184 320z" />
                                    </svg>
                                </button>
                            </Tooltip>
                            <Tooltip content={selectMode ? t('notes.drawer.tooltip.exit_select') : t('notes.drawer.tooltip.select')} placement="bottom">
                                <button
                                    type="button"
                                    onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                                    style={circleBtn(selectMode ? 'select-on' : 'select-off')}
                                    aria-label={selectMode ? t('notes.drawer.tooltip.exit_select') : t('notes.drawer.tooltip.select')}
                                >
                                    <i className={`fa-solid ${selectMode ? 'fa-xmark' : 'fa-check-double'}`} aria-hidden="true" />
                                </button>
                            </Tooltip>
                            {/* Select all / clear — operates on the currently
                                visible (filtered/searched) list. */}
                            {selectMode && notes.length > 0 && (
                                <Tooltip
                                    content={checkedIds.size === notes.length
                                        ? t('notes.drawer.tooltip.select_none')
                                        : t('notes.drawer.tooltip.select_all').replace(':count', String(notes.length))}
                                    placement="bottom"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setCheckedIds(
                                            checkedIds.size === notes.length
                                                ? new Set()
                                                : new Set(notes.map((n) => n.id)),
                                        )}
                                        style={circleBtn('select-off')}
                                        aria-label={checkedIds.size === notes.length
                                            ? t('notes.drawer.tooltip.select_none')
                                            : t('notes.drawer.tooltip.select_all').replace(':count', String(notes.length))}
                                    >
                                        <i className="fa-solid fa-list-check" aria-hidden="true" />
                                    </button>
                                </Tooltip>
                            )}
                        </div>

                        {/* Empty trash button */}
                        {currentView === 'trashed' && notes.length > 0 && (
                            <div className="mb-3 mr-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction({ type: 'force-delete', noteId: -1 })}
                                    style={emptyTrashBtnStyle}
                                >
                                    <i className="fa-solid fa-dumpster-fire" aria-hidden="true" />{' '}
                                    {t('notes.drawer.empty_trash')}
                                </button>
                            </div>
                        )}

                        {/* Bulk action toolbar */}
                        {selectMode && checkedIds.size > 0 && (
                            <BulkActionsToolbar
                                count={checkedIds.size}
                                isArchived={currentView === 'archived'}
                                onCategorize={() => setShowCategorizeModal(true)}
                                onAddTag={() => {
                                    const ids = Array.from(checkedIds);
                                    setBulkTagIds(ids);
                                    setTagModalNoteId(ids[0] ?? null);
                                    setNoteTags([]);
                                }}
                                onAddToNotebook={() => {
                                    const firstId = Array.from(checkedIds)[0];
                                    if (firstId) setNotebookPickerNoteId(firstId);
                                }}
                                onLink={() => {
                                    setBulkMoveIds(Array.from(checkedIds));
                                    setLinkAction({ noteId: 0, action: 'link' });
                                }}
                                onMove={handleBulkMove}
                                onCopy={() => {
                                    const ids = Array.from(checkedIds);
                                    void (async () => {
                                        for (const id of ids) {
                                            await fetch(`/api/v1/projects/${context?.projectId}/notes/${id}/link`, {
                                                method: 'POST', headers: csrfHeaders(), credentials: 'same-origin',
                                                body: JSON.stringify({ action: 'copy', target_type: context?.contextType, target_id: context?.contextId }),
                                            });
                                        }
                                        exitSelectMode();
                                        void fetchNotes();
                                    })();
                                }}
                                onArchive={() => void batchArchive()}
                                onTrash={async () => {
                                    for (const id of checkedIds) {
                                        await fetch(`/api/v1/projects/${context?.projectId}/notes/${id}`, {
                                            method: 'DELETE', headers: csrfHeaders(), credentials: 'same-origin',
                                        });
                                    }
                                    exitSelectMode();
                                    void fetchNotes();
                                }}
                                t={t}
                            />
                        )}

                        <div className="flex-grow overflow-y-auto">
                            <div className="mr-2 space-y-2">
                                {loading && notes.length === 0 ? (
                                    <div className="p-4 text-center">
                                        <i className="fa-solid fa-circle-notch fa-spin text-base" style={microText} aria-hidden="true" />
                                    </div>
                                ) : notes.length === 0 ? (
                                    <p className="p-4 text-center text-sm" style={fadedText}>
                                        {t('notes.drawer.list.empty')}
                                    </p>
                                ) : (
                                    notes.map((note) => {
                                        const checked = selectMode && checkedIds.has(note.id);
                                        const selected = note.id === selectedId && !selectMode;
                                        const rowState: 'selected' | 'checked' | 'idle' = checked ? 'checked' : selected ? 'selected' : 'idle';
                                        const ai = note.ai_notes as Record<string, unknown> | null;
                                        return (
                                            <div
                                                key={note.id}
                                                onClick={() => {
                                                    if (selectMode) { toggleCheck(note.id); }
                                                    else if (effectiveDrawerMode === 'list') { setModalMode('view'); setModalNote(note); }
                                                    else { setSelectedId(note.id); }
                                                }}
                                                style={noteRowStyle(rowState)}
                                            >
                                                <p className="flex items-center gap-1 truncate font-semibold">
                                                    {selectMode && (
                                                        <input
                                                            type="checkbox"
                                                            className="alex-checkbox mr-1"
                                                            checked={checked}
                                                            onChange={() => toggleCheck(note.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                    {note.is_pinned && <i className="fa-solid fa-thumbtack text-[9px]" style={{ color: 'var(--theme-brand-primary-500)' }} aria-hidden="true" />}
                                                    {ai?.status === 'processing' && (
                                                        <i className="fa-solid fa-circle-notch fa-spin text-xs" style={{ color: 'var(--theme-brand-secondary-500)' }} aria-hidden="true" />
                                                    )}
                                                    {(() => {
                                                        if (!ai || ai.status === 'processing') return null;
                                                        // Mixed toward base-content so the indicator gains
                                                        // contrast in BOTH directions: brighter on dark
                                                        // presets, deeper on light (owner: "the yellow dot
                                                        // is tough to read").
                                                        const aiDotColor = 'color-mix(in srgb, var(--theme-status-warning-stroke) 55%, var(--theme-base-content))';
                                                        if (typeof ai.routing_count === 'number' && ai.routing_count > 0 && !ai.batch_id) {
                                                            return (
                                                                <i
                                                                    className="fa-solid fa-circle-exclamation text-[11px]"
                                                                    style={{ color: aiDotColor }}
                                                                    title={t('notes.drawer.list.routing_pending_aria')}
                                                                    aria-label={t('notes.drawer.list.routing_pending_aria')}
                                                                />
                                                            );
                                                        }
                                                        if (ai.batch_id) {
                                                            return (
                                                                <i
                                                                    className="fa-solid fa-clipboard-list text-[11px]"
                                                                    style={{ color: aiDotColor }}
                                                                    title={t('notes.drawer.list.commands_ready_aria')}
                                                                    aria-label={t('notes.drawer.list.commands_ready_aria')}
                                                                />
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    <span className="truncate">
                                                        {note.title || <span className="italic" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' }}>{t('notes.drawer.list.untitled')}</span>}
                                                    </span>
                                                </p>
                                                <div className="flex items-center justify-between text-xs" style={bodyText}>
                                                    <span>
                                                        {t('notes.drawer.list.byline').replace(':name', note.creator?.name ?? t('notes.drawer.list.creator_fallback'))}
                                                    </span>
                                                    <span>
                                                        {currentView === 'trashed' && note.deleted_at
                                                            ? t('notes.drawer.list.trashed_label').replace(':date', new Date(note.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
                                                            : note.note_date
                                                                ? new Date(note.note_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                : ''
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Right pane: detail view ── */}
                    {effectiveDrawerMode === 'split' && (
                    <div className="mt-4 flex min-h-0 flex-col md:col-span-8 md:mt-0">
                        {currentView === 'trashed' && selectedNote ? (
                            <div className="flex h-full flex-col">
                                <div className="flex flex-shrink-0 items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-bold" style={{ color: 'color-mix(in srgb, var(--theme-status-error-stroke) 80%, transparent)' }}>
                                            {selectedNote.title}
                                        </h4>
                                        {selectedNote.deleted_at && (
                                            <p className="text-sm" style={bodyText}>
                                                {t('notes.drawer.detail.trashed_on').replace(
                                                    ':date',
                                                    new Date(selectedNote.deleted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void restoreNote()}
                                            className="alex-btn inline-flex items-center"
                                            style={{ ...btnSmPill, ...btnSuccessFill }}
                                        >
                                            <i className="fa-solid fa-trash-arrow-up" aria-hidden="true" />
                                            {t('notes.drawer.detail.action.restore')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmAction({ type: 'force-delete', noteId: selectedNote.id })}
                                            className="alex-btn inline-flex items-center"
                                            style={{ ...btnSmPill, ...btnDangerFill }}
                                        >
                                            <i className="fa-solid fa-skull-crossbones" aria-hidden="true" />
                                            {t('notes.drawer.detail.action.delete_forever')}
                                        </button>
                                    </div>
                                </div>
                                <div style={dividerStyle} />
                                <div
                                    className="prose prose-sm max-w-none flex-grow overflow-y-auto px-4 py-3"
                                    style={trashedDetailStyle}
                                >
                                    <p className="italic">{t('notes.drawer.detail.trashed_blurb')}</p>
                                    <div style={dividerStyle} />
                                    <div className="whitespace-pre-wrap">{selectedNote.text}</div>
                                </div>
                            </div>
                        ) : selectedNote ? (
                            <div className="flex h-full flex-col">
                                <div className="flex flex-shrink-0 items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-lg font-bold">{selectedNote.title}</h4>
                                            <Tooltip content={t('notes.drawer.detail.tooltip.generate_title')} placement="bottom">
                                                <button
                                                    type="button"
                                                    onClick={() => void generateTitle()}
                                                    disabled={generatingTitle || !selectedNote.text?.trim()}
                                                    className="alex-btn alex-btn--ghost inline-flex items-center"
                                                    style={{ ...btnXs, color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}
                                                    aria-label={t('notes.drawer.detail.tooltip.generate_title')}
                                                >
                                                    {generatingTitle
                                                        ? <i className="fa-solid fa-circle-notch fa-spin text-[10px]" aria-hidden="true" />
                                                        : <i className="fa-solid fa-wand-magic-sparkles text-[10px]" aria-hidden="true" />}
                                                </button>
                                            </Tooltip>
                                        </div>
                                        <p className="text-sm" style={bodyText}>
                                            {t('notes.drawer.detail.byline_prefix')}
                                            {selectedNote.creator?.name ?? t('notes.drawer.list.creator_fallback')}
                                            {t('notes.drawer.detail.byline_separator')}
                                            {selectedNote.note_date ? new Date(selectedNote.note_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Tooltip content={selectedNote.is_pinned ? t('notes.drawer.detail.tooltip.unpin') : t('notes.drawer.detail.tooltip.pin')} placement="bottom">
                                            <button
                                                type="button"
                                                onClick={() => void togglePin()}
                                                className="alex-notes-modal-icon-btn"
                                                style={selectedNote.is_pinned ? { color: 'var(--theme-brand-primary-500)' } : undefined}
                                                aria-label={selectedNote.is_pinned ? t('notes.drawer.detail.tooltip.unpin') : t('notes.drawer.detail.tooltip.pin')}
                                            >
                                                <i className="fa-solid fa-thumbtack" aria-hidden="true" />
                                            </button>
                                        </Tooltip>
                                        <button
                                            type="button"
                                            onClick={startEditing}
                                            className="alex-btn inline-flex items-center"
                                            style={{ ...btnSmPill, ...btnNeutralFill }}
                                        >
                                            <i className="fa-solid fa-pencil" aria-hidden="true" />
                                            {t('notes.drawer.detail.action.edit')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void openHistory(selectedNote.id)}
                                            className="alex-btn inline-flex items-center"
                                            style={{ ...btnSmPill, ...btnSecondaryFill }}
                                        >
                                            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
                                            {t('notes.drawer.detail.action.history')}
                                        </button>
                                        <NoteActionsMenu
                                            onAddTag={() => void openTagModal(selectedNote.id)}
                                            onAddToNotebook={() => setNotebookPickerNoteId(selectedNote.id)}
                                            onLink={() => setLinkAction({ noteId: selectedNote.id, action: 'link' })}
                                            onMove={() => setLinkAction({ noteId: selectedNote.id, action: 'move' })}
                                            onCopy={() => setLinkAction({ noteId: selectedNote.id, action: 'copy' })}
                                            onArchive={() => void archiveNote()}
                                            onTrash={() => setConfirmAction({ type: 'trash', noteId: selectedNote.id })}
                                            isArchived={selectedNote.status === 'archived'}
                                            t={t}
                                        />
                                    </div>
                                </div>
                                <div style={dividerStyle} />
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    {selectedNote.tags?.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1.5 text-xs font-medium"
                                            style={tagPillStyle}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => void openTagModal(selectedNote.id)}
                                        style={tagAddBtnStyle}
                                        title={t('notes.drawer.detail.action.add_tag')}
                                        aria-label={t('notes.drawer.detail.action.add_tag')}
                                    >
                                        <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto px-5 py-4" style={detailBodyStyle}>
                                    <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)' }}>
                                        {selectedNote.text}
                                    </div>
                                </div>

                                {/* Link previews */}
                                {selectedNote.links && selectedNote.links.filter((l) => l.status === 'fetched').length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {selectedNote.links.filter((l) => l.status === 'fetched').map((link) => (
                                            <a
                                                key={link.id}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs"
                                                style={linkPreviewRowStyle}
                                            >
                                                {link.favicon_url && (
                                                    <img
                                                        src={link.favicon_url}
                                                        alt=""
                                                        className="h-3.5 w-3.5 flex-shrink-0"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                )}
                                                <span className="min-w-0 flex-1 truncate" style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 70%, transparent)' }}>
                                                    {link.title ?? link.url}
                                                </span>
                                                <i className="fa-solid fa-arrow-up-right-from-square flex-shrink-0 text-[8px]" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' }} aria-hidden="true" />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* AI Status Footer */}
                                <div className="mt-3">
                                    <AiStatusFooter
                                        note={selectedNote}
                                        projectId={context!.projectId}
                                        contextType={context!.contextType}
                                        contextId={context!.contextId}
                                        onCategorize={() => setShowCategorizeModal(true)}
                                        onApproveRouting={approveRouting}
                                        onRejectRouting={rejectRouting}
                                        onReviewCommands={reviewCommands}
                                        onRetry={() => setShowCategorizeModal(true)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-1 items-center justify-center">
                                <div className="text-center">
                                    <i className="fa-solid fa-sticky-note mb-3 text-3xl" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }} aria-hidden="true" />
                                    <p className="text-sm" style={microText}>
                                        {t('notes.drawer.detail.empty')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    )}
                </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════
             *  MODALS
             * ══════════════════════════════════════════════ */}

            <HistoryModal
                open={!!historyNoteId}
                onClose={() => setHistoryNoteId(null)}
                historyRecords={historyRecords}
                historyLoading={historyLoading}
                projectId={context?.projectId ?? 0}
                noteId={historyNoteId}
            />

            <TagPickerModal
                open={!!tagModalNoteId}
                onClose={() => { setTagModalNoteId(null); setBulkTagIds(null); void fetchNotes(); }}
                projectId={context?.projectId ?? 0}
                noteTags={noteTags}
                onToggle={async (tag, selected) => {
                    if (!context) return;
                    const noteIds = bulkTagIds ?? (tagModalNoteId ? [tagModalNoteId] : []);
                    if (selected) {
                        for (const id of noteIds) {
                            await fetch(`/api/v1/projects/${context.projectId}/notes/${id}/tags/${encodeURIComponent(tag)}`, {
                                method: 'DELETE', headers: csrfHeaders(), credentials: 'same-origin',
                            });
                        }
                    } else {
                        for (const id of noteIds) {
                            await fetch(`/api/v1/projects/${context.projectId}/notes/${id}/tags`, {
                                method: 'POST', headers: csrfHeaders(), credentials: 'same-origin',
                                body: JSON.stringify({ tag }),
                            });
                        }
                    }
                    if (tagModalNoteId) {
                        const res = await fetch(`/api/v1/projects/${context.projectId}/notes/${tagModalNoteId}/tags`, {
                            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
                        });
                        if (res.ok) setNoteTags(await res.json());
                    }
                }}
                onCreate={async (tag) => {
                    if (!context) return;
                    const noteIds = bulkTagIds ?? (tagModalNoteId ? [tagModalNoteId] : []);
                    for (const id of noteIds) {
                        await fetch(`/api/v1/projects/${context.projectId}/notes/${id}/tags`, {
                            method: 'POST', headers: csrfHeaders(), credentials: 'same-origin',
                            body: JSON.stringify({ tag }),
                        });
                    }
                    if (tagModalNoteId) {
                        const res = await fetch(`/api/v1/projects/${context.projectId}/notes/${tagModalNoteId}/tags`, {
                            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
                        });
                        if (res.ok) setNoteTags(await res.json());
                    }
                }}
            />

            <NotebookSelectorModal
                open={notebookSelectorOpen}
                onClose={() => setNotebookSelectorOpen(false)}
                notebooks={notebooks}
                activeNotebookId={activeNotebookId}
                onSelectNotebook={(id) => { setActiveNotebookId(id); setSelectedId(null); }}
                onNewNotebook={() => setShowNewNotebook(true)}
                onLinkNotebook={(id) => setNotebookLinkAction({ notebookId: id, action: 'link' })}
                onMoveNotebook={(id) => setNotebookLinkAction({ notebookId: id, action: 'move' })}
            />

            {notebookLinkAction && (
                <LinkMoveModal
                    open
                    onClose={() => setNotebookLinkAction(null)}
                    projectId={context?.projectId ?? 0}
                    noteId={notebookLinkAction.notebookId}
                    action={notebookLinkAction.action}
                    onComplete={() => setNotebookLinkAction(null)}
                    apiOverride={`/api/v1/projects/${context?.projectId ?? 0}/notebooks/${notebookLinkAction.notebookId}/link`}
                />
            )}

            <ImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                projectId={context?.projectId ?? 0}
                contextType={context?.contextType ?? 'project'}
                contextId={context?.contextId ?? 0}
                onComplete={() => { setImportModalOpen(false); void fetchNotes(); }}
            />

            <LinkMoveModal
                open={!!linkAction}
                onClose={() => setLinkAction(null)}
                projectId={context?.projectId ?? 0}
                noteId={linkAction?.noteId ?? 0}
                action={linkAction?.action ?? 'link'}
                onComplete={() => { setLinkAction(null); void fetchNotes(); }}
            />

            {bulkMoveIds && (
                <LinkMoveModal
                    open
                    onClose={() => setBulkMoveIds(null)}
                    projectId={context?.projectId ?? 0}
                    noteId={0}
                    noteIds={bulkMoveIds}
                    action="move"
                    onComplete={() => { setBulkMoveIds(null); exitSelectMode(); void fetchNotes(); }}
                />
            )}

            {context && (
                <ContextSwitchModal
                    open={showContextSwitch}
                    onClose={() => setShowContextSwitch(false)}
                    projectId={context.projectId}
                    current={{ type: context.contextType, id: context.contextId, label: context.contextLabel }}
                    openedFrom={openedFromRef.current
                        ? { type: openedFromRef.current.contextType, id: openedFromRef.current.contextId, label: openedFromRef.current.contextLabel }
                        : { type: context.contextType, id: context.contextId, label: context.contextLabel }}
                    onSwitch={switchContext}
                />
            )}

            <PromptPreviewModal
                open={showPromptPreview}
                onClose={() => setShowPromptPreview(false)}
                promptPreview={promptPreview}
                promptLoading={promptLoading}
            />

            <CommandReviewModal
                open={showCommandReview}
                onClose={() => setShowCommandReview(false)}
                batchId={commandReviewBatchId}
                projectId={context?.projectId ?? 0}
                onExecuted={() => {
                    setShowCommandReview(false);
                    toast.show(t('notes.drawer.toast.executed'), { type: 'success' });
                    void fetchNotes();
                }}
                onStatusChange={() => void fetchNotes()}
            />

            <SortingHistoryModal
                open={showSortingHistory}
                onClose={() => setShowSortingHistory(false)}
                projectId={context?.projectId ?? 0}
                projectSlug={context?.projectSlug ?? ''}
                blueprintId={context?.contextType === 'blueprint' ? context.contextId : undefined}
                blueprintSlug={context?.contextType === 'blueprint' ? context?.contextSlug : undefined}
            />

            <NoteModal
                open={modalMode !== null}
                onClose={() => { setModalMode(null); setModalNote(null); }}
                note={modalNote}
                projectId={context?.projectId ?? 0}
                mode={modalMode ?? 'view'}
                contextType={context?.contextType}
                contextId={context?.contextId}
                onSaved={() => void handleModalSaved()}
            />

            {/* AI Categorize modal */}
            <Modal open={showCategorizeModal} onClose={() => setShowCategorizeModal(false)} maxWidth="max-w-sm">
                <div className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center" style={headerIconWrapStyle('secondary')}>
                            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('notes.drawer.categorize.title')}</h3>
                            {checkedIds.size > 1 ? (
                                <p className="text-xs" style={fadedText}>
                                    {t('notes.drawer.categorize.bulk_count').replace(':count', String(checkedIds.size))}
                                </p>
                            ) : selectedNote ? (
                                <p className="text-xs" style={fadedText}>
                                    "{selectedNote.title || t('notes.drawer.list.untitled')}"
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {context?.contextType !== 'blueprint' && (
                            <button
                                type="button"
                                onClick={() => void handleCategorize('send')}
                                disabled={aiProcessing}
                                className="alex-notes-tag-row flex w-full items-start gap-3 px-4 py-3 text-left"
                                style={categorizeOptionStyle}
                            >
                                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center" style={{ ...headerIconWrapStyle('primary'), borderRadius: 'var(--theme-radius-input)' }}>
                                    <i className="fa-solid fa-share-from-square text-sm" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{t('notes.drawer.categorize.send.title')}</p>
                                    <p className="text-xs" style={labelText}>{t('notes.drawer.categorize.send.desc')}</p>
                                </div>
                            </button>
                        )}

                        {context?.contextType === 'blueprint' && (
                            <button
                                type="button"
                                onClick={() => void handleCategorize('sort')}
                                disabled={aiProcessing}
                                className="alex-notes-tag-row flex w-full items-start gap-3 px-4 py-3 text-left"
                                style={categorizeOptionStyle}
                            >
                                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)', color: 'var(--theme-brand-secondary-500)', borderRadius: 'var(--theme-radius-input)' }}>
                                    <i className="fa-solid fa-layer-group text-sm" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{t('notes.drawer.categorize.sort.title')}</p>
                                    <p className="text-xs" style={labelText}>{t('notes.drawer.categorize.sort.desc')}</p>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Sort mode (blueprint context) runs the unified
                        workbench pipeline: relationships are always built
                        and execution goes through batch review, so the
                        auto/relationships toggles only apply to the
                        project-level (L1) flow. */}
                    {context?.contextType !== 'blueprint' && (
                        <>
                            <label className="mt-4 flex cursor-pointer items-start gap-3 px-2 py-2">
                                <input
                                    type="checkbox"
                                    className="alex-checkbox mt-0.5"
                                    checked={categorizeAutoProcess}
                                    onChange={(e) => setCategorizeAutoProcess(e.target.checked)}
                                />
                                <div>
                                    <p className="text-xs font-medium">{t('notes.drawer.categorize.auto.label')}</p>
                                    <p className="text-xs" style={fadedText}>{t('notes.drawer.categorize.auto.desc')}</p>
                                </div>
                            </label>

                            <label className="flex cursor-pointer items-start gap-3 px-2 py-2">
                                <input
                                    type="checkbox"
                                    className="alex-checkbox mt-0.5"
                                    checked={categorizeWithRelationships}
                                    onChange={(e) => setCategorizeWithRelationships(e.target.checked)}
                                />
                                <div>
                                    <p className="text-xs font-medium">{t('notes.drawer.categorize.with_relationships.label')}</p>
                                    <p className="text-xs" style={fadedText}>{t('notes.drawer.categorize.with_relationships.desc')}</p>
                                </div>
                            </label>
                        </>
                    )}

                    <div className="mt-3 pt-3 text-center" style={sectionBorderTopStyle}>
                        <button
                            type="button"
                            onClick={() => void fetchPromptPreview()}
                            className="inline-flex items-center gap-1.5 text-xs"
                            style={fadedText}
                        >
                            <i className="fa-solid fa-code text-[10px]" aria-hidden="true" />
                            {t('notes.drawer.categorize.preview')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Entry Integration modal */}
            <Modal open={showEntryIntegration} onClose={() => setShowEntryIntegration(false)} maxWidth="max-w-md">
                <div className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center" style={headerIconWrapStyle('primary')}>
                            <i className="fa-solid fa-puzzle-piece" aria-hidden="true" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold">{t('notes.drawer.integration.title')}</h3>
                            <p className="text-xs" style={fadedText}>{t('notes.drawer.integration.subtitle')}</p>
                        </div>
                    </div>

                    {selectedNote && (
                        <div className="mb-4 px-3 py-2" style={{ background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)', borderRadius: 'var(--theme-radius-input)' }}>
                            <p className="text-xs" style={fadedText}>
                                {t('notes.drawer.integration.note_label')}{' '}
                                <span className="font-medium" style={subtleText}>{selectedNote.title}</span>
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium" style={subtleText}>
                            {t('notes.drawer.integration.instructions_label')}
                        </label>
                        <textarea
                            value={integrationInstructions}
                            onChange={(e) => setIntegrationInstructions(e.target.value)}
                            placeholder={t('notes.drawer.integration.instructions_placeholder')}
                            rows={3}
                            className="mt-1 w-full text-sm"
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowEntryIntegration(false)}
                            className="alex-btn alex-btn--ghost"
                            style={btnXs}
                        >
                            {t('notes.drawer.integration.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => void triggerEntryIntegration()}
                            disabled={aiProcessing}
                            className="alex-btn alex-btn--primary"
                            style={btnXs}
                        >
                            {aiProcessing
                                ? <i className="fa-solid fa-circle-notch fa-spin text-xs" aria-hidden="true" />
                                : t('notes.drawer.integration.submit')}
                        </button>
                    </div>

                    <p className="mt-3 text-[10px]" style={microText}>
                        {t('notes.drawer.integration.footer')}
                    </p>
                </div>
            </Modal>

            {/* Locations modal */}
            <Modal open={!!locationsModalNote} onClose={() => setLocationsModalNote(null)} maxWidth="max-w-xs">
                <div className="p-5">
                    <h3 className="text-base font-bold">{t('notes.drawer.locations.title')}</h3>
                    <p className="mt-1 text-xs" style={fadedText}>
                        {t('notes.drawer.locations.subtitle_prefix')}
                        {locationsModalNote?.title || t('notes.drawer.list.untitled')}
                        {t('notes.drawer.locations.subtitle_suffix')}
                    </p>
                    <div className="mt-3" style={cardHiddenOverflow}>
                        {locationsModalNote?.locations?.map((loc, i, arr) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm"
                                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)' }}
                            >
                                <i
                                    className={`text-xs ${
                                        loc.type === 'project' ? 'fa-solid fa-folder' :
                                        loc.type === 'blueprint' ? 'fa-solid fa-cube' :
                                        loc.type === 'notebook' ? 'fa-solid fa-book' :
                                        loc.type === 'work' || loc.type === 'work_section' ? 'fa-solid fa-feather' :
                                        'fa-solid fa-file'
                                    }`}
                                    style={microText}
                                    aria-hidden="true"
                                />
                                <div>
                                    <span className="font-medium">{loc.name}</span>
                                    {/* Translated type label — same key family
                                        NoteModal's location chips use, so the six
                                        location types read identically in both
                                        surfaces (and stay translatable). */}
                                    <span className="ml-2 text-xs" style={microText}>{t(`notes.modal.label.${loc.type}`)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setLocationsModalNote(null)}
                            className="alex-btn alex-btn--ghost"
                            style={btnXs}
                        >
                            {t('notes.drawer.locations.close')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Create Notebook modal */}
            <Modal open={showNewNotebook} onClose={() => setShowNewNotebook(false)} maxWidth="max-w-sm">
                <div className="p-6">
                    <h3 className="text-lg font-bold">{t('notes.drawer.new_notebook.title')}</h3>
                    <p className="mt-1 text-xs" style={fadedText}>{t('notes.drawer.new_notebook.subtitle')}</p>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium" style={subtleText}>
                                {t('notes.drawer.new_notebook.field.title')}
                            </label>
                            <input
                                type="text"
                                value={newNotebookTitle}
                                onChange={(e) => setNewNotebookTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && newNotebookTitle.trim()) void createNotebook(); }}
                                placeholder={t('notes.drawer.new_notebook.field.title_placeholder')}
                                autoFocus
                                className="mt-1 w-full text-sm"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium" style={subtleText}>
                                {t('notes.drawer.new_notebook.field.description')}
                            </label>
                            <textarea
                                value={newNotebookDesc}
                                onChange={(e) => setNewNotebookDesc(e.target.value)}
                                placeholder={t('notes.drawer.new_notebook.field.description_placeholder')}
                                rows={2}
                                className="mt-1 w-full text-sm"
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium" style={subtleText}>
                                {t('notes.drawer.new_notebook.field.color')}
                            </label>
                            <div className="mt-1.5 flex items-center gap-4">
                                <label className="relative cursor-pointer">
                                    <input
                                        type="color"
                                        value={newNotebookColor}
                                        onChange={(e) => setNewNotebookColor(e.target.value)}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                    />
                                    <div
                                        style={{
                                            backgroundColor: newNotebookColor,
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '9999px',
                                            boxShadow: '0 0 0 2px var(--theme-base-100), 0 0 0 4px color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                                        }}
                                    />
                                </label>
                                <div className="grid grid-cols-[repeat(4,28px)] gap-2">
                                    {NOTEBOOK_COLOR_SWATCHES.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewNotebookColor(c)}
                                            className="h-[28px] w-[28px] rounded-full border-2"
                                            style={{
                                                backgroundColor: c,
                                                borderColor: newNotebookColor === c ? 'var(--theme-base-100)' : 'transparent',
                                                boxShadow: newNotebookColor === c ? `0 0 0 2px ${c}` : 'none',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowNewNotebook(false)}
                            className="alex-btn alex-btn--ghost"
                            style={btnXs}
                        >
                            {t('notes.drawer.new_notebook.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => void createNotebook()}
                            disabled={!newNotebookTitle.trim()}
                            className="alex-btn alex-btn--primary"
                            style={btnXs}
                        >
                            {t('notes.drawer.new_notebook.submit')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add to Notebook picker */}
            <Modal open={!!notebookPickerNoteId} onClose={() => setNotebookPickerNoteId(null)} maxWidth="max-w-sm">
                <div className="p-5">
                    <h3 className="text-base font-bold">{t('notes.drawer.notebook_picker.title')}</h3>
                    <p className="mt-1 text-xs" style={fadedText}>{t('notes.drawer.notebook_picker.subtitle')}</p>
                    {notebooks.length === 0 ? (
                        <div className="mt-4 py-6 text-center">
                            <i className="fa-solid fa-book mb-2 text-xl" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }} aria-hidden="true" />
                            <p className="text-xs" style={microText}>{t('notes.drawer.notebook_picker.empty')}</p>
                        </div>
                    ) : (
                        <div className="mt-3 max-h-48 overflow-y-auto" style={cardHiddenOverflow}>
                            {notebooks.map((nb, i, arr) => (
                                <button
                                    key={nb.id}
                                    type="button"
                                    onClick={async () => {
                                        if (notebookPickerNoteId) {
                                            await addNoteToNotebook(notebookPickerNoteId, nb.id);
                                            setNotebookPickerNoteId(null);
                                            setNotebooks((prev) => prev.map((n) => n.id === nb.id ? { ...n, notes_count: n.notes_count + 1 } : n));
                                        }
                                    }}
                                    className="alex-notes-tag-row flex w-full items-center gap-3 px-4 py-3 text-left text-sm"
                                    style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)' }}
                                >
                                    {nb.color && (
                                        <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: nb.color }} />
                                    )}
                                    <span className="flex-1 font-medium">{nb.title}</span>
                                    <span className="text-xs" style={microText}>{nb.notes_count}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setNotebookPickerNoteId(null)}
                            className="alex-btn alex-btn--ghost"
                            style={btnXs}
                        >
                            {t('notes.drawer.notebook_picker.cancel')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete confirmation modal */}
            <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} maxWidth="max-w-sm">
                <div className="p-6 text-center">
                    <div
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center"
                        style={headerIconWrapStyle('danger')}
                    >
                        <i
                            className={`fa-solid ${confirmAction?.type === 'force-delete' ? 'fa-skull-crossbones' : 'fa-trash'} text-xl`}
                            aria-hidden="true"
                        />
                    </div>
                    <h3 className="text-lg font-bold">
                        {confirmAction?.type === 'force-delete'
                            ? t('notes.drawer.confirm.delete_forever.title')
                            : t('notes.drawer.confirm.trash.title')}
                    </h3>
                    <p className="mt-2 text-sm" style={labelText}>
                        {confirmAction?.type === 'force-delete'
                            ? t('notes.drawer.confirm.delete_forever.desc')
                            : t('notes.drawer.confirm.trash.desc')}
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setConfirmAction(null)}
                            className="alex-btn alex-btn--ghost"
                            style={btnSm}
                        >
                            {t('notes.drawer.confirm.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!confirmAction) return;
                                if (confirmAction.type === 'force-delete') {
                                    if (confirmAction.noteId === -1) {
                                        void emptyTrash();
                                        setConfirmAction(null);
                                    } else {
                                        void forceDeleteNote(confirmAction.noteId);
                                    }
                                } else {
                                    void deleteNote(confirmAction.noteId);
                                }
                            }}
                            className="alex-btn"
                            style={{ ...btnSm, ...(confirmAction?.type === 'force-delete' ? btnDangerFill : btnWarningFill) }}
                        >
                            {confirmAction?.type === 'force-delete'
                                ? t('notes.drawer.confirm.delete_forever.action')
                                : t('notes.drawer.confirm.trash.action')}
                        </button>
                    </div>
                </div>
            </Modal>
        </>,
        document.body,
    );
}

/* ── Shared Portal Menu ── */

interface PortalMenuItem {
    label: string;
    icon: string;
    onClick: () => void;
    danger?: boolean;
}

function PortalMenu({ items, btnRef, open, onClose }: {
    items: PortalMenuItem[];
    btnRef: RefObject<HTMLButtonElement | null>;
    open: boolean;
    onClose: () => void;
}) {
    const menuRef = useRef<HTMLUListElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!open) return;
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.right - 208 });
        }
        function handleClickOutside(e: Event) {
            const target = e.target as Node;
            if (
                menuRef.current && !menuRef.current.contains(target) &&
                btnRef.current && !btnRef.current.contains(target)
            ) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, btnRef, onClose]);

    if (!open) return null;

    return createPortal(
        <ul
            ref={menuRef}
            className="fixed z-[9999] w-44"
            style={{ ...portalMenuStyle, top: pos.top, left: pos.left }}
        >
            {items.map((item, i) => (
                <li
                    key={i}
                    style={i < items.length - 1 ? { borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)' } : undefined}
                >
                    <button
                        type="button"
                        onClick={() => { item.onClick(); onClose(); }}
                        className="alex-notes-tag-row flex w-full items-center justify-between px-3 py-2 text-xs"
                        style={item.danger ? { color: 'var(--theme-status-error-stroke)' } : undefined}
                    >
                        <span>{item.label}</span>
                        <i
                            className={`${item.icon} ml-3 w-4 text-center`}
                            style={item.danger ? undefined : subtleText}
                            aria-hidden="true"
                        />
                    </button>
                </li>
            ))}
        </ul>,
        document.body,
    );
}

/* ── NoteActionsMenu (inline sub-component) ── */

function NoteActionsMenu({ onAddTag, onAddToNotebook, onLink, onMove, onCopy, onArchive, onTrash, isArchived, t }: {
    onAddTag: () => void;
    onAddToNotebook: () => void;
    onLink: () => void;
    onMove: () => void;
    onCopy: () => void;
    onArchive: () => void;
    onTrash: () => void;
    isArchived: boolean;
    t: Translator;
}) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);

    const items: PortalMenuItem[] = [
        { label: t('notes.drawer.actions.add_tag'), icon: 'fa-solid fa-tag', onClick: onAddTag },
        { label: t('notes.drawer.actions.add_to_notebook'), icon: 'fa-solid fa-book', onClick: onAddToNotebook },
        { label: t('notes.drawer.actions.link'), icon: 'fa-solid fa-link', onClick: onLink },
        { label: t('notes.drawer.actions.move'), icon: 'fa-solid fa-right-from-bracket', onClick: onMove },
        { label: t('notes.drawer.actions.copy'), icon: 'fa-solid fa-copy', onClick: onCopy },
        {
            label: isArchived ? t('notes.drawer.actions.unarchive') : t('notes.drawer.actions.archive'),
            icon: 'fa-solid fa-archive',
            onClick: onArchive,
        },
        { label: t('notes.drawer.actions.trash'), icon: 'fa-solid fa-trash', onClick: onTrash, danger: true },
    ];

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="alex-notes-modal-icon-btn"
                title={t('notes.drawer.actions.menu_aria')}
                aria-label={t('notes.drawer.actions.menu_aria')}
            >
                <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />
            </button>
            <PortalMenu items={items} btnRef={btnRef} open={open} onClose={() => setOpen(false)} />
        </>
    );
}

/* ── BulkActionsToolbar ── */

function BulkActionsToolbar({ count, isArchived, onCategorize, onAddTag, onAddToNotebook, onLink, onMove, onCopy, onArchive, onTrash, t }: {
    count: number;
    isArchived: boolean;
    onCategorize: () => void;
    onAddTag: () => void;
    onAddToNotebook: () => void;
    onLink: () => void;
    onMove: () => void;
    onCopy: () => void;
    onArchive: () => void;
    onTrash: () => void;
    t: Translator;
}) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);

    const items: PortalMenuItem[] = [
        { label: t('notes.drawer.bulk.categorize'), icon: 'fa-solid fa-bolt', onClick: onCategorize },
        { label: t('notes.drawer.actions.add_tag'), icon: 'fa-solid fa-tag', onClick: onAddTag },
        { label: t('notes.drawer.actions.add_to_notebook'), icon: 'fa-solid fa-book', onClick: onAddToNotebook },
        { label: t('notes.drawer.actions.link'), icon: 'fa-solid fa-link', onClick: onLink },
        { label: t('notes.drawer.actions.move'), icon: 'fa-solid fa-right-from-bracket', onClick: onMove },
        { label: t('notes.drawer.actions.copy'), icon: 'fa-solid fa-copy', onClick: onCopy },
        {
            label: isArchived ? t('notes.drawer.actions.unarchive') : t('notes.drawer.actions.archive'),
            icon: 'fa-solid fa-archive',
            onClick: onArchive,
        },
        { label: t('notes.drawer.actions.trash'), icon: 'fa-solid fa-trash', onClick: onTrash, danger: true },
    ];

    return (
        <div className="mb-2 mr-2 flex items-center justify-between px-3 py-2" style={bulkBarStyle}>
            <span className="text-xs font-medium">
                {t('notes.drawer.bulk.selected').replace(':count', String(count))}
            </span>
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="alex-btn alex-btn--primary inline-flex items-center"
                style={btnXs}
            >
                {t('notes.drawer.bulk.actions')}
                <i className="fa-solid fa-chevron-down text-[8px]" aria-hidden="true" />
            </button>
            <PortalMenu items={items} btnRef={btnRef} open={open} onClose={() => setOpen(false)} />
        </div>
    );
}
