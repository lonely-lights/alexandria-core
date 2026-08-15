import type { ComponentType } from "react";

import type { EntryShowProps } from "@alexandria/types/entries";

export interface EntryShowSlotContext {
    project: EntryShowProps["project"];
    blueprint: EntryShowProps["blueprint"];
    entry: EntryShowProps["entry"];
    pageProps: EntryShowProps;
}

export interface EntryEditSlotContext {
    project: {
        id: number;
        name: string;
        slug: string;
    };
    blueprint: {
        id: number;
        name: string;
        slug: string;
        icon: string;
        classification: string;
    };
    entry: {
        id: number;
        name: string;
        slug: string;
        can: {
            update: boolean;
        };
    };
    pageProps: Record<string, unknown>;
}

export interface EntryShowSlotRegistry {
    /** Replaces the default non-compact page-image card on the Media tab. */
    pageImageManager?: ComponentType<EntryShowSlotContext>;
    /** Adds a richer page-image manager to the Entry edit form's Media card. */
    editPageImageManager?: ComponentType<EntryEditSlotContext>;
    /**
     * App-side actions contributed to the entry header's action cluster,
     * rendered ahead of core's own Entry settings / Edit entry buttons so the
     * primary edit action keeps its established rightmost position.
     *
     * The two image-manager slots above are Media-tab only, so a consumer had
     * no way to put a page-level action in the header at all. This slot
     * renders inside the existing `PageHeader actions` row on every tab; the
     * component decides for itself whether it applies to the entry it is
     * handed (return `null` to render nothing).
     */
    headerActions?: ComponentType<EntryShowSlotContext>;
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
