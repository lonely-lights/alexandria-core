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

export type RibbonMode = 'comfortable' | 'slim' | 'collapsed';
