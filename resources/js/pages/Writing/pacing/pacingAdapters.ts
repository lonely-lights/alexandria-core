import type { OutlineRow } from '../Outline/outlineTypes';
import type { SectionNode } from '../Workspace';
import type { PacingNode } from './pacingTypes';
export function pacingNodesFromOutline(rows: OutlineRow[]): PacingNode[] {
    return rows.map((r) => ({
        key: r.key,
        sectionId: r.sectionId,
        parentKey: r.parentKey,
        isStructural: r.isStructural ?? false,
        hasOwnContent: r.hasContent ?? false,
        durationSeconds: r.durationSeconds ?? null,
    }));
}
export function pacingNodesFromSections(
    sections: SectionNode[],
    parentKey: string | null = null,
): PacingNode[] {
    return sections.flatMap((s) => [
        {
            key: 's-' + s.id,
            sectionId: s.id,
            parentKey,
            isStructural: s.is_structural ?? false,
            hasOwnContent: s.has_content,
            durationSeconds: s.duration_seconds ?? null,
        },
        ...pacingNodesFromSections(s.children, 's-' + s.id),
    ]);
}
export function timingIsActive(
    format: string,
    target: number | null,
    nodes: PacingNode[],
    anchors: { anchor_section_id?: number | null }[],
): boolean {
    return (
        format === 'screenplay' ||
        target !== null ||
        nodes.some((n) => n.durationSeconds !== null) ||
        anchors.some((a) => a.anchor_section_id != null)
    );
}
