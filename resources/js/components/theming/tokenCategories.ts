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
    | 'color-anchor'           // M1.C.1 — hex / oklch picker + text input
    | 'nullable-color-anchor'  // M1.C.3 — toggle + color anchor (Shadow.tint pattern)
    | 'text'                   // M1.C.2 — any CSS-string value
    | 'number'                 // M1.C.2 — numeric with optional unit
    | 'enum'                   // M1.C.2 — select dropdown
    | 'font-stack'             // M1.C.3 — Typography heading/body/mono picker
    | 'color-anchor-map';      // M4.5 — dynamic-keys Record<string, ColorAnchor>

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
 * leaf's value as a string ready for editor consumption: scalars get
 * `String()`-cast, objects/arrays get JSON-stringified (FontStack
 * leaves use this; FontStackEditor JSON-parses on the receiving end).
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

    if (typeof cursor === 'object') {
        return JSON.stringify(cursor);
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
            {
                path: 'brand.extras',
                labelKey: 'theming.token_editor.leaf.brand.extras.label',
                descriptionKey:
                    'theming.token_editor.leaf.brand.extras.description',
                type: 'color-anchor-map',
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
            {
                path: 'shadow.tint',
                labelKey: 'theming.token_editor.leaf.shadow.tint.label',
                descriptionKey: 'theming.token_editor.leaf.shadow.tint.description',
                type: 'nullable-color-anchor',
            },
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
            // Surface elevation — per-element deltas (Stage 8b M1.C.3).
            {
                path: 'surface.elevation.card',
                labelKey: 'theming.token_editor.leaf.surface.elevation.card.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
            {
                path: 'surface.elevation.cardRaised',
                labelKey: 'theming.token_editor.leaf.surface.elevation.card_raised.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
            {
                path: 'surface.elevation.modal',
                labelKey: 'theming.token_editor.leaf.surface.elevation.modal.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
            {
                path: 'surface.elevation.popover',
                labelKey: 'theming.token_editor.leaf.surface.elevation.popover.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
            {
                path: 'surface.elevation.tooltip',
                labelKey: 'theming.token_editor.leaf.surface.elevation.tooltip.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
            {
                path: 'surface.elevation.sidebar',
                labelKey: 'theming.token_editor.leaf.surface.elevation.sidebar.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
            {
                path: 'surface.elevation.header',
                labelKey: 'theming.token_editor.leaf.surface.elevation.header.label',
                type: 'number',
                numberMin: -10,
                numberMax: 10,
            },
            {
                path: 'surface.elevation.footer',
                labelKey: 'theming.token_editor.leaf.surface.elevation.footer.label',
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
    // ── Typography — Stage 8b M1.C.3 ───────────────────────────────
    {
        id: 'typography',
        labelKey: 'theming.token_editor.category.typography.label',
        descriptionKey: 'theming.token_editor.category.typography.description',
        icon: 'fa-solid fa-font',
        leaves: [
            {
                path: 'typography.heading',
                labelKey: 'theming.token_editor.leaf.typography.heading.label',
                type: 'font-stack',
            },
            {
                path: 'typography.body',
                labelKey: 'theming.token_editor.leaf.typography.body.label',
                type: 'font-stack',
            },
            {
                path: 'typography.mono',
                labelKey: 'theming.token_editor.leaf.typography.mono.label',
                type: 'font-stack',
            },
            {
                path: 'typography.baseSize',
                labelKey: 'theming.token_editor.leaf.typography.base_size.label',
                descriptionKey: 'theming.token_editor.leaf.typography.base_size.description',
                type: 'number',
                numberUnit: 'px',
                numberMin: 12,
                numberMax: 24,
            },
            {
                path: 'typography.scale',
                labelKey: 'theming.token_editor.leaf.typography.scale.label',
                type: 'enum',
                enumOptions: [
                    { value: 'compact', labelKey: 'theming.token_editor.leaf.typography.scale.option.compact' },
                    { value: 'default', labelKey: 'theming.token_editor.leaf.typography.scale.option.default' },
                    { value: 'comfortable', labelKey: 'theming.token_editor.leaf.typography.scale.option.comfortable' },
                    { value: 'spacious', labelKey: 'theming.token_editor.leaf.typography.scale.option.spacious' },
                ],
            },
            {
                path: 'typography.headingScale',
                labelKey: 'theming.token_editor.leaf.typography.heading_scale.label',
                descriptionKey: 'theming.token_editor.leaf.typography.heading_scale.description',
                type: 'enum',
                enumOptions: [
                    { value: 'modular-1.125', labelKey: 'theming.token_editor.leaf.typography.heading_scale.option.minor_second' },
                    { value: 'modular-1.250', labelKey: 'theming.token_editor.leaf.typography.heading_scale.option.major_third' },
                    { value: 'modular-1.333', labelKey: 'theming.token_editor.leaf.typography.heading_scale.option.perfect_fourth' },
                    { value: 'modular-1.500', labelKey: 'theming.token_editor.leaf.typography.heading_scale.option.perfect_fifth' },
                ],
            },
            {
                path: 'typography.weight.regular',
                labelKey: 'theming.token_editor.leaf.typography.weight.regular.label',
                type: 'number',
                numberMin: 100,
                numberMax: 900,
            },
            {
                path: 'typography.weight.medium',
                labelKey: 'theming.token_editor.leaf.typography.weight.medium.label',
                type: 'number',
                numberMin: 100,
                numberMax: 900,
            },
            {
                path: 'typography.weight.semibold',
                labelKey: 'theming.token_editor.leaf.typography.weight.semibold.label',
                type: 'number',
                numberMin: 100,
                numberMax: 900,
            },
            {
                path: 'typography.weight.bold',
                labelKey: 'theming.token_editor.leaf.typography.weight.bold.label',
                type: 'number',
                numberMin: 100,
                numberMax: 900,
            },
            {
                path: 'typography.lineHeight.tight',
                labelKey: 'theming.token_editor.leaf.typography.line_height.tight.label',
                type: 'number',
                numberMin: 0.8,
                numberMax: 2.5,
            },
            {
                path: 'typography.lineHeight.normal',
                labelKey: 'theming.token_editor.leaf.typography.line_height.normal.label',
                type: 'number',
                numberMin: 0.8,
                numberMax: 2.5,
            },
            {
                path: 'typography.lineHeight.relaxed',
                labelKey: 'theming.token_editor.leaf.typography.line_height.relaxed.label',
                type: 'number',
                numberMin: 0.8,
                numberMax: 2.5,
            },
            {
                path: 'typography.letterSpacing.tight',
                labelKey: 'theming.token_editor.leaf.typography.letter_spacing.tight.label',
                type: 'text',
                textPlaceholder: '-0.025em',
            },
            {
                path: 'typography.letterSpacing.normal',
                labelKey: 'theming.token_editor.leaf.typography.letter_spacing.normal.label',
                type: 'text',
                textPlaceholder: '0',
            },
            {
                path: 'typography.letterSpacing.wide',
                labelKey: 'theming.token_editor.leaf.typography.letter_spacing.wide.label',
                type: 'text',
                textPlaceholder: '0.05em',
            },
        ],
    },

    // ── Effects — Stage 8b M1.C.3 ──────────────────────────────────
    {
        id: 'effects',
        labelKey: 'theming.token_editor.category.effects.label',
        descriptionKey: 'theming.token_editor.category.effects.description',
        icon: 'fa-solid fa-wand-magic-sparkles',
        leaves: [
            {
                path: 'effects.backgroundTexture',
                labelKey: 'theming.token_editor.leaf.effects.background_texture.label',
                type: 'enum',
                enumOptions: [
                    { value: 'none', labelKey: 'theming.token_editor.leaf.effects.background_texture.option.none' },
                    { value: 'paper', labelKey: 'theming.token_editor.leaf.effects.background_texture.option.paper' },
                    { value: 'noise', labelKey: 'theming.token_editor.leaf.effects.background_texture.option.noise' },
                    { value: 'grid', labelKey: 'theming.token_editor.leaf.effects.background_texture.option.grid' },
                    { value: 'scanlines', labelKey: 'theming.token_editor.leaf.effects.background_texture.option.scanlines' },
                    { value: 'starfield', labelKey: 'theming.token_editor.leaf.effects.background_texture.option.starfield' },
                ],
            },
            {
                path: 'effects.backgroundIntensity',
                labelKey: 'theming.token_editor.leaf.effects.background_intensity.label',
                type: 'number',
                numberMin: 0,
                numberMax: 10,
            },
            {
                path: 'effects.overlay',
                labelKey: 'theming.token_editor.leaf.effects.overlay.label',
                type: 'enum',
                enumOptions: [
                    { value: 'none', labelKey: 'theming.token_editor.leaf.effects.overlay.option.none' },
                    { value: 'glitch', labelKey: 'theming.token_editor.leaf.effects.overlay.option.glitch' },
                    { value: 'vignette', labelKey: 'theming.token_editor.leaf.effects.overlay.option.vignette' },
                    { value: 'paper-grain', labelKey: 'theming.token_editor.leaf.effects.overlay.option.paper_grain' },
                    { value: 'crt', labelKey: 'theming.token_editor.leaf.effects.overlay.option.crt' },
                ],
            },
            {
                path: 'effects.overlayIntensity',
                labelKey: 'theming.token_editor.leaf.effects.overlay_intensity.label',
                type: 'number',
                numberMin: 0,
                numberMax: 10,
            },
            {
                path: 'effects.cursor',
                labelKey: 'theming.token_editor.leaf.effects.cursor.label',
                type: 'enum',
                enumOptions: [
                    { value: 'default', labelKey: 'theming.token_editor.leaf.effects.cursor.option.default' },
                    { value: 'pixel', labelKey: 'theming.token_editor.leaf.effects.cursor.option.pixel' },
                    { value: 'crosshair', labelKey: 'theming.token_editor.leaf.effects.cursor.option.crosshair' },
                    { value: 'precision', labelKey: 'theming.token_editor.leaf.effects.cursor.option.precision' },
                ],
            },
            {
                path: 'effects.selectionStyle',
                labelKey: 'theming.token_editor.leaf.effects.selection_style.label',
                type: 'enum',
                enumOptions: [
                    { value: 'default', labelKey: 'theming.token_editor.leaf.effects.selection_style.option.default' },
                    { value: 'highlighted', labelKey: 'theming.token_editor.leaf.effects.selection_style.option.highlighted' },
                    { value: 'inverted', labelKey: 'theming.token_editor.leaf.effects.selection_style.option.inverted' },
                ],
            },
        ],
    },

    // ── Layout — Stage 8b M1.C.3 ───────────────────────────────────
    {
        id: 'layout',
        labelKey: 'theming.token_editor.category.layout.label',
        descriptionKey: 'theming.token_editor.category.layout.description',
        icon: 'fa-solid fa-grip',
        leaves: [
            {
                path: 'layout.density',
                labelKey: 'theming.token_editor.leaf.layout.density.label',
                descriptionKey: 'theming.token_editor.leaf.layout.density.description',
                type: 'enum',
                enumOptions: [
                    { value: 'compact', labelKey: 'theming.token_editor.leaf.layout.density.option.compact' },
                    { value: 'comfortable', labelKey: 'theming.token_editor.leaf.layout.density.option.comfortable' },
                    { value: 'spacious', labelKey: 'theming.token_editor.leaf.layout.density.option.spacious' },
                ],
            },
            {
                path: 'layout.contentMaxWidth',
                labelKey: 'theming.token_editor.leaf.layout.content_max_width.label',
                type: 'enum',
                enumOptions: [
                    { value: 'narrow', labelKey: 'theming.token_editor.leaf.layout.content_max_width.option.narrow' },
                    { value: 'standard', labelKey: 'theming.token_editor.leaf.layout.content_max_width.option.standard' },
                    { value: 'wide', labelKey: 'theming.token_editor.leaf.layout.content_max_width.option.wide' },
                    { value: 'full', labelKey: 'theming.token_editor.leaf.layout.content_max_width.option.full' },
                ],
            },
            {
                path: 'layout.containerPadding',
                labelKey: 'theming.token_editor.leaf.layout.container_padding.label',
                type: 'enum',
                enumOptions: [
                    { value: 'tight', labelKey: 'theming.token_editor.leaf.layout.container_padding.option.tight' },
                    { value: 'standard', labelKey: 'theming.token_editor.leaf.layout.container_padding.option.standard' },
                    { value: 'generous', labelKey: 'theming.token_editor.leaf.layout.container_padding.option.generous' },
                ],
            },
        ],
    },

    // ── Themed — Stage 8b M4.5 ─────────────────────────────────────
    // Dynamic-keys map for theme-specific extra anchors that don't
    // fit the standard buckets (cyberpunk's neon hues, sepia's gilt).
    {
        id: 'themed',
        labelKey: 'theming.token_editor.category.themed.label',
        descriptionKey: 'theming.token_editor.category.themed.description',
        icon: 'fa-solid fa-flask',
        leaves: [
            {
                path: 'themed',
                labelKey: 'theming.token_editor.leaf.themed.label',
                descriptionKey: 'theming.token_editor.leaf.themed.description',
                type: 'color-anchor-map',
            },
        ],
    },
];
