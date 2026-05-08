import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';
import useT from '@alexandria/hooks/useT';
import type { BlueprintField, SiblingBlueprint } from '@alexandria/types/blueprints';
import type { FormSize } from '@alexandria/components/form/sizes';

interface TemporalFieldConfigProps {
    field: BlueprintField;
    index: number;
    listableBlueprints: SiblingBlueprint[];
    onUpdateRule: (index: number, key: string, value: unknown) => void;
    size?: FormSize;
}

export default function TemporalFieldConfig({ field, index, listableBlueprints, onUpdateRule, size = 'sm' }: TemporalFieldConfigProps) {
    const t = useT();
    const rules = field.validation_rules;

    const rowBg = 'color-mix(in srgb, var(--theme-base-200) 50%, transparent)';
    const descColor = 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)';

    return (
        <div className="mt-3 space-y-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
            <p className="text-xs font-medium text-teal-600">
                <i className="fa-solid fa-timeline mr-1" />
                {t('forms.temporal.title')}
            </p>

            <Select
                label={t('forms.temporal.date_precision_label')}
                size={size}
                value={(rules.date_precision as string) ?? 'date'}
                onChange={(e) => onUpdateRule(index, 'date_precision', e.currentTarget.value)}
                options={[
                    { value: 'date', label: t('forms.temporal.date_only') },
                    { value: 'datetime', label: t('forms.temporal.date_and_time') },
                ]}
            />

            <label
                className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors"
                style={{ background: rowBg }}
            >
                <input
                    type="checkbox"
                    className="alex-checkbox"
                    checked={!!rules.allow_intensity}
                    onChange={(e) => onUpdateRule(index, 'allow_intensity', e.target.checked)}
                />
                <div>
                    <span className="text-sm font-medium">{t('forms.temporal.enable_intensity_label')}</span>
                    <p className="text-xs" style={{ color: descColor }}>
                        {t('forms.temporal.enable_intensity_description')}
                    </p>
                </div>
            </label>

            {!!rules.allow_intensity && (
                <Input
                    label={t('forms.temporal.intensity_label_label')}
                    size={size}
                    value={(rules.intensity_label as string) ?? t('forms.temporal.intensity_label_default')}
                    onChange={(e) => onUpdateRule(index, 'intensity_label', e.currentTarget.value)}
                    placeholder={t('forms.temporal.intensity_label_placeholder')}
                />
            )}

            <label
                className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors"
                style={{ background: rowBg }}
            >
                <input
                    type="checkbox"
                    className="alex-checkbox"
                    checked={!!rules.allow_reference}
                    onChange={(e) => onUpdateRule(index, 'allow_reference', e.target.checked)}
                />
                <div>
                    <span className="text-sm font-medium">{t('forms.temporal.link_to_entry_label')}</span>
                    <p className="text-xs" style={{ color: descColor }}>
                        {t('forms.temporal.link_to_entry_description')}
                    </p>
                </div>
            </label>

            {!!rules.allow_reference && (
                <Select
                    label={t('forms.temporal.reference_blueprint_label')}
                    size={size}
                    value={(rules.reference_blueprint_slug as string) ?? ''}
                    onChange={(e) => onUpdateRule(index, 'reference_blueprint_slug', e.currentTarget.value || null)}
                    placeholder={t('forms.temporal.reference_blueprint_placeholder')}
                    options={listableBlueprints.map((bp) => ({ value: bp.slug, label: bp.name }))}
                />
            )}

            <label
                className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors"
                style={{ background: rowBg }}
            >
                <input
                    type="checkbox"
                    className="alex-checkbox"
                    checked={rules.allow_overlap !== false}
                    onChange={(e) => onUpdateRule(index, 'allow_overlap', e.target.checked)}
                />
                <div>
                    <span className="text-sm font-medium">{t('forms.temporal.allow_overlap_label')}</span>
                    <p className="text-xs" style={{ color: descColor }}>
                        {t('forms.temporal.allow_overlap_description')}
                    </p>
                </div>
            </label>
        </div>
    );
}
