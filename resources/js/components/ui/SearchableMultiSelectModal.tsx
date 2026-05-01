import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';

export interface SearchableItem {
    id: number | string;
    label: string;
    icon?: string;
    /** Optional color swatch (any CSS color) shown in place of the icon. */
    color?: string | null;
    /** Optional right-aligned count (e.g., notes per notebook). */
    count?: number;
}

interface SearchableMultiSelectModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    items: SearchableItem[];
    selectedIds: Array<number | string>;
    onToggle: (id: number | string, nextSelected: boolean) => void;
    onClear?: () => void;
    emptyLabel?: string;
    /** Placeholder for the search input. */
    searchPlaceholder?: string;
}

/**
 * Generic two-stage picker: shows a search box + scrollable list with
 * checkboxes, and a "Selected" chip row so it's obvious what's active
 * without scrolling. Mirrors TagPickerModal's layout so the two feel
 * like members of the same family.
 */
export default function SearchableMultiSelectModal({
    open,
    onClose,
    title,
    subtitle,
    items,
    selectedIds,
    onToggle,
    onClear,
    emptyLabel = 'Nothing to show',
    searchPlaceholder = 'Filter...',
}: SearchableMultiSelectModalProps) {
    const [search, setSearch] = useState('');

    useEffect(() => { if (open) setSearch(''); }, [open]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) => it.label.toLowerCase().includes(q));
    }, [items, search]);

    const selectedItems = useMemo(
        () => items.filter((it) => selectedIds.includes(it.id)),
        [items, selectedIds],
    );

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div className="flex max-h-[70vh] flex-col">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-base-300 px-5 py-4">
                    <div>
                        <h2 className="text-base font-bold">{title}</h2>
                        {subtitle && <p className="mt-0.5 text-xs text-base-content/40">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Selected chips — only shown when something's selected so
                    the header doesn't take space unnecessarily. */}
                {selectedItems.length > 0 && (
                    <div className="border-b border-base-300 px-5 py-3">
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-base-content/30">
                                Selected ({selectedItems.length})
                            </span>
                            {onClear && (
                                <button
                                    type="button"
                                    onClick={onClear}
                                    className="text-[10px] font-medium text-base-content/40 hover:text-error"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedItems.map((it) => (
                                <span
                                    key={`sel-${it.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-content"
                                >
                                    {it.icon && <i className={`${it.icon} text-[9px]`} />}
                                    {it.label}
                                    <button
                                        type="button"
                                        onClick={() => onToggle(it.id, false)}
                                        className="flex items-center text-primary-content/60 hover:text-primary-content"
                                        aria-label={`Remove ${it.label}`}
                                    >
                                        <i className="fa-solid fa-xmark text-[9px]" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="border-b border-base-300 px-5 py-3">
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-base-content/20" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            autoFocus
                            className="input input-bordered h-8 min-h-0 w-full rounded-xl pl-9 text-sm"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-xs text-base-content/30">
                            {search ? 'No matches' : emptyLabel}
                        </div>
                    ) : (
                        filtered.map((it) => {
                            const isSelected = selectedIds.includes(it.id);
                            return (
                                <button
                                    key={it.id}
                                    type="button"
                                    onClick={() => onToggle(it.id, !isSelected)}
                                    className={`flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors hover:bg-base-200/30 ${
                                        isSelected ? 'bg-primary/5' : ''
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        readOnly
                                        className="checkbox checkbox-xs checkbox-primary"
                                    />
                                    {it.color ? (
                                        <span
                                            className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                                            style={{ backgroundColor: it.color }}
                                        />
                                    ) : it.icon ? (
                                        <i className={`${it.icon} text-[11px] text-base-content/40`} />
                                    ) : null}
                                    <span className={`flex-1 truncate ${isSelected ? 'font-medium text-primary' : ''}`}>
                                        {it.label}
                                    </span>
                                    {typeof it.count === 'number' && (
                                        <span className="text-xs text-base-content/30">{it.count}</span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end border-t border-base-300 px-5 py-3">
                    <button onClick={onClose} className="btn btn-ghost btn-sm text-xs">Done</button>
                </div>
            </div>
        </Modal>
    );
}
