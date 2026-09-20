import {
    pacingNodesFromSections,
    timingIsActive,
} from '../pacing/pacingAdapters';
import { buildPacingModel } from '../pacing/pacingModel';
import type { PacingResult } from '../pacing/pacingTypes';
import { timeText } from '../pacing/SectionTiming';
import type { CurrentSection, SectionNode } from '../Workspace';
import type { DiagnosticInput } from './structureRules';
import { runStructureDiagnostics } from './structureRules';
import type { WorkStructure } from './structureTemplates';
import { STRUCTURE_TEMPLATES } from './structureTemplates';

export type StructureGuidanceState = 'complete' | 'current' | 'open';

export interface StructureGuidanceItem {
    id: string;
    labelKey: string;
    icon: string;
    state: StructureGuidanceState;
    value?: string;
    valueKey?: string;
}

export interface StructureGuidance {
    id: string;
    titleKey: string;
    bodyKey: string;
    items: StructureGuidanceItem[];
}

interface WorkSummary {
    target_runtime_seconds?: number | null;
    type: string;
    format: string;
    target_pages: number | null;
    length_plan: {
        target_lines?: number | null;
        target_pages?: number | null;
        preset?: string | null;
        structure?: WorkStructure | null;
    } | null;
}

export interface StructureGuidanceInput {
    pacing?: PacingResult;
    work: WorkSummary;
    sections: SectionNode[];
    currentSection: CurrentSection | null;
}

/** Provider function type for Stage 12a analyzers to extend the guidance card. */
type GuidanceProvider = (
    ctx: StructureGuidanceInput,
) => StructureGuidanceItem[];

/** Module-level provider registry — populated via registerGuidanceProvider(). */
const guidanceProviders: GuidanceProvider[] = [];

/**
 * Register a guidance provider to append items to the structure guidance card.
 * Stage 12a analyzers (e.g. craft-suite) use this seam to inject custom
 * diagnostic items without modifying this module.
 */
export function registerGuidanceProvider(fn: GuidanceProvider): void {
    guidanceProviders.push(fn);
}

function flattenSections(nodes: SectionNode[]): SectionNode[] {
    return nodes.flatMap((node) => [node, ...flattenSections(node.children)]);
}

function countByLabel(nodes: SectionNode[], label: string): number {
    const expected = label.toLocaleLowerCase();

    return flattenSections(nodes).filter(
        (node) => (node.label ?? '').toLocaleLowerCase() === expected,
    ).length;
}

function countDisplay(count: number, target?: number | null): string {
    return target !== undefined && target !== null
        ? `${count.toLocaleString()} / ${target.toLocaleString()}`
        : count.toLocaleString();
}

function targetDisplay(target: number): string {
    return target.toLocaleString();
}

function stateForCount(count: number, target: number): StructureGuidanceState {
    return count >= target ? 'complete' : 'open';
}

/** Recursively sum word_count for a node and all its descendants. */
function subtreeWords(node: SectionNode): number {
    return (
        node.word_count +
        node.children.reduce((sum, child) => sum + subtreeWords(child), 0)
    );
}

/**
 * Build a DiagnosticInput from the Navigator's section tree and work summary.
 *
 * endUnits are always cumulative WORD counts regardless of template unit
 * (pages vs words). Beats are percentage-based, and word-share ≈ page-share
 * within a single work, so percentage placement is accurate under both units
 * without a separate page-derivation step.
 */
export function buildDiagnosticInput(
    work: WorkSummary,
    sections: SectionNode[],
): DiagnosticInput {
    const structure = work.length_plan?.structure ?? null;
    const templateSlug = structure?.template ?? null;
    const template =
        templateSlug !== null
            ? (STRUCTURE_TEMPLATES.find((t) => t.slug === templateSlug) ?? null)
            : null;

    // Top-level sections with cumulative word-count end positions.
    // subtreeWords is used so act nodes (word_count=0) accumulate words from scene children.
    let cumulative = 0;
    const mappedSections: DiagnosticInput['sections'] = sections.map(
        (section) => {
            cumulative += subtreeWords(section); // subtree-sum: acts carry word_count=0, prose lives in scene children

            return {
                id: section.id,
                title: section.title,
                label: section.label,
                words: section.word_count,
                endUnits: cumulative,
            };
        },
    );

    const totalUnits = cumulative;

    // Collect leaf nodes (no children) recursively for outlier detection.
    function flattenLeaves(nodes: SectionNode[]): DiagnosticInput['sections'] {
        const result: DiagnosticInput['sections'] = [];

        for (const node of nodes) {
            if (node.children.length === 0) {
                result.push({
                    id: node.id,
                    title: node.title,
                    label: node.label,
                    words: node.word_count,
                    endUnits: 0, // not used by outlier detection; top-level endUnits only
                });
            } else {
                result.push(...flattenLeaves(node.children));
            }
        }

        return result;
    }

    const leafSections = flattenLeaves(sections);

    return {
        structure,
        template,
        unit: template?.unit ?? 'words',
        totalUnits,
        sections: mappedSections,
        leafSections,
        sceneLinks: [],
        // actBuckets not threaded into Navigator; characterLoad diagnostics are
        // a no-op until scene-link data is available at the work level.
    };
}

export function getStructureGuidance({
    work,
    sections,
    currentSection,
    pacing,
}: StructureGuidanceInput): StructureGuidance | null {
    const workType = work.type;
    const targetPages =
        work.target_pages ?? work.length_plan?.target_pages ?? null;
    const targetLines = work.length_plan?.target_lines ?? null;
    const structure = work.length_plan?.structure ?? null;

    const nodes = pacingNodesFromSections(sections);
    const timing =
        pacing !== undefined ||
        timingIsActive(
            work.format,
            work.target_runtime_seconds ?? null,
            nodes,
            structure?.beats ?? [],
        );

    if (timing) {
        const model =
            pacing ??
            buildPacingModel(
                nodes,
                work.target_runtime_seconds ?? null,
                structure?.beats ?? [],
            );
        const items: StructureGuidanceItem[] = [
            {
                id: 'runtime',
                labelKey: 'writing.pacing.running_time',
                icon: 'fa-clock',
                state: model.totals.actual.unknownCount ? 'open' : 'complete',
                value: timeText(model.totals.actual),
            },
        ];

        if (
            structure === null &&
            (workType === 'screenplay' || workType === 'stage_play')
        ) {
            const expectedActs = workType === 'stage_play' ? 2 : 3;
            const actCount = countByLabel(sections, 'Act') || sections.length;
            const sceneCount = countByLabel(sections, 'Scene');
            items.push(
                {
                    id: 'acts',
                    labelKey: 'writing.guidance.metric_acts',
                    icon: 'fa-layer-group',
                    state: stateForCount(actCount, expectedActs),
                    value: countDisplay(actCount, expectedActs),
                },
                {
                    id: 'scenes',
                    labelKey: 'writing.guidance.metric_scenes',
                    icon: 'fa-clapperboard',
                    state: sceneCount > 0 ? 'complete' : 'open',
                    value: countDisplay(sceneCount),
                },
            );
        }

        model.markers.forEach((marker, i) =>
            items.push({
                id: 'runtime-marker-' + i,
                labelKey:
                    'writing.pacing.' +
                    (marker.anchorUnavailable ? 'unavailable' : marker.status),
                icon: 'fa-location-dot',
                state:
                    marker.status === 'on-target'
                        ? 'complete'
                        : marker.status === 'early' || marker.status === 'late'
                          ? 'current'
                          : 'open',
                value:
                    marker.name +
                    (marker.landing ? ' · ' + timeText(marker.landing) : ''),
            }),
        );
        items.push(
            ...runStructureDiagnostics(buildDiagnosticInput(work, sections))
                .filter((d) => !d.id.startsWith('beat-'))
                .map((d) => ({
                    id: d.id,
                    labelKey: d.labelKey,
                    icon:
                        d.severity === 'warn'
                            ? 'fa-triangle-exclamation'
                            : 'fa-circle-check',
                    state:
                        d.severity === 'warn' ? ('current' as const) : d.state,
                    value: d.value,
                })),
        );

        for (const provider of guidanceProviders) {
            items.push(
                ...provider({ work, sections, currentSection, pacing: model }),
            );
        }

        return {
            id: 'authored-timing',
            titleKey: 'writing.pacing.running_time',
            bodyKey: 'writing.pacing.help',
            items,
        };
    }

    // --- Template-driven path ---
    // When a structure template is configured, run diagnostics and render them.
    // This path takes precedence over the hardcoded form branches below.
    if (structure !== null) {
        const diagnosticInput = buildDiagnosticInput(work, sections);
        const diagnostics = runStructureDiagnostics(diagnosticInput);

        const items: StructureGuidanceItem[] = diagnostics.map((d) => ({
            id: d.id,
            labelKey: d.labelKey,
            icon:
                d.severity === 'warn'
                    ? 'fa-triangle-exclamation'
                    : 'fa-circle-check',
            // 'warn' overrides state to 'current' (attention needed);
            // 'ok' preserves the Diagnostic's own state (complete / open).
            state: d.severity === 'warn' ? 'current' : d.state,
            value: d.value,
        }));

        // Append items from registered Stage 12a providers (empty by default).
        const ctx: StructureGuidanceInput = { work, sections, currentSection };

        for (const provider of guidanceProviders) {
            items.push(...provider(ctx));
        }

        return {
            id: 'structure-template',
            titleKey: 'writing.guidance.template.title',
            bodyKey: 'writing.guidance.template.body',
            items,
        };
    }

    // --- Hardcoded form branches (fallback when no structure configured) ---

    if (workType === 'screenplay' || workType === 'stage_play') {
        const expectedActs = workType === 'stage_play' ? 2 : 3;
        const actCount = countByLabel(sections, 'Act') || sections.length;
        const sceneCount = countByLabel(sections, 'Scene');
        const currentIsScene =
            (currentSection?.label ?? '').toLocaleLowerCase() === 'scene' ||
            currentSection?.format === 'screenplay';

        return {
            id: workType,
            titleKey: `writing.guidance.${workType}.title`,
            bodyKey: `writing.guidance.${workType}.body`,
            items: [
                {
                    id: 'acts',
                    labelKey: 'writing.guidance.metric_acts',
                    icon: 'fa-layer-group',
                    state: stateForCount(actCount, expectedActs),
                    value: countDisplay(actCount, expectedActs),
                },
                {
                    id: 'scenes',
                    labelKey: 'writing.guidance.metric_scenes',
                    icon: 'fa-clapperboard',
                    state: sceneCount > 0 ? 'complete' : 'open',
                    value: countDisplay(sceneCount),
                },
                ...(targetPages !== null
                    ? [
                          {
                              id: 'pages',
                              labelKey: 'writing.guidance.metric_pages',
                              icon: 'fa-file-lines',
                              state: 'open' as StructureGuidanceState,
                              value: targetDisplay(targetPages),
                          },
                      ]
                    : []),
                {
                    id: 'current-scene',
                    labelKey: 'writing.guidance.metric_current_scene',
                    icon: 'fa-location-crosshairs',
                    state: currentIsScene ? 'current' : 'open',
                    valueKey: currentIsScene
                        ? 'writing.guidance.value_active'
                        : 'writing.guidance.value_select',
                },
            ],
        };
    }

    if (workType === 'poem' || targetLines !== null) {
        return {
            id: 'poem',
            titleKey: 'writing.guidance.poem.title',
            bodyKey:
                targetLines !== null
                    ? 'writing.guidance.poem.body_with_target'
                    : 'writing.guidance.poem.body',
            items: [
                {
                    id: 'sections',
                    labelKey: 'writing.guidance.metric_sections',
                    icon: 'fa-align-left',
                    state: sections.length === 1 ? 'complete' : 'open',
                    value: countDisplay(sections.length, 1),
                },
                ...(targetLines !== null
                    ? [
                          {
                              id: 'lines',
                              labelKey: 'writing.guidance.metric_lines',
                              icon: 'fa-list-ol',
                              state: 'open' as StructureGuidanceState,
                              value: targetDisplay(targetLines),
                          },
                      ]
                    : []),
            ],
        };
    }

    return null;
}
