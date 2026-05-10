import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import Modal from '@alexandria/components/ui/Modal';
import useT, { type Translator } from '@alexandria/hooks/useT';

export interface NotebookData {
    id: number;
    title: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    is_pinned: boolean;
    notes_count: number;
}

interface NotebookSelectorModalProps {
    open: boolean;
    onClose: () => void;
    notebooks: NotebookData[];
    activeNotebookId: number | null;
    onSelectNotebook: (notebookId: number | null) => void;
    onNewNotebook: () => void;
    onLinkNotebook: (notebookId: number) => void;
    onMoveNotebook: (notebookId: number) => void;
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };

const listWrapperStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

const dividerBorder = '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)';

export default function NotebookSelectorModal({
    open,
    onClose,
    notebooks,
    activeNotebookId,
    onSelectNotebook,
    onNewNotebook,
    onLinkNotebook,
    onMoveNotebook,
}: NotebookSelectorModalProps) {
    const t = useT();

    const allNotesActive = !activeNotebookId;

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div className="p-5">
                <h3 className="text-base font-bold">{t('notes.notebook_selector.title')}</h3>
                <p className="mt-1 text-xs" style={fadedText}>
                    {t('notes.notebook_selector.subtitle')}
                </p>

                <div className="mt-4" style={listWrapperStyle}>
                    {/* All Notes option */}
                    <button
                        onClick={() => { onSelectNotebook(null); onClose(); }}
                        className="alex-notes-tag-row flex w-full items-center gap-3 px-4 py-3 text-left text-sm"
                        style={{
                            borderBottom: dividerBorder,
                            background: allNotesActive
                                ? 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)'
                                : 'transparent',
                        }}
                    >
                        <i
                            className="fa-solid fa-layer-group text-xs"
                            style={{
                                color: allNotesActive
                                    ? 'var(--theme-brand-primary-500)'
                                    : 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
                            }}
                        />
                        <span
                            className="flex-1 font-medium"
                            style={allNotesActive ? { color: 'var(--theme-brand-primary-500)' } : undefined}
                        >
                            {t('notes.notebook_selector.all_notes')}
                        </span>
                        {allNotesActive && (
                            <i
                                className="fa-solid fa-check text-[10px]"
                                style={{ color: 'var(--theme-brand-primary-500)' }}
                            />
                        )}
                    </button>

                    {/* Notebooks */}
                    {notebooks.map((nb, idx) => {
                        const isActive = activeNotebookId === nb.id;
                        const isLast = idx === notebooks.length - 1;
                        return (
                            <div
                                key={nb.id}
                                className="group flex items-center"
                                style={{
                                    borderBottom: isLast ? 'none' : dividerBorder,
                                    background: isActive
                                        ? 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)'
                                        : 'transparent',
                                }}
                            >
                                <button
                                    onClick={() => { onSelectNotebook(nb.id); onClose(); }}
                                    className="alex-notes-tag-row flex flex-1 items-center gap-3 px-4 py-3 text-left text-sm"
                                >
                                    {nb.color ? (
                                        <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: nb.color }} />
                                    ) : (
                                        <i className="fa-solid fa-book text-xs" style={microText} />
                                    )}
                                    <span
                                        className="flex-1 font-medium"
                                        style={isActive ? { color: 'var(--theme-brand-primary-500)' } : undefined}
                                    >
                                        {nb.title}
                                    </span>
                                    <span className="text-xs" style={microText}>{nb.notes_count}</span>
                                    {isActive && (
                                        <i
                                            className="fa-solid fa-check text-[10px]"
                                            style={{ color: 'var(--theme-brand-primary-500)' }}
                                        />
                                    )}
                                </button>
                                <NotebookActionsMenu
                                    onLink={() => { onClose(); onLinkNotebook(nb.id); }}
                                    onMove={() => { onClose(); onMoveNotebook(nb.id); }}
                                    t={t}
                                />
                            </div>
                        );
                    })}

                    {notebooks.length === 0 && (
                        <div className="py-6 text-center text-xs" style={microText}>
                            {t('notes.notebook_selector.empty')}
                        </div>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <button
                        onClick={() => { onClose(); onNewNotebook(); }}
                        className="alex-btn alex-btn--ghost"
                        style={{
                            borderRadius: 'var(--theme-radius-button)',
                            padding: '0.25rem 0.625rem',
                            fontSize: '0.75rem',
                            gap: '0.375rem',
                            color: 'var(--theme-brand-primary-500)',
                        }}
                    >
                        <i className="fa-solid fa-plus text-[10px]" /> {t('notes.notebook_selector.new')}
                    </button>
                    <button
                        onClick={onClose}
                        className="alex-btn alex-btn--ghost"
                        style={{
                            borderRadius: 'var(--theme-radius-button)',
                            padding: '0.25rem 0.625rem',
                            fontSize: '0.75rem',
                        }}
                    >
                        {t('notes.notebook_selector.close')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ── Notebook Actions Menu ── */

function NotebookActionsMenu({ onLink, onMove, t }: { onLink: () => void; onMove: () => void; t: Translator }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLUListElement | null>(null);

    // Close when clicking anywhere outside the menu or its trigger, or
    // when Escape is pressed. The portal renders the <ul> under
    // document.body, so the event target check uses both refs.
    useEffect(() => {
        if (!open) return;
        function handleDown(e: MouseEvent) {
            const target = e.target as Node;
            if (btnRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setOpen(false);
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleDown);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleDown);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    function toggle(e: ReactMouseEvent): void {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.right - 208 });
        }
        setOpen(!open);
    }

    const items = [
        { label: t('notes.notebook_selector.action.link'), icon: 'fa-solid fa-link', onClick: onLink },
        { label: t('notes.notebook_selector.action.move'), icon: 'fa-solid fa-right-from-bracket', onClick: onMove },
    ];

    return (
        <div className="pr-2">
            <button
                ref={btnRef}
                onClick={toggle}
                className="alex-notes-tile-menu-trigger opacity-0 group-hover:opacity-100"
                aria-label={t('notes.notebook_selector.actions_aria')}
            >
                <i className="fa-solid fa-ellipsis-vertical text-xs" />
            </button>
            {open && createPortal(
                <ul
                    ref={menuRef}
                    className="fixed z-[9999] w-52 overflow-hidden"
                    style={{
                        top: pos.top,
                        left: pos.left,
                        background: 'var(--theme-base-surface)',
                        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                        color: 'var(--theme-base-content)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
                    }}
                >
                    {items.map((item, i) => (
                        <li key={i}>
                            <button
                                onClick={() => { item.onClick(); setOpen(false); }}
                                className="alex-notes-tile-menu-row flex w-full items-center justify-between px-4 py-3 text-sm"
                                style={{
                                    borderBottom: i < items.length - 1
                                        ? '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)'
                                        : 'none',
                                }}
                            >
                                <span>{item.label}</span>
                                <i
                                    className={`${item.icon} w-5 text-center`}
                                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' }}
                                />
                            </button>
                        </li>
                    ))}
                </ul>,
                document.body,
            )}
        </div>
    );
}
