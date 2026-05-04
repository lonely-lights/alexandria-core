import { useEffect, useState, type SyntheticEvent } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { NOTE_COLORS } from '@alexandria/lib/noteColors';

export interface NotebookFormData {
    id: number;
    title: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    is_pinned: boolean;
    notes_count: number;
}

interface NotebookFormModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    /** When null, the modal is in create mode; otherwise edit mode. */
    notebook: NotebookFormData | null;
    onSaved: (saved: NotebookFormData) => void;
}

/**
 * Shared create/edit form for notebooks. Switches modes based on the
 * `notebook` prop — null for create, an existing notebook object for
 * edit. Visual treatment, validation, and field set stay identical so
 * the user learns one UI.
 */
export default function NotebookFormModal({ open, onClose, projectId, notebook, onSaved }: NotebookFormModalProps) {
    const isEdit = notebook !== null;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState<string | null>(null);
    const [icon, setIcon] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form whenever the modal opens so previous edits don't
    // leak into the next session. Seeding from `notebook` for edit mode
    // likewise happens at open time.
    useEffect(() => {
        if (!open) return;
        setTitle(notebook?.title ?? '');
        setDescription(notebook?.description ?? '');
        setColor(notebook?.color ?? null);
        setIcon(notebook?.icon ?? '');
        setIsPinned(notebook?.is_pinned ?? false);
        setError(null);
        setSaving(false);
    }, [open, notebook]);

    async function handleSubmit(e: SyntheticEvent): Promise<void> {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) {
            setError('Title is required.');
            return;
        }
        setSaving(true);
        setError(null);

        const payload: Record<string, unknown> = {
            title: trimmed,
            description: description.trim() || null,
            color: color,
            icon: icon.trim() || null,
            is_pinned: isPinned,
        };

        // Create mode requires the context so the new notebook is
        // attached to this project via `notebook_notables`.
        if (!isEdit) {
            payload.context_type = 'project';
            payload.context_id = projectId;
        }

        const url = isEdit
            ? `/api/v1/projects/${projectId}/notebooks/${notebook!.id}`
            : `/api/v1/projects/${projectId}/notebooks`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: csrfHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setError(body?.message ?? 'Save failed.');
                setSaving(false);
                return;
            }
            const saved = await res.json();
            onSaved(saved as NotebookFormData);
            onClose();
        } catch {
            setError('Network error. Try again.');
            setSaving(false);
        }
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-base-300 px-5 py-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <i className="fa-solid fa-book text-primary" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-bold">{isEdit ? 'Edit Notebook' : 'New Notebook'}</h2>
                        <p className="mt-0.5 text-xs text-base-content/40">
                            {isEdit ? 'Update this notebook' : 'Create a notebook to organize notes'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4 px-5 py-4">
                    {/* Title */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                            Title <span className="text-error">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Plot Points"
                            autoFocus
                            maxLength={255}
                            className="input input-bordered input-sm w-full rounded-xl"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional — what lives in this notebook?"
                            rows={2}
                            maxLength={2000}
                            className="textarea textarea-bordered w-full rounded-xl text-sm"
                        />
                    </div>

                    {/* Color swatches */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                            Color
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setColor(null)}
                                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs transition ${
                                    color === null ? 'border-primary text-primary' : 'border-base-content/15 text-base-content/30 hover:border-base-content/30'
                                }`}
                                aria-label="No color"
                            >
                                <i className="fa-solid fa-slash" />
                            </button>
                            {Object.entries(NOTE_COLORS).map(([key, hex]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setColor(hex)}
                                    className={`h-7 w-7 rounded-full border-2 transition ${
                                        color === hex ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: hex }}
                                    aria-label={key}
                                    title={key}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Icon — free-text FontAwesome class with live preview.
                        Simpler than a full picker; power users can paste a
                        class string, and the preview validates it. */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-base-content/50">
                            Icon
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-base-content/15 bg-base-200">
                                <i
                                    className={`${icon.trim() ? (icon.includes(' ') ? icon : `fa-solid ${icon}`) : 'fa-solid fa-book'} text-sm`}
                                    style={{ color: color ?? undefined }}
                                />
                            </div>
                            <input
                                type="text"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                placeholder="fa-book (or fa-solid fa-book)"
                                maxLength={100}
                                className="input input-bordered input-sm flex-1 rounded-xl font-mono text-xs"
                            />
                        </div>
                        <p className="mt-1 text-[10px] text-base-content/40">
                            Any FontAwesome class. "fa-solid" is assumed if no style given.
                        </p>
                    </div>

                    {/* Pinned toggle */}
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-content/10 bg-base-200/40 px-3 py-2">
                        <div>
                            <span className="text-sm font-medium">Pin to top</span>
                            <p className="text-[11px] text-base-content/40">
                                Pinned notebooks surface above the rest.
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className={`toggle toggle-sm ${isPinned ? 'toggle-primary' : ''}`}
                        />
                    </label>

                    {/* Error surface */}
                    {error && (
                        <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-base-300 px-5 py-3">
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm text-xs">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !title.trim()}
                        className="btn btn-primary btn-sm rounded-xl text-xs"
                    >
                        {saving && <span className="loading loading-spinner loading-xs" />}
                        {isEdit ? 'Save Changes' : 'Create Notebook'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
