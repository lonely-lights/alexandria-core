import type {
    PacingNode,
    PacingMarkerInput,
    PacingResult,
    PacingRow,
    TimeAmount,
} from './pacingTypes';
const zero = (): TimeAmount => ({ knownSeconds: 0, unknownCount: 0 });
export function remainingTime(
    budget: number | null,
    actual: TimeAmount,
): PacingRow['remaining'] {
    return budget === null
        ? null
        : {
              seconds: budget - actual.knownSeconds,
              bound: actual.unknownCount ? 'upper' : 'exact',
          };
}
export function buildPacingModel(
    nodes: PacingNode[],
    targetRuntimeSeconds: number | null,
    markers: PacingMarkerInput[],
): PacingResult {
    const children = new Map<string | null, PacingNode[]>();
    const byKey = new Map(nodes.map((n) => [n.key, n]));

    for (const node of nodes) {
        children.set(node.parentKey, [
            ...(children.get(node.parentKey) ?? []),
            node,
        ]);
    }

    const slots: TimeAmount[] = [];
    const intervals = new Map<string, { start: number; end: number }>();
    const rows = new Map<string, PacingRow>();
    const sum = (start: number, end: number): TimeAmount =>
        slots.slice(start, end).reduce(
            (a, b) => ({
                knownSeconds: a.knownSeconds + b.knownSeconds,
                unknownCount: a.unknownCount + b.unknownCount,
            }),
            zero(),
        );
    const walk = (node: PacingNode) => {
        const start = slots.length;
        const nested = children.get(node.key) ?? [];
        const isContainer = node.isStructural || nested.length > 0;

        if (isContainer) {
            if (nested.length === 0 || node.hasOwnContent) {
                slots.push({ knownSeconds: 0, unknownCount: 1 });
            }

            for (const child of nested) {
                walk(child);
            }
        } else {
            slots.push({
                knownSeconds: node.durationSeconds ?? 0,
                unknownCount: node.durationSeconds === null ? 1 : 0,
            });
        }

        const end = slots.length;
        intervals.set(node.key, { start, end });
        const actual = sum(start, end);
        const budgetSeconds = isContainer ? node.durationSeconds : null;
        rows.set(node.key, {
            key: node.key,
            sectionId: node.sectionId,
            isContainer,
            durationSeconds: node.durationSeconds,
            startsAt: sum(0, start),
            endsAt: sum(0, end),
            actual,
            budgetSeconds,
            remaining: remainingTime(budgetSeconds, actual),
            coverageIssue: isContainer
                ? node.hasOwnContent
                    ? 'container-content'
                    : nested.length === 0
                      ? 'empty-container'
                      : null
                : null,
        });
    };

    for (const root of children.get(null) ?? []) {
        walk(root);
    }

    const actual = sum(0, slots.length);

    return {
        rows: nodes.map((n) => rows.get(n.key)!),
        totals: {
            actual,
            targetRuntimeSeconds,
            remaining: remainingTime(targetRuntimeSeconds, actual),
        },
        markers: markers.map((marker) => {
            const anchor = nodes.find(
                (n) =>
                    n.sectionId !== null &&
                    n.sectionId === marker.anchor_section_id,
            );
            const interval = anchor ? intervals.get(anchor.key) : null;
            const edge = marker.anchor_edge ?? 'end';
            const boundary = interval
                ? edge === 'start'
                    ? interval.start
                    : interval.end
                : null;
            const landing = boundary === null ? null : sum(0, boundary);
            const targetSeconds =
                targetRuntimeSeconds === null
                    ? null
                    : (targetRuntimeSeconds * marker.target) / 100;
            const toleranceSeconds =
                targetRuntimeSeconds === null
                    ? null
                    : (targetRuntimeSeconds * marker.tolerance) / 100;
            const gapSeconds =
                landing && landing.unknownCount === 0 && targetSeconds !== null
                    ? landing.knownSeconds - targetSeconds
                    : null;
            let container = anchor;

            while (container) {
                const row = rows.get(container.key);

                if (row?.isContainer && row.budgetSeconds !== null) {
                    break;
                }

                container =
                    container.parentKey === null
                        ? undefined
                        : byKey.get(container.parentKey);
            }

            const ci = container ? intervals.get(container.key) : null;
            const before =
                ci && boundary !== null ? sum(ci.start, boundary) : null;
            const after =
                ci && boundary !== null ? sum(boundary, ci.end) : null;

            return {
                name: marker.name,
                targetPercent: marker.target,
                targetSeconds,
                toleranceSeconds,
                anchorSectionId: marker.anchor_section_id ?? null,
                anchorEdge: edge,
                anchorUnavailable: marker.anchor_section_id != null && !anchor,
                landing,
                gapSeconds,
                status: !anchor
                    ? 'unanchored'
                    : gapSeconds === null
                      ? 'unknown'
                      : Math.abs(gapSeconds) <= toleranceSeconds!
                        ? 'on-target'
                        : gapSeconds < 0
                          ? 'early'
                          : 'late',
                containerKey: container?.key ?? null,
                beforeInContainer: before,
                afterInContainer: after,
                remainingContainerBudget:
                    before && container
                        ? remainingTime(container.durationSeconds, before)
                        : null,
            };
        }),
    };
}
