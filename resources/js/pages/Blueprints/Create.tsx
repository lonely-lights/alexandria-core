import { usePage } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import { useState, useRef } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import Textarea from '@alexandria/components/form/Textarea';
import ActionButton from '@alexandria/components/ui/ActionButton';
import { useBlueprintFields } from '@alexandria/hooks/useBlueprintFields';
import { useSortableReorder } from '@alexandria/hooks/useSortableReorder';
import { FIELD_TYPES } from '@alexandria/config/fieldTypes';

interface CreateProps {
    project: {
        id: number;
        name: string;
        slug: string;
    };
}


const CLASSIFICATIONS = [
    { value: 'standard', label: 'Page', icon: 'fa-solid fa-file', description: 'Full-featured entries with their own pages.' },
    { value: 'list', label: 'List', icon: 'fa-solid fa-list', description: 'Simple selection values used as dropdowns.' },
    { value: 'structural', label: 'Structural', icon: 'fa-solid fa-sitemap', description: 'Organizational containers with hierarchy.' },
    { value: 'relationship', label: 'Relationship', icon: 'fa-solid fa-diagram-project', description: 'Defines connection schemas between entries.' },
] as const;

const FIELD_TYPE_OPTIONS = [
    { value: 'text', label: 'Text', description: 'Short text input for names, titles, labels.' },
    { value: 'textarea', label: 'Text Area', description: 'Multi-line text for longer descriptions or notes.' },
    { value: 'integer', label: 'Number', description: 'Numeric values like age, count, or sequence.' },
    { value: 'boolean', label: 'Toggle', description: 'Yes/no or true/false switch.' },
    { value: 'date', label: 'Date', description: 'Calendar date without time.' },
    { value: 'datetime', label: 'Date & Time', description: 'Full timestamp with date and time.' },
    { value: 'entry_reference', label: 'Reference', description: 'Link to another entry (e.g., a Location or Character).' },
    { value: 'temporal', label: 'Temporal', description: 'Time-bounded records with start/end dates and intensity.' },
] as const;

export default function BlueprintCreate() {
    const { project } = usePage().props as unknown as CreateProps;

    const form = useForm({
        name: '',
        description: '',
        icon: 'fa-solid fa-cube',
        classification: 'standard' as string,
        show_on_dashboard: true,
        is_linkable: true,
        is_hub: false,
        show_tree_view: false,
        list_selection_mode: 'single' as string,
    });

    const { fields, addField, removeField, updateField, reorderFields } = useBlueprintFields([]);
    const [step, setStep] = useState<'basics' | 'fields' | 'ai'>('basics');
    const [aiInstructions, setAiInstructions] = useState('');
    const sortableRef = useRef<HTMLDivElement>(null);

    useSortableReorder(sortableRef, reorderFields, step === 'fields');

    const iconClass = form.data.icon.includes(' ') ? form.data.icon : `fa-solid ${form.data.icon}`;
    const selectedClassification = CLASSIFICATIONS.find((c) => c.value === form.data.classification);
    const canHaveFields = form.data.classification !== 'structural' && form.data.classification !== 'relationship';

    function handleSubmit() {
        form.transform((data) => ({
            ...data,
            fields: fields.map((f, i) => ({
                label: f.label,
                name: f.name,
                type: f.type,
                description: f.description ?? '',
                is_required: f.is_required,
                validation_rules: f.validation_rules ?? {},
                sort_order: i + 1,
            })),
            ai_instructions: aiInstructions.trim() || undefined,
        }));
        form.post(`/p/${project.slug}/blueprints`);
    }

    return (
        <AppLayout title={`New Blueprint - ${project.name}`}>
            <div className="container mx-auto max-w-3xl px-4 py-8">
                {/* Header — serif title + subtitle, breadcrumb above.
                    Matches Notes / AI / Blueprint Show conventions so
                    the "create" flow doesn't feel visually detached. */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-sm text-base-content/50">
                        <a href={`/p/${project.slug}`} className="hover:text-primary hover:underline">{project.name}</a>
                        <i className="fa-solid fa-chevron-right text-[10px]" />
                        <span className="text-base-content/70">New Blueprint</span>
                    </div>
                    <h1 className="mt-2 font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">Create Blueprint</h1>
                    <p className="mt-1 text-sm text-base-content/50">
                        Blueprints define the structure and fields for your entries.
                    </p>
                </div>

                {/* Step tabs */}
                <div className="mb-6 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setStep('basics')}
                        className={`btn btn-sm gap-1.5 rounded-xl ${step === 'basics' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <i className="fa-solid fa-sliders w-3.5 text-center text-xs" />
                        Basics
                    </button>
                    {canHaveFields && (
                        <button
                            type="button"
                            onClick={() => setStep('fields')}
                            className={`btn btn-sm gap-1.5 rounded-xl ${step === 'fields' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            <i className="fa-solid fa-layer-group w-3.5 text-center text-xs" />
                            Fields
                            {fields.length > 0 && (
                                <span className="badge badge-sm">{fields.length}</span>
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setStep('ai')}
                        className={`btn btn-sm gap-1.5 rounded-xl ${step === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <i className="fa-solid fa-brain w-3.5 text-center text-xs" />
                        AI
                    </button>
                </div>

                {step === 'basics' ? (
                    <div className="space-y-6">
                        {/* Identity */}
                        <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-200">
                            {/* Icon hero area — subtle primary tint
                                so the icon reads as the focal point
                                without fighting the card body. */}
                            <div className="relative border-b border-base-content/5 bg-primary/5 px-8 py-8">
                                <div className="flex items-center gap-6">
                                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-base-100/80 shadow-lg ring-1 ring-base-content/5 backdrop-blur-sm transition-all duration-300">
                                        <i className={`${iconClass} text-3xl text-primary`} />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            placeholder="Blueprint Name"
                                            autoFocus
                                            className="w-full rounded-lg border border-base-content/10 bg-base-100/50 px-3 py-2 text-2xl font-bold text-base-content placeholder:text-base-content/20 focus:border-primary/30 focus:outline-none"
                                        />
                                        {form.errors.name && (
                                            <p className="mt-1 text-xs text-error">{form.errors.name}</p>
                                        )}
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2">
                                                <i className="fa-solid fa-icons text-xs text-base-content/30" />
                                                <input
                                                    type="text"
                                                    value={form.data.icon}
                                                    onChange={(e) => form.setData('icon', e.target.value)}
                                                    placeholder="fa-solid fa-cube"
                                                    className="w-full rounded-lg border border-base-content/10 bg-base-100/50 px-3 py-1.5 font-mono text-xs text-base-content/60 placeholder:text-base-content/20 focus:border-primary/30 focus:outline-none"
                                                />
                                            </div>
                                            <p className="mt-1 pl-6 text-[11px] text-base-content/30">
                                                <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" className="text-primary/50 hover:text-primary hover:underline">FontAwesome</a> icon class - live preview shown on the left
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="px-8 py-5">
                                <Textarea
                                    label="Description"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.currentTarget.value)}
                                    placeholder="What is this blueprint used for?"
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Classification */}
                        <div className="rounded-2xl border border-base-content/10 bg-base-200 p-6">
                            <h2 className="text-sm font-semibold text-base-content/70">Classification</h2>
                            <p className="mb-4 mt-1 text-xs text-base-content/40">
                                Determines how entries behave. This cannot be changed after the blueprint is created.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {CLASSIFICATIONS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => form.setData('classification', c.value)}
                                        className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                                            form.data.classification === c.value
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-base-content/10 hover:border-base-content/20 hover:bg-base-200/30'
                                        }`}
                                    >
                                        <i className={`${c.icon} mt-0.5 text-lg ${form.data.classification === c.value ? 'text-primary' : 'text-base-content/30'}`} />
                                        <div>
                                            <p className={`font-medium ${form.data.classification === c.value ? 'text-primary' : ''}`}>{c.label}</p>
                                            <p className="mt-0.5 text-xs text-base-content/50">{c.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {form.data.classification === 'list' && (
                                <div className="mt-4">
                                    <label className="mb-1 block text-xs font-medium text-base-content/60">Selection Mode</label>
                                    <select
                                        value={form.data.list_selection_mode}
                                        onChange={(e) => form.setData('list_selection_mode', e.target.value)}
                                        className="select select-bordered w-full max-w-xs rounded-xl text-sm"
                                    >
                                        <option value="single">Single select</option>
                                        <option value="multiple">Multi-select</option>
                                    </select>
                                </div>
                            )}
                            {form.data.classification === 'relationship' && (
                                <div className="mt-4 flex items-start gap-3 rounded-xl border border-info/20 bg-info/5 px-4 py-3">
                                    <i className="fa-solid fa-circle-info mt-0.5 text-sm text-info" />
                                    <div>
                                        <p className="text-sm font-medium text-info">Relationship blueprints are configured after creation</p>
                                        <p className="mt-0.5 text-xs text-base-content/50">
                                            You'll define which blueprints this relationship connects, along with its metadata fields, in the Settings panel after the blueprint is created. This allows you to reference blueprints that already exist in your project.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Settings */}
                        <div className="rounded-2xl border border-base-content/10 bg-base-200 p-6">
                            <h2 className="mb-4 text-sm font-semibold text-base-content/70">Settings</h2>
                            <div className="space-y-3">
                                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-300 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium">Show on Dashboard</p>
                                        <p className="text-xs text-base-content/50">Display entries on the project dashboard</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary toggle-sm"
                                        checked={form.data.show_on_dashboard}
                                        onChange={(e) => form.setData('show_on_dashboard', e.target.checked)}
                                    />
                                </label>
                                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-300 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium">Linkable</p>
                                        <p className="text-xs text-base-content/50">Allow other entries to reference this type</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary toggle-sm"
                                        checked={form.data.is_linkable}
                                        onChange={(e) => form.setData('is_linkable', e.target.checked)}
                                    />
                                </label>
                                {form.data.classification !== 'structural' && (
                                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-300 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium">Tree View</p>
                                            <p className="text-xs text-base-content/50">Enable hierarchy view for parent/child entries</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-primary toggle-sm"
                                            checked={form.data.show_tree_view}
                                            onChange={(e) => form.setData('show_tree_view', e.target.checked)}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                ) : step === 'fields' ? (
                    /* Fields step */
                    <div className="space-y-6">
                        {/* Custom fields */}
                        <div className="rounded-2xl border border-base-content/10 bg-base-200 p-6">
                            <div className="mb-1 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-base-content/70">Custom Fields</h2>
                                <ActionButton
                                    icon="fa-solid fa-plus"
                                    label="Add Field"
                                    size="xs"
                                    onClick={addField}
                                />
                            </div>
                            <p className="mb-4 text-xs text-base-content/40">
                                Define the data structure for your entries. Every entry also includes Name, Summary, and Content by default. Fields can be added or modified later via Settings.
                            </p>

                            {fields.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-base-content/10 py-8 text-center">
                                    <i className="fa-solid fa-layer-group mb-2 text-2xl text-base-content/15" />
                                    <p className="text-sm text-base-content/40">No custom fields yet</p>
                                    <p className="mt-1 text-xs text-base-content/25">Click "Add Field" to define your blueprint's data structure.</p>
                                </div>
                            ) : (
                                <div ref={sortableRef} className="-mx-6 -mb-6 overflow-hidden rounded-b-2xl">
                                    {fields.map((field, index) => {
                                        const ft = FIELD_TYPES[field.type];
                                        const showDrag = fields.length > 1;
                                        return (
                                            <div
                                                key={field.id ?? index}
                                                className={`group border-t border-base-content/5 px-6 py-4 transition-colors ${
                                                    index % 2 === 0 ? 'bg-base-200/30' : 'bg-base-100'
                                                } hover:bg-base-200/60`}
                                            >
                                                <div className="flex">
                                                    {/* Left gutter: drag handle */}
                                                    {showDrag && (
                                                        <div className="drag-handle flex w-8 flex-shrink-0 cursor-grab items-center justify-center text-base-content/15 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
                                                            <i className="fa-solid fa-grip-vertical text-base" />
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="min-w-0 flex-1 space-y-2 py-0.5">
                                                        {/* Label + type icon + type select + delete */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-300/50 ring-1 ring-base-content/5">
                                                                {ft && <i className={`${ft.icon} text-sm ${ft.color}`} />}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={field.label}
                                                                onChange={(e) => updateField(index, { label: e.target.value })}
                                                                placeholder="Field label"
                                                                className="input input-bordered h-8 min-h-0 flex-1 rounded-lg text-sm font-medium"
                                                            />
                                                            <select
                                                                value={field.type}
                                                                onChange={(e) => updateField(index, { type: e.target.value })}
                                                                className="select select-bordered h-8 min-h-0 w-32 flex-shrink-0 rounded-lg text-xs"
                                                            >
                                                                {FIELD_TYPE_OPTIONS.map((fto) => (
                                                                    <option key={fto.value} value={fto.value}>{fto.label}</option>
                                                                ))}
                                                            </select>
                                                            <button type="button" onClick={() => removeField(index)} className="btn btn-ghost btn-xs btn-square h-7 min-h-0 w-7 flex-shrink-0 rounded-lg text-error/20 opacity-0 transition-all hover:text-error group-hover:opacity-100" title="Remove field">
                                                                <i className="fa-solid fa-trash text-[10px]" />
                                                            </button>
                                                        </div>
                                                        {/* Description */}
                                                        <input
                                                            type="text"
                                                            value={field.description ?? ''}
                                                            onChange={(e) => updateField(index, { description: e.target.value })}
                                                            placeholder="Description for AI context"
                                                            className="input input-bordered h-8 min-h-0 w-full rounded-lg text-xs text-base-content/60 placeholder:text-base-content/20"
                                                        />
                                                        {/* Options */}
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-base-content/5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.is_required}
                                                                    onChange={(e) => updateField(index, { is_required: e.target.checked })}
                                                                    className="checkbox checkbox-xs checkbox-primary"
                                                                />
                                                                <span className="text-[11px] text-base-content/40">Required</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Field type reference */}
                        <div className="rounded-2xl border border-base-content/10 bg-base-200 p-6">
                            <h2 className="text-sm font-semibold text-base-content/70">Available Field Types</h2>
                            <p className="mb-4 mt-1 text-xs text-base-content/40">
                                Each field type determines how data is stored, displayed, and filtered.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {FIELD_TYPE_OPTIONS.map((fto) => {
                                    const ft = FIELD_TYPES[fto.value];
                                    return (
                                        <div key={fto.value} className="flex items-start gap-3 rounded-xl border border-base-content/5 px-3 py-2.5">
                                            <i className={`${ft?.icon ?? 'fa-solid fa-cube'} mt-0.5 w-4 text-center text-xs ${ft?.color ?? 'text-base-content/30'}`} />
                                            <div>
                                                <p className="text-sm font-medium">{fto.label}</p>
                                                <p className="text-[11px] leading-tight text-base-content/40">{fto.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : step === 'ai' ? (
                    /* AI step */
                    <div className="space-y-6">
                        {/* Blueprint AI Instructions */}
                        <div className="rounded-2xl border border-base-content/10 bg-base-200 p-6">
                            <h2 className="text-sm font-semibold text-base-content/70">AI Instructions</h2>
                            <p className="mb-4 mt-1 text-xs text-base-content/40">
                                Guide how AI processes entries of this type. These instructions are included in AI prompts when sorting notes, generating content, or filling fields. You can add more instruction sets after creation.
                            </p>
                            <textarea
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                                placeholder={"Example: When creating a Character entry, always include their role in the story. Use formal names, not nicknames. If a gender is not specified, leave it blank rather than assuming."}
                                className="textarea textarea-bordered w-full rounded-xl text-sm"
                                rows={6}
                            />
                        </div>

                        {/* Info about post-creation AI features */}
                        <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 px-5 py-4">
                            <i className="fa-solid fa-circle-info mt-0.5 text-sm text-info" />
                            <div>
                                <p className="text-sm font-medium text-info">More AI options available after creation</p>
                                <p className="mt-0.5 text-xs text-base-content/50">
                                    Once created, you can add multiple labeled instruction sets for different purposes (sorting, content generation, field population), configure per-field AI behavior (priority, triggers, conditions), and set up AI-assisted note integration.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Actions */}
                <div className="mt-6 flex items-center justify-between">
                    <a href={`/p/${project.slug}`} className="btn btn-ghost btn-sm rounded-xl">
                        <i className="fa-solid fa-arrow-left text-xs" /> Back to Project
                    </a>
                    <div className="flex items-center gap-2">
                        {step === 'basics' && canHaveFields && (
                            <ActionButton
                                icon="fa-solid fa-arrow-right"
                                label="Next: Fields"
                                variant="ghost"
                                onClick={() => setStep('fields')}
                            />
                        )}
                        <ActionButton
                            icon="fa-solid fa-check"
                            label={`Create ${selectedClassification?.label ?? 'Blueprint'}`}
                            onClick={handleSubmit}
                            loading={form.processing}
                            disabled={!form.data.name.trim()}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
