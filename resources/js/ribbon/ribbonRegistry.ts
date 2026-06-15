import type { RibbonTab, RibbonTabContribution } from './types';

/**
 * Tab-set registry — settingsCache/writingPanelRegistry mechanics one
 * structural level deeper. Base sets register under a key; packages
 * extend them; merging happens lazily at read time so registration
 * order never matters. Snapshots are cached per set key so
 * useSyncExternalStore consumers get stable references.
 */

const baseSets = new Map<string, RibbonTab[]>();
const contributions = new Map<string, RibbonTabContribution[]>();
const snapshots = new Map<string, RibbonTab[]>();
const listeners = new Set<() => void>();

const EMPTY: RibbonTab[] = [];

function notify(): void {
    snapshots.clear();
    for (const listener of listeners) {
        listener();
    }
}

export function registerRibbonTabs(setKey: string, tabs: RibbonTab[]): void {
    baseSets.set(setKey, tabs);
    notify();
}

export function extendRibbonTabs(setKey: string, items: RibbonTabContribution[]): void {
    contributions.set(setKey, [...(contributions.get(setKey) ?? []), ...items]);
    notify();
}

export function getRibbonTabs(setKey: string): RibbonTab[] {
    const cached = snapshots.get(setKey);
    if (cached) {
        return cached;
    }

    const base = baseSets.get(setKey);
    const extra = contributions.get(setKey) ?? [];

    if (!base) {
        return EMPTY;
    }

    // Deep-ish clone of the tab/group arrays (controls are shared by
    // reference — they're behavioral objects, not mutated).
    const merged: RibbonTab[] = base.map((tab) => ({
        ...tab,
        groups: tab.groups.map((group) => ({ ...group, controls: [...group.controls] })),
    }));

    for (const item of extra) {
        const tab = merged.find((t) => t.id === item.tabId);

        if ('groupId' in item && item.groupId !== undefined) {
            const group = tab?.groups.find((g) => g.id === item.groupId);

            if (group === undefined) {
                console.warn(
                    `[ribbon] contribution targeting unknown tab/group "${item.tabId}/${item.groupId}" — controls dropped`,
                );
            }

            group?.controls.push(...item.controls);
            continue;
        }

        if (tab) {
            tab.groups.push(...item.groups);
        } else {
            merged.push({ id: item.tabId, labelKey: item.labelKey ?? item.tabId, groups: [...item.groups] });
        }
    }

    snapshots.set(setKey, merged);

    return merged;
}

export function subscribeRibbon(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Test-only: wipe all registry state between cases. */
export function resetRibbonRegistryForTests(): void {
    baseSets.clear();
    contributions.clear();
    snapshots.clear();
    listeners.clear();
}
