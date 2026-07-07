/**
 * Deterministic structure diagnostic rules — Stage 11 Slice 3.
 *
 * Beat-mapping rule (positional, not by name):
 *   Beat N maps to the Nth section when sections are sorted by endUnits
 *   ascending. When section count < beat count, remaining beats produce
 *   'open' / "not enough structure yet" diagnostics rather than guessing.
 *
 * Outlier rule:
 *   Sections whose word count exceeds (median × outlierHigh) or falls below
 *   (median × outlierLow) are flagged. Minimum 3 sections before judging;
 *   median = 0 means no baseline → skip.
 *
 * All functions are pure: never throw, never return NaN/undefined, return []
 * when input is insufficient (no template, <3 sections, zero totals).
 *
 * DiagnosticInput fields: sections = top-level (beat mapping), leafSections =
 * leaf sections (outliers; falls back to sections for flat works).
 */

import type { StructureTemplate, WorkStructure } from './structureTemplates';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface DiagnosticInput {
    /** Per-work structure snapshot (beats editable per work). */
    structure: WorkStructure | null;
    /** Resolved template, null when custom/none. */
    template: StructureTemplate | null;
    unit: 'pages' | 'words';
    /** Work page estimate or word count. */
    totalUnits: number;
    /**
     * Top-level sections — used by beat placement (positional mapping by endUnits).
     * endUnits = cumulative position where the section ends.
     */
    sections: Array<{
        id: number;
        title: string;
        label: string | null;
        words: number;
        endUnits: number;
    }>;
    /**
     * Leaf sections (scenes / lowest-level nodes) — used by outlier detection.
     * Falls back to sections for flat works where all sections are leaves.
     */
    leafSections?: DiagnosticInput['sections'];
    sceneLinks: Array<{
        name: string;
        slug: string | null;
        mentions: number;
        characterCues: number;
        sectionIds?: number[];
    }>;
    /** Per-act distinct speaking names, when derivable. */
    actBuckets?: Array<{ label: string; characterNames: string[] }>;
}

export interface Diagnostic {
    /** Unique within a single runStructureDiagnostics call. */
    id: string;
    state: 'complete' | 'current' | 'open';
    /** Translation key — rendered via t() in the guidance card. */
    labelKey: string;
    /** Human-readable metric string — rendered verbatim by the card. */
    value: string;
    severity: 'ok' | 'warn';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Compute median of a non-empty numeric array. */
function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

// ---------------------------------------------------------------------------
// Exported rule functions
// ---------------------------------------------------------------------------

/**
 * Per-beat diagnostic: compares actual position (% of totalUnits) to
 * beat.target ± beat.tolerance.  Uses structure.beats when available,
 * otherwise falls back to template.beats.
 */
export function beatPlacementDiagnostics(input: DiagnosticInput): Diagnostic[] {
    const { template, structure, totalUnits, sections } = input;
    if (!template || totalUnits <= 0) return [];

    const beats = structure?.beats ?? template.beats;
    if (beats.length === 0) return [];

    // Sort sections by cumulative end position ascending.
    const sorted = [...sections].sort((a, b) => a.endUnits - b.endUnits);

    return beats.map((beat, i): Diagnostic => {
        if (i >= sorted.length) {
            // Not enough sections yet — emit an 'open' placeholder.
            return {
                id: `beat-${i + 1}`,
                state: 'open',
                labelKey: 'writing.guidance.beat_pending',
                value: beat.name,
                severity: 'ok',
            };
        }

        const section = sorted[i];
        const actualPct = (section.endUnits / totalUnits) * 100;
        const diff = Math.abs(actualPct - beat.target);
        const onTarget = diff <= beat.tolerance;

        return {
            id: `beat-${i + 1}`,
            state: 'complete',
            labelKey: onTarget ? 'writing.guidance.beat_on_target' : 'writing.guidance.beat_off_target',
            value: `${actualPct.toFixed(1)}% / ${beat.target}±${beat.tolerance}`,
            severity: onTarget ? 'ok' : 'warn',
        };
    });
}

/**
 * Flag leaf sections whose word count is an outlier vs the median.
 * Requires at least 3 sections and a non-zero median; otherwise returns [].
 */
export function lengthOutlierDiagnostics(input: DiagnosticInput): Diagnostic[] {
    const { template } = input;
    const sections = input.leafSections ?? input.sections;
    if (!template || sections.length < 3) return [];

    const words = sections.map((s) => s.words);
    const med = median(words);
    if (med <= 0) return [];

    const result: Diagnostic[] = [];
    for (const section of sections) {
        if (section.words > med * template.outlierHigh) {
            result.push({
                id: `outlier-long-${section.id}`,
                state: 'complete',
                labelKey: 'writing.guidance.outlier_long',
                value: `"${section.title}" — ${section.words}`,
                severity: 'warn',
            });
        } else if (section.words < med * template.outlierLow) {
            result.push({
                id: `outlier-short-${section.id}`,
                state: 'complete',
                labelKey: 'writing.guidance.outlier_short',
                value: `"${section.title}" — ${section.words}`,
                severity: 'warn',
            });
        }
    }
    return result;
}

/**
 * Flag acts whose distinct speaking-character count exceeds the template's
 * characterLoadHint.  No-ops when the hint or actBuckets are absent.
 */
export function characterLoadDiagnostics(input: DiagnosticInput): Diagnostic[] {
    const { template, actBuckets } = input;
    if (!template?.characterLoadHint || !actBuckets?.length) return [];

    const result: Diagnostic[] = [];
    for (let i = 0; i < actBuckets.length; i++) {
        const bucket = actBuckets[i];
        const count = bucket.characterNames.length;
        if (count > template.characterLoadHint) {
            result.push({
                id: `char-load-act-${i + 1}`,
                state: 'complete',
                labelKey: 'writing.guidance.character_load',
                value: `${bucket.label}: ${count}/${template.characterLoadHint}`,
                severity: 'warn',
            });
        }
    }
    return result;
}

/**
 * Flag scene links whose canonical entry is unresolved (slug === null).
 * Emits a single summary diagnostic with the orphaned count.
 */
export function orphanedLinkDiagnostics(input: DiagnosticInput): Diagnostic[] {
    const orphaned = input.sceneLinks.filter((l) => l.slug === null);
    if (orphaned.length === 0) return [];

    return [
        {
            id: 'orphaned-links',
            state: 'open',
            labelKey: 'writing.guidance.orphaned_links',
            value: `${orphaned.length}`,
            severity: 'warn',
        },
    ];
}

/**
 * Run all four rules in order and concatenate results.
 */
export function runStructureDiagnostics(input: DiagnosticInput): Diagnostic[] {
    return [
        ...beatPlacementDiagnostics(input),
        ...lengthOutlierDiagnostics(input),
        ...characterLoadDiagnostics(input),
        ...orphanedLinkDiagnostics(input),
    ];
}
