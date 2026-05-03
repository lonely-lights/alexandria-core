import { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';
import { FIELD_TYPES } from '@alexandria/config/fieldTypes';
import { useBlueprintFields } from '@alexandria/hooks/useBlueprintFields';
import TemporalFieldConfig from '@alexandria/components/form/TemporalFieldConfig';
import type { BlueprintDetail, SiblingBlueprint } from '@alexandria/types/blueprints';

interface StructureTabProps {
    blueprint: BlueprintDetail;
    project: { slug: string };
    listableBlueprints: SiblingBlueprint[];
    relationshipBlueprints: SiblingBlueprint[];
}

export default function StructureTab({ blueprint, project, listableBlueprints, relationshipBlueprints }: StructureTabProps) {
    const { fields, expandedIndex, setExpandedIndex, addField, removeField, moveField, updateField, updateValidationRule, resetFields } = useBlueprintFields(blueprint.fields);
    const [saving, setSaving] = useState(false);

    const isDirty = JSON.stringify(fields) !== JSON.stringify(blueprint.fields.map((f, i) => ({ ...f, sort_order: i })));

    const handleSave = useCallback(() => {
        setSaving(true);
        router.put(`/p/${project.slug}/${blueprint.slug}`, {
            name: blueprint.name,
            description: blueprint.description ?? '',
            icon: blueprint.icon,
            show_on_dashboard: blueprint.show_on_dashboard,
            is_linkable: blueprint.is_linkable,
            is_hub: blueprint.is_hub,
            classification: blueprint.classification,
            list_selection_mode: blueprint.list_selection_mode,
            fields: JSON.parse(JSON.stringify(fields)),
            infobox_schema: JSON.parse(JSON.stringify(blueprint.infobox_schema)),
        } as Record<string, FormDataConvertible>, {
            onSuccess: () => setSaving(false),
            onError: () => setSaving(false),
        });
    }, [fields, blueprint.name, blueprint.slug, blueprint.description, blueprint.icon, blueprint.show_on_dashboard, blueprint.is_linkable, blueprint.is_hub, blueprint.classification, blueprint.list_selection_mode, blueprint.infobox_schema, project.slug]);

    function handleDiscard() {
        resetFields(blueprint.fields);
    }

    return (
        <div className="space-y-4">
            {/* Field list */}
            <div className="space-y-2">
                {fields.map((field, index) => {
                    const typeConfig = FIELD_TYPES[field.type] ?? FIELD_TYPES.text;
                    const isExpanded = expandedIndex === index;

                    return (
                        <div key={`${field.id ?? 'new'}-${index}`} className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 transition-all hover:border-base-content/20">
                            {/* Field header */}
                            <div
                                className="flex cursor-pointer items-center gap-3 px-4 py-3"
                                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                            >
                                <i className={`${typeConfig.icon} ${typeConfig.color} w-5 text-center`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">
                                            {field.label || <span className="italic text-base-content/30">Untitled field</span>}
                                        </span>
                                        {field.is_required && <span className="badge badge-error badge-xs">Required</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-base-content/40">
                                        <span className="font-mono">{field.name || '—'}</span>
                                        <span>&middot;</span>
                                        <span>{typeConfig.label}</span>
                                    </div>
                                </div>

                                {/* Reorder + expand */}
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="btn btn-ghost btn-xs rounded-lg disabled:opacity-20">
                                        <i className="fa-solid fa-chevron-up text-[10px]" />
                                    </button>
                                    <button type="button" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="btn btn-ghost btn-xs rounded-lg disabled:opacity-20">
                                        <i className="fa-solid fa-chevron-down text-[10px]" />
                                    </button>
                                </div>
                                <i className={`fa-solid fa-chevron-right text-[10px] text-base-content/30 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>

                            {/* Expanded config */}
                            {isExpanded && (
                                <div className="border-t border-base-300 bg-base-200/30 px-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Label" value={field.label} onChange={(e) => updateField(index, { label: e.currentTarget.value })} placeholder="e.g. Gender, Location Type" autoFocus />
                                        <Input label="Field Key" value={field.name} onChange={(e) => updateField(index, { name: e.currentTarget.value })} placeholder="auto_generated" className="font-mono text-xs" />
                                        <Select
                                            label="Type" value={field.type}
                                            onChange={(e) => updateField(index, { type: e.currentTarget.value })}
                                            options={Object.entries(FIELD_TYPES).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
                                        />
                                        <Input label="Help Text" value={field.description ?? ''} onChange={(e) => updateField(index, { description: e.currentTarget.value || null })} placeholder="Optional description" />
                                    </div>

                                    {/* Required toggle */}
                                    <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl px-1 py-1">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm checkbox-primary"
                                            checked={field.is_required}
                                            onChange={(e) => updateField(index, { is_required: e.target.checked })}
                                        />
                                        <span className="text-sm">Required field</span>
                                    </label>

                                    {/* Entry Reference config */}
                                    {field.type === 'entry_reference' && (
                                        <div className="mt-3 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                                            <Select
                                                label="Choose List"
                                                value={(field.validation_rules.target_blueprint_slug as string) ?? ''}
                                                onChange={(e) => updateValidationRule(index, 'target_blueprint_slug', e.currentTarget.value || null)}
                                                placeholder="Select a list..."
                                                options={listableBlueprints.map((bp) => ({ value: bp.slug, label: bp.name }))}
                                                hint="Users will select from entries in this list."
                                            />

                                        </div>
                                    )}

                                    {field.type === 'relationship_manager' && (
                                        <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                                            <Select
                                                label="Relationship Blueprint"
                                                value={(field.validation_rules.target_relationship_blueprint_slug as string) ?? ''}
                                                onChange={(e) => updateValidationRule(index, 'target_relationship_blueprint_slug', e.currentTarget.value || null)}
                                                placeholder="Select a relationship type..."
                                                options={relationshipBlueprints.map((bp) => ({ value: bp.slug, label: bp.name }))}
                                            />
                                        </div>
                                    )}

                                    {field.type === 'temporal' && (
                                        <TemporalFieldConfig
                                            field={field}
                                            index={index}
                                            listableBlueprints={listableBlueprints}
                                            onUpdateRule={updateValidationRule}
                                        />
                                    )}

                                    {/* Delete */}
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeField(index)}
                                            className="btn btn-ghost btn-sm rounded-xl text-error"
                                        >
                                            <i className="fa-solid fa-trash mr-1 text-xs" /> Remove Field
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {fields.length === 0 && (
                    <div className="rounded-2xl border border-base-300 bg-base-100 py-12 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-base-300">
                            <i className="fa-solid fa-layer-group text-xl text-base-content/30" />
                        </div>
                        <p className="font-medium text-base-content/50">No fields defined</p>
                        <p className="mt-1 text-sm text-base-content/40">Add fields to define the structure of entries using this blueprint.</p>
                    </div>
                )}
            </div>

            {/* Add field button */}
            <button
                type="button"
                onClick={addField}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-base-300 py-3 text-sm text-base-content/50 transition-colors hover:border-primary/30 hover:text-primary"
            >
                <i className="fa-solid fa-plus" /> Add Field
            </button>

            {/* Floating save bar */}
            {isDirty && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
                    <div className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 px-6 py-3 shadow-2xl">
                        <span className="text-sm text-base-content/60">
                            {fields.length} field{fields.length !== 1 ? 's' : ''}
                        </span>
                        <button type="button" onClick={handleDiscard} className="btn btn-ghost btn-sm rounded-xl">
                            Discard
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm rounded-xl">
                            {saving ? <span className="loading loading-spinner loading-xs" /> : <i className="fa-solid fa-check mr-1" />}
                            Save Structure
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
