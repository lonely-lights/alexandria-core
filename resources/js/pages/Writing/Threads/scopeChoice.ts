/**
 * Scope-picker helpers shared between MarkThreadModal (new-thread scope
 * choice) and ThreadDetailModal (Task 6, editing an existing thread's
 * scope) — extracted from MarkThreadModal so the second consumer
 * doesn't duplicate them. Pure — no React, no fetch.
 */

import type { SectionNode } from '../Workspace';
import type { PatternScopeType } from './threadApi';

export type ScopeChoice =
    | { type: 'section'; id: number }
    | { type: 'work' }
    | { type: 'entry'; id: number };

export function scopeKey(choice: ScopeChoice): string {
    switch (choice.type) {
        case 'section':
            return `section:${choice.id}`;
        case 'entry':
            return `entry:${choice.id}`;
        default:
            return 'work';
    }
}

export function scopeChoiceToWire(
    choice: ScopeChoice,
    workId: number,
): { scope_type: PatternScopeType; scope_id: number } {
    switch (choice.type) {
        case 'section':
            return { scope_type: 'section', scope_id: choice.id };
        case 'entry':
            return { scope_type: 'entry', scope_id: choice.id };
        default:
            return { scope_type: 'work', scope_id: workId };
    }
}

/** The inverse of `scopeChoiceToWire` — reconstructs a `ScopeChoice`
 *  from a thread's wire scope fields, so ThreadDetailModal can
 *  preselect the current scope in its editable picker. */
export function scopeChoiceFromWire(scopeType: PatternScopeType, scopeId: number): ScopeChoice {
    if (scopeType === 'work') {
        return { type: 'work' };
    }

    if (scopeType === 'entry') {
        return { type: 'entry', id: scopeId };
    }

    return { type: 'section', id: scopeId };
}

/** Depth-first ancestor path for `targetId`, nearest ancestor first. */
export function ancestorsOf(nodes: SectionNode[], targetId: number): SectionNode[] {
    function walk(list: SectionNode[], trail: SectionNode[]): SectionNode[] | null {
        for (const node of list) {
            if (node.id === targetId) {
                return trail;
            }

            const found = walk(node.children, [...trail, node]);

            if (found !== null) {
                return found;
            }
        }

        return null;
    }

    const trail = walk(nodes, []);

    return trail === null ? [] : [...trail].reverse();
}

/** Depth-first lookup of a section node by id — used to label a
 *  thread's existing section scope when it isn't necessarily the
 *  workspace's current section. */
export function findSectionInTree(nodes: SectionNode[], targetId: number): SectionNode | null {
    for (const node of nodes) {
        if (node.id === targetId) {
            return node;
        }

        const found = findSectionInTree(node.children, targetId);

        if (found !== null) {
            return found;
        }
    }

    return null;
}
