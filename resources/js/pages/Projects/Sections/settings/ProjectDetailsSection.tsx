import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import RichTextEditor from '@alexandria/components/editor/RichTextEditor';
import Tooltip from '@alexandria/components/ui/Tooltip';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import type { ProjectDetail, AiInstruction } from '@alexandria/types/projects';
import type { SyntheticEvent } from 'react';

interface ProjectDetailsSectionProps {
    project: ProjectDetail;
}

export default function ProjectDetailsSection({ project }: ProjectDetailsSectionProps) {
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
            <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-6">
                <h3 className="mb-4 text-lg font-bold">Project Details</h3>

                <div className="space-y-4">
                    <div className="form-control">
                        <label className="label"><span className="label-text font-semibold">Project Name</span></label>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className="input input-bordered rounded-xl focus:input-primary"
                            maxLength={255}
                        />
                        {form.errors.name && <p className="mt-1 text-sm text-error">{form.errors.name}</p>}
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text font-semibold">Logline</span></label>
                        <input
                            type="text"
                            value={form.data.logline}
                            onChange={(e) => form.setData('logline', e.target.value)}
                            className="input input-bordered rounded-xl focus:input-primary"
                            placeholder="A one-sentence pitch for your world"
                            maxLength={500}
                        />
                        {form.errors.logline && <p className="mt-1 text-sm text-error">{form.errors.logline}</p>}
                    </div>

                    <div>
                        <RichTextEditor
                            label="Summary"
                            value={form.data.summary}
                            onChange={(wiki) => form.setData('summary', wiki)}
                            placeholder="Describe your world..."
                            maxLength={5000}
                            tier="free"
                        />
                        {form.errors.summary && <p className="mt-1 text-sm text-error">{form.errors.summary}</p>}
                    </div>

                    <div>
                        <RichTextEditor
                            label="Contents"
                            value={form.data.contents}
                            onChange={(wiki) => form.setData('contents', wiki)}
                            placeholder="Detailed world description, lore, history..."
                            maxLength={50000}
                            tier="premium"
                            enableAi
                            projectId={project.id}
                            aiInstructions={instructions}
                        />
                        {form.errors.contents && <p className="mt-1 text-sm text-error">{form.errors.contents}</p>}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button type="submit" className="btn btn-primary rounded-xl" disabled={form.processing}>
                    {form.processing ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Changes'}
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
        <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold">
                        <i className="fa-solid fa-scroll mr-2 text-secondary/70" />
                        AI Writing Instructions
                    </h3>
                    <p className="mt-1 text-xs text-base-content/40">
                        Instruction sets are available when using the AI writing assistant, unless excluded.
                    </p>
                </div>
            </div>

            {/* Instruction list */}
            {instructions.length > 0 && (
                <div className="mt-4 space-y-2">
                    {instructions.map((inst) => (
                        <div key={inst.id} className="group flex items-start gap-3 rounded-xl border border-base-300 bg-base-200/30 p-4 transition-all hover:border-base-content/20">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{inst.label}</span>
                                    {inst.is_default && <span className="badge badge-sm badge-secondary">Default</span>}
                                </div>
                                <p className="mt-1 text-xs text-base-content/50 line-clamp-2">{inst.instructions}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {!inst.is_default && (
                                    <Tooltip content="Set as default">
                                        <button type="button" onClick={() => handleSetDefault(inst.id)} className="btn btn-ghost btn-xs">
                                            <i className="fa-solid fa-star text-xs text-warning" />
                                        </button>
                                    </Tooltip>
                                )}
                                <Tooltip content="Edit">
                                    <button type="button" onClick={() => startEdit(inst)} className="btn btn-ghost btn-xs">
                                        <i className="fa-solid fa-pen text-xs text-info" />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Delete" variant="error">
                                    <button type="button" onClick={() => handleDelete(inst.id)} className="btn btn-ghost btn-xs">
                                        <i className="fa-solid fa-trash text-xs text-error" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add / Edit form */}
            {showAdd ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-secondary/20 bg-secondary/5 p-5">
                    <h4 className="text-sm font-semibold">{editId ? 'Edit Instruction Set' : 'New Instruction Set'}</h4>
                    <div className="form-control">
                        <label className="label py-1"><span className="label-text text-sm">Label</span></label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="input input-bordered rounded-xl focus:input-secondary"
                            placeholder="e.g. Prose Style, Dialogue, Technical"
                            maxLength={100}
                        />
                    </div>
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text text-sm">Instructions</span>
                            <span className="label-text-alt text-xs text-base-content/40">{text.length}/2000</span>
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="textarea textarea-bordered rounded-xl focus:textarea-secondary"
                            placeholder="e.g. Avoid emdashes. Write in active voice. Keep sentences direct."
                            rows={3}
                            maxLength={2000}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={resetForm} className="btn btn-ghost btn-sm rounded-xl">Cancel</button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="btn btn-secondary btn-sm rounded-xl"
                            disabled={!label.trim() || !text.trim() || saving}
                        >
                            {saving ? <><span className="loading loading-spinner loading-xs" /> Saving...</> : (editId ? 'Update' : 'Add')}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="mt-4 btn btn-ghost w-full gap-2 rounded-2xl border-2 border-dashed border-base-300 text-base-content/50 hover:border-secondary/30 hover:text-secondary"
                >
                    <i className="fa-solid fa-plus" /> Add Instruction Set
                </button>
            )}
        </div>
    );
}
