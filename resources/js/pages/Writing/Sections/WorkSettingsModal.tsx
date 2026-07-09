import { useForm } from '@inertiajs/react';
import { useState } from 'react';

import useT from '@alexandria/hooks/useT';
import Button from '@alexandria/components/ui/Button';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import CheckboxField from '@alexandria/components/form/CheckboxField';
import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';
import Textarea from '@alexandria/components/form/Textarea';
import {
    STRUCTURE_TEMPLATES,
    type StructureBeat,
    type WorkStructure,
} from './structureTemplates';

/**
 * WorkSettingsModal — Stage 8g.1 (Plan 4 Task 2) + Stage 11 Slice 3 (structure).
 *
 * Edit a work's metadata (title / type / status / logline) plus its
 * length plan and structure template. Shared by the workspace header
 * gear and the works-index card gear. Submits the FULL contract every
 * time (title + status are required by works.update); length_plan
 * collapses to null when no preset is chosen, every number field is
 * empty, and no structure template is selected.
 */

/** Stored length-plan JSON on a work (preset key + resolved numbers + optional structure). */
export interface WorkLengthPlan {
    preset?: string;
    target_words?: number;
    per_section_words?: number;
    target_lines?: number;
    target_pages?: number;
    structure?: WorkStructure;
}

/** One config preset row from the server's lengthPlans prop. */
export interface LengthPlanOption {
    key: string;
    target_words?: number;
    per_section_words?: number;
    target_lines?: number;
    target_pages?: number;
}

export interface WorkSettingsWork {
    id: number;
    title: string;
    slug: string;
    type: string;
    status: string;
    logline: string | null;
    length_plan: WorkLengthPlan | null;
    target_words: number | null;
    word_count: number;
    line_count?: number;
}

const WORK_STATUSES = ['concept', 'drafting', 'revising', 'complete'] as const;

const NUMBER_FIELDS = ['target_words', 'per_section_words', 'target_lines', 'target_pages'] as const;

type NumberField = (typeof NUMBER_FIELDS)[number];

function parseCount(value: string): number | null {
    const trimmed = value.trim();

    if (trimmed === '') {
        return null;
    }

    const parsed = Number.parseInt(trimmed, 10);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export default function WorkSettingsModal({
    project,
    work,
    types,
    lengthPlans,
    onClose,
}: {
    project: { slug: string };
    work: WorkSettingsWork;
    types: string[];
    lengthPlans: LengthPlanOption[];
    onClose: () => void;
}) {
    const t = useT();

    const existingStructure = work.length_plan?.structure;

    const form = useForm({
        title: work.title,
        type: work.type,
        status: work.status,
        logline: work.logline ?? '',
        preset: work.length_plan?.preset ?? '',
        target_words: work.length_plan?.target_words?.toString() ?? '',
        per_section_words: work.length_plan?.per_section_words?.toString() ?? '',
        target_lines: work.length_plan?.target_lines?.toString() ?? '',
        target_pages: work.length_plan?.target_pages?.toString() ?? '',
        apply_section_targets: false,
        structure_template: existingStructure?.template ?? '',
        structure_beats: (existingStructure?.beats ?? []) as StructureBeat[],
    });

    // Registered once at body level (Inertia v3 convention — transform
    // is a persistent callback, not a per-submit step). It reads ONLY
    // its `data` argument, so there are no stale closures to worry
    // about.
    form.transform((data) => {
        const numbers = {
            target_words: parseCount(data.target_words),
            per_section_words: parseCount(data.per_section_words),
            target_lines: parseCount(data.target_lines),
            target_pages: parseCount(data.target_pages),
        };
        const hasPreset = data.preset !== '';
        const hasNumbers = Object.values(numbers).some((value) => value !== null);
        const hasStructure = data.structure_template !== '';
        const structurePayload: WorkStructure | undefined = hasStructure
            ? { template: data.structure_template, beats: data.structure_beats }
            : undefined;

        return {
            title: data.title,
            type: data.type,
            status: data.status,
            logline: data.logline,
            // Explicit nulls ride along so a cleared field beats the
            // preset's config seed server-side; all-empty + no preset
            // + no structure clears the plan entirely.
            length_plan: !hasPreset && !hasNumbers && !hasStructure
                ? null
                : {
                    ...(hasPreset ? { preset: data.preset } : {}),
                    ...numbers,
                    ...(structurePayload !== undefined ? { structure: structurePayload } : {}),
                  },
            apply_section_targets: data.apply_section_targets,
        };
    });

    // Slug-autofill pattern: picking a preset prefills the number
    // fields, but once the user edits a number by hand the preset
    // never overwrites that field again (this session).
    const [touched, setTouched] = useState<Record<NumberField, boolean>>({
        target_words: false,
        per_section_words: false,
        target_lines: false,
        target_pages: false,
    });

    // Per-beat touched tracking: mirrors the number-field pattern.
    // Picking a template seeds untouched beats from defaults; once a
    // beat is edited it retains its value across template switches.
    const [touchedBeats, setTouchedBeats] = useState<Record<number, boolean>>({});

    // Nested length_plan.* errors come back keyed by dot path, which
    // the typed errors bag doesn't know about.
    const allErrors = form.errors as Record<string, string | undefined>;

    function handlePresetChange(key: string) {
        const plan = key === '' ? undefined : lengthPlans.find((option) => option.key === key);

        form.setData((data) => {
            const next = { ...data, preset: key };

            for (const field of NUMBER_FIELDS) {
                if (!touched[field]) {
                    next[field] = plan?.[field]?.toString() ?? '';
                }
            }

            return next;
        });
    }

    function handleNumberChange(field: NumberField, value: string) {
        form.setData(field, value);
        setTouched((prev) => ({ ...prev, [field]: true }));

        if (allErrors[`length_plan.${field}`]) {
            form.clearErrors(`length_plan.${field}` as never);
        }
    }

    function handleStructureTemplateChange(slug: string) {
        const template = STRUCTURE_TEMPLATES.find((t) => t.slug === slug);

        form.setData((data) => {
            const next = { ...data, structure_template: slug };

            if (slug === '') {
                next.structure_beats = [] as StructureBeat[];
            } else if (template !== undefined) {
                // Seed beats from the template's defaults, but preserve
                // any beats the user has already edited in this session.
                next.structure_beats = template.beats.map(
                    (defaultBeat, i): StructureBeat =>
                        touchedBeats[i] !== undefined && i < data.structure_beats.length
                            ? data.structure_beats[i]
                            : { ...defaultBeat },
                );
            }

            return next;
        });

        // "none" resets all touched-beat tracking.
        if (slug === '') {
            setTouchedBeats({});
        }
    }

    function handleBeatChange(index: number, field: keyof StructureBeat, raw: string) {
        const value: string | number =
            field === 'name' ? raw : Number.isFinite(Number(raw)) ? Number(raw) : 0;

        form.setData((data) => {
            const newBeats = data.structure_beats.map((beat, i) =>
                i === index ? { ...beat, [field]: value } : beat,
            );
            return { ...data, structure_beats: newBeats };
        });

        setTouchedBeats((prev) => ({ ...prev, [index]: true }));
    }

    function submit() {
        form.put(`/works/${project.slug}/${work.slug}`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    const sectionHeadingColor = 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)';
    const columnLabelColor = 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)';

    return (
        <Modal open onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader title={t('writing.settings.title')} onClose={onClose} />
            {/* noValidate: the server validates `required`; without it
                Chrome's native constraint bubble fires before submit and
                the error poppers never get a chance. */}
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <div className="flex flex-col gap-4 px-6 py-5">
                    <Tooltip
                        content={form.errors.title}
                        open={!!form.errors.title}
                        tone="error"
                        placement="top-end"
                    >
                        <Input
                            label={t('writing.form.title')}
                            name="title"
                            value={form.data.title}
                            onChange={(e) => {
                                form.setData('title', e.target.value);
                                if (form.errors.title) {
                                    form.clearErrors('title');
                                }
                            }}
                            error={form.errors.title}
                            hideErrorText
                            autoFocus
                            required
                            size="md"
                        />
                    </Tooltip>
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label={t('writing.form.type')}
                            name="type"
                            value={form.data.type}
                            onChange={(e) => {
                                form.setData('type', e.target.value);
                                if (form.errors.type) {
                                    form.clearErrors('type');
                                }
                            }}
                            error={form.errors.type}
                            options={types.map((type) => ({
                                value: type,
                                label: t(`writing.types.${type}`, type),
                            }))}
                            size="md"
                        />
                        <Select
                            label={t('writing.form.status')}
                            name="status"
                            value={form.data.status}
                            onChange={(e) => {
                                form.setData('status', e.target.value);
                                if (form.errors.status) {
                                    form.clearErrors('status');
                                }
                            }}
                            error={form.errors.status}
                            options={WORK_STATUSES.map((status) => ({
                                value: status,
                                label: t(`writing.statuses.${status}`, status),
                            }))}
                            size="md"
                        />
                    </div>
                    <Textarea
                        label={t('writing.form.logline')}
                        name="logline"
                        value={form.data.logline}
                        onChange={(e) => form.setData('logline', e.target.value)}
                        error={form.errors.logline}
                        rows={2}
                        size="md"
                    />

                    {/* ── Length plan ── */}
                    <div>
                        <div
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: sectionHeadingColor }}
                        >
                            {t('writing.settings.length_heading')}
                        </div>
                        <p
                            className="mt-0.5 text-xs"
                            style={{ color: columnLabelColor }}
                        >
                            {t('writing.settings.length_help')}
                        </p>
                    </div>
                    <Select
                        label={t('writing.settings.preset')}
                        name="preset"
                        value={form.data.preset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        error={allErrors['length_plan.preset']}
                        options={[
                            { value: '', label: t('writing.settings.preset_none') },
                            ...lengthPlans.map((plan) => ({
                                value: plan.key,
                                // Key fallback keeps future presets usable
                                // before their label lands.
                                label: t(`writing.settings.preset_${plan.key}`, plan.key),
                            })),
                        ]}
                        size="md"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label={t('writing.settings.target_words')}
                            name="target_words"
                            type="number"
                            min={0}
                            value={form.data.target_words}
                            onChange={(e) => handleNumberChange('target_words', e.target.value)}
                            error={allErrors['length_plan.target_words']}
                            size="md"
                        />
                        <Input
                            label={t('writing.settings.per_section_words')}
                            name="per_section_words"
                            type="number"
                            min={0}
                            value={form.data.per_section_words}
                            onChange={(e) => handleNumberChange('per_section_words', e.target.value)}
                            error={allErrors['length_plan.per_section_words']}
                            size="md"
                        />
                        <Input
                            label={t('writing.settings.target_lines')}
                            name="target_lines"
                            type="number"
                            min={0}
                            value={form.data.target_lines}
                            onChange={(e) => handleNumberChange('target_lines', e.target.value)}
                            error={allErrors['length_plan.target_lines']}
                            size="md"
                        />
                        <Input
                            label={t('writing.settings.target_pages')}
                            name="target_pages"
                            type="number"
                            min={0}
                            value={form.data.target_pages}
                            onChange={(e) => handleNumberChange('target_pages', e.target.value)}
                            error={allErrors['length_plan.target_pages']}
                            size="md"
                        />
                    </div>
                    <div>
                        <CheckboxField
                            label={t('writing.settings.apply_targets')}
                            name="apply_section_targets"
                            align="start"
                            checked={form.data.apply_section_targets}
                            onChange={(e) => form.setData('apply_section_targets', e.target.checked)}
                        />
                        <p
                            className="mt-1 pl-7 text-xs"
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}
                        >
                            {t('writing.settings.apply_targets_help')}
                        </p>
                    </div>

                    {/* ── Structure ── */}
                    <div>
                        <div
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: sectionHeadingColor }}
                        >
                            {t('writing.settings.structure_heading')}
                        </div>
                        <p
                            className="mt-0.5 text-xs"
                            style={{ color: columnLabelColor }}
                        >
                            {t('writing.settings.structure_help')}
                        </p>
                    </div>
                    <Select
                        label={t('writing.settings.structure_template')}
                        name="structure_template"
                        value={form.data.structure_template}
                        onChange={(e) => handleStructureTemplateChange(e.target.value)}
                        options={[
                            { value: '', label: t('writing.settings.structure_none') },
                            ...STRUCTURE_TEMPLATES.map((template) => ({
                                value: template.slug,
                                label: t(template.labelKey, template.slug),
                            })),
                        ]}
                        size="md"
                    />
                    {form.data.structure_template !== '' && form.data.structure_beats.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <div
                                className="grid grid-cols-[1fr_5rem_5rem] gap-2 text-xs"
                                style={{ color: columnLabelColor }}
                            >
                                <span>{t('writing.settings.structure_col_beat')}</span>
                                <span>{t('writing.settings.structure_col_target')}</span>
                                <span>{t('writing.settings.structure_col_tolerance')}</span>
                            </div>
                            {form.data.structure_beats.map((beat, i) => (
                                <div key={i} className="grid grid-cols-[1fr_5rem_5rem] gap-2">
                                    <Input
                                        name={`structure_beat_${i}_name`}
                                        value={beat.name}
                                        onChange={(e) => handleBeatChange(i, 'name', e.target.value)}
                                        error={allErrors[`length_plan.structure.beats.${i}.name`]}
                                        size="sm"
                                    />
                                    <Input
                                        name={`structure_beat_${i}_target`}
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={beat.target.toString()}
                                        onChange={(e) => handleBeatChange(i, 'target', e.target.value)}
                                        error={allErrors[`length_plan.structure.beats.${i}.target`]}
                                        size="sm"
                                    />
                                    <Input
                                        name={`structure_beat_${i}_tolerance`}
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={beat.tolerance.toString()}
                                        onChange={(e) => handleBeatChange(i, 'tolerance', e.target.value)}
                                        error={allErrors[`length_plan.structure.beats.${i}.tolerance`]}
                                        size="sm"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button type="submit" loading={form.processing}>
                        {t('writing.settings.save')}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
