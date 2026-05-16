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
    | 'color-anchor'
    | 'radius-size'  // M1.C.2
    | 'duration-ms'  // M1.C.2
    | 'intensity'    // M1.C.2 (0..10 number)
    | 'enum';        // M1.C.2 (select)

// ----------------------------------------------------------------------------
// Leaf + category shape
// ----------------------------------------------------------------------------

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
    // M1.C.2 placeholders — visible but not yet editable.
    {
        id: 'radius',
        labelKey: 'theming.token_editor.category.radius.label',
        icon: 'fa-solid fa-square-rounded',
        leaves: [],
        placeholder: true,
    },
    {
        id: 'motion',
        labelKey: 'theming.token_editor.category.motion.label',
        icon: 'fa-solid fa-wave-square',
        leaves: [],
        placeholder: true,
    },
    {
        id: 'border',
        labelKey: 'theming.token_editor.category.border.label',
        icon: 'fa-solid fa-border-all',
        leaves: [],
        placeholder: true,
    },
    {
        id: 'shadow',
        labelKey: 'theming.token_editor.category.shadow.label',
        icon: 'fa-solid fa-clone',
        leaves: [],
        placeholder: true,
    },
    {
        id: 'surface',
        labelKey: 'theming.token_editor.category.surface.label',
        icon: 'fa-solid fa-layer-group',
        leaves: [],
        placeholder: true,
    },
    {
        id: 'neutral',
        labelKey: 'theming.token_editor.category.neutral.label',
        icon: 'fa-solid fa-circle-half-stroke',
        leaves: [],
        placeholder: true,
    },
    {
        id: 'semantic',
        labelKey: 'theming.token_editor.category.semantic.label',
        icon: 'fa-solid fa-link',
        leaves: [],
        placeholder: true,
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
