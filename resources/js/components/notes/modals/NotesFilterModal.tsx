import { useState, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import SearchableMultiSelectModal, {
    type SearchableItem,
} from '@alexandria/components/ui/SearchableMultiSelectModal';
import type { NotebookData } from './NotebookSelectorModal';
import useT from '@alexandria/hooks/useT';
import type {
    NoteCreator,
    NoteQuickFilter,
    NoteStatusFilter,
} from '@alexandria/types/notes-dashboard';

/**
 * Props shared by NotesFilterModal and NotesFilterChips — both views'
 * Filters trigger + chip row read/write the exact same filter shape
 * (owner ruling, 2026-08-31: Notes Dashboard toolbar unification), so
 * List and Grid stay behaviorally identical without literally sharing
 * one state instance (each view owns its own useNotesFilterState()).
 */
export interface NotesFilterControls {
    statusFilter: NoteStatusFilter;
    onStatusChange: (status: NoteStatusFilter) => void;
    quickFilter: NoteQuickFilter;
    onQuickFilterToggle: (filter: NoteQuickFilter) => void;
    creatorIds: number[];
    onCreatorIdsChange: (ids: number[]) => void;
    creators: NoteCreator[];
    notebookFilters: number[];
    onNotebookFiltersChange: (ids: number[]) => void;
    notebooks: NotebookData[];
    hasActiveFilters: boolean;
    onClearAll: () => void;
}

interface NotesFilterModalProps extends NotesFilterControls {
    open: boolean;
    onClose: () => void;
}

const fadedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};
const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};
const microText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

/**
 * The Filters panel — status, quick filters, author + notebook pickers —
 * shared between the Notes Dashboard's List and Grid views. Moved out of
 * NotesView so a single component (rendered once from whichever view is
 * currently mounted) backs the one Filters button in the unified toolbar
 * row (NotesToolbar). All state lives with the caller; this component is
 * purely controlled.
 */
export default function NotesFilterModal({
    open,
    onClose,
    statusFilter,
    onStatusChange,
    quickFilter,
    onQuickFilterToggle,
    creatorIds,
    onCreatorIdsChange,
    creators,
    notebookFilters,
    onNotebookFiltersChange,
    notebooks,
    hasActiveFilters,
    onClearAll,
}: NotesFilterModalProps) {
    const t = useT();
    const [showAuthorPicker, setShowAuthorPicker] = useState(false);
    const [showNotebookPicker, setShowNotebookPicker] = useState(false);

    const statusOptions: { value: NoteStatusFilter; label: string }[] = [
        { value: 'all', label: t('notes.list.status.all') },
        { value: 'active', label: t('notes.list.status.active') },
        { value: 'archived', label: t('notes.list.status.archived') },
        { value: 'trashed', label: t('notes.list.status.trashed') },
    ];

    return (
        <>
            <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
                <div className="p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                                background:
                                    'color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)',
                            }}
                        >
                            <i
                                className="fa-solid fa-filter"
                                style={{ color: 'var(--theme-brand-secondary-500)' }}
                            />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('notes.list.filter_modal.title')}</h3>
                            <p className="text-xs" style={subtleText}>
                                {t('notes.list.filter_modal.subtitle')}
                            </p>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="mb-4">
                        <label
                            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                            style={fadedText}
                        >
                            {t('notes.list.filter_modal.status_label')}
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => onStatusChange(opt.value)}
                                    className={`alex-notes-quick-chip ${statusFilter === opt.value ? 'alex-notes-quick-chip--active' : ''}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="mb-4">
                        <label
                            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                            style={fadedText}
                        >
                            {t('notes.list.filter_modal.quick_label')}
                        </label>
                        <div className="flex flex-wrap gap-1">
                            <button
                                type="button"
                                onClick={() => onQuickFilterToggle('uncategorized')}
                                className={`alex-notes-quick-chip alex-notes-quick-chip--warning ${quickFilter === 'uncategorized' ? 'alex-notes-quick-chip--active' : ''}`}
                            >
                                <i className="fa-solid fa-inbox text-xs" /> {t('notes.list.quick.uncategorized')}
                            </button>
                            <button
                                type="button"
                                onClick={() => onQuickFilterToggle('pending_routing')}
                                className={`alex-notes-quick-chip alex-notes-quick-chip--info ${quickFilter === 'pending_routing' ? 'alex-notes-quick-chip--active' : ''}`}
                            >
                                <i className="fa-solid fa-route text-xs" /> {t('notes.list.quick.pending')}
                            </button>
                            <button
                                type="button"
                                onClick={() => onQuickFilterToggle('pinned')}
                                className={`alex-notes-quick-chip ${quickFilter === 'pinned' ? 'alex-notes-quick-chip--active' : ''}`}
                            >
                                <i className="fa-solid fa-thumbtack text-xs" /> {t('notes.list.quick.pinned')}
                            </button>
                        </div>
                    </div>

                    {/* Author + Notebook — each opens a dedicated searchable
                        picker modal, same pattern as Tags. */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                        <div>
                            <label
                                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                                style={fadedText}
                            >
                                {t('notes.list.filter_modal.author_label')}
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowAuthorPicker(true)}
                                className="alex-notes-facet-trigger flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                                style={{ borderRadius: 'var(--theme-radius-input)' }}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <i className="fa-solid fa-user text-[11px]" style={subtleText} />
                                    <span className="truncate">
                                        {creatorIds.length === 0
                                            ? t('notes.list.filter_modal.all_authors')
                                            : creatorIds.length === 1
                                              ? (creators.find((c) => c.id === creatorIds[0])?.name ??
                                                t('notes.list.filter_modal.one_selected'))
                                              : t('notes.list.filter_modal.n_selected').replace(
                                                    ':count',
                                                    String(creatorIds.length),
                                                )}
                                    </span>
                                </span>
                                <i className="fa-solid fa-chevron-right text-[10px]" style={microText} />
                            </button>
                        </div>
                        <div>
                            <label
                                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                                style={fadedText}
                            >
                                {t('notes.list.filter_modal.notebook_label')}
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowNotebookPicker(true)}
                                className="alex-notes-facet-trigger flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                                style={{ borderRadius: 'var(--theme-radius-input)' }}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <i className="fa-solid fa-book text-[11px]" style={subtleText} />
                                    <span className="truncate">
                                        {notebookFilters.length === 0
                                            ? t('notes.list.filter_modal.all_notebooks')
                                            : notebookFilters.length === 1
                                              ? (notebooks.find((n) => n.id === notebookFilters[0])?.title ??
                                                t('notes.list.filter_modal.one_selected'))
                                              : t('notes.list.filter_modal.n_selected').replace(
                                                    ':count',
                                                    String(notebookFilters.length),
                                                )}
                                    </span>
                                </span>
                                <i className="fa-solid fa-chevron-right text-[10px]" style={microText} />
                            </button>
                        </div>
                    </div>

                    {/* Clear all */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="alex-notes-bulk-btn flex w-full items-center justify-center gap-1.5 py-2"
                            style={{ color: 'var(--theme-status-error-stroke)' }}
                        >
                            <i className="fa-solid fa-xmark text-xs" /> {t('notes.list.filter_modal.clear_all')}
                        </button>
                    )}
                </div>
            </Modal>

            {/* Author picker */}
            <SearchableMultiSelectModal
                open={showAuthorPicker}
                onClose={() => setShowAuthorPicker(false)}
                title={t('notes.list.author_picker.title')}
                subtitle={t('notes.list.author_picker.subtitle')}
                items={creators.map((c): SearchableItem => ({
                    id: c.id,
                    label: c.name,
                    icon: 'fa-solid fa-user',
                }))}
                selectedIds={creatorIds}
                onToggle={(id, next) => {
                    const numId = Number(id);
                    onCreatorIdsChange(
                        next ? [...creatorIds, numId] : creatorIds.filter((x) => x !== numId),
                    );
                }}
                onClear={() => onCreatorIdsChange([])}
                emptyLabel={t('notes.list.author_picker.empty')}
                searchPlaceholder={t('notes.list.author_picker.search')}
            />

            {/* Notebook picker */}
            <SearchableMultiSelectModal
                open={showNotebookPicker}
                onClose={() => setShowNotebookPicker(false)}
                title={t('notes.list.notebook_picker.title')}
                subtitle={t('notes.list.notebook_picker.subtitle')}
                items={notebooks.map((nb): SearchableItem => ({
                    id: nb.id,
                    label: nb.title,
                    icon: nb.icon ?? 'fa-solid fa-book',
                    color: nb.color,
                    count: nb.notes_count,
                }))}
                selectedIds={notebookFilters}
                onToggle={(id, next) => {
                    const numId = Number(id);
                    onNotebookFiltersChange(
                        next ? [...notebookFilters, numId] : notebookFilters.filter((x) => x !== numId),
                    );
                }}
                onClear={() => onNotebookFiltersChange([])}
                emptyLabel={t('notes.list.notebook_picker.empty')}
                searchPlaceholder={t('notes.list.notebook_picker.search')}
            />
        </>
    );
}

/**
 * Dismissable pills for each active filter — sits right after the
 * Filters button in NotesToolbar so the user reads left-to-right:
 * "manage filters, here's what's active."
 */
export function NotesFilterChips({
    statusFilter,
    onStatusChange,
    quickFilter,
    onQuickFilterToggle,
    creatorIds,
    onCreatorIdsChange,
    creators,
    notebookFilters,
    onNotebookFiltersChange,
    notebooks,
}: NotesFilterControls) {
    const t = useT();

    return (
        <>
            {notebookFilters.map((nbId) => {
                const nb = notebooks.find((n) => n.id === nbId);
                return (
                    <button
                        key={`nb-chip-${nbId}`}
                        type="button"
                        onClick={() =>
                            onNotebookFiltersChange(notebookFilters.filter((id) => id !== nbId))
                        }
                        className="alex-notes-filter-chip alex-notes-filter-chip--brand"
                    >
                        <i className="fa-solid fa-book text-[9px]" />
                        {nb?.title ?? t('notes.list.chip.notebook_fallback').replace(':id', String(nbId))}
                        <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                );
            })}
            {statusFilter !== 'active' && (
                <button
                    type="button"
                    onClick={() => onStatusChange('active')}
                    className="alex-notes-filter-chip"
                >
                    {statusFilter}
                    <i className="fa-solid fa-xmark text-[9px]" />
                </button>
            )}
            {quickFilter !== 'all' && (
                <button
                    type="button"
                    onClick={() => onQuickFilterToggle('all' as NoteQuickFilter)}
                    className="alex-notes-filter-chip"
                >
                    {quickFilter.replace('_', ' ')}
                    <i className="fa-solid fa-xmark text-[9px]" />
                </button>
            )}
            {creatorIds.map((cid) => {
                const c = creators.find((cc) => cc.id === cid);
                return (
                    <button
                        key={`author-chip-${cid}`}
                        type="button"
                        onClick={() => onCreatorIdsChange(creatorIds.filter((id) => id !== cid))}
                        className="alex-notes-filter-chip"
                    >
                        <i className="fa-solid fa-user text-[9px]" />
                        {c?.name ?? t('notes.list.chip.author_fallback').replace(':id', String(cid))}
                        <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                );
            })}
        </>
    );
}
