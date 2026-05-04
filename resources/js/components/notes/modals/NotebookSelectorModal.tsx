import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import Modal from '@alexandria/components/ui/Modal';

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
    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div className="p-5">
                <h3 className="text-base font-bold">Notebooks</h3>
                <p className="mt-1 text-xs text-base-content/40">Switch between notebooks or view all notes</p>

                <div className="mt-4 overflow-hidden rounded-xl border border-base-300">
                    {/* All Notes option */}
                    <button
                        onClick={() => { onSelectNotebook(null); onClose(); }}
                        className={`flex w-full items-center gap-3 border-b border-base-content/5 px-4 py-3 text-left text-sm transition-colors hover:bg-base-200/30 ${
                            !activeNotebookId ? 'bg-primary/5' : ''
                        }`}
                    >
                        <i className={`fa-solid fa-layer-group text-xs ${!activeNotebookId ? 'text-primary' : 'text-base-content/30'}`} />
                        <span className={`flex-1 font-medium ${!activeNotebookId ? 'text-primary' : ''}`}>All Notes</span>
                        {!activeNotebookId && <i className="fa-solid fa-check text-[10px] text-primary" />}
                    </button>

                    {/* Notebooks */}
                    {notebooks.map((nb) => (
                        <div
                            key={nb.id}
                            className={`group flex items-center border-b border-base-content/5 last:border-0 ${
                                activeNotebookId === nb.id ? 'bg-primary/5' : ''
                            }`}
                        >
                            <button
                                onClick={() => { onSelectNotebook(nb.id); onClose(); }}
                                className="flex flex-1 items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-base-200/30"
                            >
                                {nb.color ? (
                                    <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: nb.color }} />
                                ) : (
                                    <i className="fa-solid fa-book text-xs text-base-content/30" />
                                )}
                                <span className={`flex-1 font-medium ${activeNotebookId === nb.id ? 'text-primary' : ''}`}>{nb.title}</span>
                                <span className="text-xs text-base-content/30">{nb.notes_count}</span>
                                {activeNotebookId === nb.id && <i className="fa-solid fa-check text-[10px] text-primary" />}
                            </button>
                            <NotebookActionsMenu
                                onLink={() => { onClose(); onLinkNotebook(nb.id); }}
                                onMove={() => { onClose(); onMoveNotebook(nb.id); }}
                            />
                        </div>
                    ))}

                    {notebooks.length === 0 && (
                        <div className="py-6 text-center text-xs text-base-content/30">No notebooks yet</div>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <button
                        onClick={() => { onClose(); onNewNotebook(); }}
                        className="btn btn-ghost btn-sm gap-1.5 text-xs text-primary"
                    >
                        <i className="fa-solid fa-plus text-[10px]" /> New Notebook
                    </button>
                    <button onClick={onClose} className="btn btn-ghost btn-sm text-xs">Close</button>
                </div>
            </div>
        </Modal>
    );
}

/* ── Notebook Actions Menu ── */

function NotebookActionsMenu({ onLink, onMove }: { onLink: () => void; onMove: () => void }) {
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
        { label: 'Link to...', icon: 'fa-solid fa-link', onClick: onLink },
        { label: 'Move to...', icon: 'fa-solid fa-right-from-bracket', onClick: onMove },
    ];

    return (
        <div className="pr-2">
            <button
                ref={btnRef}
                onClick={toggle}
                className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100"
                aria-label="Notebook actions"
            >
                <i className="fa-solid fa-ellipsis-vertical" />
            </button>
            {open && createPortal(
                <ul
                    ref={menuRef}
                    className="fixed z-[9999] w-52 overflow-hidden rounded-lg border border-base-content/10 bg-base-100 text-base-content shadow-lg"
                    style={{ top: pos.top, left: pos.left }}
                >
                    {items.map((item, i) => (
                        <li key={i}>
                            <button
                                onClick={() => { item.onClick(); setOpen(false); }}
                                className={`flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-base-200 ${i < items.length - 1 ? 'border-b border-base-content/10' : ''}`}
                            >
                                <span>{item.label}</span>
                                <i className={`${item.icon} w-5 text-center text-base-content/60`} />
                            </button>
                        </li>
                    ))}
                </ul>,
                document.body,
            )}
        </div>
    );
}
