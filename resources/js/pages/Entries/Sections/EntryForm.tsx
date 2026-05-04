import { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import Sortable from 'sortablejs';
import Textarea from '@alexandria/components/form/Textarea';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Modal from '@alexandria/components/ui/Modal';
import StardateInput from '@alexandria/components/fields/StardateInput';
import MediaSection from '@alexandria/components/media/MediaSection';

interface ReferenceEntry {
    id: number;
    name: string;
}

interface ReferenceConfig {
    target_blueprint_slug: string | null;
    target_blueprint_name: string | null;
    selection_mode: 'single' | 'multiple';
    entries: ReferenceEntry[];
}

interface BlueprintFieldDef {
    id: number;
    name: string;
    label: string;
    type: string;
    description: string | null;
    is_required: boolean;
    validation_rules: Record<string, unknown>;
    sort_order: number;
    reference_config?: ReferenceConfig;
}

interface ParentEntry {
    id: number;
    name: string;
    slug: string;
}

interface TemporalRecord {
    label: string;
    start: string;
    end: string;
    intensity: number | null;
    reference_id: number | null;
    notes: string;
}

interface EntryFormProps {
    mode: 'create' | 'edit';
    projectSlug: string;
    blueprintSlug: string;
    blueprintName: string;
    blueprintIcon: string;
    fields: BlueprintFieldDef[];
    parentEntries: ParentEntry[];
    entrySlug?: string;
    entryId?: number;
    initialValues?: {
        name: string;
        summary: string | null;
        content: string | null;
        parent_id: number | null;
    };
    initialFieldValues?: Record<string, unknown>;
}

export default function EntryForm({
    mode,
    projectSlug,
    blueprintSlug,
    blueprintName,
    blueprintIcon,
    fields,
    parentEntries,
    entrySlug,
    entryId,
    initialValues,
    initialFieldValues,
}: EntryFormProps) {
    const iconClass = blueprintIcon.includes(' ') ? blueprintIcon : `fa-solid ${blueprintIcon}`;

    // Split fields into standard and temporal
    const standardFields = fields.filter((f) => f.type !== 'temporal');
    const temporalFields = fields.filter((f) => f.type === 'temporal');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm<any>({
        name: initialValues?.name ?? '',
        summary: initialValues?.summary ?? '',
        content: initialValues?.content ?? '',
        parent_id: initialValues?.parent_id ?? '',
        fields: buildInitialFields(fields, initialFieldValues),
    });

    function handleSubmit() {
        if (mode === 'create') {
            form.post(`/p/${projectSlug}/${blueprintSlug}`);
        } else {
            form.put(`/p/${projectSlug}/${blueprintSlug}/${entrySlug}`);
        }
    }

    function updateField(fieldName: string, value: unknown) {
        form.setData('fields', { ...form.data.fields, [fieldName]: value });
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="flex gap-6">
                {/* ── Left Column: Identity + Content + Temporal ── */}
                <div className="min-w-0 flex-1 space-y-6">
                    {/* Identity */}
                    <div className="paper-board rounded-2xl border border-base-content/10">
                        <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                            <div
                                className="relative border-b border-base-content/10 px-8 py-6"
                                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 12%, transparent), color-mix(in srgb, var(--color-secondary) 8%, transparent), color-mix(in srgb, var(--color-base-200) 50%, transparent))' }}
                            >
                                <div className="flex items-center gap-5">
                                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-base-100 shadow-md ring-1 ring-base-content/5">
                                        <i className={`${iconClass} text-2xl text-primary`} />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            placeholder={`${blueprintName} name`}
                                            autoFocus
                                            className="w-full rounded-lg border border-base-content/10 bg-base-100 px-3 py-2 text-2xl font-bold text-base-content placeholder:text-base-content/20 focus:border-primary/30 focus:outline-none"
                                        />
                                        {form.errors.name && (
                                            <p className="mt-1 text-xs text-error">{form.errors.name}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-5">
                                <Textarea
                                    label="Summary"
                                    value={form.data.summary}
                                    onChange={(e) => form.setData('summary', e.currentTarget.value)}
                                    placeholder="A brief summary of this entry"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="paper-board rounded-2xl border border-base-content/10">
                        <div className="bg-base-200 p-6" style={{ borderRadius: 'inherit' }}>
                            <h2 className="mb-3 text-sm font-semibold text-base-content/70">Content</h2>
                            <textarea
                                value={form.data.content}
                                onChange={(e) => form.setData('content', e.target.value)}
                                placeholder="Write your content here... Supports [[wiki links]] and wiki markup."
                                rows={16}
                                className="textarea textarea-bordered w-full rounded-xl bg-base-100 text-sm leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Temporal Fields */}
                    {temporalFields.map((field) => (
                        <TemporalFieldEditor
                            key={field.name}
                            field={field}
                            records={(form.data.fields[field.name] as TemporalRecord[] | undefined) ?? []}
                            onChange={(records) => updateField(field.name, records)}
                        />
                    ))}
                </div>

                {/* ── Right Column: Fields + Organization ── */}
                <div className="w-80 flex-shrink-0 space-y-6">
                    {/* Standard Fields */}
                    {standardFields.length > 0 && (
                        <div className="paper-board rounded-2xl border border-base-content/10">
                            <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                                <div
                                    className="flex items-center gap-2 border-b border-base-content/10 px-4 py-3 text-secondary-content"
                                    style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-secondary) 80%, transparent), color-mix(in srgb, var(--color-secondary) 60%, transparent))' }}
                                >
                                    <i className="fa-solid fa-layer-group text-xs text-secondary-content/60" />
                                    <h3 className="text-xs font-semibold">Fields</h3>
                                    <span className="ml-auto rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold text-white">
                                        {standardFields.length}
                                    </span>
                                </div>
                                <div className="divide-y divide-dashed divide-base-content/10">
                                    {standardFields.map((field) => (
                                        <div key={field.name} className="px-4 py-3">
                                            <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/60">
                                                {field.label}
                                                {field.is_required && <span className="text-[9px] text-error/60">*</span>}
                                            </label>
                                            {field.description && (
                                                <p className="mt-0.5 text-[10px] text-base-content/30">{field.description}</p>
                                            )}
                                            <div className="mt-1.5">
                                                <DynamicFieldInput
                                                    field={field}
                                                    value={form.data.fields[field.name] ?? ''}
                                                    onChange={(v) => updateField(field.name, v)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Media — only on existing entries (need an ID for the API). */}
                    {entryId && (
                        <div className="paper-board rounded-2xl border border-base-content/10">
                            <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                                <div
                                    className="flex items-center gap-2 border-b border-base-content/10 px-4 py-3 text-accent-content"
                                    style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 80%, transparent), color-mix(in srgb, var(--color-accent) 60%, transparent))' }}
                                >
                                    <i className="fa-solid fa-photo-film text-xs text-accent-content/60" />
                                    <h3 className="text-xs font-semibold">Media</h3>
                                </div>
                                <div className="p-4">
                                    <MediaSection modelType="entries" modelId={entryId} compact />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Parent */}
                    {parentEntries.length > 0 && (
                        <div className="paper-board rounded-2xl border border-base-content/10">
                            <div className="bg-base-200 p-4" style={{ borderRadius: 'inherit' }}>
                                <label className="text-xs font-medium text-base-content/60">Parent Entry</label>
                                <p className="mb-2 mt-0.5 text-[10px] text-base-content/30">
                                    Place this entry under another entry in the hierarchy. Used for structural organization like chapters, sections, or locations within locations.
                                </p>
                                <select
                                    value={form.data.parent_id as string}
                                    onChange={(e) => form.setData('parent_id', e.target.value ? Number(e.target.value) : '' as unknown as number)}
                                    className="select select-bordered mt-1 h-8 min-h-0 w-full rounded-xl bg-base-100 text-xs"
                                >
                                    <option value="">No parent</option>
                                    {parentEntries.map((pe) => (
                                        <option key={pe.id} value={pe.id}>{pe.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                        <ActionButton
                            icon="fa-solid fa-check"
                            label={mode === 'create' ? `Create ${blueprintName}` : `Save Changes`}
                            onClick={handleSubmit}
                            loading={form.processing}
                            disabled={!form.data.name.trim()}
                            className="w-full justify-center"
                        />
                        <a
                            href={`/p/${projectSlug}/${blueprintSlug}`}
                            className="btn btn-ghost btn-sm w-full rounded-xl text-xs"
                        >
                            Cancel
                        </a>
                    </div>
                </div>
            </div>
        </form>
    );
}

/* ── Temporal Field Editor ── */

function TemporalFieldEditor({ field, records, onChange }: {
    field: BlueprintFieldDef;
    records: TemporalRecord[];
    onChange: (records: TemporalRecord[]) => void;
}) {
    function addRecord() {
        onChange([...records, { label: '', start: '', end: '', intensity: null, reference_id: null, notes: '' }]);
    }

    function updateRecord(i: number, updates: Partial<TemporalRecord>) {
        onChange(records.map((r, j) => j === i ? { ...r, ...updates } : r));
    }

    function removeRecord(i: number) {
        onChange(records.filter((_, j) => j !== i));
    }

    const config = field.validation_rules ?? {};
    const allowIntensity = !!config.allow_intensity;
    const intensityLabel = (config.intensity_label as string) ?? 'Intensity';

    return (
        <div className="paper-board rounded-2xl border border-base-content/10">
            <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                <div
                    className="flex items-center gap-2 border-b border-base-content/10 px-5 py-3 text-secondary-content"
                    style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-secondary) 80%, transparent), color-mix(in srgb, var(--color-secondary) 60%, transparent))' }}
                >
                    <i className="fa-solid fa-timeline text-xs text-secondary-content/60" />
                    <h3 className="text-xs font-semibold">{field.label}</h3>
                    <span className="ml-auto rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {records.length} {records.length === 1 ? 'record' : 'records'}
                    </span>
                </div>

                {field.description && (
                    <div className="border-b border-base-content/10 bg-base-300/30 px-5 py-2">
                        <p className="text-[11px] text-base-content/40">{field.description}</p>
                    </div>
                )}

                <div className="divide-y divide-dashed divide-base-content/10">
                    {records.map((record, i) => (
                        <div key={i} className="group px-5 py-4">
                            <div className="flex items-start gap-3">
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center pt-3">
                                    <div className={`h-2.5 w-2.5 rounded-full ${record.end ? 'bg-base-content/20' : 'bg-success'}`} />
                                    <div className="mt-1 w-px flex-1 bg-base-content/5" />
                                </div>

                                <div className="min-w-0 flex-1 space-y-3">
                                    {/* Title (1/2) + Start (1/4) + End (1/4) */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={record.label}
                                            onChange={(e) => updateRecord(i, { label: e.target.value })}
                                            placeholder="Title"
                                            className="input input-bordered h-8 min-h-0 w-1/2 rounded-lg bg-base-100 text-sm font-medium"
                                        />
                                        <input
                                            type="date"
                                            value={record.start}
                                            onChange={(e) => updateRecord(i, { start: e.target.value })}
                                            className="input input-bordered h-8 min-h-0 w-1/4 rounded-lg bg-base-100 text-xs"
                                        />
                                        <input
                                            type="date"
                                            value={record.end}
                                            onChange={(e) => updateRecord(i, { end: e.target.value })}
                                            className="input input-bordered h-8 min-h-0 w-1/4 rounded-lg bg-base-100 text-xs placeholder:text-success/40"
                                            placeholder="Present"
                                        />
                                    </div>

                                    {/* Notes */}
                                    <textarea
                                        value={record.notes}
                                        onChange={(e) => updateRecord(i, { notes: e.target.value })}
                                        placeholder="Notes..."
                                        rows={2}
                                        className="textarea textarea-bordered min-h-0 w-full rounded-lg bg-base-100 text-xs"
                                    />

                                    {/* Intensity — centered 2/3 width with breathing room */}
                                    {allowIntensity && (
                                        <div className="mx-auto flex items-center gap-3 py-2 w-[66.7%]">
                                            <label className="flex-shrink-0 text-[10px] font-medium text-base-content/40">{intensityLabel}</label>
                                            <input
                                                type="range"
                                                min={1}
                                                max={10}
                                                value={record.intensity ?? 5}
                                                onChange={(e) => updateRecord(i, { intensity: parseInt(e.target.value) })}
                                                className="range range-primary range-xs flex-1"
                                            />
                                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                                {record.intensity ?? 5}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={() => removeRecord(i)}
                                    className="mt-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-error/20 opacity-0 transition-all hover:text-error group-hover:opacity-100"
                                >
                                    <i className="fa-solid fa-trash text-[10px]" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add button */}
                <button
                    type="button"
                    onClick={addRecord}
                    className="flex w-full items-center justify-center gap-2 border-t border-base-content/10 bg-base-300/30 py-3 text-xs text-base-content/50 transition-colors hover:bg-base-300/60 hover:text-primary"
                >
                    <i className="fa-solid fa-plus text-[10px]" /> Add {field.label}
                </button>
            </div>
        </div>
    );
}

/* ── Dynamic Field Input ── */

function DynamicFieldInput({ field, value, onChange }: {
    field: BlueprintFieldDef;
    value: unknown;
    onChange: (v: unknown) => void;
}) {
    switch (field.type) {
        case 'text':
            return (
                <input
                    type="text"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="input input-bordered h-8 min-h-0 w-full rounded-lg text-xs"
                />
            );
        case 'textarea':
            return (
                <textarea
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="textarea textarea-bordered min-h-0 w-full rounded-lg text-xs"
                    rows={3}
                />
            );
        case 'integer':
            return (
                <input
                    type="number"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : '')}
                    className="input input-bordered h-8 min-h-0 w-full rounded-lg text-xs"
                />
            );
        case 'boolean':
            return (
                <label className="flex cursor-pointer items-center gap-2">
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="toggle toggle-primary toggle-sm"
                    />
                    <span className="text-xs text-base-content/50">{value ? 'Yes' : 'No'}</span>
                </label>
            );
        case 'date':
            return (
                <input
                    type="date"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="input input-bordered h-8 min-h-0 w-full rounded-lg text-xs"
                />
            );
        case 'datetime':
            return (
                <input
                    type="datetime-local"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="input input-bordered h-8 min-h-0 w-full rounded-lg text-xs"
                />
            );
        case 'entry_reference':
            return (
                <EntryReferencePicker
                    field={field}
                    value={value}
                    onChange={onChange}
                />
            );
        case 'stardate':
            return (
                <StardateInput
                    value={value}
                    onChange={(v) => onChange(v)}
                />
            );
        default:
            return (
                <input
                    type="text"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="input input-bordered h-8 min-h-0 w-full rounded-lg text-xs"
                />
            );
    }
}

/* ── Entry Reference Picker ── */

function EntryReferencePicker({ field, value, onChange }: {
    field: BlueprintFieldDef;
    value: unknown;
    onChange: (v: unknown) => void;
}) {
    const [modalOpen, setModalOpen] = useState(false);
    const config = field.reference_config;
    if (!config) return <span className="text-xs text-base-content/30">No reference config</span>;

    const isMulti = config.selection_mode === 'multiple';
    const selectedIds: number[] = isMulti
        ? (Array.isArray(value) ? value as number[] : value ? [value as number] : [])
        : (value ? [value as number] : []);

    const selectedNames = selectedIds
        .map((id) => config.entries.find((e) => e.id === id)?.name)
        .filter(Boolean);

    return (
        <>
            <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border border-base-content/10 bg-base-100 px-3 py-2 text-left text-xs transition-colors hover:border-primary/30 hover:bg-base-100"
            >
                {selectedNames.length > 0 ? (
                    isMulti ? (
                        <div className="flex flex-wrap gap-1">
                            {selectedNames.map((name, i) => (
                                <span key={i} className="badge badge-sm border border-base-content/10 bg-base-200 py-1.5 font-normal text-base-content/80">
                                    {name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-base-content/70">{selectedNames[0]}</span>
                    )
                ) : (
                    <span className="text-base-content/30">Select {field.label}...</span>
                )}
                <i className="fa-solid fa-chevron-down ml-2 text-[10px] text-base-content/20" />
            </button>

            <EntryReferenceModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                field={field}
                config={config}
                selectedIds={selectedIds}
                onChange={(ids) => {
                    onChange(isMulti ? ids : (ids[0] ?? null));
                    setModalOpen(false);
                }}
            />
        </>
    );
}

/* ── Entry Reference Modal ── */

function EntryReferenceModal({ open, onClose, field, config: initialConfig, selectedIds, onChange }: {
    open: boolean;
    onClose: () => void;
    field: BlueprintFieldDef;
    config: ReferenceConfig;
    selectedIds: number[];
    onChange: (ids: number[]) => void;
}) {
    const [search, setSearch] = useState('');
    const [localSelected, setLocalSelected] = useState<number[]>(selectedIds);
    const [localEntries, setLocalEntries] = useState<ReferenceEntry[]>(initialConfig.entries);
    const [creating, setCreating] = useState(false);
    const sortableRef = useRef<HTMLDivElement>(null);
    const isMulti = initialConfig.selection_mode === 'multiple';

    // Sync on open
    useEffect(() => {
        if (open) {
            setLocalSelected(selectedIds);
            setLocalEntries(initialConfig.entries);
            setSearch('');
            setCreating(false);
        }
    }, [open]);

    // SortableJS for reordering selected items
    useEffect(() => {
        if (!open || !isMulti || !sortableRef.current || localSelected.length < 2) return;
        const sortable = Sortable.create(sortableRef.current, {
            animation: 150,
            ghostClass: 'opacity-30',
            onEnd: (evt) => {
                const { oldIndex, newIndex, from, item } = evt;
                if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
                from.removeChild(item);
                const ref = from.children[oldIndex];
                ref ? from.insertBefore(item, ref) : from.appendChild(item);
                setLocalSelected((prev) => {
                    const next = [...prev];
                    const [moved] = next.splice(oldIndex, 1);
                    next.splice(newIndex, 0, moved);
                    return next;
                });
            },
        });
        return () => sortable.destroy();
    }, [open, isMulti, localSelected.length]);

    const filtered = localEntries.filter((e) =>
        !search || e.name.toLowerCase().includes(search.toLowerCase())
    );

    const exactMatch = search.trim() && localEntries.some((e) => e.name.toLowerCase() === search.trim().toLowerCase());

    async function createNewEntry() {
        const name = search.trim();
        if (!name || !initialConfig.target_blueprint_slug || creating) return;
        setCreating(true);
        try {
            const res = await fetch(`/api/v1/blueprints/by-slug/${initialConfig.target_blueprint_slug}/quick-create`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                const newEntry: ReferenceEntry = await res.json();
                setLocalEntries((prev) => [...prev, newEntry]);
                // Also add to the original config so the picker reflects it
                initialConfig.entries.push(newEntry);
                if (isMulti) {
                    setLocalSelected((prev) => [...prev, newEntry.id]);
                } else {
                    onChange([newEntry.id]);
                }
                setSearch('');
            }
        } finally {
            setCreating(false);
        }
    }

    function toggleEntry(id: number) {
        if (isMulti) {
            setLocalSelected((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            );
        } else {
            onChange([id]);
        }
    }

    function removeSelected(id: number) {
        setLocalSelected((prev) => prev.filter((x) => x !== id));
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
            <div className="flex flex-col max-h-[70vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                    <div>
                        <h2 className="text-base font-bold">{field.label}</h2>
                        <p className="mt-0.5 text-xs text-base-content/40">
                            {initialConfig.target_blueprint_name ?? 'Select entries'}
                            {isMulti && ' — select multiple, drag to reorder'}
                        </p>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Selected items (multi-select, sortable) */}
                {isMulti && localSelected.length > 0 && (
                    <div className="border-b border-base-300 px-5 py-3">
                        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-base-content/30">
                            Selected ({localSelected.length}) — drag to reorder
                        </div>
                        <div ref={sortableRef} className="flex flex-wrap gap-1.5">
                            {localSelected.map((id) => {
                                const entry = localEntries.find((e) => e.id === id);
                                if (!entry) return null;
                                return (
                                    <span key={id} className="badge badge-sm badge-primary gap-1 cursor-grab">
                                        {entry.name}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeSelected(id); }}
                                            className="ml-0.5 text-primary-content/60 hover:text-primary-content"
                                        >
                                            <i className="fa-solid fa-xmark text-[8px]" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Search + quick create */}
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
                                            void createNewEntry();
                                        }
                                    }
                                }}
                                placeholder="Filter or type to create..."
                                autoFocus
                                className="input input-bordered h-8 min-h-0 w-full rounded-xl pl-9 text-sm"
                            />
                        </div>
                        {search.trim() && !exactMatch && (
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); void createNewEntry(); }}
                                disabled={creating}
                                className="btn btn-primary h-8 min-h-0 rounded-xl text-xs"
                            >
                                {creating ? (
                                    <span className="loading loading-spinner loading-xs" />
                                ) : (
                                    <i className="fa-solid fa-plus text-[10px]" />
                                )}
                                Create
                            </button>
                        )}
                    </div>
                </div>

                {/* Entry list
                   NOTE: To revert animation, replace <AnimatedEntryList> with the plain version:
                   {filtered.map((entry) => { const isSelected = localSelected.includes(entry.id); return (
                     <button key={entry.id} type="button" onClick={() => toggleEntry(entry.id)}
                       className={`flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors hover:bg-base-200/30 ${isSelected ? 'bg-primary/5' : ''}`}>
                       {isMulti ? <input type="checkbox" checked={isSelected} readOnly className="checkbox checkbox-xs checkbox-primary" />
                         : <i className={`fa-solid fa-circle text-[6px] ${isSelected ? 'text-primary' : 'text-base-content/10'}`} />}
                       <span className={isSelected ? 'font-medium text-primary' : ''}>{entry.name}</span>
                     </button>); })}
                */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-xs text-base-content/30">No entries found</div>
                    ) : (
                        <div>
                            {localEntries.map((entry) => {
                                const isSelected = localSelected.includes(entry.id);
                                const isVisible = filtered.some((f) => f.id === entry.id);
                                return (
                                    <div
                                        key={entry.id}
                                        className="overflow-hidden transition-all duration-200 ease-in-out"
                                        style={{
                                            maxHeight: isVisible ? '44px' : '0px',
                                            opacity: isVisible ? 1 : 0,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleEntry(entry.id)}
                                            className={`flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors hover:bg-base-200/30 ${
                                                isSelected ? 'bg-primary/5' : ''
                                            }`}
                                        >
                                            {isMulti ? (
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    className="checkbox checkbox-xs checkbox-primary"
                                                />
                                            ) : (
                                                <i className={`fa-solid fa-circle text-[6px] ${isSelected ? 'text-primary' : 'text-base-content/10'}`} />
                                            )}
                                            <span className={isSelected ? 'font-medium text-primary' : ''}>{entry.name}</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {isMulti && (
                    <div className="flex items-center justify-between border-t border-base-300 px-5 py-3">
                        <span className="text-xs text-base-content/40">{localSelected.length} selected</span>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm text-xs">Cancel</button>
                            <button type="button" onClick={() => onChange(localSelected)} className="btn btn-primary btn-sm text-xs">Apply</button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

/* ── Helpers ── */

function buildInitialFields(fields: BlueprintFieldDef[], initialValues?: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
        if (field.type === 'temporal') {
            result[field.name] = initialValues?.[field.name] ?? [];
        } else {
            result[field.name] = initialValues?.[field.name] ?? '';
        }
    }
    return result;
}
