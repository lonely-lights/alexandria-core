export interface TimeAmount {
    knownSeconds: number;
    unknownCount: number;
}
export interface PacingNode {
    key: string;
    sectionId: number | null;
    parentKey: string | null;
    isStructural: boolean;
    hasOwnContent: boolean;
    durationSeconds: number | null;
}
export interface PacingMarkerInput {
    name: string;
    target: number;
    tolerance: number;
    anchor_section_id?: number | null;
    anchor_edge?: 'start' | 'end';
}
export interface PacingRow {
    key: string;
    sectionId: number | null;
    isContainer: boolean;
    durationSeconds: number | null;
    startsAt: TimeAmount;
    endsAt: TimeAmount;
    actual: TimeAmount;
    budgetSeconds: number | null;
    remaining: { seconds: number; bound: 'exact' | 'upper' } | null;
    coverageIssue: 'empty-container' | 'container-content' | null;
}
export interface MarkerTiming {
    name: string;
    targetPercent: number;
    targetSeconds: number | null;
    toleranceSeconds: number | null;
    anchorSectionId: number | null;
    anchorEdge: 'start' | 'end';
    anchorUnavailable: boolean;
    landing: TimeAmount | null;
    gapSeconds: number | null; // landing minus target; null if unknown
    status: 'on-target' | 'early' | 'late' | 'unanchored' | 'unknown';
    containerKey: string | null; // closest enclosing container with a budget
    beforeInContainer: TimeAmount | null;
    afterInContainer: TimeAmount | null;
    remainingContainerBudget: {
        seconds: number;
        bound: 'exact' | 'upper';
    } | null;
}
export interface PacingResult {
    rows: PacingRow[];
    markers: MarkerTiming[];
    totals: {
        actual: TimeAmount;
        targetRuntimeSeconds: number | null;
        remaining: { seconds: number; bound: 'exact' | 'upper' } | null;
    };
}
