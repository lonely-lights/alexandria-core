import type { ComponentType } from 'react';

/**
 * How a user gains access to a view. `free` is always available;
 * `tier` requires a subscription level; `purchase` requires a
 * one-time SKU entitlement.
 */
export type ViewAccess =
    | { type: 'free' }
    | { type: 'tier'; minTier: 'starter' | 'pro' | 'enterprise' }
    | { type: 'purchase'; sku: string };

/**
 * Runtime data for a configured view on a specific blueprint.
 * Matches the backend `blueprints.views` JSON shape 1:1.
 */
export interface BlueprintViewEntry {
    type: string;
    enabled: boolean;
    config: Record<string, unknown>;
    sort_order: number;
}

/**
 * Props every view render component receives.
 * Individual views can extend this via their own prop types as needed.
 */
export interface ViewRenderProps {
    blueprint: { id: number; slug: string; classification: string };
    projectSlug: string;
    config: Record<string, unknown>;
}

/**
 * Props every view's settings panel receives.
 */
export interface ViewSettingsProps {
    blueprintId: number;
    value: BlueprintViewEntry;
    onChange: (next: BlueprintViewEntry) => void;
}

/**
 * Registry entry — one per view type. Adding a view to the app
 * means adding one of these to BLUEPRINT_VIEWS in registry.ts.
 */
export interface BlueprintViewDefinition {
    /** Unique key — used for URL hash + views JSON `type` field. */
    type: string;
    /** Display label in the toggle + settings panel. */
    label: string;
    /** Font Awesome class (with or without "fa-solid " prefix). */
    icon: string;
    /** How this view is gated. */
    access: ViewAccess;
    /** Optional blueprint classification filter. null/undef = any. */
    supportedClassifications?: string[];
    /** Optional — show "needs a date field" disabled state. */
    requiresFieldType?: string[];
    /** The rendered view surface. */
    render: ComponentType<ViewRenderProps>;
    /** The settings panel shown in BlueprintSettingsModal. */
    settingsPanel: ComponentType<ViewSettingsProps>;
    /** Seed config when the view is first enabled. */
    defaultConfig: () => Record<string, unknown>;
}
