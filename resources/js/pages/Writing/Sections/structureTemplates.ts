/**
 * Structure-template data — Stage 11 Slice 3.
 *
 * Templates are pure client-side data: no server registry. Each Work
 * stores a WorkStructure snapshot in length_plan.structure so beats
 * survive template renames and per-work edits are independent.
 */

/** One structural marker in a work (e.g. end of Act 1). */
export interface StructureBeat {
    /** Human label shown in the UI (editable per-work). */
    name: string;
    /** Position as a percentage of total length (0–100). */
    target: number;
    /** Acceptable deviation from target in percentage points (0–50). */
    tolerance: number;
}

/** A named collection of beats describing a work's structure shape. */
export interface StructureTemplate {
    slug: 'three-act-screenplay' | 'five-act-screenplay' | 'three-act-prose' | string;
    /** Translation key for the template's display name. */
    labelKey: string;
    /** Whether the template's length unit is pages or words. */
    unit: 'pages' | 'words';
    /** Default beats (deep-copied into the work on template selection). */
    beats: StructureBeat[];
    /** Outlier threshold — beats above (median × outlierHigh) are flagged. */
    outlierHigh: number;
    /** Outlier threshold — beats below (median × outlierLow) are flagged. ~1/3 */
    outlierLow: number;
    /** Screenplay hint: max distinct speaking characters per act. */
    characterLoadHint?: number;
}

/** Persisted in length_plan.structure (snapshot of beats at save time). */
export interface WorkStructure {
    /** Slug of the template that seeded these beats (informational). */
    template: string;
    /** Per-work editable copy of the template's beats. */
    beats: StructureBeat[];
}

export const STRUCTURE_TEMPLATES: StructureTemplate[] = [
    {
        slug: 'three-act-screenplay',
        labelKey: 'writing.settings.structure_three_act_screenplay',
        unit: 'pages',
        outlierHigh: 2,
        outlierLow: 0.333,
        characterLoadHint: 8,
        beats: [
            { name: 'Act 1 end', target: 25, tolerance: 5 },
            { name: 'Midpoint', target: 50, tolerance: 5 },
            { name: 'Act 2 end', target: 75, tolerance: 5 },
        ],
    },
    {
        slug: 'five-act-screenplay',
        labelKey: 'writing.settings.structure_five_act_screenplay',
        unit: 'pages',
        outlierHigh: 2,
        outlierLow: 0.333,
        beats: [
            { name: 'Act 1 end', target: 20, tolerance: 5 },
            { name: 'Act 2 end', target: 40, tolerance: 5 },
            { name: 'Act 3 end', target: 60, tolerance: 5 },
            { name: 'Act 4 end', target: 80, tolerance: 5 },
        ],
    },
    {
        slug: 'three-act-prose',
        labelKey: 'writing.settings.structure_three_act_prose',
        unit: 'words',
        outlierHigh: 2,
        outlierLow: 0.333,
        beats: [
            { name: 'Act 1 end', target: 25, tolerance: 5 },
            { name: 'Midpoint', target: 50, tolerance: 5 },
            { name: 'Act 2 end', target: 75, tolerance: 5 },
        ],
    },
];
