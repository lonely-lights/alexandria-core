import type { ComponentType } from "react";

import type { BlueprintDetail } from "@alexandria/types/blueprints";

/**
 * Consumer-app extension seam for the blueprint settings modal.
 *
 * Precedents this mirrors: `EntryShowSlotRegistry` (entryShowSlots.ts) for
 * the register/get/reset shape, and `SettingsSlotRegistry.extraNav /
 * extraSections` (Settings/settingsCache.ts) for "a consumer contributes a
 * nav item plus the pane it opens". Neither of those reaches the blueprint
 * modal, which until now had no way for an app to add a settings section at
 * all — every panel was a hard import inside BlueprintSettingsModal.
 *
 * A registered section renders in the right pane INSTEAD of a built-in
 * panel, and owns its whole pane: import `PanelHeader` from this same
 * folder so the title/description band matches the built-ins exactly, then
 * render the body. Sections are self-contained — they fetch their own data
 * rather than expecting core to widen the blueprint page payload.
 */
export interface BlueprintSettingsSlotContext {
    /** The blueprint the modal was opened for. */
    blueprint: BlueprintDetail;
    /** The project the blueprint belongs to. */
    project: { slug: string };
    /**
     * The host page's Inertia props, verbatim. Sections that need data the
     * consumer's own controller shared can read it here without core
     * knowing the shape; most sections fetch instead.
     */
    pageProps: Record<string, unknown>;
    /** Closes the whole modal — same handler the built-in panels get. */
    onClose: () => void;
}

/** Which built-in nav cluster a consumer section is appended to. */
export type BlueprintSettingsNavGroup = "general" | "data" | "display";

export interface BlueprintSettingsSection {
    /**
     * Menu key. Must not collide with a built-in panel key (columns, main,
     * settings, ai, theme, media, fields, relationships, infobox, display,
     * timeline, kanban, tree, graph) — a collision loses to the built-in,
     * because the modal checks its own panels first.
     */
    key: string;
    /** Font Awesome class string, e.g. `fa-solid fa-wand-magic-sparkles`. */
    icon: string;
    /** Translation key resolved with the host app's `useT()`. */
    labelKey: string;
    /** Nav cluster the item joins. Defaults to `data`. */
    navGroup?: BlueprintSettingsNavGroup;
    /**
     * Return false to hide the nav item for this blueprint (classification
     * gating, entitlement gating, …). Omitted means always shown.
     */
    isAvailable?: (blueprint: BlueprintDetail) => boolean;
    /** The pane itself. Renders its own PanelHeader. */
    component: ComponentType<BlueprintSettingsSlotContext>;
}

export interface BlueprintSettingsSlotRegistry {
    /**
     * Sections appended after the built-in items of their nav group, in
     * registration order.
     */
    extraSections?: BlueprintSettingsSection[];
}

let registeredSlots: BlueprintSettingsSlotRegistry = {};

/**
 * Register consumer-owned blueprint settings sections at application boot.
 * Repeated calls merge by slot name so packages can contribute
 * independently; the most recent registration for a specific slot wins.
 */
export function registerBlueprintSettingsSlots(
    slots: BlueprintSettingsSlotRegistry,
): void {
    registeredSlots = { ...registeredSlots, ...slots };
}

/** Return the stable slot registry used when the settings modal renders. */
export function getBlueprintSettingsSlots(): BlueprintSettingsSlotRegistry {
    return registeredSlots;
}

/**
 * The sections that apply to one blueprint, filtered by `isAvailable` and
 * bucketed by nav group. Exported so the modal and its tests agree on the
 * defaulting rule (`navGroup` omitted means `data`).
 */
export function blueprintSettingsSectionsFor(
    blueprint: BlueprintDetail | undefined,
    group: BlueprintSettingsNavGroup,
): BlueprintSettingsSection[] {
    if (!blueprint) return [];

    return (registeredSlots.extraSections ?? []).filter(
        (section) =>
            (section.navGroup ?? "data") === group &&
            (section.isAvailable?.(blueprint) ?? true),
    );
}

/** Test-only: clear consumer registrations between cases. */
export function resetBlueprintSettingsSlotsForTests(): void {
    registeredSlots = {};
}
