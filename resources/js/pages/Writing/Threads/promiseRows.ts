/**
 * Pure helpers for the Reports "Promises" group (Task 6, design doc
 * 2026-08-29-devices-tropes-design.md Surface #4). No React, no fetch.
 *
 * Neither `writing.promises.index` (project-wide, open threads only,
 * grouped by scope) nor `writing.threads.index?work_id=…` (this work's
 * threads, with derived status/stance, but no setup_location/scope_title)
 * alone carries everything a per-work open-promises table needs — this
 * cross-references the two, per the task-6 brief's "promises for the
 * project + threads for this work" instruction.
 */

import type { PatternThread, PromiseGroup, PromiseThreadRow } from './threadApi';

export interface PromiseTableRow extends PromiseThreadRow {
    scope_title: string;
}

/**
 * This work's open-promises table: only promise rows whose thread id
 * also appears as `open` among `workThreads` (the work_id-filtered
 * index call) make the cut — a project-wide open promise scoped to a
 * different work's section never surfaces on this work's Reports page.
 * `scope_title` is lifted from each row's group since Reports renders a
 * flat table, not grouped-by-scope like the hub dashboard's promises
 * block.
 */
export function buildWorkPromiseRows(
    promiseGroups: PromiseGroup[],
    workThreads: PatternThread[],
): PromiseTableRow[] {
    const openWorkThreadIds = new Set(
        workThreads.filter((thread) => thread.status === 'open').map((thread) => thread.id),
    );

    const rows: PromiseTableRow[] = [];

    for (const group of promiseGroups) {
        for (const row of group.threads) {
            if (openWorkThreadIds.has(row.id)) {
                rows.push({ ...row, scope_title: group.scope_title });
            }
        }
    }

    return rows;
}

/** Count of `workThreads` whose derived status is `kept`. */
export function keptCount(threads: PatternThread[]): number {
    return threads.filter((thread) => thread.status === 'kept').length;
}

/**
 * Every promise row across ALL scope groups, each carrying its own
 * group's `scope_title` — the sidebar rail card's cross-scope flatten
 * (2026-08-29-devices-tropes rework-1). Unlike `buildWorkPromiseRows`,
 * this keeps every open thread project-wide rather than filtering to
 * one work.
 */
export function flattenPromiseRows(promiseGroups: PromiseGroup[]): PromiseTableRow[] {
    const rows: PromiseTableRow[] = [];

    for (const group of promiseGroups) {
        for (const row of group.threads) {
            rows.push({ ...row, scope_title: group.scope_title });
        }
    }

    return rows;
}

/** Total open-promise count across every scope group — the rail card's
 *  header badge. */
export function totalPromiseCount(promiseGroups: PromiseGroup[]): number {
    return promiseGroups.reduce((sum, group) => sum + group.threads.length, 0);
}

/**
 * The `limit` oldest open promises across every scope group,
 * oldest-first. Each group's own `threads` array is already
 * oldest-first WITHIN that scope (see this file's header note /
 * `PatternThreadService::promises`), but the rail flattens across
 * scopes first, so it re-sorts globally by `created_at`.
 */
export function oldestPromiseRows(promiseGroups: PromiseGroup[], limit: number): PromiseTableRow[] {
    return flattenPromiseRows(promiseGroups)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, limit);
}

export interface StanceCount {
    stance: string;
    count: number;
}

/** Per-stance counts across every thread (open + kept); a thread with
 *  no stance set yet counts under the `'none'` key. */
export function stanceDistribution(threads: PatternThread[]): StanceCount[] {
    const counts = new Map<string, number>();

    for (const thread of threads) {
        const key = thread.stance ?? 'none';
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()].map(([stance, count]) => ({ stance, count }));
}
