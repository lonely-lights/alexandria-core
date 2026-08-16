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

/**
 * One whole tab contributed to the Entry show page by a consumer app.
 *
 * Position doctrine: registered tabs render in the entry page's tab bar
 * AFTER core's own pinned tabs (Overview, Structure, Timeline,
 * Connections) and BEFORE the 3-dot "More options" dropdown, so an app
 * tab never displaces the established order of core's own chrome — the
 * same fixed, documented seat the `menuActions` slot takes inside the
 * dropdown.
 *
 * Self-gating doctrine: a tab that does not apply to the entry on screen
 * must not appear at all, and gating is the consumer's job in both
 * layers. `isAvailable` hides the BUTTON — core cannot know whether an
 * app tab applies to a given blueprint, and unlike a `menuActions` row
 * the button is core's markup, so returning null from the component
 * cannot remove it. The component itself then returns `null` for
 * anything it will not render, exactly like the `headerActions` /
 * `menuActions` components do.
 *
 * Hash routing: `key` doubles as the URL hash the entry page writes
 * while the tab is active (`#image-training`), joining the existing tab
 * convention. It must not collide with a core tab key (`overview`,
 * `structure`, `attributes`, `relationships`, `connections`, `mentions`,
 * `mentioned_in`, `media`, `history`, `timeline`) — a collision loses,
 * because the content switch renders core's own tabs first.
 */
export interface EntryTab {
    /** Stable identity: React key, hash fragment, and active-tab value. */
    key: string;
    /**
     * Translation key, resolved by core with the host app's `useT()`.
     * Registration happens at boot, outside React, so the label travels
     * as a key rather than as resolved text — same contract as
     * `BlueprintSettingsSection.labelKey`.
     */
    label: string;
    /** Font Awesome class string, e.g. `fa-solid fa-person-rays`. */
    icon: string;
    /**
     * Return false to hide the tab button for this entry. Omitted means
     * always shown.
     */
    isAvailable?: (context: EntryShowSlotContext) => boolean;
    /**
     * The tab body, rendered inside the page's existing content
     * container. Receives the same context every other slot gets.
     */
    component: ComponentType<EntryShowSlotContext>;
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
    /**
     * Whole tabs contributed to the Entry show page's tab bar and content
     * switch. Rendered only when registered; see the `EntryTab` doc block
     * above for the position, self-gating, and hash-routing doctrine.
     *
     * The fifth member of the registry family (pageImageManager,
     * editPageImageManager, headerActions, menuActions, extraTabs) and
     * the first that contributes page-level NAVIGATION rather than an
     * action or a card — an app feature big enough to be its own view of
     * the entry had nowhere to land before this.
     */
    extraTabs?: EntryTab[];
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
