/**
 * Recently-visited note contexts for the drawer's context switcher.
 *
 * Storage is per project and deliberately dumb: an MRU list of plain
 * SwitchTarget-shaped rows, newest first, capped at RECENTS_CAP. No
 * timestamps — position IS the recency — and no note counts, because a
 * stored count goes stale the moment a note is added anywhere else.
 *
 * Every read is defensive. localStorage is user-writable, shared across
 * tabs, and survives deploys, so anything in it is untrusted input: bad
 * JSON, a hand-edited array, or rows written by an older shape all
 * degrade to "no recents" rather than throwing inside a render.
 */

import type { SwitchContextType, SwitchTarget } from './ContextSwitchModal';

export const RECENTS_CAP = 10;

/** The subset we persist — live fields like note_count are dropped. */
export type RecentTarget = Pick<
    SwitchTarget,
    'type' | 'id' | 'label' | 'sublabel' | 'slug'
>;

const VALID_TYPES: readonly SwitchContextType[] = [
    'project',
    'blueprint',
    'entry',
    'work_section',
    'work',
];

export function recentsStorageKey(projectId: number): string {
    return `alexandria:notes-switch-recents:${projectId}`;
}

/** Nullish or a string — anything else would render as a React child. */
function isOptionalString(value: unknown): boolean {
    return value == null || typeof value === 'string';
}

function isRecentTarget(value: unknown): value is RecentTarget {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const row = value as Record<string, unknown>;

    return (
        typeof row.type === 'string'
        && VALID_TYPES.includes(row.type as SwitchContextType)
        && typeof row.id === 'number'
        && typeof row.label === 'string'
        // A corrupted object here reaches JSX as `{sublabel}` and throws
        // "Objects are not valid as a React child", taking the whole
        // drawer down over a bad localStorage row.
        && isOptionalString(row.sublabel)
        // Same class of failure one step later: a non-string slug flows
        // through onSwitch into URL building.
        && isOptionalString(row.slug)
    );
}

export function readRecents(projectId: number): RecentTarget[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(recentsStorageKey(projectId));

        if (!raw) {
            return [];
        }

        const parsed: unknown = JSON.parse(raw);

        return Array.isArray(parsed)
            ? dedupe(parsed.filter(isRecentTarget)).slice(0, RECENTS_CAP)
            : [];
    } catch {
        return [];
    }
}

/**
 * Keep the first occurrence of each type+id.
 *
 * Our own writes can't produce a duplicate, but storage is shared with
 * other tabs and hand-editable, and a repeat would surface twice over:
 * duplicate React keys, and two elements behind one `data-recent-row`
 * selector — the strict-mode failure the attribute split exists to
 * prevent.
 */
function dedupe(rows: RecentTarget[]): RecentTarget[] {
    const seen = new Set<string>();

    return rows.filter((row) => {
        const key = `${row.type}-${row.id}`;

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);

        return true;
    });
}

export function writeRecents(projectId: number, rows: RecentTarget[]): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            recentsStorageKey(projectId),
            JSON.stringify(rows.slice(0, RECENTS_CAP)),
        );
    } catch {
        // Private-mode / quota-exceeded: recents are a convenience, never
        // a correctness requirement. Losing them must not break a switch.
    }
}

/** Move `target` to the front, de-duplicated, capped. */
export function promoteRecent(
    rows: RecentTarget[],
    target: SwitchTarget,
): RecentTarget[] {
    const entry: RecentTarget = {
        type: target.type,
        id: target.id,
        label: target.label,
        sublabel: target.sublabel ?? null,
        slug: target.slug ?? null,
    };

    return [
        entry,
        ...rows.filter(
            (row) => !(row.type === entry.type && row.id === entry.id),
        ),
    ].slice(0, RECENTS_CAP);
}

export function removeRecent(
    rows: RecentTarget[],
    target: RecentTarget,
): RecentTarget[] {
    return rows.filter(
        (row) => !(row.type === target.type && row.id === target.id),
    );
}
