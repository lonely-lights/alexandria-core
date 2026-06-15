import type { CurrentSection, SectionNode } from '../Workspace';

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
    type: string;
    format: string;
    target_pages: number | null;
    length_plan: {
        target_lines?: number | null;
        target_pages?: number | null;
        preset?: string | null;
    } | null;
}

export interface StructureGuidanceInput {
    work: WorkSummary;
    sections: SectionNode[];
    currentSection: CurrentSection | null;
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

export function getStructureGuidance({
    work,
    sections,
    currentSection,
}: StructureGuidanceInput): StructureGuidance | null {
    const workType = work.type;
    const targetPages = work.target_pages ?? work.length_plan?.target_pages ?? null;
    const targetLines = work.length_plan?.target_lines ?? null;

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
                    ? [{
                        id: 'pages',
                        labelKey: 'writing.guidance.metric_pages',
                        icon: 'fa-file-lines',
                        state: 'open' as StructureGuidanceState,
                        value: targetDisplay(targetPages),
                    }]
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
            bodyKey: targetLines !== null
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
                    ? [{
                        id: 'lines',
                        labelKey: 'writing.guidance.metric_lines',
                        icon: 'fa-list-ol',
                        state: 'open' as StructureGuidanceState,
                        value: targetDisplay(targetLines),
                    }]
                    : []),
            ],
        };
    }

    return null;
}
