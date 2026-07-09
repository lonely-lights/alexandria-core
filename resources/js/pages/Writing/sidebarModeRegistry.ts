/**
 * Sidebar mode registry — Stage 12a Task 2.
 *
 * Packages (e.g. alexandria-craft) register additional right-rail modes
 * at boot; PanelModeSwitcher renders them after the three built-in modes
 * (Linked items · Notes · Comments) and re-renders when new registrations
 * land. Entitlement gating is resolved per mode at render time via
 * resolveGate — the same rules that govern ribbon controls.
 *
 * Same module-state + register/get/subscribe mechanics as writingPanelRegistry.ts.
 */

import type { ComponentType } from 'react';

import type { RibbonRequires } from '@alexandria/ribbon/types';

import type { WritingEditorBridge } from './ribbon/writingRibbonContext';

/** Context threaded into every registered sidebar mode component. */
export interface SidebarModeContext {
    project: { id: number; name: string; slug: string };
    work: { id: number; title: string; slug: string };
    currentSection: { id: number; title: string; slug: string } | null;
    editorBridge: WritingEditorBridge | null;
    editorTick: number;
    canUpdate: boolean;
}

/** A sidebar mode contributed by a sibling package. */
export interface RegisteredSidebarMode {
    id: string;
    /** useT key for the switcher button tooltip/aria label. */
    labelKey: string;
    /** Font Awesome classes for the mode switcher icon. */
    icon: string;
    component: ComponentType<SidebarModeContext>;
    /** Optional permission/entitlement gate — same rules as ribbon controls. */
    requires?: RibbonRequires;
}

let registered: RegisteredSidebarMode[] = [];
const listeners = new Set<() => void>();

function notify(): void {
    for (const listener of listeners) {
        listener();
    }
}

/**
 * Register sidebar modes. Accumulates across calls — multiple packages can
 * each register their own modes at boot. Idempotent by id: a mode whose id
 * is already registered is silently skipped (first registration wins).
 */
export function registerSidebarModes(modes: RegisteredSidebarMode[]): void {
    const existingIds = new Set(registered.map((m) => m.id));
    const novel = modes.filter((m) => !existingIds.has(m.id));

    if (novel.length === 0) {
        return;
    }

    registered = [...registered, ...novel];
    notify();
}

/**
 * Snapshot of the registered modes. The array reference is stable
 * between registrations, so this is safe for useSyncExternalStore.
 */
export function getSidebarModes(): RegisteredSidebarMode[] {
    return registered;
}

export function subscribeSidebarModes(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Test-only: wipe all registry state between cases. */
export function resetSidebarModeRegistryForTests(): void {
    registered = [];
    listeners.clear();
}
