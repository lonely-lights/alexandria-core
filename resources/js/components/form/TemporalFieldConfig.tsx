import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';
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
    const rules = field.validation_rules;

    return (
        <div className="mt-3 space-y-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
            <p className="text-xs font-medium text-teal-600">
                <i className="fa-solid fa-timeline mr-1" />
                Temporal Configuration
            </p>

            <Select
                label="Date Precision"
                size={size}
                value={(rules.date_precision as string) ?? 'date'}
                onChange={(e) => onUpdateRule(index, 'date_precision', e.currentTarget.value)}
                options={[
                    { value: 'date', label: 'Date only' },
                    { value: 'datetime', label: 'Date and Time' },
                ]}
            />

            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-base-100/50 p-3 transition-colors hover:bg-base-100">
                <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={!!rules.allow_intensity}
                    onChange={(e) => onUpdateRule(index, 'allow_intensity', e.target.checked)}
                />
                <div>
                    <span className="text-sm font-medium">Enable Intensity</span>
                    <p className="text-xs text-base-content/50">Add a 1-10 scale to measure degree or importance</p>
                </div>
            </label>

            {!!rules.allow_intensity && (
                <Input
                    label="Intensity Label"
                    size={size}
                    value={(rules.intensity_label as string) ?? 'Importance'}
                    onChange={(e) => onUpdateRule(index, 'intensity_label', e.currentTarget.value)}
                    placeholder="e.g. Importance, Strength, Priority"
                />
            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-base-100/50 p-3 transition-colors hover:bg-base-100">
                <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={!!rules.allow_reference}
                    onChange={(e) => onUpdateRule(index, 'allow_reference', e.target.checked)}
                />
                <div>
                    <span className="text-sm font-medium">Link to Entry</span>
                    <p className="text-xs text-base-content/50">Associate each record with an entry from another blueprint</p>
                </div>
            </label>

            {!!rules.allow_reference && (
                <Select
                    label="Reference Blueprint"
                    size={size}
                    value={(rules.reference_blueprint_slug as string) ?? ''}
                    onChange={(e) => onUpdateRule(index, 'reference_blueprint_slug', e.currentTarget.value || null)}
                    placeholder="Select a blueprint..."
                    options={listableBlueprints.map((bp) => ({ value: bp.slug, label: bp.name }))}
                />
            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-base-100/50 p-3 transition-colors hover:bg-base-100">
                <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={rules.allow_overlap !== false}
                    onChange={(e) => onUpdateRule(index, 'allow_overlap', e.target.checked)}
                />
                <div>
                    <span className="text-sm font-medium">Allow Overlapping Dates</span>
                    <p className="text-xs text-base-content/50">Multiple records can be active at the same time</p>
                </div>
            </label>
        </div>
    );
}
