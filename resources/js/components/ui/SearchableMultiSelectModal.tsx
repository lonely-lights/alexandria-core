import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Modal from './Modal';
import Input from '../form/Input';
import Button from './Button';

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

const sectionDividerStyle: CSSProperties = {
    borderBottom: '1px solid var(--theme-base-300)',
};

const headerStyle: CSSProperties = {
    ...sectionDividerStyle,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
};

const subtitleStyle: CSSProperties = {
    marginTop: '0.125rem',
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const closeBtnStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    border: 'none',
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    cursor: 'pointer',
};

const selectedHeaderRowStyle: CSSProperties = {
    marginBottom: '0.375rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
};

const selectedLabelStyle: CSSProperties = {
    fontSize: '0.625rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const clearAllBtnStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.625rem',
    fontWeight: 500,
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    transition: 'color var(--theme-motion-duration-fast, 150ms) ease',
};

const selectedChipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    borderRadius: 'var(--theme-radius-input)',
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 500,
};

const chipDismissBtnStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    color: 'color-mix(in srgb, var(--theme-brand-primary-content) 60%, transparent)',
    transition: 'color var(--theme-motion-duration-fast, 150ms) ease',
};

const searchWrapStyle: CSSProperties = {
    ...sectionDividerStyle,
    padding: '0.75rem 1.25rem',
};

const emptyStateStyle: CSSProperties = {
    padding: '2rem 0',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const rowBaseStyle: CSSProperties = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 1.25rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
};

const rowSelectedStyle: CSSProperties = {
    ...rowBaseStyle,
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
};

const checkboxStyle: CSSProperties = {
    width: '0.875rem',
    height: '0.875rem',
    accentColor: 'var(--theme-brand-primary-500)',
    cursor: 'pointer',
};

const swatchStyle: CSSProperties = {
    display: 'inline-block',
    width: '0.75rem',
    height: '0.75rem',
    flexShrink: 0,
    borderRadius: '9999px',
};

const itemIconStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const selectedLabelTextStyle: CSSProperties = {
    fontWeight: 500,
    color: 'var(--theme-brand-primary-500)',
};

const countStyle: CSSProperties = {
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const footerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTop: '1px solid var(--theme-base-300)',
    padding: '0.75rem 1.25rem',
};

/**
 * Generic two-stage picker: search box + scrollable list + "Selected" chip row.
 * Mirrors TagPickerModal's layout so the two feel like members of the same family.
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
                <div style={headerStyle}>
                    <div>
                        <h2 className="text-base font-bold">{title}</h2>
                        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Close">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Selected chips */}
                {selectedItems.length > 0 && (
                    <div style={{ ...sectionDividerStyle, padding: '0.75rem 1.25rem' }}>
                        <div style={selectedHeaderRowStyle}>
                            <span style={selectedLabelStyle}>
                                Selected ({selectedItems.length})
                            </span>
                            {onClear && (
                                <button
                                    type="button"
                                    onClick={onClear}
                                    className="alex-clear-link"
                                    style={clearAllBtnStyle}
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedItems.map((it) => (
                                <span key={`sel-${it.id}`} style={selectedChipStyle}>
                                    {it.icon && <i className={`${it.icon} text-[9px]`} />}
                                    {it.label}
                                    <button
                                        type="button"
                                        onClick={() => onToggle(it.id, false)}
                                        style={chipDismissBtnStyle}
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
                <div style={searchWrapStyle}>
                    <Input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        autoFocus
                        icon="fa-solid fa-search"
                        size="sm"
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div style={emptyStateStyle}>
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
                                    className="alex-row"
                                    style={isSelected ? rowSelectedStyle : rowBaseStyle}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        readOnly
                                        style={checkboxStyle}
                                    />
                                    {it.color ? (
                                        <span style={{ ...swatchStyle, backgroundColor: it.color }} />
                                    ) : it.icon ? (
                                        <i className={it.icon} style={itemIconStyle} />
                                    ) : null}
                                    <span className="flex-1 truncate" style={isSelected ? selectedLabelTextStyle : undefined}>
                                        {it.label}
                                    </span>
                                    {typeof it.count === 'number' && (
                                        <span style={countStyle}>{it.count}</span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={footerStyle}>
                    <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
                </div>
            </div>
        </Modal>
    );
}
