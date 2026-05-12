import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { usePage } from '@inertiajs/react';
import Modal, { ModalFooter } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import TagPickerModal from '@alexandria/components/notes/modals/TagPickerModal';
import LinkMoveModal from '@alexandria/components/notes/modals/LinkMoveModal';
import HistoryModal from '@alexandria/components/notes/modals/HistoryModal';
import NotebookSelectorModal, { type NotebookData } from '@alexandria/components/notes/modals/NotebookSelectorModal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { relativeDate } from '@alexandria/lib/formatDate';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import { useNoteActions } from '@alexandria/hooks/useNoteActions';
import useT from '@alexandria/hooks/useT';

import type { Note } from '@alexandria/types/notes-dashboard';

interface NoteModalProps {
    open: boolean;
    onClose: () => void;
    note: Note | null;
    projectId: number;
    mode: 'view' | 'create';
    onSaved: () => void;
    onRefresh?: () => void;
    /** Context for create mode — the notable this note attaches to.
     * Defaults to the project itself (the current Dashboard behavior).
     * Drawer-invoked create passes blueprint/entry for scoped notes. */
    contextType?: 'project' | 'blueprint' | 'entry';
    contextId?: number;
}

// Color value → swatch hex map. Display labels resolve via t() at the
// render site so the picker stays localizable without coupling the
// data shape to English strings.
const NOTE_COLORS: { value: string; hex: string }[] = [
    { value: 'red', hex: '#ef4444' },
    { value: 'orange', hex: '#f97316' },
    { value: 'yellow', hex: '#eab308' },
    { value: 'green', hex: '#22c55e' },
    { value: 'teal', hex: '#14b8a6' },
    { value: 'blue', hex: '#3b82f6' },
    { value: 'cerulean', hex: '#0ea5e9' },
    { value: 'purple', hex: '#a855f7' },
    { value: 'pink', hex: '#ec4899' },
    { value: 'brown', hex: '#92400e' },
    { value: 'gray', hex: '#6b7280' },
];


function toDatetimeLocal(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(' ', 'T').slice(0, 16);
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };

export default function NoteModal({ open, onClose, note, projectId, mode, onSaved, onRefresh, contextType = 'project', contextId }: NoteModalProps) {
    const t = useT();
    const auth = (usePage().props as unknown as { auth?: { preferences?: { auto_save?: boolean } } }).auth;
    const autoSave = auth?.preferences?.auto_save ?? true;
    const noteActions = useNoteActions(projectId);
    // Mobile pass: tighter padding, smaller header icon, smaller heading,
    // truncate the author/created subtitle so it stays on one line.
    const isMobileNoteModal = useMediaQuery('(max-width: 1023px)');

    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [noteDate, setNoteDate] = useState('');
    const [pinned, setPinned] = useState(false);
    const [noteColor, setNoteColor] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const needsRefresh = useRef(false);

    // Track originals to detect changes
    const origTitle = useRef('');
    const origText = useRef('');
    const origDate = useRef('');

    // Live metrics (debounced from text state)
    const [liveChars, setLiveChars] = useState(0);
    const [liveWords, setLiveWords] = useState(0);
    const statsDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        if (statsDebounce.current) clearTimeout(statsDebounce.current);
        statsDebounce.current = setTimeout(() => {
            setLiveChars(text.length);
            setLiveWords(text.trim() ? text.trim().split(/\s+/).length : 0);
        }, 300);
        return () => clearTimeout(statsDebounce.current);
    }, [text]);

    // Local mirror of `note.tags` so optimistic add/remove from the
    // tag picker persists for the duration of the modal — not just
    // inside the picker. Without this, closing + reopening the picker
    // resets to the parent's prop value (which is only refetched when
    // NoteModal itself closes), making it look like the save didn't
    // stick. Re-syncs from the prop whenever the modal re-opens with
    // a new note.
    const [localTags, setLocalTags] = useState<string[]>(note?.tags ?? []);

    // Sub-modals
    const [showTags, setShowTags] = useState(false);
    const [linkAction, setLinkAction] = useState<'link' | 'move' | 'copy' | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [historyRecords, setHistoryRecords] = useState<Array<{ id: number; previous_title: string | null; previous_text: string | null; previous_note_date: string | null; created_at: string | null; user: { name: string; display_name: string | null } | null }>>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showNotebook, setShowNotebook] = useState(false);
    const [modalNotebooks, setModalNotebooks] = useState<NotebookData[]>([]);

    useEffect(() => {
        if (!open) return;
        if (note) {
            const tt = note.title ?? '';
            const x = note.text ?? '';
            const d = toDatetimeLocal(note.note_date);
            setTitle(tt);
            setText(x);
            setNoteDate(d);
            setPinned(note.is_pinned);
            setNoteColor(note.color ?? null);
            setLocalTags(note.tags ?? []);
            needsRefresh.current = false;
            origTitle.current = tt;
            origText.current = x;
            origDate.current = d;
        } else {
            setTitle('');
            setText('');
            setNoteDate('');
            origTitle.current = '';
            origText.current = '';
            origDate.current = '';
        }
    }, [open, note]);

    const isEdit = mode === 'view' && note !== null;
    const hasChanges = title !== origTitle.current || text !== origText.current || noteDate !== origDate.current;

    const saveNote = useCallback(async () => {
        if (saving) return;
        if (!text.trim()) return;
        setSaving(true);
        try {
            const body = isEdit
                ? { title, text, note_date: noteDate || null, color: noteColor }
                : { title, text, note_date: noteDate || null, color: noteColor, context_type: contextType, context_id: contextId ?? projectId };

            const url = isEdit
                ? `/api/v1/projects/${projectId}/notes/${note!.id}`
                : `/api/v1/projects/${projectId}/notes`;

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify(body),
            });

            if (response.ok) {
                origTitle.current = title;
                origText.current = text;
                origDate.current = noteDate;
                onSaved();
            }
        } finally {
            setSaving(false);
        }
    }, [saving, text, title, note, projectId, onSaved, noteColor, contextType, contextId]);

    function handleClose() {
        const doClose = () => {
            if (needsRefresh.current) onRefresh?.();
            onClose();
        };
        if (autoSave && hasChanges && text.trim()) {
            void saveNote().then(doClose);
        } else {
            doClose();
        }
    }

    async function togglePin() {
        if (!note) return;
        setPinned((p) => !p);
        needsRefresh.current = true;
        await noteActions.togglePin(note.id);
    }

    async function generateTitle() {
        if (!note) return;
        const next = await noteActions.generateTitle(note.id);
        if (next !== null) {
            setTitle(next);
            origTitle.current = next;
        }
        needsRefresh.current = true;
    }

    async function openHistory() {
        if (!note) return;
        setHistoryLoading(true);
        setHistoryRecords([]);
        setShowHistory(true);
        try {
            setHistoryRecords(await noteActions.fetchHistory(note.id));
        } finally {
            setHistoryLoading(false);
        }
    }

    async function openNotebookPicker() {
        try {
            const res = await fetch(`/api/v1/projects/${projectId}/notebooks`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (res.ok) setModalNotebooks(await res.json());
        } catch { /* ignore */ }
        setShowNotebook(true);
    }

    async function addToNotebook(notebookId: number) {
        if (!note) return;
        await fetch(`/api/v1/projects/${projectId}/notebooks/${notebookId}/notes`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ note_id: note.id }),
        });
        setShowNotebook(false);
        needsRefresh.current = true;
    }

    /**
     * Toggle a tag on the current note. Flips `localTags` optimistically
     * so the picker + badge row update before the network round-trip,
     * then fires the actual write. On API failure (non-2xx response or
     * network error), revert the optimistic update so the UI matches
     * the server-of-truth.
     */
    async function handleTagToggle(tag: string, currentlySelected: boolean) {
        if (!note) return;
        const before = localTags;
        if (currentlySelected) {
            setLocalTags((prev) => prev.filter((s) => s !== tag));
        } else {
            setLocalTags((prev) => prev.includes(tag) ? prev : [...prev, tag]);
        }
        const url = currentlySelected
            ? `/api/v1/projects/${projectId}/notes/${note.id}/tags/${encodeURIComponent(tag)}`
            : `/api/v1/projects/${projectId}/notes/${note.id}/tags`;
        const init: RequestInit = currentlySelected
            ? { method: 'DELETE', headers: csrfHeaders(), credentials: 'same-origin' }
            : { method: 'POST', headers: csrfHeaders(), credentials: 'same-origin', body: JSON.stringify({ tag }) };
        const res = await fetch(url, init).catch((err) => {
            console.error('[NoteModal] handleTagToggle network error', err);
            return null;
        });
        if (!res || !res.ok) {
            console.error('[NoteModal] handleTagToggle failed', res?.status);
            setLocalTags(before);
            return;
        }
        needsRefresh.current = true;
    }

    async function handleTagCreate(tag: string) {
        if (!note) return;
        const before = localTags;
        setLocalTags((prev) => prev.includes(tag) ? prev : [...prev, tag]);
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${note.id}/tags`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ tag }),
        }).catch((err) => {
            console.error('[NoteModal] handleTagCreate network error', err);
            return null;
        });
        if (!res || !res.ok) {
            console.error('[NoteModal] handleTagCreate failed', res?.status);
            setLocalTags(before);
            return;
        }
        needsRefresh.current = true;
    }

    /* ── Reusable theme-token style snippets ─────────────────────────── */

    const headerIconWrapStyle: CSSProperties = {
        background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)',
        color: 'var(--theme-brand-secondary-500)',
        borderRadius: '9999px',
    };

    const inputStyle: CSSProperties = {
        background: 'var(--theme-base-surface)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
        borderRadius: 'var(--theme-radius-input)',
        color: 'var(--theme-base-content)',
        padding: '0.5rem 0.75rem',
    };

    const metricsRowStyle: CSSProperties = {
        background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
        borderRadius: 'var(--theme-radius-button)',
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    };

    return (
        <>
            <Modal open={open} onClose={handleClose} maxWidth="max-w-3xl">
                {/* Header — tighter on mobile so the avatar + title +
                    4 action buttons fit on one row at 375px without the
                    subtitle wrapping. The author/created line is forced
                    single-line via truncate; on desktop it stays its
                    original size. */}
                <div
                    className={`flex flex-shrink-0 items-center ${isMobileNoteModal ? 'gap-2 px-3 py-2.5' : 'gap-4 px-6 py-4'}`}
                    style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }}
                >
                    <div
                        className={`flex flex-shrink-0 items-center justify-center ${isMobileNoteModal ? 'h-8 w-8' : 'h-10 w-10'}`}
                        style={headerIconWrapStyle}
                    >
                        <i className="fa-solid fa-sticky-note" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className={`font-bold ${isMobileNoteModal ? 'text-sm' : 'text-lg'}`}>
                            {isEdit ? t('notes.modal.edit_title') : t('notes.modal.create_title')}
                        </h3>
                        {isEdit && note?.creator && (
                            <p className={`truncate ${isMobileNoteModal ? 'text-[10px]' : 'text-xs'}`} style={microText}>
                                {t('notes.modal.author_prefix')} {note.creator.display_name ?? note.creator.name}
                                {note.created_at && (
                                    <> &middot; {t('notes.modal.created_prefix')} {relativeDate(note.created_at)}</>
                                )}
                            </p>
                        )}
                    </div>
                    <div className={`flex items-center ${isMobileNoteModal ? 'gap-0.5' : 'gap-1'}`}>
                        {isEdit && note && (
                            <>
                                <Tooltip content={pinned ? t('notes.modal.tooltip.unpin') : t('notes.modal.tooltip.pin')} placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => void togglePin()}
                                        className={`alex-notes-modal-icon-btn ${pinned ? 'alex-notes-modal-icon-btn--active' : ''}`}
                                        aria-label={pinned ? t('notes.modal.tooltip.unpin') : t('notes.modal.tooltip.pin')}
                                    >
                                        <i className="fa-solid fa-thumbtack" />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('notes.modal.tooltip.generate_title')} placement="bottom">
                                    <button
                                        type="button"
                                        onClick={() => void generateTitle()}
                                        className="alex-notes-modal-icon-btn"
                                        aria-label={t('notes.modal.tooltip.generate_title')}
                                    >
                                        <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                                    </button>
                                </Tooltip>
                                <DropdownMenu
                                    align="right"
                                    items={[
                                        { label: t('notes.modal.menu.tags'), icon: 'fa-tag', onClick: () => setShowTags(true) },
                                        { label: t('notes.modal.menu.add_to_notebook'), icon: 'fa-book', onClick: () => void openNotebookPicker() },
                                        { label: t('notes.modal.menu.history'), icon: 'fa-clock-rotate-left', onClick: () => void openHistory() },
                                        { divider: true },
                                        { label: t('notes.modal.menu.link_to'), icon: 'fa-link', onClick: () => setLinkAction('link') },
                                        { label: t('notes.modal.menu.move_to'), icon: 'fa-right-from-bracket', onClick: () => setLinkAction('move') },
                                        { label: t('notes.modal.menu.copy_to'), icon: 'fa-copy', onClick: () => setLinkAction('copy') },
                                    ]}
                                />
                            </>
                        )}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="alex-notes-modal-icon-btn ml-1"
                            aria-label={t('notes.modal.tooltip.close')}
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                {/* Body — flex-1 + overflow-y-auto so the panel can
                    fit a long form on mobile (the Modal panel itself
                    caps at calc(100vh - 2rem) and lays out flex-col,
                    so this section absorbs the leftover space and
                    scrolls internally between the fixed header and
                    footer). */}
                <div className={`flex-1 overflow-y-auto ${isMobileNoteModal ? 'space-y-3 px-3 py-3' : 'space-y-4 px-6 py-5'}`}>
                    {/* Location & Status info (edit mode) */}
                    {isEdit && note && (
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Status */}
                            <span
                                className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium"
                                style={{
                                    background: note.status === 'archived'
                                        ? 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)'
                                        : 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
                                    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
                                    borderRadius: 'var(--theme-radius-badge)',
                                }}
                            >
                                {note.status === 'archived' ? t('notes.modal.badge.archived') : t('notes.modal.badge.active')}
                            </span>
                            {pinned && (
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                                    style={{
                                        background: 'var(--theme-brand-primary-500)',
                                        color: 'var(--theme-brand-primary-content)',
                                        borderRadius: 'var(--theme-radius-badge)',
                                    }}
                                >
                                    <i className="fa-solid fa-thumbtack text-[10px]" /> {t('notes.modal.badge.pinned')}
                                </span>
                            )}
                            {/* Locations — wrapped in Tooltip so hovering
                                reveals "<Type>: <Name>" via the themed
                                popover, distinguishing each badge type
                                (notebook / blueprint / entry / project)
                                from the tag pills next to them. */}
                            {note.locations?.map((loc) => {
                                let bg = 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)';
                                let color = 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)';
                                let border = '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)';
                                let tooltipVariant: 'secondary' | 'accent' | 'default' = 'default';
                                if (loc.type === 'blueprint') {
                                    bg = 'transparent';
                                    color = 'var(--theme-brand-secondary-500)';
                                    border = '1px solid color-mix(in srgb, var(--theme-brand-secondary-500) 50%, transparent)';
                                    tooltipVariant = 'secondary';
                                } else if (loc.type === 'entry') {
                                    bg = 'transparent';
                                    color = 'var(--theme-brand-accent-500)';
                                    border = '1px solid color-mix(in srgb, var(--theme-brand-accent-500) 50%, transparent)';
                                    tooltipVariant = 'accent';
                                }
                                const typeLabel = t(`notes.modal.label.${loc.type}`);
                                return (
                                    <Tooltip
                                        key={`${loc.type}-${loc.id}`}
                                        content={`${typeLabel}: ${loc.name}`}
                                        placement="top"
                                        variant={tooltipVariant}
                                    >
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                                            style={{ background: bg, color, border, borderRadius: 'var(--theme-radius-badge)' }}
                                        >
                                            {loc.icon && <i className={`${loc.icon.includes(' ') ? loc.icon : `fa-solid ${loc.icon}`} text-[10px]`} />}
                                            {loc.name}
                                            {loc.processing_status === 'pending' && (
                                                <span className="ml-0.5 text-[10px]" style={{ color: 'var(--theme-status-warning-stroke)' }}>
                                                    {t('notes.modal.badge.pending')}
                                                </span>
                                            )}
                                        </span>
                                    </Tooltip>
                                );
                            })}
                            {/* Tags — `fa-tag` icon prefix + Tooltip
                                "Tag: <name>" distinguishes them from the
                                notebook/blueprint/entry location badges
                                in the same row, since they otherwise
                                look like generic pills. Hovering the
                                pill reveals an inline X for live tag
                                removal (no picker round-trip). */}
                            {localTags.map((tag) => (
                                <Tooltip
                                    key={tag}
                                    content={`${t('notes.modal.label.tag')}: ${tag}`}
                                    placement="top"
                                    variant="primary"
                                >
                                    <span
                                        className="alex-notes-tag-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium"
                                        style={{
                                            color: 'var(--theme-brand-primary-500)',
                                            background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent), color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent))',
                                            borderRadius: 'var(--theme-radius-badge)',
                                        }}
                                    >
                                        <i className="fa-solid fa-tag text-[9px]" aria-hidden="true" />
                                        {tag}
                                        <button
                                            type="button"
                                            className="alex-notes-tag-x"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleTagToggle(tag, true);
                                            }}
                                            aria-label={t('notes.modal.tag_remove_aria').replace(':tag', tag)}
                                        >
                                            <i className="fa-solid fa-xmark text-[10px]" aria-hidden="true" />
                                        </button>
                                    </span>
                                </Tooltip>
                            ))}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">{t('notes.modal.field.title')}</label>
                        <input
                            type="text"
                            className="w-full text-sm"
                            style={inputStyle}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('notes.modal.field.title_placeholder')}
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            {t('notes.modal.field.content')}{' '}
                            <span style={{ color: 'var(--theme-status-error-stroke)' }}>*</span>
                        </label>
                        <textarea
                            className="w-full text-sm min-h-[200px]"
                            style={{ ...inputStyle, resize: 'vertical' }}
                            rows={10}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={t('notes.modal.field.content_placeholder')}
                        />
                    </div>

                    {/* Note Date */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">{t('notes.modal.field.note_date')}</label>
                        <input
                            type="datetime-local"
                            className="w-56 text-sm"
                            style={{ ...inputStyle, paddingRight: '0.5rem' }}
                            value={noteDate}
                            onChange={(e) => setNoteDate(e.target.value)}
                        />
                        <style>{`
                            input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                                margin-left: 0.5rem;
                                padding: 0.25rem;
                            }
                        `}</style>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">{t('notes.modal.field.color')}</label>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setNoteColor(null)}
                                className={`alex-notes-modal-color-btn alex-notes-modal-color-btn--none ${!noteColor ? 'alex-notes-modal-color-btn--active' : ''}`}
                                title={t('notes.modal.color.none')}
                                aria-label={t('notes.modal.color.none')}
                            >
                                {!noteColor && <i className="fa-solid fa-xmark text-[8px]" style={microText} />}
                            </button>
                            {NOTE_COLORS.map((c) => {
                                const label = t(`notes.modal.color.${c.value}`);
                                return (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setNoteColor(c.value)}
                                        className={`alex-notes-modal-color-btn ${noteColor === c.value ? 'alex-notes-modal-color-btn--active' : ''}`}
                                        style={{ backgroundColor: c.hex }}
                                        title={label}
                                        aria-label={label}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-4 px-4 py-3 text-xs" style={metricsRowStyle}>
                        <span><i className="fa-solid fa-font mr-1.5" />{liveChars.toLocaleString()} {t('notes.modal.metric.chars')}</span>
                        <span><i className="fa-solid fa-paragraph mr-1.5" />{liveWords.toLocaleString()} {t('notes.modal.metric.words')}</span>
                        {isEdit && note?.updated_at && (
                            <span><i className="fa-solid fa-pen mr-1.5" />{t('notes.modal.metric.updated_prefix')} {relativeDate(note.updated_at)}</span>
                        )}
                        {isEdit && localTags.length > 0 && (
                            <span>
                                <i className="fa-solid fa-tag mr-1.5" />
                                {localTags.length}{' '}
                                {localTags.length === 1 ? t('notes.modal.metric.tag_singular') : t('notes.modal.metric.tag_plural')}
                            </span>
                        )}
                        {isEdit && note?.locations && (
                            <span>
                                <i className="fa-solid fa-location-dot mr-1.5" />
                                {note.locations.length}{' '}
                                {note.locations.length === 1 ? t('notes.modal.metric.location_singular') : t('notes.modal.metric.location_plural')}
                            </span>
                        )}
                    </div>

                    {/* Link Previews */}
                    {isEdit && note?.links && note.links.filter((l) => l.status === 'fetched').length > 0 && (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium">{t('notes.modal.field.links')}</label>
                            <div className="space-y-2">
                                {note.links.filter((l) => l.status === 'fetched').map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="alex-notes-modal-link-preview"
                                    >
                                        {link.image_url && (
                                            <img
                                                src={link.image_url}
                                                alt=""
                                                className="h-16 w-24 flex-shrink-0 rounded-md object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                {link.favicon_url && (
                                                    <img
                                                        src={link.favicon_url}
                                                        alt=""
                                                        className="h-4 w-4 flex-shrink-0"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                )}
                                                {link.site_name && (
                                                    <span className="text-[10px] uppercase tracking-wider" style={microText}>
                                                        {link.site_name}
                                                    </span>
                                                )}
                                            </div>
                                            <p
                                                className="truncate text-sm font-medium"
                                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)' }}
                                            >
                                                {link.title ?? link.url}
                                            </p>
                                            {link.description && (
                                                <p className="mt-0.5 line-clamp-2 text-xs" style={fadedText}>
                                                    {link.description}
                                                </p>
                                            )}
                                        </div>
                                        <i
                                            className="fa-solid fa-arrow-up-right-from-square mt-1 flex-shrink-0 text-[10px]"
                                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <ModalFooter>
                    <button
                        className="alex-btn alex-btn--ghost"
                        style={{
                            borderRadius: 'var(--theme-radius-button)',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                        }}
                        onClick={() => onClose()}
                        disabled={saving}
                    >
                        {t('notes.modal.discard')}
                    </button>
                    <button
                        className="alex-btn alex-btn--primary"
                        style={{
                            borderRadius: 'var(--theme-radius-button)',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            gap: '0.5rem',
                        }}
                        onClick={() => void saveNote().then(() => onClose())}
                        disabled={saving || !text.trim()}
                    >
                        {saving && <i className="fa-solid fa-circle-notch fa-spin text-xs" />}
                        {t('notes.modal.save')}
                    </button>
                </ModalFooter>
            </Modal>

            {/* Sub-modals */}
            {isEdit && note && (
                <>
                    <TagPickerModal
                        open={showTags}
                        onClose={() => { setShowTags(false); needsRefresh.current = true; }}
                        projectId={projectId}
                        noteTags={localTags}
                        onToggle={handleTagToggle}
                        onCreate={handleTagCreate}
                    />

                    {linkAction && (
                        <LinkMoveModal
                            open={true}
                            onClose={() => setLinkAction(null)}
                            projectId={projectId}
                            noteId={note.id}
                            action={linkAction}
                            onComplete={() => { setLinkAction(null); needsRefresh.current = true; }}
                        />
                    )}

                    <HistoryModal
                        open={showHistory}
                        onClose={() => setShowHistory(false)}
                        historyRecords={historyRecords}
                        historyLoading={historyLoading}
                        projectId={projectId}
                        noteId={note.id}
                    />

                    <NotebookSelectorModal
                        open={showNotebook}
                        onClose={() => setShowNotebook(false)}
                        notebooks={modalNotebooks}
                        activeNotebookId={null}
                        onSelectNotebook={() => {}}
                        onNewNotebook={async () => {
                            const name = prompt(t('notes.modal.prompt.notebook_name'));
                            if (!name) return;
                            await fetch(`/api/v1/projects/${projectId}/notebooks`, {
                                method: 'POST',
                                headers: csrfHeaders(),
                                credentials: 'same-origin',
                                body: JSON.stringify({ title: name }),
                            });
                            void openNotebookPicker();
                        }}
                        onLinkNotebook={(nbId) => void addToNotebook(nbId)}
                        onMoveNotebook={(nbId) => void addToNotebook(nbId)}
                    />
                </>
            )}
        </>
    );
}
