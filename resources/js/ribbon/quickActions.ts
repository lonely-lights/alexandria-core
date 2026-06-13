import type { RibbonControl, RibbonTab } from './types';

export type RibbonQuickAction =
    | {
        id: string;
        type: 'control';
        setKey: string;
        controlId: string;
    }
    | {
        id: string;
        type: 'bookmark';
        url: string;
        icon: string;
        label: string;
    };

const INTERNAL_URL = /^\/(?!\/)/;
const MAX_ITEMS = 12;

export function nextQuickActionId(prefix: 'control' | 'bookmark'): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function findControlById<Ctx>(
    tabs: RibbonTab<Ctx>[],
    controlId: string,
): RibbonControl<Ctx> | null {
    for (const tab of tabs) {
        for (const group of tab.groups) {
            const control = group.controls.find((item) => item.id === controlId);

            if (control) {
                return control;
            }
        }
    }

    return null;
}

export function canPinControl(control: RibbonControl | null): boolean {
    return control !== null && control.type !== 'select';
}

export function normalizeQuickActions(input: unknown): RibbonQuickAction[] {
    if (!Array.isArray(input)) {
        return [];
    }

    const normalized: RibbonQuickAction[] = [];

    for (const item of input) {
        if (normalized.length >= MAX_ITEMS || item === null || typeof item !== 'object') {
            continue;
        }

        const row = item as Record<string, unknown>;

        if (
            row.type === 'control'
            && typeof row.id === 'string'
            && typeof row.setKey === 'string'
            && row.setKey.length > 0
            && typeof row.controlId === 'string'
            && row.controlId.length > 0
        ) {
            normalized.push({
                id: row.id,
                type: 'control',
                setKey: row.setKey,
                controlId: row.controlId,
            });
        }

        if (
            row.type === 'bookmark'
            && typeof row.id === 'string'
            && typeof row.url === 'string'
            && INTERNAL_URL.test(row.url)
            && typeof row.icon === 'string'
            && typeof row.label === 'string'
            && row.label.trim().length > 0
        ) {
            normalized.push({
                id: row.id,
                type: 'bookmark',
                url: row.url,
                icon: row.icon,
                label: row.label.trim(),
            });
        }
    }

    return normalized;
}

export function moveQuickAction(
    actions: RibbonQuickAction[],
    id: string,
    delta: -1 | 1,
): RibbonQuickAction[] {
    const index = actions.findIndex((item) => item.id === id);
    const nextIndex = index + delta;

    if (index === -1 || nextIndex < 0 || nextIndex >= actions.length) {
        return actions;
    }

    const next = [...actions];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);

    return next;
}

export function replaceVisibleQuickActions(
    actions: RibbonQuickAction[],
    visibleActions: RibbonQuickAction[],
    nextVisibleActions: RibbonQuickAction[],
): RibbonQuickAction[] {
    const visibleIds = new Set(visibleActions.map((item) => item.id));
    const nextQueue = normalizeQuickActions(nextVisibleActions);
    const merged = actions.flatMap((item) => {
        if (!visibleIds.has(item.id)) {
            return [item];
        }

        const next = nextQueue.shift();

        return next ? [next] : [];
    });

    return [...merged, ...nextQueue];
}
