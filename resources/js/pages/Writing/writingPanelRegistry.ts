/**
 * Writing reference-panel tab registry — Stage 8g.1 (Plan 3 Task 4).
 *
 * The workspace's right-rail ReferencePanel ships three built-in tabs
 * (Browse / Pins / Section). Sibling packages — the 8g.2 craft suite
 * is the first customer — register extra tabs here at boot; the panel
 * renders them after the built-ins and re-renders when registrations
 * land. Same module-state + register/get/subscribe mechanics as the
 * SettingsSlotRegistry in pages/Settings/settingsCache.ts.
 */

import type { ComponentType } from 'react';

export interface WritingPanelContext {
    project: { id: number; name: string; slug: string };
    work: { id: number; title: string; slug: string };
    currentSection: { id: number; title: string; slug: string } | null;
}

export interface WritingPanelTab {
    id: string;
    /** useT key for the tab tooltip/aria label. */
    labelKey: string;
    /** Font Awesome classes for the tab strip icon. */
    icon: string;
    component: ComponentType<WritingPanelContext>;
}

let registered: WritingPanelTab[] = [];
const listeners = new Set<() => void>();

function notify(): void {
    for (const listener of listeners) {
        listener();
    }
}

/**
 * Append tabs to the registry. Accumulates across calls — multiple
 * packages can each register their own tabs at boot.
 */
export function registerWritingPanels(tabs: WritingPanelTab[]): void {
    registered = [...registered, ...tabs];
    notify();
}

/**
 * Snapshot of the registered tabs. The array reference is stable
 * between registrations, so this is safe for useSyncExternalStore.
 */
export function getWritingPanels(): WritingPanelTab[] {
    return registered;
}

export function subscribeWritingPanels(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
