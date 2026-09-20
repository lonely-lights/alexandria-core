import useT from '@alexandria/hooks/useT';
import DurationInput from '../pacing/DurationInput';
import type { StructureBeat } from './structureTemplates';
export interface TimingSectionChoice {
    id: number;
    title: string;
}
export default function WorkTimingSettings({
    target,
    markers,
    sections,
    onTargetChange,
    onMarkerChange,
    onValidityChange,
    disabled = false,
    errors = {},
}: {
    target: number | null;
    markers: StructureBeat[];
    sections: TimingSectionChoice[];
    onTargetChange(value: number | null): void;
    onMarkerChange(index: number, patch: Partial<StructureBeat>): void;
    onValidityChange(valid: boolean): void;
    disabled?: boolean;
    errors?: Record<string, string | undefined>;
}) {
    const t = useT();

    return (
        <section data-work-timing className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">
                {t('writing.pacing.running_time')}
            </h3>
            <p className="text-xs">{t('writing.pacing.help')}</p>
            <label className="flex items-center gap-2 text-sm">
                {t('writing.pacing.runtime_target')}
                <DurationInput
                    label={t('writing.pacing.runtime_target')}
                    value={target}
                    onCommit={onTargetChange}
                    disabled={disabled}
                    onValidityChange={onValidityChange}
                />
            </label>
            {errors.target_runtime_seconds && (
                <p role="alert">{errors.target_runtime_seconds}</p>
            )}
            {markers.map((m, i) => (
                <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 text-xs"
                >
                    <strong>{m.name}</strong>
                    <select
                        aria-label={t('writing.pacing.anchor') + ' — ' + m.name}
                        value={m.anchor_section_id ?? ''}
                        disabled={disabled}
                        onChange={(e) =>
                            onMarkerChange(i, {
                                anchor_section_id:
                                    e.target.value === ''
                                        ? null
                                        : Number(e.target.value),
                            })
                        }
                        className="max-w-full rounded border p-1"
                    >
                        <option value="">
                            {t('writing.pacing.unanchored')}
                        </option>
                        {m.anchor_section_id != null &&
                            !sections.some(
                                (s) => s.id === m.anchor_section_id,
                            ) && (
                                <option value={m.anchor_section_id}>
                                    {t('writing.pacing.unavailable')}
                                </option>
                            )}
                        {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.title}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label={t('writing.pacing.edge') + ' — ' + m.name}
                        value={m.anchor_edge ?? 'end'}
                        disabled={disabled}
                        onChange={(e) =>
                            onMarkerChange(i, {
                                anchor_edge: e.target.value as 'start' | 'end',
                            })
                        }
                        className="rounded border p-1"
                    >
                        <option value="start">
                            {t('writing.pacing.start')}
                        </option>
                        <option value="end">{t('writing.pacing.end')}</option>
                    </select>
                    {errors[
                        'length_plan.structure.beats.' +
                            i +
                            '.anchor_section_id'
                    ] && (
                        <p role="alert">
                            {
                                errors[
                                    'length_plan.structure.beats.' +
                                        i +
                                        '.anchor_section_id'
                                ]
                            }
                        </p>
                    )}
                </div>
            ))}
        </section>
    );
}
