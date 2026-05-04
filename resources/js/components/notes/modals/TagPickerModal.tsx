import { useState, useEffect } from 'react';
import Modal from '@alexandria/components/ui/Modal';

interface TagPickerModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    noteTags: string[];
    onToggle: (tag: string, currentlySelected: boolean) => Promise<void>;
    onCreate: (tag: string) => Promise<void>;
}

export default function TagPickerModal({ open, onClose, projectId, noteTags, onToggle, onCreate }: TagPickerModalProps) {
    const [allTags, setAllTags] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!open || !projectId) return;
        setSearch('');
        fetch(`/api/v1/projects/${projectId}/tags`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.ok ? r.json() : [])
            .then((tags) => setAllTags(tags))
            .catch(() => setAllTags([]));
    }, [open, projectId]);

    const filtered = allTags.filter((t) =>
        !search || t.toLowerCase().includes(search.toLowerCase())
    );

    const exactMatch = search.trim() && allTags.some((t) => t.toLowerCase() === search.trim().toLowerCase());

    async function handleCreate() {
        if (!search.trim() || creating) return;
        setCreating(true);
        await onCreate(search.trim());
        setAllTags((prev) => prev.includes(search.trim()) ? prev : [...prev, search.trim()].sort());
        setSearch('');
        setCreating(false);
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div className="flex flex-col max-h-[60vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                    <div>
                        <h2 className="text-base font-bold">Manage Tags</h2>
                        <p className="mt-0.5 text-xs text-base-content/40">Select existing tags or create new ones</p>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Selected tags */}
                {noteTags.length > 0 && (
                    <div className="border-b border-base-300 px-5 py-3">
                        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-base-content/30">
                            Selected ({noteTags.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {noteTags.map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-content">
                                    {tag}
                                    <button onClick={() => void onToggle(tag, true)} className="flex items-center text-primary-content/60 hover:text-primary-content">
                                        <i className="fa-solid fa-xmark text-[9px]" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search + create */}
                <div className="border-b border-base-300 px-5 py-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-base-content/20" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (search.trim() && !exactMatch) {
                                            void handleCreate();
                                        }
                                    }
                                }}
                                placeholder="Filter or create..."
                                autoFocus
                                className="input input-bordered h-8 min-h-0 w-full rounded-xl pl-9 text-sm"
                            />
                        </div>
                        {search.trim() && !exactMatch && (
                            <button
                                onClick={() => void handleCreate()}
                                disabled={creating}
                                className="btn btn-primary h-8 min-h-0 rounded-xl text-xs"
                            >
                                {creating ? <span className="loading loading-spinner loading-xs" /> : <i className="fa-solid fa-plus text-[10px]" />}
                                Create
                            </button>
                        )}
                    </div>
                </div>

                {/* Tag list */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-xs text-base-content/30">
                            {search ? 'No matching tags' : 'No tags yet'}
                        </div>
                    ) : (
                        <div>
                            {allTags.map((tag) => {
                                const isSelected = noteTags.includes(tag);
                                const isVisible = filtered.includes(tag);
                                return (
                                    <div
                                        key={tag}
                                        className="overflow-hidden transition-all duration-200 ease-in-out"
                                        style={{
                                            maxHeight: isVisible ? '44px' : '0px',
                                            opacity: isVisible ? 1 : 0,
                                        }}
                                    >
                                        <button
                                            onClick={() => void onToggle(tag, isSelected)}
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
                                            <span className={isSelected ? 'font-medium text-primary' : ''}>{tag}</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
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
