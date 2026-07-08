/**
 * Ribbon data model — the declarative core of the app-level ribbon
 * (spec: docs/superpowers/specs/2026-06-12-ribbon-transitions-design.md §1).
 *
 * Controls are DATA: rendering, shortcut binding, the future QAT, and
 * ribbon customization all read these definitions. The context type is
 * host-defined — the framework treats it as opaque and just threads it
 * into the predicate/action callbacks.
 */

export type RibbonControlType = 'button' | 'toggle' | 'select' | 'menu';

/**
 * Permission/entitlement requirements for a ribbon control.
 * Evaluated at render time against the `gates` prop supplied to Ribbon.
 */
export interface RibbonRequires {
    /** A key in `RibbonGates.can` that must be truthy for the control to be visible. */
    permission?: string;
    /** A key that must be present in `RibbonGates.entitlements` (string[]) for
     *  the control to be fully enabled; failing renders it locked (disabled + lock icon). */
    entitlement?: string;
}

/**
 * Runtime gate state threaded into Ribbon from the host mount.
 * `can` maps permission keys to booleans; `entitlements` is a string[]
 * of active entitlement keys (truthy values from `auth.entitlements`).
 */
export interface RibbonGates {
    can: Record<string, boolean>;
    entitlements: string[];
}

export interface RibbonControl<Ctx = unknown> {
    /** Globally unique within a set — QAT pins and customization reference this. */
    id: string;
    type: RibbonControlType;
    /** FontAwesome classes. */
    icon: string;
    /** useT key (flat). */
    labelKey: string;
    /** TipTap-style notation, e.g. 'Mod-Shift-R'. Binder + tooltip read it. */
    shortcut?: string;
    /** Display-only shortcut hint for commands bound by the editor, not the ribbon. */
    menuShortcut?: string;
    /** Optional permission/entitlement gate — see ribbonGates.ts for resolution rules. */
    requires?: RibbonRequires;
    visible?: (ctx: Ctx) => boolean;
    disabled?: (ctx: Ctx) => boolean;
    /** Pressed state for toggles (and buttons that track state). */
    active?: (ctx: Ctx) => boolean;
    /** Options for select/menu controls. */
    options?: (ctx: Ctx) => Array<{ value: string; labelKey: string }>;
    /** Current value for select controls. */
    value?: (ctx: Ctx) => string;
    onAction: (ctx: Ctx, value?: string) => void;
}

export interface RibbonGroup<Ctx = unknown> {
    id: string;
    labelKey: string;
    controls: RibbonControl<Ctx>[];
}

export interface RibbonTab<Ctx = unknown> {
    id: string;
    labelKey: string;
    groups: RibbonGroup<Ctx>[];
}

/**
 * A contribution from a package or the host app, merged at read time:
 * - {tabId, groups}: append groups to an existing tab (or, with
 *   labelKey, create the tab if the id is unknown);
 * - {tabId, groupId, controls}: append controls to an existing group.
 */
export type RibbonTabContribution<Ctx = unknown> =
    | { tabId: string; labelKey?: string; groups: RibbonGroup<Ctx>[]; groupId?: never; controls?: never }
    | { tabId: string; groupId: string; controls: RibbonControl<Ctx>[]; labelKey?: never; groups?: never };

/**
 * `expanded` shows the icon band (tooltips carry control names — no
 * inline text labels); `collapsed` shows the tab strip alone and
 * overlays the band on tab click (Word behavior).
 */
export type RibbonMode = 'expanded' | 'collapsed';
