import { useState, useEffect, useRef, type RefObject } from 'react';
import { usePage } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import Tooltip from '@alexandria/components/ui/Tooltip';
import Modal from '@alexandria/components/ui/Modal';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { useDrawerHeight, type DrawerHeight } from '@alexandria/hooks/useDrawerHeight';
import { useDrawerMode, type DrawerMode } from '@alexandria/hooks/useDrawerMode';
import { useNoteActions } from '@alexandria/hooks/useNoteActions';
import NoteModal from '@alexandria/pages/Notes/Sections/NoteModal';
import NotesView from '@alexandria/pages/Notes/Sections/NotesView';

// Tooltip copy + icons for the height-toggle buttons in the drawer
// header. Keeps the render block tight.
const HEIGHT_OPTIONS: Array<{ key: DrawerHeight; icon: string; label: string }> = [
    { key: 'partial', icon: 'fa-solid fa-window-minimize', label: 'Partial' },
    { key: 'tall', icon: 'fa-solid fa-bars', label: 'Tall' },
    { key: 'full', icon: 'fa-solid fa-up-right-and-down-left-from-center', label: 'Full screen' },
];

// Layout mode options — split keeps the inline detail pane; list
// hands deep reading/editing off to the shared NoteModal.
const MODE_OPTIONS: Array<{ key: DrawerMode; icon: string; label: string }> = [
    { key: 'split', icon: 'fa-solid fa-table-columns', label: 'Split view' },
    { key: 'list', icon: 'fa-solid fa-list', label: 'List only' },
];

/* ── Child components ── */

import type { Note } from '@alexandria/types/notes-dashboard';
import AiStatusFooter from './AiStatusFooter';
import CommandReviewModal from './CommandReviewModal';
import TagPickerModal from './modals/TagPickerModal';
import NotebookSelectorModal, { type NotebookData } from './modals/NotebookSelectorModal';
import HistoryModal, { type HistoryRecord } from './modals/HistoryModal';
import LinkMoveModal from './modals/LinkMoveModal';
import ImportModal from './modals/ImportModal';
import PromptPreviewModal from './modals/PromptPreviewModal';
import SortingHistoryModal from './modals/SortingHistoryModal';

/* ── Types ── */

export interface NotesContext {
    projectId: number;
    projectSlug: string;
    contextType: 'project' | 'blueprint' | 'entry';
    contextId: number;
    contextLabel: string;
    contextSlug?: string;
    preSelectNoteId?: number;
}

/* ── Global event for opening the drawer ── */

const OPEN_EVENT = 'alexandria:open-notes';

export function openNotesDrawer(ctx: NotesContext) {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: ctx }));
}

/* ── Drawer Component ── */

export default function NotesDrawer() {
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

    /* ── Shared per-note server actions ── */
    const noteActions = useNoteActions(context?.projectId ?? 0);

    /* ── Unified edit/create modal state. Replaces the old inline
           editor panels so the drawer uses the same feature-rich
           NoteModal as the dashboard. */
    const [modalMode, setModalMode] = useState<'view' | 'create' | null>(null);
    const [modalNote, setModalNote] = useState<Note | null>(null);

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

    const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

    /* ══════════════════════════════════════════════
     *  EFFECTS — open/close, Echo, polling, fetch
     * ══════════════════════════════════════════════ */

    // Listen for open events
    const skipAnimationRef = useRef(false);

    useEffect(() => {
        function handleOpen(e: Event) {
            const ctx = (e as CustomEvent<NotesContext>).detail;
            skipAnimationRef.current = !!ctx.preSelectNoteId;
            setContext(ctx);
            setOpen(true);
            setCurrentView('active');
            setSearch('');
            setSelectedId(ctx.preSelectNoteId ?? null);
            setModalMode(null);
            setModalNote(null);
        }
        window.addEventListener(OPEN_EVENT, handleOpen);
        return () => window.removeEventListener(OPEN_EVENT, handleOpen);
    }, []);

    // Animate open/close (skip when opening via page transition)
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            if (skipAnimationRef.current) {
                // Instant — page transition handles the reveal
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
                toast.show('AI categorization completed', { type: 'success', description: 'Note has been routed to the matching blueprint(s)' });
            } else if (data.status === 'failed') {
                toast.show('AI categorization failed', { type: 'danger', description: data.error ?? 'An error occurred during processing' });
            }
        });

        return () => { channel.stopListening('.note.ai.status'); };
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
                // When viewing a notebook, show all its notes (notebooks are universal)
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
            if (!selectedId && data.length > 0) setSelectedId(data[0].id);
        } finally {
            setLoading(false);
        }
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
     * Called when the shared NoteModal finishes saving — we don't know
     * the exact shape of the saved note without another fetch (the
     * modal doesn't hand it back), so refetch the list to pick up both
     * create and edit changes. For create, also remember to attach to
     * the active notebook if one is selected.
     */
    async function handleModalSaved() {
        if (!context) return;
        // Refetch the drawer's notes list from the same endpoint the
        // list originally uses so new/edited notes surface in place.
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
            // Bump the notebook's note count so the filter chip stays
            // accurate without a second fetch. Only relevant on create.
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
            const res = await fetch(`/api/v1/projects/${context.projectId}/notes/${selectedNote.id}/prompt-preview?context_type=${context.contextType}&context_id=${context.contextId}`, {
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

        // Determine which notes to categorize: bulk selected or single
        const noteIds = checkedIds.size > 0
            ? Array.from(checkedIds)
            : selectedNote ? [selectedNote.id] : [];

        if (noteIds.length === 0) {
            setAiProcessing(false);
            return;
        }

        try {
            if (noteIds.length > 1) {
                // Batch categorize
                await fetch(`/api/v1/projects/${context.projectId}/notes/batch-categorize`, {
                    method: 'POST',
                    headers: csrfHeaders(),
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        note_ids: noteIds,
                        context_type: contextType,
                        context_id: contextId,
                        auto_process: categorizeAutoProcess,
                    }),
                });
            } else {
                // Single note categorize
                await fetch(`/api/v1/projects/${context.projectId}/notes/${noteIds[0]}/categorize`, {
                    method: 'POST',
                    headers: csrfHeaders(),
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        context_type: contextType,
                        context_id: contextId,
                        auto_process: categorizeAutoProcess,
                    }),
                });
            }

            // Mark all as processing
            setNotes((prev) => prev.map((n) =>
                noteIds.includes(n.id) ? { ...n, ai_notes: { ...n.ai_notes, status: 'processing' } } : n
            ));

            const count = noteIds.length;
            const label = mode === 'send' ? 'Routing to blueprints' : 'Generating commands';
            const autoLabel = categorizeAutoProcess ? ' (auto-processing enabled)' : '';
            toast.show(`${label}${autoLabel}`, { type: 'info', description: `${count} note(s) processing in the background...` });

            if (checkedIds.size > 0) exitSelectMode();
        } finally {
            setAiProcessing(false);
        }
    }

    /* ── AI routing/review handlers (used by AiStatusFooter via inline rendering) ── */

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
                    `Note routed to ${data.blueprint_count} blueprint(s)`,
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
            <div ref={backdropRef} className="fixed inset-0 z-40 bg-black/50" onClick={close} />

            {/* Drawer — bottom panel with partial/tall/full height
                presets. `transition-[height]` lets Tailwind smoothly
                grow/shrink when the preset changes without conflicting
                with GSAP's open/close y-transform animation. */}
            <div
                ref={drawerRef}
                className={`fixed inset-x-0 bottom-0 z-50 flex flex-col bg-base-100 shadow-2xl transition-[height] duration-300 ease-out ${drawerHeightClass}`}
            >

                {/* Header */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-base-content/10 px-4 py-3" style={{ background: 'linear-gradient(to bottom, oklch(var(--p) / 0.1), oklch(var(--p) / 0.05))' }}>
                    <h3 className="text-xl font-bold">
                        {context && (
                            <>Notes for: <span className="text-primary">{context.contextLabel}</span></>
                        )}
                    </h3>
                    <div className="flex items-center gap-2">
                        {/* Layout mode toggle — split (inline detail)
                            vs list (full-width rows, open modal on
                            click). Same segmented-group treatment as
                            the height toggle so they read as a family. */}
                        <div className="hidden items-center rounded-lg border border-base-content/10 bg-base-100/50 p-0.5 sm:flex">
                            {MODE_OPTIONS.map(({ key, icon, label }) => (
                                <Tooltip key={key} content={label} placement="bottom">
                                    <button
                                        onClick={() => setDrawerMode(key)}
                                        className={`btn btn-ghost btn-xs btn-square rounded-md ${drawerMode === key ? 'bg-primary/15 text-primary' : 'text-base-content/50 hover:text-base-content'}`}
                                        aria-label={label}
                                        aria-pressed={drawerMode === key}
                                    >
                                        <i className={`${icon} text-[10px]`} />
                                    </button>
                                </Tooltip>
                            ))}
                        </div>

                        {/* Height toggle — partial / tall / full. Segmented
                            button group; the active preset gets the
                            btn-active styling so the current state is
                            obvious at a glance. */}
                        <div className="hidden items-center rounded-lg border border-base-content/10 bg-base-100/50 p-0.5 sm:flex">
                            {HEIGHT_OPTIONS.map(({ key, icon, label }) => (
                                <Tooltip key={key} content={label} placement="bottom">
                                    <button
                                        onClick={() => setDrawerHeight(key)}
                                        className={`btn btn-ghost btn-xs btn-square rounded-md ${drawerHeight === key ? 'bg-primary/15 text-primary' : 'text-base-content/50 hover:text-base-content'}`}
                                        aria-label={label}
                                        aria-pressed={drawerHeight === key}
                                    >
                                        <i className={`${icon} text-[10px]`} />
                                    </button>
                                </Tooltip>
                            ))}
                        </div>

                        <Tooltip content="Sorting History" placement="bottom">
                            <button
                                onClick={() => setShowSortingHistory(true)}
                                className="btn btn-ghost btn-sm gap-1.5 text-base-content/70 hover:text-info"
                                aria-label="Sorting History"
                            >
                                <i className="fa-solid fa-clock-rotate-left text-xs" />
                                <span className="hidden sm:inline">Sorting History</span>
                            </button>
                        </Tooltip>
                        <Tooltip content="Open Notes Dashboard" placement="bottom">
                            <a
                                href={`/notes/${context?.projectSlug ?? ''}`}
                                className="btn btn-ghost btn-sm gap-1.5 text-base-content/70 hover:text-primary"
                                aria-label="Open Notes Dashboard"
                                onClick={close}
                            >
                                <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                                <span className="hidden sm:inline">Notes Dashboard</span>
                            </a>
                        </Tooltip>
                        <button onClick={close} className="btn btn-sm btn-neutral rounded-full">Close</button>
                    </div>
                </div>

                {/* Two-panel content */}
                {drawerMode === 'list' && context ? (
                    /* List mode — render the same NotesView the
                       Notes Dashboard uses, but scoped to this
                       drawer's notable. All controls (filters,
                       column picker, bulk actions, compact mode,
                       sort, pagination) come for free; no
                       duplicated UI. */
                    <div className="min-h-0 flex-grow overflow-y-auto px-4 py-4">
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
                    <div className={`flex min-h-0 flex-col ${drawerMode === 'split' ? 'border-r border-dashed border-base-content/10 pr-2 md:col-span-4' : 'md:col-span-12'}`}>
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
                                            ) : 'Notebook';
                                        })()}
                                    </>
                                ) : (
                                    <span>
                                        {currentView === 'archived' ? 'Archived Notes' : currentView === 'trashed' ? 'Trashed Notes' : 'Active Notes'}
                                    </span>
                                )}

                                <button
                                    onClick={() => setNotebookSelectorOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-base-content/60 transition-colors hover:text-base-content"
                                    style={{ background: 'linear-gradient(90deg, oklch(var(--s) / 0.2), oklch(var(--s) / 0.1))' }}
                                >
                                    <i className="fa-solid fa-book text-[10px]" />
                                    {activeNotebookId ? 'Switch' : 'Notebooks'}
                                    {notebooks.length > 0 && (
                                        <span className="text-[9px] opacity-50">{notebooks.length}</span>
                                    )}
                                </button>
                            </div>

                            {!activeNotebookId && (
                                <div className="flex gap-0.5">
                                    <Tooltip content="Show active notes" placement="bottom">
                                        <button
                                            onClick={() => { setCurrentView('active'); setSelectedId(null); }}
                                            className={`btn btn-ghost btn-circle btn-sm ${currentView === 'active' ? 'btn-active' : ''}`}
                                            aria-label="Show active notes"
                                        >
                                            <i className="fa-solid fa-folder-open" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Show archived notes" placement="bottom">
                                        <button
                                            onClick={() => { setCurrentView('archived'); setSelectedId(null); }}
                                            className={`btn btn-ghost btn-circle btn-sm ${currentView === 'archived' ? 'btn-active' : ''}`}
                                            aria-label="Show archived notes"
                                        >
                                            <i className="fa-solid fa-archive" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Show trashed notes" placement="bottom">
                                        <button
                                            onClick={() => { setCurrentView('trashed'); setSelectedId(null); }}
                                            className={`btn btn-ghost btn-circle btn-sm ${currentView === 'trashed' ? 'btn-active' : ''}`}
                                            aria-label="Show trashed notes"
                                        >
                                            <i className="fa-solid fa-trash" />
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </h4>

                        {/* Search + action buttons */}
                        <div className="mb-6 mr-2 flex flex-shrink-0 items-center gap-2">
                            <div className="relative flex-1">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <i className="fa-solid fa-magnifying-glass text-base-content/40" />
                                </span>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={`Search notes (${notes.length})`}
                                    className="input input-bordered h-12 w-full rounded-full pl-10"
                                />
                            </div>
                            <Tooltip content="Import Notes" placement="bottom">
                                <button
                                    onClick={() => setImportModalOpen(true)}
                                    className="flex h-12 w-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-base-200 text-base-content transition-colors hover:bg-base-300"
                                    title="Import Notes"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5 fill-current">
                                        <path d="M192 96L320 96L320 192C320 227.3 348.7 256 384 256L480 256L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 464L128 464L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 250.5C512 233.5 505.3 217.2 493.3 205.2L370.7 82.7C358.7 70.7 342.5 64 325.5 64L192 64C156.7 64 128 92.7 128 128L128 336L160 336L160 128C160 110.3 174.3 96 192 96zM352 109.3L466.7 224L384 224C366.3 224 352 209.7 352 192L352 109.3zM64 400C64 408.8 71.2 416 80 416L329.4 416L284.7 460.7C278.5 466.9 278.5 477.1 284.7 483.3C290.9 489.5 301.1 489.5 307.3 483.3L379.3 411.3C385.5 405.1 385.5 394.9 379.3 388.7L307.3 316.7C301.1 310.5 290.9 310.5 284.7 316.7C278.5 322.9 278.5 333.1 284.7 339.3L329.4 384L80 384C71.2 384 64 391.2 64 400z" />
                                    </svg>
                                </button>
                            </Tooltip>
                            <Tooltip content="Add Note" placement="bottom">
                                <button
                                    onClick={startAdding}
                                    className="flex h-12 w-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary/60 text-primary-content transition-colors hover:bg-primary/80"
                                    title="Add Note"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5 fill-current">
                                        <path d="M160 512L352 512L352 416C352 380.7 380.7 352 416 352L512 352L512 160C512 142.3 497.7 128 480 128L160 128C142.3 128 128 142.3 128 160L128 480C128 497.7 142.3 512 160 512zM384 498.7L498.7 384L416 384C398.3 384 384 398.3 384 416L384 498.7zM160 544C124.7 544 96 515.3 96 480L96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 357.5C544 374.5 537.3 390.8 525.3 402.8L402.7 525.3C390.7 537.3 374.4 544 357.4 544L160 544zM184 432C184 418.7 194.7 408 208 408C221.3 408 232 418.7 232 432C232 445.3 221.3 456 208 456C194.7 456 184 445.3 184 432zM208 232C194.7 232 184 221.3 184 208C184 194.7 194.7 184 208 184C221.3 184 232 194.7 232 208C232 221.3 221.3 232 208 232zM184 320C184 306.7 194.7 296 208 296C221.3 296 232 306.7 232 320C232 333.3 221.3 344 208 344C194.7 344 184 333.3 184 320z" />
                                    </svg>
                                </button>
                            </Tooltip>
                            <Tooltip content={selectMode ? 'Exit Select' : 'Select Notes'} placement="bottom">
                                <button
                                    onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                                    className={`flex h-12 w-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${selectMode ? 'bg-warning/60 text-warning-content hover:bg-warning/80' : 'bg-base-300/50 text-base-content/60 hover:bg-base-300/80'}`}
                                >
                                    <i className={`fa-solid ${selectMode ? 'fa-xmark' : 'fa-check-double'}`} />
                                </button>
                            </Tooltip>
                        </div>

                        {/* Empty trash button */}
                        {currentView === 'trashed' && notes.length > 0 && (
                            <div className="mb-3 mr-2">
                                <button
                                    onClick={() => setConfirmAction({ type: 'force-delete', noteId: -1 })}
                                    className="btn btn-error btn-sm w-full"
                                >
                                    <i className="fa-solid fa-dumpster-fire" /> Empty All Trashed Notes
                                </button>
                            </div>
                        )}

                        {/* Note list */}
                        {/* Bulk action toolbar */}
                        {selectMode && checkedIds.size > 0 && (
                            <BulkActionsToolbar
                                count={checkedIds.size}
                                isArchived={currentView === 'archived'}
                                onCategorize={() => setShowCategorizeModal(true)}
                                onAddTag={() => {
                                    const ids = Array.from(checkedIds);
                                    setBulkTagIds(ids);
                                    // Open tag modal with empty selection — adding will apply to all
                                    setTagModalNoteId(ids[0] ?? null);
                                    setNoteTags([]);
                                }}
                                onAddToNotebook={() => {
                                    // Add all selected to notebook — use first for the picker
                                    const firstId = Array.from(checkedIds)[0];
                                    if (firstId) setNotebookPickerNoteId(firstId);
                                }}
                                onLink={() => {
                                    setBulkMoveIds(Array.from(checkedIds));
                                    setLinkAction({ noteId: 0, action: 'link' });
                                }}
                                onMove={handleBulkMove}
                                onCopy={() => {
                                    // Copy each selected note
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
                            />
                        )}

                        <div className="flex-grow overflow-y-auto">
                            <div className="mr-2 space-y-2">
                                {loading && notes.length === 0 ? (
                                    <div className="p-4 text-center"><span className="loading loading-spinner loading-md" /></div>
                                ) : notes.length === 0 ? (
                                    <p className="p-4 text-center text-sm text-base-content/40">No matching notes found.</p>
                                ) : (
                                    notes.map((note) => (
                                        <div
                                            key={note.id}
                                            onClick={() => {
                                                if (selectMode) { toggleCheck(note.id); }
                                                // In list mode, skip the inline detail pane and open the full
                                                // NoteModal directly — same surface used from the dashboard.
                                                else if (drawerMode === 'list') { setModalMode('view'); setModalNote(note); }
                                                else { setSelectedId(note.id); }
                                            }}
                                            className={`cursor-pointer rounded border-l-4 px-4 py-2 transition-all duration-200 ${
                                                selectMode && checkedIds.has(note.id)
                                                    ? 'border-secondary bg-secondary/20 shadow-sm'
                                                    : note.id === selectedId && !selectMode
                                                        ? 'border-primary bg-primary/20 shadow-sm'
                                                        : 'border-transparent hover:bg-primary/10'
                                            }`}
                                        >
                                            <p className="flex items-center gap-1 truncate font-semibold">
                                                {selectMode && (
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-xs checkbox-primary mr-1"
                                                        checked={checkedIds.has(note.id)}
                                                        onChange={() => toggleCheck(note.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                )}
                                                {note.is_pinned && <i className="fa-solid fa-thumbtack text-[9px] text-primary" />}
                                                {(note.ai_notes as Record<string, unknown> | null)?.status === 'processing' && (
                                                    <span className="loading loading-spinner loading-xs text-secondary" />
                                                )}
                                                {(() => {
                                                    const ai = note.ai_notes as Record<string, unknown> | null;
                                                    if (!ai || ai.status === 'processing') return null;
                                                    if (typeof ai.routing_count === 'number' && ai.routing_count > 0 && !ai.batch_id) {
                                                        return <i className="fa-solid fa-circle-exclamation text-[10px] text-warning" title="Routing approval needed" />;
                                                    }
                                                    if (ai.batch_id) {
                                                        return <i className="fa-solid fa-clipboard-list text-[10px] text-warning" title="Commands ready for review" />;
                                                    }
                                                    return null;
                                                })()}
                                                <span className="truncate">{note.title || <span className="italic opacity-60">Untitled</span>}</span>
                                            </p>
                                            <div className="flex items-center justify-between text-xs opacity-70">
                                                <span>By {note.creator?.name ?? 'System'}</span>
                                                <span>
                                                    {currentView === 'trashed' && note.deleted_at
                                                        ? `Trashed: ${new Date(note.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                        : note.note_date
                                                            ? new Date(note.note_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : ''
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Right pane: detail view only. Create & edit
                           have been lifted to the shared NoteModal (see
                           mount near the end of the file) so the drawer
                           no longer renders its own simple editors.
                           Hidden entirely in `list` mode — users open
                           the full modal on note click instead. */}
                    {drawerMode === 'split' && (
                    <div className="mt-4 flex min-h-0 flex-col md:col-span-8 md:mt-0">
                        {currentView === 'trashed' && selectedNote ? (
                            /* Trashed view */
                            <div className="flex h-full flex-col">
                                <div className="flex flex-shrink-0 items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-bold text-error/80">{selectedNote.title}</h4>
                                        {selectedNote.deleted_at && (
                                            <p className="text-sm opacity-70">
                                                Trashed on {new Date(selectedNote.deleted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => void restoreNote()} className="btn btn-success btn-sm rounded-full gap-1">
                                            <i className="fa-solid fa-trash-arrow-up" /> Restore
                                        </button>
                                        <button onClick={() => setConfirmAction({ type: 'force-delete', noteId: selectedNote.id })} className="btn btn-error btn-sm rounded-full gap-1">
                                            <i className="fa-solid fa-skull-crossbones" /> Delete Forever
                                        </button>
                                    </div>
                                </div>
                                <div className="divider my-3" />
                                <div className="prose prose-sm max-w-none flex-grow overflow-y-auto rounded-lg bg-error/10 px-4 py-3 text-base-content/70">
                                    <p className="italic">This note is in the trash. You can restore it or delete it permanently.</p>
                                    <div className="divider my-2" />
                                    <div className="whitespace-pre-wrap">{selectedNote.text}</div>
                                </div>
                            </div>
                        ) : selectedNote ? (
                            /* Standard view — delegates to NoteDetail */
                            <div className="flex h-full flex-col">
                                <div className="flex flex-shrink-0 items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-lg font-bold">{selectedNote.title}</h4>
                                            <Tooltip content="Generate title from contents" placement="bottom">
                                                <button
                                                    onClick={() => void generateTitle()}
                                                    disabled={generatingTitle || !selectedNote.text?.trim()}
                                                    className="btn btn-ghost btn-xs gap-1 text-base-content/40 hover:text-primary"
                                                >
                                                    {generatingTitle
                                                        ? <span className="loading loading-spinner loading-xs" />
                                                        : <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />}
                                                </button>
                                            </Tooltip>
                                        </div>
                                        <p className="text-sm opacity-70">
                                            By {selectedNote.creator?.name ?? 'System'} on{' '}
                                            {selectedNote.note_date ? new Date(selectedNote.note_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Tooltip content={selectedNote.is_pinned ? 'Unpin note' : 'Pin note'} placement="bottom">
                                            <button
                                                onClick={() => void togglePin()}
                                                className={`btn btn-ghost btn-circle btn-sm ${selectedNote.is_pinned ? 'text-primary' : ''}`}
                                                aria-label={selectedNote.is_pinned ? 'Unpin note' : 'Pin note'}
                                            >
                                                <i className="fa-solid fa-thumbtack" />
                                            </button>
                                        </Tooltip>
                                        <button onClick={startEditing} className="btn btn-neutral btn-sm rounded-full gap-1">
                                            <i className="fa-solid fa-pencil" /> Edit
                                        </button>
                                        <button onClick={() => void openHistory(selectedNote.id)} className="btn btn-secondary btn-sm rounded-full gap-1">
                                            <i className="fa-solid fa-clock-rotate-left" /> History
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
                                        />
                                    </div>
                                </div>
                                <div className="divider my-3" />
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    {selectedNote.tags?.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary"
                                            style={{ background: 'linear-gradient(90deg, oklch(var(--p) / 0.25), oklch(var(--p) / 0.15))' }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    <button
                                        onClick={() => void openTagModal(selectedNote.id)}
                                        className="group/tag flex aspect-square h-7 items-center justify-center rounded-full text-primary transition-all hover:text-white"
                                        style={{ background: 'linear-gradient(90deg, oklch(var(--p) / 0.25), oklch(var(--p) / 0.15))' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, oklch(var(--p) / 0.6), oklch(var(--p) / 0.45))'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, oklch(var(--p) / 0.25), oklch(var(--p) / 0.15))'}
                                        title="Add tag"
                                    >
                                        <i className="fa-solid fa-plus text-[10px]" />
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto rounded-xl border border-base-content/5 bg-gradient-to-b from-base-200/60 to-base-200/30 px-5 py-4 shadow-inner">
                                    <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-base-content/80">{selectedNote.text}</div>
                                </div>

                                {/* Link Previews (compact) */}
                                {selectedNote.links && selectedNote.links.filter((l) => l.status === 'fetched').length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {selectedNote.links.filter((l) => l.status === 'fetched').map((link) => (
                                            <a
                                                key={link.id}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-base-200/50"
                                            >
                                                {link.favicon_url && (
                                                    <img src={link.favicon_url} alt="" className="h-3.5 w-3.5 flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                )}
                                                <span className="min-w-0 flex-1 truncate text-primary/70">{link.title ?? link.url}</span>
                                                <i className="fa-solid fa-arrow-up-right-from-square flex-shrink-0 text-[8px] text-base-content/20" />
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
                            /* Empty state */
                            <div className="flex flex-1 items-center justify-center">
                                <div className="text-center">
                                    <i className="fa-solid fa-sticky-note mb-3 text-3xl text-base-content/10" />
                                    <p className="text-sm text-base-content/30">Select a note or add a new one</p>
                                </div>
                            </div>
                        )}
                    </div>
                    )}
                </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════
             *  MODALS — delegated to extracted components
             * ══════════════════════════════════════════════ */}

            {/* History modal */}
            <HistoryModal
                open={!!historyNoteId}
                onClose={() => setHistoryNoteId(null)}
                historyRecords={historyRecords}
                historyLoading={historyLoading}
                projectId={context?.projectId ?? 0}
                noteId={historyNoteId}
            />

            {/* Tag picker modal */}
            <TagPickerModal
                open={!!tagModalNoteId}
                onClose={() => { setTagModalNoteId(null); setBulkTagIds(null); void fetchNotes(); }}
                projectId={context?.projectId ?? 0}
                noteTags={noteTags}
                onToggle={async (tag, selected) => {
                    if (!context) return;
                    const noteIds = bulkTagIds ?? (tagModalNoteId ? [tagModalNoteId] : []);
                    if (selected) {
                        // Remove tag from all
                        for (const id of noteIds) {
                            await fetch(`/api/v1/projects/${context.projectId}/notes/${id}/tags/${encodeURIComponent(tag)}`, {
                                method: 'DELETE', headers: csrfHeaders(), credentials: 'same-origin',
                            });
                        }
                    } else {
                        // Add tag to all
                        for (const id of noteIds) {
                            await fetch(`/api/v1/projects/${context.projectId}/notes/${id}/tags`, {
                                method: 'POST', headers: csrfHeaders(), credentials: 'same-origin',
                                body: JSON.stringify({ tag }),
                            });
                        }
                    }
                    // Refresh tags display from first note
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

            {/* Notebook selector modal */}
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

            {/* Notebook Link/Move modal */}
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

            {/* Import modal */}
            <ImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                projectId={context?.projectId ?? 0}
                contextType={context?.contextType ?? 'project'}
                contextId={context?.contextId ?? 0}
                onComplete={() => { setImportModalOpen(false); void fetchNotes(); }}
            />

            {/* Link/Move/Copy modal */}
            <LinkMoveModal
                open={!!linkAction}
                onClose={() => setLinkAction(null)}
                projectId={context?.projectId ?? 0}
                noteId={linkAction?.noteId ?? 0}
                action={linkAction?.action ?? 'link'}
                onComplete={() => { setLinkAction(null); void fetchNotes(); }}
            />

            {/* Bulk Move modal */}
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

            {/* Prompt Preview modal */}
            <PromptPreviewModal
                open={showPromptPreview}
                onClose={() => setShowPromptPreview(false)}
                promptPreview={promptPreview}
                promptLoading={promptLoading}
            />

            {/* Command Review modal */}
            <CommandReviewModal
                open={showCommandReview}
                onClose={() => setShowCommandReview(false)}
                batchId={commandReviewBatchId}
                projectId={context?.projectId ?? 0}
                onExecuted={() => {
                    setShowCommandReview(false);
                    toast.show('Commands executed successfully', { type: 'success' });
                    void fetchNotes();
                }}
                onStatusChange={() => void fetchNotes()}
            />

            {/* Sorting History modal */}
            <SortingHistoryModal
                open={showSortingHistory}
                onClose={() => setShowSortingHistory(false)}
                projectId={context?.projectId ?? 0}
                projectSlug={context?.projectSlug ?? ''}
                blueprintId={context?.contextType === 'blueprint' ? context.contextId : undefined}
                blueprintSlug={context?.contextType === 'blueprint' ? context?.contextSlug : undefined}
            />

            {/* Shared edit / create modal — same component used by the
                Notes Dashboard, opened here via the Edit button on the
                detail pane or the "+ Add" button in the list. Context
                is forwarded so create mode attaches the new note to the
                correct notable (project/blueprint/entry). */}
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
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                            <i className="fa-solid fa-wand-magic-sparkles text-secondary-content" />
                        </div>
                        <div>
                            <h3 className="font-bold">AI Categorization</h3>
                            {checkedIds.size > 1 ? (
                                <p className="text-xs text-base-content/40">{checkedIds.size} notes selected</p>
                            ) : selectedNote ? (
                                <p className="text-xs text-base-content/40">"{selectedNote.title || 'Untitled'}"</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {/* Send to Blueprint — only from project/entry context */}
                        {context?.contextType !== 'blueprint' && (
                            <button
                                onClick={() => void handleCategorize('send')}
                                disabled={aiProcessing}
                                className="flex w-full items-start gap-3 rounded-xl border border-base-content/10 bg-base-200/50 px-4 py-3 text-left transition-colors hover:bg-base-200"
                            >
                                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20">
                                    <i className="fa-solid fa-share-from-square text-sm text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Send to Blueprint</p>
                                    <p className="text-xs text-base-content/50">AI will determine which blueprint(s) this note belongs to and route it there.</p>
                                </div>
                            </button>
                        )}

                        {/* Sort within Blueprint — only in blueprint context */}
                        {context?.contextType === 'blueprint' && (
                            <button
                                onClick={() => void handleCategorize('sort')}
                                disabled={aiProcessing}
                                className="flex w-full items-start gap-3 rounded-xl border border-base-content/10 bg-base-200/50 px-4 py-3 text-left transition-colors hover:bg-base-200"
                            >
                                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/20">
                                    <i className="fa-solid fa-layer-group text-sm text-secondary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Sort within Blueprint</p>
                                    <p className="text-xs text-base-content/50">Generate commands to create entries and relationships for this blueprint.</p>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Auto-process checkbox */}
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-sm checkbox-primary mt-0.5"
                            checked={categorizeAutoProcess}
                            onChange={(e) => setCategorizeAutoProcess(e.target.checked)}
                        />
                        <div>
                            <p className="text-xs font-medium">Auto-process</p>
                            <p className="text-xs text-base-content/40">Skip the approval step and process automatically.</p>
                        </div>
                    </label>

                    {/* Preview prompt link */}
                    <div className="mt-3 border-t border-base-content/5 pt-3 text-center">
                        <button
                            onClick={() => void fetchPromptPreview()}
                            className="inline-flex items-center gap-1.5 text-xs text-base-content/40 transition-colors hover:text-primary"
                        >
                            <i className="fa-solid fa-code text-[10px]" />
                            Preview prompt &amp; token estimate
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Entry Integration modal */}
            <Modal open={showEntryIntegration} onClose={() => setShowEntryIntegration(false)} maxWidth="max-w-md">
                <div className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                            <i className="fa-solid fa-puzzle-piece text-primary" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold">Integrate into Entry</h3>
                            <p className="text-xs text-base-content/40">AI will analyze this note and suggest field updates for the entry</p>
                        </div>
                    </div>

                    {selectedNote && (
                        <div className="mb-4 rounded-lg bg-base-200/30 px-3 py-2">
                            <p className="text-xs text-base-content/40">Note: <span className="font-medium text-base-content/60">{selectedNote.title}</span></p>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium text-base-content/60">Custom Instructions (optional)</label>
                        <textarea
                            value={integrationInstructions}
                            onChange={(e) => setIntegrationInstructions(e.target.value)}
                            placeholder="Any specific instructions for the AI... (e.g., 'Focus on updating the character's motivations')"
                            rows={3}
                            className="textarea textarea-bordered mt-1 w-full rounded-xl text-sm"
                        />
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button onClick={() => setShowEntryIntegration(false)} className="btn btn-ghost btn-sm text-xs">Cancel</button>
                        <button onClick={() => void triggerEntryIntegration()} disabled={aiProcessing} className="btn btn-primary btn-sm text-xs">
                            {aiProcessing ? <span className="loading loading-spinner loading-xs" /> : 'Integrate'}
                        </button>
                    </div>

                    <p className="mt-3 text-[10px] text-base-content/30">
                        AI will create a review plan. You'll be able to approve or reject each suggestion before changes are applied.
                    </p>
                </div>
            </Modal>

            {/* Locations modal */}
            <Modal open={!!locationsModalNote} onClose={() => setLocationsModalNote(null)} maxWidth="max-w-xs">
                <div className="p-5">
                    <h3 className="text-base font-bold">Note Locations</h3>
                    <p className="mt-1 text-xs text-base-content/40">
                        "{locationsModalNote?.title || 'Untitled'}" is attached to:
                    </p>
                    <div className="mt-3 overflow-hidden rounded-xl border border-base-300">
                        {locationsModalNote?.locations?.map((loc, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 border-b border-base-content/5 px-4 py-2.5 text-sm last:border-0"
                            >
                                <i className={`text-xs text-base-content/30 ${
                                    loc.type === 'project' ? 'fa-solid fa-folder' :
                                    loc.type === 'blueprint' ? 'fa-solid fa-cube' :
                                    loc.type === 'notebook' ? 'fa-solid fa-book' :
                                    'fa-solid fa-file'
                                }`} />
                                <div>
                                    <span className="font-medium">{loc.name}</span>
                                    <span className="ml-2 text-xs capitalize text-base-content/30">{loc.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                        <button onClick={() => setLocationsModalNote(null)} className="btn btn-ghost btn-sm text-xs">Close</button>
                    </div>
                </div>
            </Modal>

            {/* Create Notebook modal */}
            <Modal open={showNewNotebook} onClose={() => setShowNewNotebook(false)} maxWidth="max-w-sm">
                <div className="p-6">
                    <h3 className="text-lg font-bold">New Notebook</h3>
                    <p className="mt-1 text-xs text-base-content/40">Create a notebook to organize your notes</p>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-base-content/60">Title</label>
                            <input
                                type="text"
                                value={newNotebookTitle}
                                onChange={(e) => setNewNotebookTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && newNotebookTitle.trim()) void createNotebook(); }}
                                placeholder="Notebook name"
                                autoFocus
                                className="input input-bordered mt-1 h-9 min-h-0 w-full rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-base-content/60">Description</label>
                            <textarea
                                value={newNotebookDesc}
                                onChange={(e) => setNewNotebookDesc(e.target.value)}
                                placeholder="What is this notebook for? (optional)"
                                rows={2}
                                className="textarea textarea-bordered mt-1 min-h-0 w-full rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-base-content/60">Color</label>
                            <div className="mt-1.5 flex items-center gap-4">
                                <label className="relative cursor-pointer">
                                    <input
                                        type="color"
                                        value={newNotebookColor}
                                        onChange={(e) => setNewNotebookColor(e.target.value)}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                    />
                                    <div
                                        style={{ backgroundColor: newNotebookColor }}
                                        className="h-[60px] w-[60px] rounded-full ring-2 ring-base-content/10 ring-offset-2 ring-offset-base-100"
                                    />
                                </label>
                                <div className="grid grid-cols-[repeat(4,28px)] gap-2">
                                    {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'].map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewNotebookColor(c)}
                                            className="h-[28px] w-[28px] rounded-full border-2"
                                            style={{
                                                backgroundColor: c,
                                                borderColor: newNotebookColor === c ? 'white' : 'transparent',
                                                boxShadow: newNotebookColor === c ? `0 0 0 2px ${c}` : 'none',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={() => setShowNewNotebook(false)} className="btn btn-ghost btn-sm text-xs">Cancel</button>
                        <button
                            onClick={() => void createNotebook()}
                            disabled={!newNotebookTitle.trim()}
                            className="btn btn-primary btn-sm text-xs"
                        >
                            Create Notebook
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add to Notebook picker */}
            <Modal open={!!notebookPickerNoteId} onClose={() => setNotebookPickerNoteId(null)} maxWidth="max-w-sm">
                <div className="p-5">
                    <h3 className="text-base font-bold">Add to Notebook</h3>
                    <p className="mt-1 text-xs text-base-content/40">Select a notebook for this note</p>
                    {notebooks.length === 0 ? (
                        <div className="mt-4 py-6 text-center">
                            <i className="fa-solid fa-book mb-2 text-xl text-base-content/10" />
                            <p className="text-xs text-base-content/30">No notebooks yet</p>
                        </div>
                    ) : (
                        <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-base-300">
                            {notebooks.map((nb) => (
                                <button
                                    key={nb.id}
                                    onClick={async () => {
                                        if (notebookPickerNoteId) {
                                            await addNoteToNotebook(notebookPickerNoteId, nb.id);
                                            setNotebookPickerNoteId(null);
                                            setNotebooks((prev) => prev.map((n) => n.id === nb.id ? { ...n, notes_count: n.notes_count + 1 } : n));
                                        }
                                    }}
                                    className="flex w-full items-center gap-3 border-b border-base-content/5 px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-base-200/30"
                                >
                                    {nb.color && (
                                        <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: nb.color }} />
                                    )}
                                    <span className="flex-1 font-medium">{nb.title}</span>
                                    <span className="text-xs text-base-content/30">{nb.notes_count}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="mt-3 flex justify-end">
                        <button onClick={() => setNotebookPickerNoteId(null)} className="btn btn-ghost btn-sm text-xs">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Delete confirmation modal */}
            <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} maxWidth="max-w-sm">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
                        <i className={`fa-solid ${confirmAction?.type === 'force-delete' ? 'fa-skull-crossbones' : 'fa-trash'} text-xl text-error`} />
                    </div>
                    <h3 className="text-lg font-bold">
                        {confirmAction?.type === 'force-delete' ? 'Delete Forever?' : 'Move to Trash?'}
                    </h3>
                    <p className="mt-2 text-sm text-base-content/50">
                        {confirmAction?.type === 'force-delete'
                            ? 'This note will be permanently deleted. This action cannot be undone.'
                            : 'This note will be moved to the trash. You can restore it later.'}
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <button onClick={() => setConfirmAction(null)} className="btn btn-ghost btn-sm">Cancel</button>
                        <button
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
                            className={`btn btn-sm ${confirmAction?.type === 'force-delete' ? 'btn-error' : 'btn-warning'}`}
                        >
                            {confirmAction?.type === 'force-delete' ? 'Delete Forever' : 'Move to Trash'}
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
            className="fixed z-[9999] w-44 overflow-hidden rounded-lg border border-base-content/10 bg-base-100 text-base-content shadow-lg"
            style={{ top: pos.top, left: pos.left }}
        >
            {items.map((item, i) => (
                <li key={i}>
                    <button
                        onClick={() => { item.onClick(); onClose(); }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-base-200 ${i < items.length - 1 ? 'border-b border-base-content/10' : ''} ${item.danger ? 'text-error' : ''}`}
                    >
                        <span>{item.label}</span>
                        <i className={`${item.icon} ml-3 w-4 text-center text-base-content/60`} />
                    </button>
                </li>
            ))}
        </ul>,
        document.body,
    );
}

/* ── NoteActionsMenu (inline sub-component) ── */

function NoteActionsMenu({ onAddTag, onAddToNotebook, onLink, onMove, onCopy, onArchive, onTrash, isArchived }: {
    onAddTag: () => void;
    onAddToNotebook: () => void;
    onLink: () => void;
    onMove: () => void;
    onCopy: () => void;
    onArchive: () => void;
    onTrash: () => void;
    isArchived: boolean;
}) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);

    const items: PortalMenuItem[] = [
        { label: 'Add Tag', icon: 'fa-solid fa-tag', onClick: onAddTag },
        { label: 'Add to Notebook', icon: 'fa-solid fa-book', onClick: onAddToNotebook },
        { label: 'Link to...', icon: 'fa-solid fa-link', onClick: onLink },
        { label: 'Move to...', icon: 'fa-solid fa-right-from-bracket', onClick: onMove },
        { label: 'Make a Copy', icon: 'fa-solid fa-copy', onClick: onCopy },
        { label: isArchived ? 'Unarchive' : 'Archive', icon: 'fa-solid fa-archive', onClick: onArchive },
        { label: 'Move to Trash', icon: 'fa-solid fa-trash', onClick: onTrash, danger: true },
    ];

    return (
        <>
            <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="btn btn-ghost btn-circle btn-sm" title="More actions">
                <i className="fa-solid fa-ellipsis-vertical" />
            </button>
            <PortalMenu items={items} btnRef={btnRef} open={open} onClose={() => setOpen(false)} />
        </>
    );
}

/* ── BulkActionsToolbar ── */

function BulkActionsToolbar({ count, isArchived, onCategorize, onAddTag, onAddToNotebook, onLink, onMove, onCopy, onArchive, onTrash }: {
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
}) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);

    const items: PortalMenuItem[] = [
        { label: 'Categorize', icon: 'fa-solid fa-bolt', onClick: onCategorize },
        { label: 'Add Tag', icon: 'fa-solid fa-tag', onClick: onAddTag },
        { label: 'Add to Notebook', icon: 'fa-solid fa-book', onClick: onAddToNotebook },
        { label: 'Link to...', icon: 'fa-solid fa-link', onClick: onLink },
        { label: 'Move to...', icon: 'fa-solid fa-right-from-bracket', onClick: onMove },
        { label: 'Make a Copy', icon: 'fa-solid fa-copy', onClick: onCopy },
        { label: isArchived ? 'Unarchive' : 'Archive', icon: 'fa-solid fa-archive', onClick: onArchive },
        { label: 'Move to Trash', icon: 'fa-solid fa-trash', onClick: onTrash, danger: true },
    ];

    return (
        <div className="mb-2 mr-2 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
            <span className="text-xs font-medium text-primary">{count} selected</span>
            <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="btn btn-primary btn-xs gap-1">
                Actions <i className="fa-solid fa-chevron-down text-[8px]" />
            </button>
            <PortalMenu items={items} btnRef={btnRef} open={open} onClose={() => setOpen(false)} />
        </div>
    );
}
