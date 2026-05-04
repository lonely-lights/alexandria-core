import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useNoteActions } from '@alexandria/hooks/useNoteActions';

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

const NOTE_COLORS: { value: string; label: string; hex: string }[] = [
    { value: 'red', label: 'Red', hex: '#ef4444' },
    { value: 'orange', label: 'Orange', hex: '#f97316' },
    { value: 'yellow', label: 'Yellow', hex: '#eab308' },
    { value: 'green', label: 'Green', hex: '#22c55e' },
    { value: 'teal', label: 'Teal', hex: '#14b8a6' },
    { value: 'blue', label: 'Blue', hex: '#3b82f6' },
    { value: 'cerulean', label: 'Cerulean', hex: '#0ea5e9' },
    { value: 'purple', label: 'Purple', hex: '#a855f7' },
    { value: 'pink', label: 'Pink', hex: '#ec4899' },
    { value: 'brown', label: 'Brown', hex: '#92400e' },
    { value: 'gray', label: 'Gray', hex: '#6b7280' },
];


function toDatetimeLocal(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(' ', 'T').slice(0, 16);
}

export default function NoteModal({ open, onClose, note, projectId, mode, onSaved, onRefresh, contextType = 'project', contextId }: NoteModalProps) {
    const auth = (usePage().props as unknown as { auth?: { preferences?: { auto_save?: boolean } } }).auth;
    const autoSave = auth?.preferences?.auto_save ?? true;
    const noteActions = useNoteActions(projectId);

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
            const t = note.title ?? '';
            const x = note.text ?? '';
            const d = toDatetimeLocal(note.note_date);
            setTitle(t);
            setText(x);
            setNoteDate(d);
            setPinned(note.is_pinned);
            setNoteColor(note.color ?? null);
            needsRefresh.current = false;
            origTitle.current = t;
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

    async function handleTagToggle(tag: string, currentlySelected: boolean) {
        if (!note) return;
        if (currentlySelected) {
            await fetch(`/api/v1/projects/${projectId}/notes/${note.id}/tags/${encodeURIComponent(tag)}`, {
                method: 'DELETE', headers: csrfHeaders(), credentials: 'same-origin',
            });
        } else {
            await fetch(`/api/v1/projects/${projectId}/notes/${note.id}/tags`, {
                method: 'POST', headers: csrfHeaders(), credentials: 'same-origin',
                body: JSON.stringify({ tag }),
            });
        }
    }

    async function handleTagCreate(tag: string) {
        if (!note) return;
        await fetch(`/api/v1/projects/${projectId}/notes/${note.id}/tags`, {
            method: 'POST', headers: csrfHeaders(), credentials: 'same-origin',
            body: JSON.stringify({ tag }),
        });
    }

    return (
        <>
            <Modal open={open} onClose={handleClose} maxWidth="max-w-3xl">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-base-content/10 px-6 py-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20">
                        <i className="fa-solid fa-sticky-note text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold">{isEdit ? 'Edit Note' : 'New Note'}</h3>
                        {isEdit && note?.creator && (
                            <p className="text-xs text-base-content/40">
                                By {note.creator.display_name ?? note.creator.name}
                                {note.created_at && <> &middot; Created {relativeDate(note.created_at)}</>}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {isEdit && note && (
                            <>
                                <Tooltip content={pinned ? 'Unpin' : 'Pin'} placement="bottom">
                                    <button type="button" onClick={() => void togglePin()} className={`btn btn-ghost btn-sm btn-circle ${pinned ? 'text-primary' : ''}`}>
                                        <i className="fa-solid fa-thumbtack" />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Generate title" placement="bottom">
                                    <button type="button" onClick={() => void generateTitle()} className="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-primary">
                                        <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                                    </button>
                                </Tooltip>
                                <DropdownMenu
                                    align="right"
                                    items={[
                                        { label: 'Tags', icon: 'fa-tag', onClick: () => setShowTags(true) },
                                        { label: 'Add to Notebook', icon: 'fa-book', onClick: () => void openNotebookPicker() },
                                        { label: 'History', icon: 'fa-clock-rotate-left', onClick: () => void openHistory() },
                                        { divider: true },
                                        { label: 'Link to...', icon: 'fa-link', onClick: () => setLinkAction('link') },
                                        { label: 'Move to...', icon: 'fa-right-from-bracket', onClick: () => setLinkAction('move') },
                                        { label: 'Copy to...', icon: 'fa-copy', onClick: () => setLinkAction('copy') },
                                    ]}
                                />
                            </>
                        )}
                        <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle ml-1">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="space-y-4 px-6 py-5">
                    {/* Location & Status info (edit mode) */}
                    {isEdit && note && (
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Status */}
                            <span className={`badge ${note.status === 'archived' ? 'badge-ghost' : 'badge-neutral'}`}>
                                {note.status === 'archived' ? 'Archived' : 'Active'}
                            </span>
                            {pinned && (
                                <span className="badge badge-primary gap-1">
                                    <i className="fa-solid fa-thumbtack text-[10px]" /> Pinned
                                </span>
                            )}
                            {/* Locations */}
                            {note.locations?.map((loc) => (
                                <span
                                    key={`${loc.type}-${loc.id}`}
                                    className={`badge gap-1 ${loc.type === 'blueprint' ? 'badge-secondary badge-outline' : loc.type === 'entry' ? 'badge-accent badge-outline' : 'badge-ghost'}`}
                                >
                                    {loc.icon && <i className={`${loc.icon.includes(' ') ? loc.icon : `fa-solid ${loc.icon}`} text-[10px]`} />}
                                    {loc.name}
                                    {loc.processing_status === 'pending' && (
                                        <span className="ml-0.5 text-[10px] text-warning">pending</span>
                                    )}
                                </span>
                            ))}
                            {/* Tags */}
                            {note.tags?.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-lg px-3 py-1 text-xs font-medium text-primary"
                                    style={{ background: 'linear-gradient(90deg, oklch(var(--p) / 0.2), oklch(var(--p) / 0.1))' }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">Title</label>
                        <input
                            type="text"
                            className="input input-bordered w-full rounded-xl"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Optional title"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Content <span className="text-error">*</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered w-full rounded-xl min-h-[200px]"
                            rows={10}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Write your note here…"
                        />
                    </div>

                    {/* Note Date */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">Note Date</label>
                        <input
                            type="datetime-local"
                            className="input input-bordered w-56 rounded-xl pr-2"
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
                        <label className="mb-1 block text-sm font-medium">Color</label>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setNoteColor(null)}
                                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${!noteColor ? 'border-primary scale-110' : 'border-base-300 hover:border-base-content/30'}`}
                                title="None"
                            >
                                {!noteColor && <i className="fa-solid fa-xmark text-[8px] text-base-content/40" />}
                            </button>
                            {NOTE_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setNoteColor(c.value)}
                                    className={`h-7 w-7 flex-shrink-0 rounded-full border-2 transition-all ${noteColor === c.value ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-4 rounded-lg border border-base-200/50 bg-base-200/20 px-4 py-3 text-xs text-base-content/50 transition-all">
                        <span><i className="fa-solid fa-font mr-1.5" />{liveChars.toLocaleString()} chars</span>
                        <span><i className="fa-solid fa-paragraph mr-1.5" />{liveWords.toLocaleString()} words</span>
                        {isEdit && note?.updated_at && <span><i className="fa-solid fa-pen mr-1.5" />Updated {relativeDate(note.updated_at)}</span>}
                        {isEdit && note?.tags && note.tags.length > 0 && <span><i className="fa-solid fa-tag mr-1.5" />{note.tags.length} tag{note.tags.length !== 1 ? 's' : ''}</span>}
                        {isEdit && note?.locations && <span><i className="fa-solid fa-location-dot mr-1.5" />{note.locations.length} location{note.locations.length !== 1 ? 's' : ''}</span>}
                    </div>

                    {/* Link Previews */}
                    {isEdit && note?.links && note.links.filter((l) => l.status === 'fetched').length > 0 && (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium">Links</label>
                            <div className="space-y-2">
                                {note.links.filter((l) => l.status === 'fetched').map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex gap-3 rounded-lg border border-base-300/50 bg-base-100 p-3 transition-colors hover:border-primary/30 hover:bg-base-200/30"
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
                                                    <span className="text-[10px] uppercase tracking-wider text-base-content/40">{link.site_name}</span>
                                                )}
                                            </div>
                                            <p className="truncate text-sm font-medium text-base-content/80">
                                                {link.title ?? link.url}
                                            </p>
                                            {link.description && (
                                                <p className="mt-0.5 line-clamp-2 text-xs text-base-content/50">
                                                    {link.description}
                                                </p>
                                            )}
                                        </div>
                                        <i className="fa-solid fa-arrow-up-right-from-square mt-1 flex-shrink-0 text-[10px] text-base-content/30" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <ModalFooter>
                    <button className="btn btn-ghost" onClick={() => onClose()} disabled={saving}>
                        Discard
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => void saveNote().then(() => onClose())}
                        disabled={saving || !text.trim()}
                    >
                        {saving && <span className="loading loading-spinner loading-sm" />}
                        Save
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
                        noteTags={note.tags ?? []}
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
                            const name = prompt('Notebook name:');
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
