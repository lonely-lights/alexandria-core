/**
 * Token category registry — the source-of-truth for which tokens the
 * editor can edit, how each leaf is labeled, what control it uses, and
 * what dot-notation path it lives at in the override JSON.
 *
 * Stage 8b M1.C.1 — wires only Brand + Status categories (color-anchor
 * leaves). Other categories appear as collapsed placeholder rows that
 * M1.C.2 + M1.C.3 fill in. The registry shape is extensible: each
 * category gets a label + icon + description + array of leaves, and
 * the editor renders them generically.
 */

import type { ReactNode } from 'react';

import type {
    CascadeScope,
    ResolvedThemeView,
} from '@alexandria/lib/themePreview';

// ----------------------------------------------------------------------------
// Leaf editor contract
// ----------------------------------------------------------------------------

/**
 * What an editor needs in order to render its input for a given leaf.
 * Returned by `LeafTypeConfig.renderEditor`. Pure-data: no React refs
 * or other live wiring — those are owned by the editor component the
 * function returns.
 */
export interface LeafEditorContext {
    /** Resolved (post-cascade) value for this leaf, ready for display. */
    value: string;
    /** True if the user has overridden this leaf at the editor's scope. */
    overridden: boolean;
    /** Called when the editor commits a new value to the override. */
    onCommit: (next: string) => void;
}

/**
 * Bridge from the leaf's logical type (`color-anchor`, `radius-size`,
 * `motion-style`, ...) to the React control that edits it. Lets a
 * single registry stay free of UI imports — the editor component
 * supplies the renderers at use site.
 */
export type LeafRenderer = (ctx: LeafEditorContext) => ReactNode;

export type LeafType =
    | 'color-anchor'  // M1.C.1 — hex / oklch picker + text input
    | 'text'          // M1.C.2 — any CSS-string value (radius lengths, easing functions, ShapeChoice)
    | 'number'        // M1.C.2 — numeric with optional unit (ms, count)
    | 'enum';         // M1.C.2 — select dropdown from fixed options

// ----------------------------------------------------------------------------
// Leaf + category shape
// ----------------------------------------------------------------------------

export interface EnumOption {
    value: string;
    /** Translation key for the display label of this option. */
    labelKey: string;
}

export interface TokenLeaf {
    /**
     * Dot-notation path into the override JSON, also matches the
     * resolver's provenance-map key. e.g. `brand.primary`, `status.error`.
     */
    path: string;
    /** Translation key for the human-readable label. */
    labelKey: string;
    /** Optional translation key for the helper text under the label. */
    descriptionKey?: string;
    /** Type discriminator — picks which editor renders. */
    type: LeafType;
    /** Required when `type === 'enum'` — the list of valid options. */
    enumOptions?: EnumOption[];
    /** Optional unit suffix shown next to a `number` input (ms, rem, …). */
    numberUnit?: string;
    /** Inclusive minimum for `number` inputs — clamped on commit. */
    numberMin?: number;
    /** Inclusive maximum for `number` inputs — clamped on commit. */
    numberMax?: number;
    /** Optional placeholder for `text` inputs. */
    textPlaceholder?: string;
}

export interface TokenCategory {
    /** Stable slug used as the React key. */
    id: string;
    /** Translation key for the category title. */
    labelKey: string;
    /** Optional translation key for the helper text. */
    descriptionKey?: string;
    /** Font Awesome glyph for the header. */
    icon: string;
    /** Leaves the editor renders inside this category, in display order. */
    leaves: TokenLeaf[];
    /**
     * True when M1.C.1 doesn't fully wire this category yet — editor
     * renders a "coming in M1.C.2" placeholder for now.
     */
    placeholder?: boolean;
}

// ----------------------------------------------------------------------------
// Helpers for reading resolved values via dot-paths
// ----------------------------------------------------------------------------

/**
 * Walks the resolved theme's `tokens` tree by dot-path. Returns the
 * leaf's value as a string (color anchors + radius sizes + easing
 * strings are all naturally string-typed; numbers come back stringified
 * for uniform editor input).
 */
export function readResolvedLeaf(
    resolved: ResolvedThemeView,
    path: string,
): string {
    const segments = path.split('.');
    let cursor: unknown = resolved.tokens;

    for (const key of segments) {
        if (
            cursor === null ||
            typeof cursor !== 'object' ||
            !(key in (cursor as Record<string, unknown>))
        ) {
            return '';
        }
        cursor = (cursor as Record<string, unknown>)[key];
    }

    if (cursor === null || cursor === undefined) {
        return '';
    }

    return String(cursor);
}

/** Get the provenance scope for a leaf, defaulting to `'system'`. */
export function readProvenanceScope(
    resolved: ResolvedThemeView,
    path: string,
): CascadeScope {
    return resolved.provenance[path] ?? 'system';
}

// ----------------------------------------------------------------------------
// The registry
// ----------------------------------------------------------------------------

export const TOKEN_CATEGORIES: TokenCategory[] = [
    {
        id: 'brand',
        labelKey: 'theming.token_editor.category.brand.label',
        descriptionKey: 'theming.token_editor.category.brand.description',
        icon: 'fa-solid fa-droplet',
        leaves: [
            {
                path: 'brand.primary',
                labelKey: 'theming.token_editor.leaf.brand.primary.label',
                descriptionKey:
                    'theming.token_editor.leaf.brand.primary.description',
                type: 'color-anchor',
            },
            {
                path: 'brand.secondary',
                labelKey: 'theming.token_editor.leaf.brand.secondary.label',
                descriptionKey:
                    'theming.token_editor.leaf.brand.secondary.description',
                type: 'color-anchor',
            },
            {
                path: 'brand.accent',
                labelKey: 'theming.token_editor.leaf.brand.accent.label',
                descriptionKey:
                    'theming.token_editor.leaf.brand.accent.description',
                type: 'color-anchor',
            },
        ],
    },
    {
        id: 'status',
        labelKey: 'theming.token_editor.category.status.label',
        descriptionKey: 'theming.token_editor.category.status.description',
        icon: 'fa-solid fa-circle-info',
        leaves: [
            {
                path: 'status.info',
                labelKey: 'theming.token_editor.leaf.status.info.label',
                type: 'color-anchor',
            },
            {
                path: 'status.success',
                labelKey: 'theming.token_editor.leaf.status.success.label',
                type: 'color-anchor',
            },
            {
                path: 'status.warning',
                labelKey: 'theming.token_editor.leaf.status.warning.label',
                type: 'color-anchor',
            },
            {
                path: 'status.error',
                labelKey: 'theming.token_editor.leaf.status.error.label',
                type: 'color-anchor',
            },
        ],
    },
    // ── Radius — Stage 8b M1.C.2 ───────────────────────────────────
    {
        id: 'radius',
        labelKey: 'theming.token_editor.category.radius.label',
        descriptionKey: 'theming.token_editor.category.radius.description',
        icon: 'fa-solid fa-square-rounded',
        leaves: [
            {
                path: 'radius.style',
                labelKey: 'theming.token_editor.leaf.radius.style.label',
                type: 'enum',
                enumOptions: [
                    { value: 'none', labelKey: 'theming.token_editor.leaf.radius.style.option.none' },
                    { value: 'sharp', labelKey: 'theming.token_editor.leaf.radius.style.option.sharp' },
                    { value: 'soft', labelKey: 'theming.token_editor.leaf.radius.style.option.soft' },
                    { value: 'rounded', labelKey: 'theming.token_editor.leaf.radius.style.option.rounded' },
                    { value: 'ornamental', labelKey: 'theming.token_editor.leaf.radius.style.option.ornamental' },
                ],
            },
            {
                path: 'radius.button',
                labelKey: 'theming.token_editor.leaf.radius.button.label',
                type: 'text',
                textPlaceholder: '0.5rem',
            },
            {
                path: 'radius.input',
                labelKey: 'theming.token_editor.leaf.radius.input.label',
                type: 'text',
                textPlaceholder: '0.625rem',
            },
            {
                path: 'radius.card',
                labelKey: 'theming.token_editor.leaf.radius.card.label',
                type: 'text',
                textPlaceholder: '1rem',
            },
            {
                path: 'radius.modal',
                labelKey: 'theming.token_editor.leaf.radius.modal.label',
                type: 'text',
                textPlaceholder: '1rem',
            },
            {
                path: 'radius.badge',
                labelKey: 'theming.token_editor.leaf.radius.badge.label',
                type: 'text',
                textPlaceholder: '9999px',
            },
            {
                path: 'radius.avatar',
                labelKey: 'theming.token_editor.leaf.radius.avatar.label',
                type: 'enum',
                enumOptions: [
                    { value: 'square', labelKey: 'theming.token_editor.shape.square' },
                    { value: 'rounded', labelKey: 'theming.token_editor.shape.rounded' },
                    { value: 'circle', labelKey: 'theming.token_editor.shape.circle' },
                ],
            },
            {
                path: 'radius.checkbox',
                labelKey: 'theming.token_editor.leaf.radius.checkbox.label',
                type: 'enum',
                enumOptions: [
                    { value: 'square', labelKey: 'theming.token_editor.shape.square' },
                    { value: 'rounded', labelKey: 'theming.token_editor.shape.rounded' },
                    { value: 'circle', labelKey: 'theming.token_editor.shape.circle' },
                ],
            },
        ],
    },

    // ── Motion — Stage 8b M1.C.2 ───────────────────────────────────
    {
        id: 'motion',
        labelKey: 'theming.token_editor.category.motion.label',
        descriptionKey: 'theming.token_editor.category.motion.description',
        icon: 'fa-solid fa-wave-square',
        leaves: [
            {
                path: 'motion.style',
                labelKey: 'theming.token_editor.leaf.motion.style.label',
                type: 'enum',
                enumOptions: [
                    { value: 'subtle', labelKey: 'theming.token_editor.leaf.motion.style.option.subtle' },
                    { value: 'standard', labelKey: 'theming.token_editor.leaf.motion.style.option.standard' },
                    { value: 'expressive', labelKey: 'theming.token_editor.leaf.motion.style.option.expressive' },
                ],
            },
            {
                path: 'motion.intensity',
                labelKey: 'theming.token_editor.leaf.motion.intensity.label',
                descriptionKey: 'theming.token_editor.leaf.motion.intensity.description',
                type: 'number',
                numberMin: 0,
                numberMax: 10,
            },
            {
                path: 'motion.durations.fast',
                labelKey: 'theming.token_editor.leaf.motion.durations.fast.label',
                type: 'number',
                numberUnit: 'ms',
                numberMin: 0,
            },
            {
                path: 'motion.durations.interactive',
                labelKey: 'theming.token_editor.leaf.motion.durations.interactive.label',
                type: 'number',
                numberUnit: 'ms',
                numberMin: 0,
            },
            {
                path: 'motion.durations.normal',
                labelKey: 'theming.token_editor.leaf.motion.durations.normal.label',
                type: 'number',
                numberUnit: 'ms',
                numberMin: 0,
            },
            {
                path: 'motion.durations.slow',
                labelKey: 'theming.token_editor.leaf.motion.durations.slow.label',
                type: 'number',
                numberUnit: 'ms',
                numberMin: 0,
            },
            {
                path: 'motion.easing.standard',
                labelKey: 'theming.token_editor.leaf.motion.easing.standard.label',
                type: 'text',
                textPlaceholder: 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
            {
                path: 'motion.easing.accelerate',
                labelKey: 'theming.token_editor.leaf.motion.easing.accelerate.label',
                type: 'text',
                textPlaceholder: 'cubic-bezier(0.4, 0, 1, 1)',
            },
            {
                path: 'motion.easing.decelerate',
                labelKey: 'theming.token_editor.leaf.motion.easing.decelerate.label',
                type: 'text',
                textPlaceholder: 'cubic-bezier(0, 0, 0.2, 1)',
            },
        ],
    },

    // ── Border — Stage 8b M1.C.2 ───────────────────────────────────
    {
        id: 'border',
        labelKey: 'theming.token_editor.category.border.label',
        descriptionKey: 'theming.token_editor.category.border.description',
        icon: 'fa-solid fa-border-all',
        leaves: [
            {
                path: 'border.width',
                labelKey: 'theming.token_editor.leaf.border.width.label',
                type: 'number',
                numberUnit: 'px',
                numberMin: 1,
                numberMax: 3,
            },
            {
                path: 'border.style',
                labelKey: 'theming.token_editor.leaf.border.style.label',
                type: 'enum',
                enumOptions: [
                    { value: 'solid', labelKey: 'theming.token_editor.leaf.border.style.option.solid' },
                    { value: 'dashed', labelKey: 'theming.token_editor.leaf.border.style.option.dashed' },
                    { value: 'dotted', labelKey: 'theming.token_editor.leaf.border.style.option.dotted' },
                    { value: 'double', labelKey: 'theming.token_editor.leaf.border.style.option.double' },
                ],
            },
            {
                path: 'border.treatment',
                labelKey: 'theming.token_editor.leaf.border.treatment.label',
                descriptionKey: 'theming.token_editor.leaf.border.treatment.description',
                type: 'enum',
                enumOptions: [
                    { value: 'none', labelKey: 'theming.token_editor.leaf.border.treatment.option.none' },
                    { value: 'glow', labelKey: 'theming.token_editor.leaf.border.treatment.option.glow' },
                    { value: 'inset', labelKey: 'theming.token_editor.leaf.border.treatment.option.inset' },
                    { value: 'shadow', labelKey: 'theming.token_editor.leaf.border.treatment.option.shadow' },
                    { value: 'ornamental', labelKey: 'theming.token_editor.leaf.border.treatment.option.ornamental' },
                ],
            },
        ],
    },

    // ── Shadow — Stage 8b M1.C.2 ───────────────────────────────────
    {
        id: 'shadow',
        labelKey: 'theming.token_editor.category.shadow.label',
        descriptionKey: 'theming.token_editor.category.shadow.description',
        icon: 'fa-solid fa-clone',
        leaves: [
            {
                path: 'shadow.style',
                labelKey: 'theming.token_editor.leaf.shadow.style.label',
                type: 'enum',
                enumOptions: [
                    { value: 'none', labelKey: 'theming.token_editor.leaf.shadow.style.option.none' },
                    { value: 'flat', labelKey: 'theming.token_editor.leaf.shadow.style.option.flat' },
                    { value: 'soft', labelKey: 'theming.token_editor.leaf.shadow.style.option.soft' },
                    { value: 'lifted', labelKey: 'theming.token_editor.leaf.shadow.style.option.lifted' },
                    { value: 'dramatic', labelKey: 'theming.token_editor.leaf.shadow.style.option.dramatic' },
                    { value: 'neon', labelKey: 'theming.token_editor.leaf.shadow.style.option.neon' },
                ],
            },
            {
                path: 'shadow.intensity',
                labelKey: 'theming.token_editor.leaf.shadow.intensity.label',
                descriptionKey: 'theming.token_editor.leaf.shadow.intensity.description',
                type: 'number',
                numberMin: 0,
                numberMax: 10,
            },
            // shadow.tint is nullable ColorAnchor — deferred to M1.C.3
        ],
    },

    // ── Surface — Stage 8b M1.C.2 (base only; elevation deferred to M1.C.3)
    {
        id: 'surface',
        labelKey: 'theming.token_editor.category.surface.label',
        descriptionKey: 'theming.token_editor.category.surface.description',
        icon: 'fa-solid fa-layer-group',
        leaves: [
            {
                path: 'surface.base',
                labelKey: 'theming.token_editor.leaf.surface.base.label',
                descriptionKey: 'theming.token_editor.leaf.surface.base.description',
                type: 'color-anchor',
            },
            {
                path: 'surface.sunkenDelta',
                labelKey: 'theming.token_editor.leaf.surface.sunken_delta.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
            {
                path: 'surface.raisedDelta',
                labelKey: 'theming.token_editor.leaf.surface.raised_delta.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
        ],
    },

    // ── Neutral — Stage 8b M1.C.2 ──────────────────────────────────
    {
        id: 'neutral',
        labelKey: 'theming.token_editor.category.neutral.label',
        descriptionKey: 'theming.token_editor.category.neutral.description',
        icon: 'fa-solid fa-circle-half-stroke',
        leaves: [
            {
                path: 'neutral',
                labelKey: 'theming.token_editor.leaf.neutral.label',
                type: 'color-anchor',
            },
        ],
    },

    // ── Semantic — Stage 8b M1.C.2 ─────────────────────────────────
    {
        id: 'semantic',
        labelKey: 'theming.token_editor.category.semantic.label',
        descriptionKey: 'theming.token_editor.category.semantic.description',
        icon: 'fa-solid fa-link',
        leaves: [
            {
                path: 'semantic.link',
                labelKey: 'theming.token_editor.leaf.semantic.link.label',
                type: 'color-anchor',
            },
            {
                path: 'semantic.linkHover',
                labelKey: 'theming.token_editor.leaf.semantic.link_hover.label',
                type: 'color-anchor',
            },
            {
                path: 'semantic.linkVisited',
                labelKey: 'theming.token_editor.leaf.semantic.link_visited.label',
                type: 'color-anchor',
            },
            {
                path: 'semantic.focusRing',
                labelKey: 'theming.token_editor.leaf.semantic.focus_ring.label',
                type: 'color-anchor',
            },
            {
                path: 'semantic.selection',
                labelKey: 'theming.token_editor.leaf.semantic.selection.label',
                type: 'color-anchor',
            },
            {
                path: 'semantic.overlay',
                labelKey: 'theming.token_editor.leaf.semantic.overlay.label',
                type: 'color-anchor',
            },
            {
                path: 'semantic.scrim',
                labelKey: 'theming.token_editor.leaf.semantic.scrim.label',
                type: 'color-anchor',
            },
        ],
    },
    // M1.C.3 placeholders
    {
        id: 'typography',
        labelKey: 'theming.token_editor.category.typography.label',
        icon: 'fa-solid fa-font',
        leaves: [],
        placeholder: true,
    },
    {
        id: 'effects',
        labelKey: 'theming.token_editor.category.effects.label',
        icon: 'fa-solid fa-wand-magic-sparkles',
        leaves: [],
        placeholder: true,
    },
    {
        id: 'layout',
        labelKey: 'theming.token_editor.category.layout.label',
        icon: 'fa-solid fa-grip',
        leaves: [],
        placeholder: true,
    },
];
