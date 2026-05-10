import { useEffect, useState, type CSSProperties, type SyntheticEvent } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { NOTE_COLORS } from '@alexandria/lib/noteColors';
import useT from '@alexandria/hooks/useT';

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

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

const sectionBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const sectionBorderTopStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const headerIconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: '9999px',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.75rem',
};

const iconPreviewStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
};

const pinToggleWrapperStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const errorStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-status-error-stroke) 30%, transparent)',
    background: 'color-mix(in srgb, var(--theme-status-error-stroke) 5%, transparent)',
    color: 'var(--theme-status-error-stroke)',
    borderRadius: 'var(--theme-radius-button)',
};

/**
 * Shared create/edit form for notebooks. Switches modes based on the
 * `notebook` prop — null for create, an existing notebook object for
 * edit. Visual treatment, validation, and field set stay identical so
 * the user learns one UI.
 */
export default function NotebookFormModal({ open, onClose, projectId, notebook, onSaved }: NotebookFormModalProps) {
    const t = useT();
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
            setError(t('notes.notebook_form.error.title_required'));
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

        if (!isEdit) {
            payload.context_type = 'project';
            payload.context_id = projectId;
        }

        const url = isEdit
            ? `/api/v1/projects/${projectId}/notebooks/${notebook!.id}`
            : `/api/v1/projects/${projectId}/notebooks`;
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify(payload),
        }).catch(() => null);

        if (!res) {
            setError(t('notes.notebook_form.error.network'));
            setSaving(false);
            return;
        }
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            setError(body?.message ?? t('notes.notebook_form.error.save_failed'));
            setSaving(false);
            return;
        }
        const saved = await res.json();
        onSaved(saved as NotebookFormData);
        onClose();
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4" style={sectionBorderStyle}>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center" style={headerIconWrapStyle}>
                        <i className="fa-solid fa-book" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-bold">
                            {isEdit ? t('notes.notebook_form.edit_title') : t('notes.notebook_form.create_title')}
                        </h2>
                        <p className="mt-0.5 text-xs" style={fadedText}>
                            {isEdit ? t('notes.notebook_form.edit_subtitle') : t('notes.notebook_form.create_subtitle')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="alex-notes-modal-icon-btn"
                        aria-label={t('notes.modal.tooltip.close')}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4 px-5 py-4">
                    {/* Title */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={muteText}>
                            {t('notes.notebook_form.field.title')}{' '}
                            <span style={{ color: 'var(--theme-status-error-stroke)' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('notes.notebook_form.field.title_placeholder')}
                            autoFocus
                            maxLength={255}
                            className="w-full text-sm"
                            style={inputStyle}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={muteText}>
                            {t('notes.notebook_form.field.description')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('notes.notebook_form.field.description_placeholder')}
                            rows={2}
                            maxLength={2000}
                            className="w-full text-sm"
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    {/* Color swatches */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={muteText}>
                            {t('notes.notebook_form.field.color')}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setColor(null)}
                                className={`alex-notes-modal-color-btn alex-notes-modal-color-btn--none ${color === null ? 'alex-notes-modal-color-btn--active' : ''}`}
                                aria-label={t('notes.notebook_form.field.color_none_aria')}
                            >
                                <i
                                    className="fa-solid fa-slash text-[10px]"
                                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}
                                />
                            </button>
                            {Object.entries(NOTE_COLORS).map(([key, hex]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setColor(hex)}
                                    className={`alex-notes-modal-color-btn ${color === hex ? 'alex-notes-modal-color-btn--active' : ''}`}
                                    style={{ backgroundColor: hex }}
                                    aria-label={key}
                                    title={key}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Icon — free-text FontAwesome class with live preview. */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={muteText}>
                            {t('notes.notebook_form.field.icon')}
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center" style={iconPreviewStyle}>
                                <i
                                    className={`${icon.trim() ? (icon.includes(' ') ? icon : `fa-solid ${icon}`) : 'fa-solid fa-book'} text-sm`}
                                    style={{ color: color ?? undefined }}
                                />
                            </div>
                            <input
                                type="text"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                placeholder={t('notes.notebook_form.field.icon_placeholder')}
                                maxLength={100}
                                className="flex-1 font-mono text-xs"
                                style={inputStyle}
                            />
                        </div>
                        <p className="mt-1 text-[10px]" style={fadedText}>
                            {t('notes.notebook_form.field.icon_hint')}
                        </p>
                    </div>

                    {/* Pinned toggle */}
                    <label className="flex cursor-pointer items-center justify-between px-3 py-2" style={pinToggleWrapperStyle}>
                        <div>
                            <span className="text-sm font-medium">{t('notes.notebook_form.field.pin_label')}</span>
                            <p className="text-[11px]" style={fadedText}>
                                {t('notes.notebook_form.field.pin_hint')}
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="alex-toggle"
                        />
                    </label>

                    {/* Error surface */}
                    {error && (
                        <div className="px-3 py-2 text-xs" style={errorStyle}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3" style={sectionBorderTopStyle}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="alex-btn alex-btn--ghost"
                        style={{ borderRadius: 'var(--theme-radius-button)', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                    >
                        {t('notes.notebook_form.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !title.trim()}
                        className="alex-btn alex-btn--primary"
                        style={{ borderRadius: 'var(--theme-radius-button)', padding: '0.25rem 0.625rem', fontSize: '0.75rem', gap: '0.375rem' }}
                    >
                        {saving && <i className="fa-solid fa-circle-notch fa-spin text-xs" />}
                        {isEdit ? t('notes.notebook_form.submit_edit') : t('notes.notebook_form.submit_create')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
