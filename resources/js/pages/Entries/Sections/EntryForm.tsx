import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useForm } from '@inertiajs/react';
import Sortable from 'sortablejs';
import useT from '@alexandria/hooks/useT';
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

/* ── Theme-token style recipes ──
   Shared across EntryForm + sub-components so a change to the
   form chrome ripples consistently across Identity, Content,
   Fields, Media, Parent, Temporal, and Reference panels. */

const cardOuterStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const cardInnerStyle: CSSProperties = {
    background: 'var(--theme-base-200)',
    borderRadius: 'inherit',
};

const sectionDivider: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const identityHeaderStyle: CSSProperties = {
    background:
        'linear-gradient(135deg, color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 8%, transparent), color-mix(in srgb, var(--theme-base-200) 50%, transparent))',
};

const iconWrapStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-base-content) 5%, transparent), 0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

const iconStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
};

const nameInputStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    color: 'var(--theme-base-content)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.5rem 0.75rem',
    fontSize: '1.5rem',
    fontWeight: 700,
    width: '100%',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
};

const contentHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const baseInputStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    color: 'var(--theme-base-content)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    fontSize: '0.875rem',
};

const contentTextareaStyle: CSSProperties = {
    ...baseInputStyle,
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: '0.875rem',
    lineHeight: '1.625',
};

const sectionHeaderSecondaryStyle: CSSProperties = {
    background:
        'linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-secondary-500) 80%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 60%, transparent))',
    color: 'var(--theme-brand-secondary-content)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const sectionHeaderAccentStyle: CSSProperties = {
    background:
        'linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-accent-500) 80%, transparent), color-mix(in srgb, var(--theme-brand-accent-500) 60%, transparent))',
    color: 'var(--theme-brand-accent-content)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const sectionIconSecondaryStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-brand-secondary-content) 60%, transparent)',
};

const sectionIconAccentStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-brand-accent-content) 60%, transparent)',
};

const sectionCountBadgeStyle: CSSProperties = {
    marginLeft: 'auto',
    borderRadius: '9999px',
    background: 'rgb(0 0 0 / 0.25)',
    color: 'white',
    padding: '0.125rem 0.5rem',
    fontSize: '0.625rem',
    fontWeight: 600,
};

const fieldDividerStyle: CSSProperties = {
    borderTop: '1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const fieldLabelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const fieldRequiredStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-status-error-stroke) 60%, transparent)',
};

const fieldDescStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const parentSelectStyle: CSSProperties = {
    ...baseInputStyle,
    width: '100%',
    height: '2rem',
    padding: '0 0.5rem',
    fontSize: '0.75rem',
};

const compactInputStyle: CSSProperties = {
    ...baseInputStyle,
    width: '100%',
    height: '2rem',
    padding: '0 0.5rem',
    fontSize: '0.75rem',
};

const fieldRowInputStyle: CSSProperties = {
    ...compactInputStyle,
};

const fieldRowTextareaStyle: CSSProperties = {
    ...baseInputStyle,
    width: '100%',
    padding: '0.375rem 0.5rem',
    fontSize: '0.75rem',
};

const cancelLinkStyle: CSSProperties = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.375rem 0.75rem',
    fontSize: '0.75rem',
    borderRadius: 'var(--theme-radius-button)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

/* ── Component ── */

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
    const t = useT();
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
                    <div className="paper-board" style={cardOuterStyle}>
                        <div className="overflow-hidden" style={cardInnerStyle}>
                            <div className="relative px-8 py-6" style={{ ...identityHeaderStyle, ...sectionDivider }}>
                                <div className="flex items-center gap-5">
                                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center" style={iconWrapStyle}>
                                        <i className={`${iconClass} text-2xl`} style={iconStyle} />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            placeholder={t('entries.form.name_placeholder').replace(':blueprint', blueprintName)}
                                            autoFocus
                                            style={nameInputStyle}
                                        />
                                        {form.errors.name && (
                                            <p className="mt-1 text-xs" style={errorTextStyle}>{form.errors.name}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-5">
                                <Textarea
                                    label={t('entries.form.summary_label')}
                                    value={form.data.summary}
                                    onChange={(e) => form.setData('summary', e.currentTarget.value)}
                                    placeholder={t('entries.form.summary_placeholder')}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="paper-board" style={cardOuterStyle}>
                        <div className="p-6" style={cardInnerStyle}>
                            <h2 className="mb-3 text-sm font-semibold" style={contentHeadingStyle}>{t('entries.form.content_heading')}</h2>
                            <textarea
                                value={form.data.content}
                                onChange={(e) => form.setData('content', e.target.value)}
                                placeholder={t('entries.form.content_placeholder')}
                                rows={16}
                                style={contentTextareaStyle}
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
                        <div className="paper-board" style={cardOuterStyle}>
                            <div className="overflow-hidden" style={cardInnerStyle}>
                                <div className="flex items-center gap-2 px-4 py-3" style={sectionHeaderSecondaryStyle}>
                                    <i className="fa-solid fa-layer-group text-xs" style={sectionIconSecondaryStyle} />
                                    <h3 className="text-xs font-semibold">{t('entries.form.fields_heading')}</h3>
                                    <span style={sectionCountBadgeStyle}>{standardFields.length}</span>
                                </div>
                                <div>
                                    {standardFields.map((field, i) => (
                                        <div key={field.name} className="px-4 py-3" style={i > 0 ? fieldDividerStyle : undefined}>
                                            <label className="flex items-center gap-1.5 text-xs font-medium" style={fieldLabelStyle}>
                                                {field.label}
                                                {field.is_required && <span className="text-[9px]" style={fieldRequiredStyle}>*</span>}
                                            </label>
                                            {field.description && (
                                                <p className="mt-0.5 text-[10px]" style={fieldDescStyle}>{field.description}</p>
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
                        <div className="paper-board" style={cardOuterStyle}>
                            <div className="overflow-hidden" style={cardInnerStyle}>
                                <div className="flex items-center gap-2 px-4 py-3" style={sectionHeaderAccentStyle}>
                                    <i className="fa-solid fa-photo-film text-xs" style={sectionIconAccentStyle} />
                                    <h3 className="text-xs font-semibold">{t('entries.form.media_heading')}</h3>
                                </div>
                                <div className="p-4">
                                    <MediaSection modelType="entries" modelId={entryId} compact />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Parent */}
                    {parentEntries.length > 0 && (
                        <div className="paper-board" style={cardOuterStyle}>
                            <div className="p-4" style={cardInnerStyle}>
                                <label className="text-xs font-medium" style={fieldLabelStyle}>{t('entries.form.parent_label')}</label>
                                <p className="mb-2 mt-0.5 text-[10px]" style={fieldDescStyle}>
                                    {t('entries.form.parent_helper')}
                                </p>
                                <select
                                    value={form.data.parent_id as string}
                                    onChange={(e) => form.setData('parent_id', e.target.value ? Number(e.target.value) : '' as unknown as number)}
                                    style={parentSelectStyle}
                                >
                                    <option value="">{t('entries.form.parent_none')}</option>
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
                            label={mode === 'create'
                                ? t('entries.form.action.create').replace(':blueprint', blueprintName)
                                : t('entries.form.action.save')}
                            onClick={handleSubmit}
                            loading={form.processing}
                            disabled={!form.data.name.trim()}
                            className="w-full justify-center"
                        />
                        <a
                            href={`/p/${projectSlug}/${blueprintSlug}`}
                            className="alex-view-toggle-btn"
                            style={cancelLinkStyle}
                        >
                            {t('common.cancel')}
                        </a>
                    </div>
                </div>
            </div>
        </form>
    );
}

/* ── Temporal Field Editor ── */

const temporalDotDoneStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const temporalDotActiveStyle: CSSProperties = {
    background: 'var(--theme-status-success-stroke)',
};

const temporalLineStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const temporalDescBannerStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-300) 30%, transparent)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const temporalDescTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const temporalIntensityBadgeStyle: CSSProperties = {
    display: 'inline-flex',
    height: '1.5rem',
    width: '1.5rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    fontSize: '0.625rem',
    fontWeight: 700,
    flexShrink: 0,
};

const temporalRemoveStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-status-error-stroke) 20%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    transition: 'color var(--theme-motion-duration-fast, 150ms) ease, opacity 200ms ease',
};

const temporalAddBtnStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-300) 30%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease, color var(--theme-motion-duration-fast, 150ms) ease',
};

function TemporalFieldEditor({ field, records, onChange }: {
    field: BlueprintFieldDef;
    records: TemporalRecord[];
    onChange: (records: TemporalRecord[]) => void;
}) {
    const t = useT();

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
    const intensityLabel = (config.intensity_label as string) ?? t('entries.form.temporal.intensity_default');

    return (
        <div className="paper-board" style={cardOuterStyle}>
            <div className="overflow-hidden" style={cardInnerStyle}>
                <div className="flex items-center gap-2 px-5 py-3" style={sectionHeaderSecondaryStyle}>
                    <i className="fa-solid fa-timeline text-xs" style={sectionIconSecondaryStyle} />
                    <h3 className="text-xs font-semibold">{field.label}</h3>
                    <span style={sectionCountBadgeStyle}>
                        {t(records.length === 1 ? 'entries.form.temporal.record_count.singular' : 'entries.form.temporal.record_count.plural').replace(':count', String(records.length))}
                    </span>
                </div>

                {field.description && (
                    <div className="px-5 py-2" style={temporalDescBannerStyle}>
                        <p className="text-[11px]" style={temporalDescTextStyle}>{field.description}</p>
                    </div>
                )}

                <div>
                    {records.map((record, i) => (
                        <div key={i} className="group px-5 py-4" style={i > 0 ? fieldDividerStyle : undefined}>
                            <div className="flex items-start gap-3">
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center pt-3">
                                    <div className="h-2.5 w-2.5 rounded-full" style={record.end ? temporalDotDoneStyle : temporalDotActiveStyle} />
                                    <div className="mt-1 w-px flex-1" style={temporalLineStyle} />
                                </div>

                                <div className="min-w-0 flex-1 space-y-3">
                                    {/* Title (1/2) + Start (1/4) + End (1/4) */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={record.label}
                                            onChange={(e) => updateRecord(i, { label: e.target.value })}
                                            placeholder={t('entries.form.temporal.title_placeholder')}
                                            style={{ ...fieldRowInputStyle, width: '50%', fontSize: '0.875rem', fontWeight: 500 }}
                                        />
                                        <input
                                            type="date"
                                            value={record.start}
                                            onChange={(e) => updateRecord(i, { start: e.target.value })}
                                            style={{ ...fieldRowInputStyle, width: '25%' }}
                                        />
                                        <input
                                            type="date"
                                            value={record.end}
                                            onChange={(e) => updateRecord(i, { end: e.target.value })}
                                            style={{ ...fieldRowInputStyle, width: '25%' }}
                                            placeholder={t('entries.form.temporal.end_placeholder')}
                                        />
                                    </div>

                                    {/* Notes */}
                                    <textarea
                                        value={record.notes}
                                        onChange={(e) => updateRecord(i, { notes: e.target.value })}
                                        placeholder={t('entries.form.temporal.notes_placeholder')}
                                        rows={2}
                                        style={fieldRowTextareaStyle}
                                    />

                                    {/* Intensity — centered 2/3 width with breathing room */}
                                    {allowIntensity && (
                                        <div className="mx-auto flex items-center gap-3 py-2 w-[66.7%]">
                                            <label className="flex-shrink-0 text-[10px] font-medium" style={fieldDescStyle}>{intensityLabel}</label>
                                            <input
                                                type="range"
                                                min={1}
                                                max={10}
                                                value={record.intensity ?? 5}
                                                onChange={(e) => updateRecord(i, { intensity: parseInt(e.target.value) })}
                                                className="flex-1"
                                                style={{ accentColor: 'var(--theme-brand-primary-500)' }}
                                            />
                                            <span style={temporalIntensityBadgeStyle}>
                                                {record.intensity ?? 5}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={() => removeRecord(i)}
                                    className="mt-2 flex h-6 w-6 flex-shrink-0 items-center justify-center opacity-0 group-hover:opacity-100"
                                    style={temporalRemoveStyle}
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
                    className="flex w-full items-center justify-center gap-2 py-3 text-xs"
                    style={temporalAddBtnStyle}
                >
                    <i className="fa-solid fa-plus text-[10px]" /> {t('entries.form.temporal.add').replace(':label', field.label)}
                </button>
            </div>
        </div>
    );
}

/* ── Dynamic Field Input ── */

const booleanToggleStyle: CSSProperties = {
    accentColor: 'var(--theme-brand-primary-500)',
    width: '2rem',
    height: '1.25rem',
};

const booleanLabelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

function DynamicFieldInput({ field, value, onChange }: {
    field: BlueprintFieldDef;
    value: unknown;
    onChange: (v: unknown) => void;
}) {
    const t = useT();

    switch (field.type) {
        case 'text':
            return (
                <input
                    type="text"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={compactInputStyle}
                />
            );
        case 'textarea':
            return (
                <textarea
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={fieldRowTextareaStyle}
                    rows={3}
                />
            );
        case 'integer':
            return (
                <input
                    type="number"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : '')}
                    style={compactInputStyle}
                />
            );
        case 'boolean':
            return (
                <label className="flex cursor-pointer items-center gap-2">
                    <input
                        type="checkbox"
                        role="switch"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        style={booleanToggleStyle}
                    />
                    <span className="text-xs" style={booleanLabelStyle}>
                        {value ? t('entries.form.boolean.yes') : t('entries.form.boolean.no')}
                    </span>
                </label>
            );
        case 'date':
            return (
                <input
                    type="date"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={compactInputStyle}
                />
            );
        case 'datetime':
            return (
                <input
                    type="datetime-local"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={compactInputStyle}
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
                    style={compactInputStyle}
                />
            );
    }
}

/* ── Entry Reference Picker ── */

const pickerBtnStyle: CSSProperties = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    textAlign: 'left',
    transition: 'border-color var(--theme-motion-duration-fast, 150ms) ease',
};

const pickerBadgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.0625rem 0.375rem',
    fontSize: '0.6875rem',
    borderRadius: 'var(--theme-radius-badge)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'var(--theme-base-200)',
    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
};

const pickerSelectedTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const pickerPlaceholderStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const pickerChevronStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

function EntryReferencePicker({ field, value, onChange }: {
    field: BlueprintFieldDef;
    value: unknown;
    onChange: (v: unknown) => void;
}) {
    const t = useT();
    const [modalOpen, setModalOpen] = useState(false);
    const config = field.reference_config;
    if (!config) return <span className="text-xs" style={pickerPlaceholderStyle}>{t('entries.form.reference.no_config')}</span>;

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
                style={pickerBtnStyle}
            >
                {selectedNames.length > 0 ? (
                    isMulti ? (
                        <div className="flex flex-wrap gap-1">
                            {selectedNames.map((name, i) => (
                                <span key={i} style={pickerBadgeStyle}>
                                    {name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span style={pickerSelectedTextStyle}>{selectedNames[0]}</span>
                    )
                ) : (
                    <span style={pickerPlaceholderStyle}>{t('entries.form.reference.placeholder').replace(':label', field.label)}</span>
                )}
                <i className="fa-solid fa-chevron-down ml-2 text-[10px]" style={pickerChevronStyle} />
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

const modalHeaderDivider: CSSProperties = {
    borderBottom: '1px solid var(--theme-base-300)',
};

const modalSubtitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const closeBtnStyle: CSSProperties = {
    display: 'inline-flex',
    width: '2rem',
    height: '2rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--theme-radius-button)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
};

const selectedHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const selectedBadgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    cursor: 'grab',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: 'var(--theme-radius-badge)',
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

const selectedBadgeXStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-brand-primary-content) 60%, transparent)',
};

const searchIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const searchInputStyle: CSSProperties = {
    ...baseInputStyle,
    width: '100%',
    height: '2rem',
    paddingLeft: '2.25rem',
    paddingRight: '0.75rem',
    fontSize: '0.875rem',
};

const createBtnStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    height: '2rem',
    padding: '0 0.75rem',
    fontSize: '0.75rem',
    borderRadius: 'var(--theme-radius-button)',
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

const listEmptyStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const listRowStyle: CSSProperties = {
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
};

const listRowSelectedStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
};

const checkboxStyle: CSSProperties = {
    accentColor: 'var(--theme-brand-primary-500)',
    width: '0.875rem',
    height: '0.875rem',
};

const radioDotActiveStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
};

const radioDotIdleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const selectedRowTextStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
};

const footerCountStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const footerCancelStyle: CSSProperties = {
    fontSize: '0.75rem',
    padding: '0.375rem 0.75rem',
    borderRadius: 'var(--theme-radius-button)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const footerApplyStyle: CSSProperties = {
    fontSize: '0.75rem',
    padding: '0.375rem 0.75rem',
    borderRadius: 'var(--theme-radius-button)',
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

const modalSpinnerStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-content)',
};

function EntryReferenceModal({ open, onClose, field, config: initialConfig, selectedIds, onChange }: {
    open: boolean;
    onClose: () => void;
    field: BlueprintFieldDef;
    config: ReferenceConfig;
    selectedIds: number[];
    onChange: (ids: number[]) => void;
}) {
    const t = useT();
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
                <div className="flex items-center justify-between px-5 py-4" style={modalHeaderDivider}>
                    <div>
                        <h2 className="text-base font-bold">{field.label}</h2>
                        <p className="mt-0.5 text-xs" style={modalSubtitleStyle}>
                            {initialConfig.target_blueprint_name ?? t('entries.form.reference_modal.subtitle_fallback')}
                            {isMulti && t('entries.form.reference_modal.subtitle_multi_suffix')}
                        </p>
                    </div>
                    <button onClick={onClose} className="alex-view-toggle-btn" style={closeBtnStyle}>
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Selected items (multi-select, sortable) */}
                {isMulti && localSelected.length > 0 && (
                    <div className="px-5 py-3" style={modalHeaderDivider}>
                        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={selectedHeadingStyle}>
                            {t('entries.form.reference_modal.selected_heading').replace(':count', String(localSelected.length))}
                        </div>
                        <div ref={sortableRef} className="flex flex-wrap gap-1.5">
                            {localSelected.map((id) => {
                                const entry = localEntries.find((e) => e.id === id);
                                if (!entry) return null;
                                return (
                                    <span key={id} style={selectedBadgeStyle}>
                                        {entry.name}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeSelected(id); }}
                                            className="ml-0.5"
                                            style={selectedBadgeXStyle}
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
                <div className="px-5 py-3" style={modalHeaderDivider}>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={searchIconStyle} />
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
                                placeholder={t('entries.form.reference_modal.search_placeholder')}
                                autoFocus
                                style={searchInputStyle}
                            />
                        </div>
                        {search.trim() && !exactMatch && (
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); void createNewEntry(); }}
                                disabled={creating}
                                style={createBtnStyle}
                            >
                                {creating ? (
                                    <i className="fa-solid fa-circle-notch fa-spin text-[10px]" style={modalSpinnerStyle} />
                                ) : (
                                    <i className="fa-solid fa-plus text-[10px]" />
                                )}
                                {t('entries.form.reference_modal.create')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Entry list */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-xs" style={listEmptyStyle}>
                            {t('entries.form.reference_modal.no_entries')}
                        </div>
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
                                            className="alex-row flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm"
                                            style={isSelected ? { ...listRowStyle, ...listRowSelectedStyle } : listRowStyle}
                                        >
                                            {isMulti ? (
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    style={checkboxStyle}
                                                />
                                            ) : (
                                                <i className="fa-solid fa-circle text-[6px]" style={isSelected ? radioDotActiveStyle : radioDotIdleStyle} />
                                            )}
                                            <span style={isSelected ? { fontWeight: 500, ...selectedRowTextStyle } : undefined}>{entry.name}</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {isMulti && (
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--theme-base-300)' }}>
                        <span className="text-xs" style={footerCountStyle}>
                            {t('entries.form.reference_modal.selected_count').replace(':count', String(localSelected.length))}
                        </span>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="alex-view-toggle-btn" style={footerCancelStyle}>{t('common.cancel')}</button>
                            <button type="button" onClick={() => onChange(localSelected)} style={footerApplyStyle}>{t('entries.form.reference_modal.apply')}</button>
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
