import { useState, useEffect, useRef, useCallback, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import NotebookFormModal, { type NotebookFormData } from '@alexandria/components/notes/modals/NotebookFormModal';
import LinkEntriesModal from '@alexandria/components/notes/modals/LinkEntriesModal';
import { useSortableReorder } from '@alexandria/hooks/useSortableReorder';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT, { type Translator } from '@alexandria/hooks/useT';

// Threshold at which the filter input becomes useful — below this the
// grid is scannable without one.
const SEARCH_THRESHOLD = 6;

interface LinkedEntry {
    id: number;
    name: string;
    slug: string;
    blueprint_slug: string | null;
    blueprint_icon: string | null;
}

interface NotebookItem {
    id: number;
    title: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    is_pinned: boolean;
    notes_count: number;
    linked_entries?: LinkedEntry[];
    created_at: string | null;
}

interface NotebooksViewProps {
    projectId: number;
    /** Bumped by the parent when a notebook was created elsewhere
     * (e.g., the page-level "New Notebook" button). Triggers a refetch. */
    refetchNonce?: number;
    onSelectNotebook: (notebookId: number, title: string) => void;
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };

export default function NotebooksView({ projectId, refetchNonce, onSelectNotebook }: NotebooksViewProps) {
    const t = useT();
    const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<NotebookItem | null>(null);
    const [filter, setFilter] = useState('');
    // Link-entries picker — opened from a tile's overflow menu. The
    // picker self-loads paginated entries and blueprint facets; we
    // just hand it the notebook reference so it knows what to attach
    // to on commit.
    const [linkingNotebook, setLinkingNotebook] = useState<NotebookItem | null>(null);

    const fetchNotebooks = useCallback((silent: boolean = false) => {
        if (!silent) setLoading(true);
        fetch(`/api/v1/projects/${projectId}/notebooks`, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data: NotebookItem[]) => {
                setNotebooks(Array.isArray(data) ? data : []);
                if (!silent) setLoading(false);
            })
            .catch(() => { if (!silent) setLoading(false); });
    }, [projectId]);

    // Initial fetch + refetch on parent-requested nonce bumps. `> 0`
    // guard skips the default-undefined case so we don't double-fetch on
    // the very first mount.
    useEffect(() => {
        fetchNotebooks();
    }, [fetchNotebooks]);
    useEffect(() => {
        if (refetchNonce && refetchNonce > 0) fetchNotebooks();
    }, [refetchNonce, fetchNotebooks]);

    function handleSaved(saved: NotebookFormData): void {
        setNotebooks((prev) => {
            const exists = prev.some((n) => n.id === saved.id);
            if (exists) {
                return prev.map((n) => (n.id === saved.id ? { ...n, ...saved } : n));
            }
            // New notebook — server omits linked_entries on create since
            // there aren't any yet; spread defaults so rendering is safe.
            return [...prev, { ...saved, linked_entries: [], created_at: null }];
        });
    }

    async function togglePin(nb: NotebookItem): Promise<void> {
        const nextPinned = !nb.is_pinned;
        // Optimistic update; revert on failure.
        setNotebooks((prev) => prev.map((n) => (n.id === nb.id ? { ...n, is_pinned: nextPinned } : n)));
        const res = await fetch(`/api/v1/projects/${projectId}/notebooks/${nb.id}`, {
            method: 'PUT',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ is_pinned: nextPinned }),
        }).catch(() => null);
        if (!res || !res.ok) {
            setNotebooks((prev) => prev.map((n) => (n.id === nb.id ? { ...n, is_pinned: nb.is_pinned } : n)));
        }
    }

    async function handleDelete(nb: NotebookItem): Promise<void> {
        const message = t('notes.notebooks.delete_confirm').replace(':title', nb.title);
        if (!confirm(message)) return;
        const prev = notebooks;
        // Optimistic remove.
        setNotebooks((p) => p.filter((n) => n.id !== nb.id));
        const res = await fetch(`/api/v1/projects/${projectId}/notebooks/${nb.id}`, {
            method: 'DELETE',
            headers: csrfHeaders(),
            credentials: 'same-origin',
        }).catch(() => null);
        if (!res || !res.ok) {
            setNotebooks(prev);
            alert(t('notes.notebooks.delete_failed'));
        }
    }

    /**
     * Commit a new order for a single band (pinned or unpinned) by
     * reordering locally + flushing the full list to the server. We
     * send `[...pinned, ...unpinned]` so `sort_order` persists
     * coherently across both; `is_pinned` remains the primary sort key
     * server-side, so band membership is preserved.
     */
    function openLinkEntries(nb: NotebookItem): void {
        setLinkingNotebook(nb);
    }

    /**
     * Called by LinkEntriesModal on close with the final selection.
     * Diffs against the notebook's previous links, fires link/unlink
     * writes in parallel, and patches the in-memory notebook so tile
     * badges update without a refetch flash.
     */
    function commitLinkChanges(selectedIds: number[]): void {
        if (!linkingNotebook) return;
        const before = new Set((linkingNotebook.linked_entries ?? []).map((e) => e.id));
        const after = new Set(selectedIds);
        const toAdd = [...after].filter((id) => !before.has(id));
        const toRemove = [...before].filter((id) => !after.has(id));
        const targetId = linkingNotebook.id;
        const previousLinks = linkingNotebook.linked_entries ?? [];

        setLinkingNotebook(null);
        if (toAdd.length === 0 && toRemove.length === 0) return;

        // Optimistic update: keep unchanged links + stub-add new ones.
        // The modal doesn't have blueprint metadata for the newly added
        // entries, so we render them with a minimal LinkedEntry shape;
        // the next fetch will fill in the blueprint icon/slug.
        setNotebooks((prev) => prev.map((nb) => {
            if (nb.id !== targetId) return nb;
            const kept = previousLinks.filter((e) => !toRemove.includes(e.id));
            const added: LinkedEntry[] = toAdd.map((id) => ({
                id,
                name: `#${id}`,
                slug: '',
                blueprint_slug: null,
                blueprint_icon: null,
            }));
            return { ...nb, linked_entries: [...kept, ...added] };
        }));

        const addPromises = toAdd.map((entryId) =>
            fetch(`/api/v1/projects/${projectId}/notebooks/${targetId}/link`, {
                method: 'POST',
                headers: csrfHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({ action: 'link', target_type: 'entry', target_id: entryId }),
            }),
        );
        const removePromises = toRemove.map((entryId) =>
            fetch(`/api/v1/projects/${projectId}/notebooks/${targetId}/unlink`, {
                method: 'POST',
                headers: csrfHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({ target_type: 'entry', target_id: entryId }),
            }),
        );
        // After writes land, silent-refetch to pick up real names/icons
        // for added entries. No loading flash — the grid re-renders
        // in place.
        void Promise.all([...addPromises, ...removePromises]).then(() => fetchNotebooks(true));
    }

    async function reorderBand(band: 'pinned' | 'unpinned', oldIdx: number, newIdx: number): Promise<void> {
        setNotebooks((prev) => {
            const list = prev.filter((n) => n.is_pinned === (band === 'pinned'));
            const other = prev.filter((n) => n.is_pinned !== (band === 'pinned'));
            const [moved] = list.splice(oldIdx, 1);
            list.splice(newIdx, 0, moved);
            const next = band === 'pinned' ? [...list, ...other] : [...other, ...list];
            // Fire-and-forget PATCH; if it fails, the next page load
            // will re-sync from the server's persisted sort_order.
            void fetch(`/api/v1/projects/${projectId}/notebooks/reorder`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({ ordered_ids: next.map((n) => n.id) }),
            });
            return next;
        });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <i
                    className="fa-solid fa-circle-notch fa-spin text-2xl"
                    style={{ color: 'var(--theme-brand-primary-500)' }}
                    aria-hidden="true"
                />
            </div>
        );
    }

    // Client-side title/description search. Only applied when the
    // input is rendered (> SEARCH_THRESHOLD notebooks).
    const filterLower = filter.trim().toLowerCase();
    const visible = !filterLower
        ? notebooks
        : notebooks.filter(
            (n) =>
                n.title.toLowerCase().includes(filterLower)
                || (n.description?.toLowerCase().includes(filterLower) ?? false),
        );

    // Split + sort: pinned first, unpinned second. `notebooks` is
    // already in server-defined sort_order; filter + split preserves
    // that order.
    const pinned = visible.filter((n) => n.is_pinned);
    const unpinned = visible.filter((n) => !n.is_pinned);

    const countLabel = notebooks.length === 1
        ? t('notes.notebooks.singular')
        : t('notes.notebooks.plural');

    const sectionHeaderStyle: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

    return (
        <div className="space-y-6">
            {/* Header row — count on the left, optional search on the
                right. Creation lives in the page header's "New Notebook"
                button so it's reachable from any tab. */}
            <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="font-serif text-2xl font-bold tracking-tight">
                        {t('notes.notebooks.heading')}
                    </h2>
                    {notebooks.length > 0 && (
                        <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{
                                background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                            }}
                        >
                            {notebooks.length} {countLabel}
                        </span>
                    )}
                </div>
                {notebooks.length > SEARCH_THRESHOLD && (
                    <div className="relative w-full sm:w-64">
                        <i
                            className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                            style={microText}
                        />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={t('notes.notebooks.filter_placeholder')}
                            className="w-full pl-9 pr-3 py-1.5 text-sm"
                            style={{
                                background: 'var(--theme-base-surface)',
                                border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
                                borderRadius: 'var(--theme-radius-input)',
                                color: 'var(--theme-base-content)',
                            }}
                        />
                    </div>
                )}
            </div>

            {notebooks.length === 0 ? (
                <div
                    className="py-16 text-center"
                    style={{
                        border: '1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                    }}
                >
                    <i
                        className="fa-solid fa-book mb-3 text-3xl"
                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)' }}
                    />
                    <p className="text-sm" style={microText}>
                        {t('notes.notebooks.empty.heading')}
                    </p>
                    <p
                        className="mt-1 text-xs"
                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 22%, transparent)' }}
                    >
                        {t('notes.notebooks.empty.hint')}
                    </p>
                </div>
            ) : (
                <>
                    {pinned.length > 0 && (
                        <section>
                            <div className="mb-2 flex items-center gap-2">
                                <i
                                    className="fa-solid fa-thumbtack text-[10px]"
                                    style={{ color: 'var(--theme-status-warning-stroke)' }}
                                />
                                <h3
                                    className="text-xs font-semibold uppercase tracking-wider"
                                    style={sectionHeaderStyle}
                                >
                                    {t('notes.notebooks.section.pinned')}
                                </h3>
                            </div>
                            <NotebookGrid
                                notebooks={pinned}
                                onSelect={onSelectNotebook}
                                onEdit={(nb) => { setEditing(nb); setFormOpen(true); }}
                                onPinToggle={togglePin}
                                onDelete={handleDelete}
                                onLinkEntries={openLinkEntries}
                                onReorder={(o, n) => void reorderBand('pinned', o, n)}
                                reorderEnabled={!filterLower}
                                t={t}
                            />
                        </section>
                    )}
                    {unpinned.length > 0 && (
                        <section>
                            {pinned.length > 0 && (
                                <h3
                                    className="mb-2 text-xs font-semibold uppercase tracking-wider"
                                    style={sectionHeaderStyle}
                                >
                                    {t('notes.notebooks.section.all')}
                                </h3>
                            )}
                            <NotebookGrid
                                notebooks={unpinned}
                                onSelect={onSelectNotebook}
                                onEdit={(nb) => { setEditing(nb); setFormOpen(true); }}
                                onPinToggle={togglePin}
                                onDelete={handleDelete}
                                onLinkEntries={openLinkEntries}
                                onReorder={(o, n) => void reorderBand('unpinned', o, n)}
                                reorderEnabled={!filterLower}
                                t={t}
                            />
                        </section>
                    )}
                    {visible.length === 0 && filterLower && (
                        <div
                            className="py-10 text-center text-sm"
                            style={{
                                border: '1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                                borderRadius: 'var(--theme-radius-card)',
                                color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
                            }}
                        >
                            {t('notes.notebooks.no_match').replace(':filter', filter)}
                        </div>
                    )}
                </>
            )}

            <NotebookFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                projectId={projectId}
                notebook={editing}
                onSaved={handleSaved}
            />

            {/* Link-entries picker. Saves are committed on Close, so the
                flow is: open → toggle checkboxes → close to apply.
                LinkEntriesModal self-loads paginated entries + blueprint
                facets; we just provide the seed selection + a commit
                callback. */}
            {linkingNotebook && (
                <LinkEntriesModal
                    open
                    onClose={() => setLinkingNotebook(null)}
                    projectId={projectId}
                    notebookTitle={linkingNotebook.title}
                    initialSelectedIds={(linkingNotebook.linked_entries ?? []).map((e) => e.id)}
                    onCommit={commitLinkChanges}
                />
            )}
        </div>
    );
}

/* ── Grid of tiles ─────────────────────────────────────────────── */

interface NotebookGridProps {
    notebooks: NotebookItem[];
    onSelect: (id: number, title: string) => void;
    onEdit: (nb: NotebookItem) => void;
    onPinToggle: (nb: NotebookItem) => void;
    onDelete: (nb: NotebookItem) => void;
    onLinkEntries: (nb: NotebookItem) => void;
    onReorder: (oldIdx: number, newIdx: number) => void;
    /** When false, drag-to-reorder is disabled (e.g., during filter). */
    reorderEnabled: boolean;
    t: Translator;
}

function NotebookGrid({ notebooks, onSelect, onEdit, onPinToggle, onDelete, onLinkEntries, onReorder, reorderEnabled, t }: NotebookGridProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    useSortableReorder(gridRef, onReorder, reorderEnabled);

    return (
        <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notebooks.map((nb) => (
                <NotebookTile
                    key={nb.id}
                    notebook={nb}
                    onSelect={() => onSelect(nb.id, nb.title)}
                    onEdit={() => onEdit(nb)}
                    onPinToggle={() => onPinToggle(nb)}
                    onDelete={() => onDelete(nb)}
                    onLinkEntries={() => onLinkEntries(nb)}
                    t={t}
                />
            ))}
        </div>
    );
}

/* ── Single tile ───────────────────────────────────────────────── */

interface NotebookTileProps {
    notebook: NotebookItem;
    onSelect: () => void;
    onEdit: () => void;
    onPinToggle: () => void;
    onDelete: () => void;
    onLinkEntries: () => void;
    t: Translator;
}

function NotebookTile({ notebook: nb, onSelect, onEdit, onPinToggle, onDelete, onLinkEntries, t }: NotebookTileProps) {
    const iconClass = nb.icon
        ? (nb.icon.includes(' ') ? nb.icon : `fa-solid ${nb.icon}`)
        : 'fa-solid fa-book';

    const noteCountLabel = nb.notes_count === 1
        ? t('notes.notebooks.note_singular')
        : t('notes.notebooks.note_plural');

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
            className="alex-notes-card alex-notes-tile group relative flex cursor-pointer flex-col p-5 text-left"
        >
            {/* Drag handle — grip icon top-left, hover-revealed so it
                doesn't fight with the tile's visual hierarchy. Only this
                element triggers SortableJS (via the `.drag-handle`
                selector in useSortableReorder), so clicks on the rest of
                the tile still route to the filter action. */}
            <div
                className="drag-handle absolute left-2 top-2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
                aria-label={t('notes.notebooks.tile.drag_aria')}
                title={t('notes.notebooks.tile.drag_aria')}
            >
                <i className="fa-solid fa-grip-vertical text-xs" style={microText} />
            </div>

            {/* Overflow menu — absolute top-right so it doesn't push the
                header content around. Hover-revealed to reduce visual
                noise; focus-within keeps keyboard users supported. */}
            <div
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                onClick={(e) => e.stopPropagation()}
            >
                <TileMenu
                    isPinned={nb.is_pinned}
                    onEdit={onEdit}
                    onPinToggle={onPinToggle}
                    onDelete={onDelete}
                    onLinkEntries={onLinkEntries}
                    t={t}
                />
            </div>

            {/* Header */}
            <div className="flex items-start gap-3">
                <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                    style={{
                        backgroundColor: nb.color ? `${nb.color}20` : 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
                        borderRadius: 'var(--theme-radius-button)',
                    }}
                >
                    <i className={`${iconClass} text-lg`} style={{ color: nb.color ?? undefined }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 pr-6">
                        <h3 className="alex-notes-tile-title truncate text-sm font-semibold">{nb.title}</h3>
                        {nb.is_pinned && (
                            <i
                                className="fa-solid fa-thumbtack text-[10px]"
                                style={{ color: 'var(--theme-status-warning-stroke)' }}
                            />
                        )}
                    </div>
                    {nb.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs" style={fadedText}>{nb.description}</p>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-2">
                <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                        background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                        color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                    }}
                >
                    <i className="fa-solid fa-note-sticky text-[9px]" />
                    {nb.notes_count} {noteCountLabel}
                </span>
            </div>

            {/* Linked entries */}
            {nb.linked_entries && nb.linked_entries.length > 0 && (
                <div
                    className="mt-3 flex flex-wrap gap-1.5 pt-3"
                    style={{ borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)' }}
                >
                    {nb.linked_entries.map((entry) => {
                        const entryIcon = entry.blueprint_icon
                            ? (entry.blueprint_icon.includes(' ') ? entry.blueprint_icon : `fa-solid ${entry.blueprint_icon}`)
                            : 'fa-solid fa-cube';
                        return (
                            <span
                                key={entry.id}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
                                style={{
                                    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                                    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                                }}
                            >
                                <i className={`${entryIcon} text-[8px]`} />
                                {entry.name}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── Overflow menu (portal-based to escape the tile clip) ──────── */

interface TileMenuProps {
    isPinned: boolean;
    onEdit: () => void;
    onPinToggle: () => void;
    onDelete: () => void;
    onLinkEntries: () => void;
    t: Translator;
}

function TileMenu({ isPinned, onEdit, onPinToggle, onDelete, onLinkEntries, t }: TileMenuProps) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!open) return;
        function handleDocClick(e: MouseEvent) {
            if (!btnRef.current?.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, [open]);

    function toggle(e: ReactMouseEvent): void {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            // Menu is ~200px wide; align right edge to button right.
            setPos({ top: rect.bottom + 4, left: rect.right - 200 });
        }
        setOpen(!open);
    }

    const items: Array<{ label: string; icon: string; danger?: boolean; onClick: () => void }> = [
        { label: t('notes.notebooks.tile.menu.edit'), icon: 'fa-solid fa-pen', onClick: onEdit },
        { label: isPinned ? t('notes.notebooks.tile.menu.unpin') : t('notes.notebooks.tile.menu.pin'), icon: 'fa-solid fa-thumbtack', onClick: onPinToggle },
        { label: t('notes.notebooks.tile.menu.link_entries'), icon: 'fa-solid fa-link', onClick: onLinkEntries },
        { label: t('notes.notebooks.tile.menu.delete'), icon: 'fa-solid fa-trash', danger: true, onClick: onDelete },
    ];

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                aria-label={t('notes.notebooks.tile.menu_aria')}
                className="alex-notes-tile-menu-trigger backdrop-blur-sm"
            >
                <i className="fa-solid fa-ellipsis-vertical text-xs" />
            </button>
            {open && createPortal(
                <ul
                    className="fixed z-[9999] w-[200px] overflow-hidden"
                    style={{
                        top: pos.top,
                        left: pos.left,
                        background: 'var(--theme-base-surface)',
                        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                        color: 'var(--theme-base-content)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    {items.map((item, i) => (
                        <li key={i}>
                            <button
                                type="button"
                                onClick={() => { item.onClick(); setOpen(false); }}
                                className={`alex-notes-tile-menu-row flex w-full items-center gap-3 px-4 py-2.5 text-sm ${item.danger ? 'alex-notes-tile-menu-row--danger' : ''}`}
                                style={{
                                    borderBottom: i < items.length - 1
                                        ? '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)'
                                        : 'none',
                                }}
                            >
                                <i className={`${item.icon} w-4 text-center text-xs`} />
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>,
                document.body,
            )}
        </>
    );
}
