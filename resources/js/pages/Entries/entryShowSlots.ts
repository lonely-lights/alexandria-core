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
     * App-side actions contributed to the entry header's action cluster.
     * Kept in place for future header-level consumers (nothing core ships
     * currently registers here — "Entry settings" moved into the 3-dot menu
     * below, and "Train this look" moved to `menuActions`) — but the row
     * still renders ahead of core's own Edit entry button so a future
     * consumer's action doesn't disturb Edit entry's established rightmost
     * position.
     *
     * The two image-manager slots above are Media-tab only, so a consumer had
     * no way to put a page-level action in the header at all. This slot
     * renders inside the existing `PageHeader actions` row on every tab; the
     * component decides for itself whether it applies to the entry it is
     * handed (return `null` to render nothing).
     */
    headerActions?: ComponentType<EntryShowSlotContext>;
    /**
     * App-side actions contributed to the entry page's existing 3-dot
     * ("More actions") dropdown menu. Rendered as a single group directly
     * after core's own "Entry settings" item and before the divider that
     * opens the tab-navigation section, so app items land beside the
     * settings action they're most related to rather than getting buried
     * near the danger zone at the bottom.
     *
     * The component is responsible for rendering its own row markup matching
     * the dropdown's existing item styling (see `DropdownMenu`'s default
     * item classes/tokens) — it is not converted into a `DropdownMenuItem`
     * data object, so it stays free to use its own routing (e.g. an Inertia
     * `<Link>`) instead of the `href`/`onClick` shape. As with the other
     * slots, the component decides for itself whether it applies to the
     * entry it is handed (return `null` to render nothing).
     */
    menuActions?: ComponentType<EntryShowSlotContext>;
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
