import type { ComponentType } from "react";

import type { EntryShowProps } from "@alexandria/types/entries";

export interface EntryShowSlotContext {
    project: EntryShowProps["project"];
    blueprint: EntryShowProps["blueprint"];
    entry: EntryShowProps["entry"];
    pageProps: EntryShowProps;
}

export interface EntryShowSlotRegistry {
    /** Replaces the default non-compact page-image card on the Media tab. */
    pageImageManager?: ComponentType<EntryShowSlotContext>;
}

let registeredSlots: EntryShowSlotRegistry = {};

/**
 * Register consumer-owned Entry page sections at application boot. Repeated
 * calls merge by slot name so packages can contribute independently; the most
 * recent registration for a specific slot wins.
 */
export function registerEntryShowSlots(slots: EntryShowSlotRegistry): void {
    registeredSlots = { ...registeredSlots, ...slots };
}

/** Return the stable slot registry used when an Entry page renders. */
export function getEntryShowSlots(): EntryShowSlotRegistry {
    return registeredSlots;
}

/** Test-only: clear consumer registrations between cases. */
export function resetEntryShowSlotsForTests(): void {
    registeredSlots = {};
}
