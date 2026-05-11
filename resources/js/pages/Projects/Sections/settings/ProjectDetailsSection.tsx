import { useForm } from '@inertiajs/react';
import { useState, type CSSProperties, type SyntheticEvent } from 'react';
import RichTextEditor from '@alexandria/components/editor/RichTextEditor';
import Tooltip from '@alexandria/components/ui/Tooltip';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT from '@alexandria/hooks/useT';
import type { ProjectDetail, AiInstruction } from '@alexandria/types/projects';

interface ProjectDetailsSectionProps {
    project: ProjectDetail;
}

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const errorText: CSSProperties = { color: 'var(--theme-status-error-stroke)' };

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1.5rem',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
};

const textareaStyle: CSSProperties = {
    ...inputStyle,
    resize: 'vertical',
};

const primaryBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    gap: '0.375rem',
};

const secondaryBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-secondary-500)',
    color: 'var(--theme-brand-secondary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    gap: '0.375rem',
};

const ghostBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
};

const iconBtnGhostStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
};

const instructionItemStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1rem',
    transition: 'border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const defaultBadgeStyle: CSSProperties = {
    background: 'var(--theme-brand-secondary-500)',
    color: 'var(--theme-brand-secondary-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
};

const editFormCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)',
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 5%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1.25rem',
};

const addCtaStyle: CSSProperties = {
    border: '2px dashed color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '0.75rem',
    gap: '0.5rem',
    transition: 'border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

export default function ProjectDetailsSection({ project }: ProjectDetailsSectionProps) {
    const t = useT();
    const form = useForm({
        name: project.name,
        logline: project.logline ?? '',
        summary: project.summary ?? '',
        contents: project.contents ?? '',
    });

    const [instructions, setInstructions] = useState<AiInstruction[]>(project.ai_instructions);

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        form.put(`/p/${project.slug}/settings`);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div style={cardStyle}>
                <h3 className="mb-4 text-lg font-bold">{t('projects.details.title')}</h3>

                <div className="space-y-4">
                    <div className="flex flex-col">
                        <label className="mb-1 text-sm font-semibold">
                            {t('projects.details.field.name')}
                        </label>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            style={inputStyle}
                            maxLength={255}
                        />
                        {form.errors.name && <p className="mt-1 text-sm" style={errorText}>{form.errors.name}</p>}
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-1 text-sm font-semibold">
                            {t('projects.details.field.logline')}
                        </label>
                        <input
                            type="text"
                            value={form.data.logline}
                            onChange={(e) => form.setData('logline', e.target.value)}
                            style={inputStyle}
                            placeholder={t('projects.details.field.logline_placeholder')}
                            maxLength={500}
                        />
                        {form.errors.logline && <p className="mt-1 text-sm" style={errorText}>{form.errors.logline}</p>}
                    </div>

                    <div>
                        <RichTextEditor
                            label={t('projects.details.field.summary')}
                            value={form.data.summary}
                            onChange={(wiki) => form.setData('summary', wiki)}
                            placeholder={t('projects.details.field.summary_placeholder')}
                            maxLength={5000}
                            tier="free"
                        />
                        {form.errors.summary && <p className="mt-1 text-sm" style={errorText}>{form.errors.summary}</p>}
                    </div>

                    <div>
                        <RichTextEditor
                            label={t('projects.details.field.contents')}
                            value={form.data.contents}
                            onChange={(wiki) => form.setData('contents', wiki)}
                            placeholder={t('projects.details.field.contents_placeholder')}
                            maxLength={50000}
                            tier="premium"
                            enableAi
                            projectId={project.id}
                            aiInstructions={instructions}
                        />
                        {form.errors.contents && <p className="mt-1 text-sm" style={errorText}>{form.errors.contents}</p>}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="alex-btn inline-flex items-center"
                    style={{ ...primaryBtnStyle, opacity: form.processing ? 0.5 : 1 }}
                >
                    {form.processing && <i className="fa-solid fa-circle-notch fa-spin text-sm" aria-hidden="true" />}
                    {form.processing ? t('projects.details.saving') : t('projects.details.save')}
                </button>
            </div>

            {/* AI Writing Instructions */}
            <AiInstructionsSection
                projectId={project.id}
                instructions={instructions}
                onChange={setInstructions}
            />
        </form>
    );
}

/* ── AI Writing Instructions CRUD ── */

function AiInstructionsSection({ projectId, instructions, onChange }: {
    projectId: number;
    instructions: AiInstruction[];
    onChange: (instructions: AiInstruction[]) => void;
}) {
    const t = useT();
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [label, setLabel] = useState('');
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);

    function resetForm() {
        setLabel('');
        setText('');
        setEditId(null);
        setShowAdd(false);
    }

    function startEdit(inst: AiInstruction) {
        setEditId(inst.id);
        setLabel(inst.label);
        setText(inst.instructions);
        setShowAdd(true);
    }

    function handleSave() {
        if (!label.trim() || !text.trim()) return;
        setSaving(true);

        if (editId) {
            fetch(`/api/v1/ai-instructions/${editId}`, {
                method: 'PUT', headers: csrfHeaders(), credentials: 'same-origin',
                body: JSON.stringify({ label, instructions: text }),
            })
                .then((r) => r.json())
                .then((updated) => {
                    onChange(instructions.map((i) => i.id === editId ? { ...i, ...updated } : i));
                    resetForm();
                })
                .finally(() => setSaving(false));
        } else {
            fetch(`/api/v1/projects/${projectId}/ai-instructions`, {
                method: 'POST', headers: csrfHeaders(), credentials: 'same-origin',
                body: JSON.stringify({ label, instructions: text, is_default: instructions.length === 0 }),
            })
                .then((r) => r.json())
                .then((created) => {
                    onChange([...instructions, created]);
                    resetForm();
                })
                .finally(() => setSaving(false));
        }
    }

    function handleDelete(id: number) {
        fetch(`/api/v1/ai-instructions/${id}`, {
            method: 'DELETE', headers: csrfHeaders(), credentials: 'same-origin',
        }).then(() => {
            const remaining = instructions.filter((i) => i.id !== id);
            // If we deleted the default, the backend promotes the first remaining one
            if (remaining.length > 0 && !remaining.some((i) => i.is_default)) {
                remaining[0].is_default = true;
            }
            onChange(remaining);
            if (editId === id) resetForm();
        });
    }

    function handleSetDefault(id: number) {
        fetch(`/api/v1/ai-instructions/${id}/default`, {
            method: 'PUT', headers: csrfHeaders(), credentials: 'same-origin',
        }).then(() => {
            onChange(instructions.map((i) => ({ ...i, is_default: i.id === id })));
        });
    }

    return (
        <div style={cardStyle}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold">
                        <i
                            className="fa-solid fa-scroll mr-2"
                            style={{ color: 'color-mix(in srgb, var(--theme-brand-secondary-500) 70%, transparent)' }}
                            aria-hidden="true"
                        />
                        {t('projects.details.ai.title')}
                    </h3>
                    <p className="mt-1 text-xs" style={fadedText}>
                        {t('projects.details.ai.subtitle')}
                    </p>
                </div>
            </div>

            {/* Instruction list */}
            {instructions.length > 0 && (
                <div className="mt-4 space-y-2">
                    {instructions.map((inst) => (
                        <div key={inst.id} className="group flex items-start gap-3" style={instructionItemStyle}>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{inst.label}</span>
                                    {inst.is_default && (
                                        <span style={defaultBadgeStyle}>
                                            {t('projects.details.ai.default_badge')}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs line-clamp-2" style={labelText}>{inst.instructions}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {!inst.is_default && (
                                    <Tooltip content={t('projects.details.ai.tooltip.set_default')}>
                                        <button
                                            type="button"
                                            onClick={() => handleSetDefault(inst.id)}
                                            className="alex-btn"
                                            style={iconBtnGhostStyle}
                                            aria-label={t('projects.details.ai.tooltip.set_default')}
                                        >
                                            <i
                                                className="fa-solid fa-star text-xs"
                                                style={{ color: 'var(--theme-status-warning-stroke)' }}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </Tooltip>
                                )}
                                <Tooltip content={t('projects.details.ai.tooltip.edit')}>
                                    <button
                                        type="button"
                                        onClick={() => startEdit(inst)}
                                        className="alex-btn"
                                        style={iconBtnGhostStyle}
                                        aria-label={t('projects.details.ai.tooltip.edit')}
                                    >
                                        <i
                                            className="fa-solid fa-pen text-xs"
                                            style={{ color: 'var(--theme-status-info-stroke)' }}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('projects.details.ai.tooltip.delete')} variant="error">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(inst.id)}
                                        className="alex-btn"
                                        style={iconBtnGhostStyle}
                                        aria-label={t('projects.details.ai.tooltip.delete')}
                                    >
                                        <i
                                            className="fa-solid fa-trash text-xs"
                                            style={{ color: 'var(--theme-status-error-stroke)' }}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add / Edit form */}
            {showAdd ? (
                <div className="mt-4 space-y-3" style={editFormCardStyle}>
                    <h4 className="text-sm font-semibold">
                        {editId ? t('projects.details.ai.form.edit_title') : t('projects.details.ai.form.new_title')}
                    </h4>
                    <div className="flex flex-col">
                        <label className="mb-1 text-sm">
                            {t('projects.details.ai.form.label')}
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            style={inputStyle}
                            placeholder={t('projects.details.ai.form.label_placeholder')}
                            maxLength={100}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 flex items-center justify-between text-sm">
                            <span>{t('projects.details.ai.form.instructions')}</span>
                            <span className="text-xs" style={fadedText}>{text.length}/2000</span>
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            style={textareaStyle}
                            placeholder={t('projects.details.ai.form.instructions_placeholder')}
                            rows={3}
                            maxLength={2000}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="alex-btn"
                            style={ghostBtnStyle}
                        >
                            {t('projects.details.ai.form.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!label.trim() || !text.trim() || saving}
                            className="alex-btn inline-flex items-center"
                            style={{ ...secondaryBtnStyle, opacity: (!label.trim() || !text.trim() || saving) ? 0.5 : 1 }}
                        >
                            {saving && <i className="fa-solid fa-circle-notch fa-spin text-xs" aria-hidden="true" />}
                            {saving
                                ? t('projects.details.ai.form.saving')
                                : (editId ? t('projects.details.ai.form.update') : t('projects.details.ai.form.add'))}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="alex-btn mt-4 w-full inline-flex items-center justify-center"
                    style={addCtaStyle}
                >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    {t('projects.details.ai.add_button')}
                </button>
            )}
        </div>
    );
}
