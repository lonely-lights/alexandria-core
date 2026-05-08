import type { ReactNode } from 'react';

/**
 * One row in the user dropdown menu (Navbar) and in the BottomNav "More"
 * sheet. The consumer fills the URLs/labels — core ships no opinions about
 * /settings, /profile, /support, /logout, etc.
 *
 * Use { divider: true } as a sentinel item to render a horizontal rule.
 */
export interface UserMenuItemRow {
    /** Visible label */
    label: string;
    /** href — passed straight to <a>. Use the `onClick` handler if you need
     *  router-based navigation (e.g. logout via POST). */
    href: string;
    /** Optional icon. Either a FontAwesome class string (e.g. "fa-solid fa-gear")
     *  or a ReactNode (e.g. an inline <svg>). */
    icon?: string | ReactNode;
    /** Right-aligned shortcut hint, e.g. "⇧⌘P". */
    shortcut?: string;
    /** Marks the row as destructive — paints red on hover. */
    danger?: boolean;
    /** Renders the row as disabled (e.g. coming-soon items). */
    disabled?: boolean;
    /** Optional click handler. If provided, called BEFORE the browser
     *  follows `href`. Call `event.preventDefault()` to suppress navigation
     *  (e.g. for logout-via-POST). */
    onClick?: (event: { preventDefault: () => void }) => void;
}

export interface UserMenuItemDivider {
    divider: true;
}

export type UserMenuItem = UserMenuItemRow | UserMenuItemDivider;

/**
 * A single tab in the mobile BottomNav. Five tabs render evenly spaced.
 * The global "create" affordance lives in a separate floating action
 * button — do not try to express it as a featured tab here.
 *
 * Use `href: '#'` + an `onClick` handler for tabs that open modals or
 * sheets instead of navigating.
 */
export interface BottomNavTab {
    /** Stable React key. */
    id: string;
    /** Visible label under the icon. */
    label: string;
    /** Icon content. FontAwesome class string OR ReactNode. */
    icon: string | ReactNode;
    /** Destination href. Pass `'#'` for action-only tabs (opens a modal /
     *  sheet via `onClick`). */
    href: string;
    /** Optional badge content (e.g. unread count). */
    badge?: number | string;
    /** Optional click handler — called before navigation. Call
     *  `event.preventDefault()` to suppress navigation. */
    onClick?: (event: { preventDefault: () => void }) => void;
}

/**
 * One actionable command shown by the CommandPalette. Either pass `action`
 * (a callback) for an arbitrary command, or `href` for a link-style command.
 */
export interface PaletteCommand {
    /** Stable React key. */
    id: string;
    /** Primary visible label. */
    label: string;
    /** Optional secondary detail line. */
    description?: string;
    /** Optional grouping label — commands sharing a `section` are rendered
     *  under a sticky section header in the order they appear in the array. */
    section?: string;
    /** Icon. FontAwesome class string OR ReactNode. */
    icon?: string | ReactNode;
    /** Optional keywords used during fuzzy search (in addition to `label`
     *  and `description`). */
    keywords?: string[];
    /** Action invoked on Enter / click. Either set `action` or `href`. */
    action?: () => void;
    /** href used when the consumer prefers link semantics. */
    href?: string;
}

/**
 * Result group returned by the CommandPalette's `onSearch` handler. Mirrors
 * the legacy SearchResults shape so blueprint-driven results render with a
 * sticky group header per blueprint.
 */
export interface PaletteSearchGroup {
    /** Sticky group label rendered above the entries. */
    label: string;
    /** Optional icon for the group label. FontAwesome class OR ReactNode. */
    icon?: string | ReactNode;
    entries: PaletteSearchEntry[];
}

export interface PaletteSearchEntry {
    /** Stable React key. */
    id: string | number;
    /** Primary visible label. */
    label: string;
    /** Optional secondary detail line (often a stripped-markup summary). */
    description?: string;
    /** Destination URL when the entry is selected (Enter / click). */
    href: string;
}

export interface PaletteSearchResults {
    query: string;
    total: number;
    groups: PaletteSearchGroup[];
}
