/**
 * Live-preview context for the token-override editor.
 *
 * Stage 8b M1.C.1 — bridges the host app's theming module to core's
 * `<TokenOverrideEditor>`. The editor lives in core (rendered inside
 * Project Settings → Theme tab); the theming module + cascade resolver
 * live in the consumer app. This context decouples the two:
 *
 *   - Consumer app's ThemingBridge provides the context value (current
 *     preview override, the resolved content theme, the setter).
 *   - Core's editor consumes via `useThemePreview()` and pushes WIP
 *     overrides through `setPreviewOverride` for live repaint.
 *
 * Types here are intentionally weaker than the app's nominal theming
 * types (`ResolvedTheme`, `ThemeOverride`). Structural subtyping means
 * the app's strict types satisfy these shapes without conversion — the
 * editor doesn't need the nominal token-tree definitions to render
 * (it walks paths against a registry, not the type system).
 */

import { createContext, useContext } from 'react';

import type { ThemeOverridePatch } from './themeOverride';

// ----------------------------------------------------------------------------
// Weak structural types
// ----------------------------------------------------------------------------

/** Scope the resolver attributes each token leaf to. */
export type CascadeScope =
    | 'system'
    | 'user'
    | 'project'
    | 'blueprint'
    | 'entry';

/** Light / dark — the only two modes the resolver picks between. */
export type ThemeMode = 'light' | 'dark';

/**
 * Structural shape of `ResolvedTheme` — what `useThemePreview()` exposes
 * to consumers. The consumer app's `ResolvedTheme` from its theming
 * module is a strict subtype; assigns into this without conversion.
 */
export interface ResolvedThemeView {
    /** Flat object containing every resolved token value, walked by path. */
    tokens: Record<string, unknown>;
    /** path → cascade scope that contributed this leaf's value. */
    provenance: Record<string, CascadeScope>;
    mode: ThemeMode;
}

// ----------------------------------------------------------------------------
// Context
// ----------------------------------------------------------------------------

export interface ThemePreviewContextValue {
    /**
     * WIP override the editor is previewing. Non-null means the cascade
     * resolver should use this as the project-scope override instead of
     * the persisted `theme_override`. Editor clears on Save / Cancel.
     */
    previewOverride: ThemeOverridePatch | null;
    setPreviewOverride: (next: ThemeOverridePatch | null) => void;

    /**
     * Active resolved content theme — post-cascade, with `previewOverride`
     * already merged in when present. Editor reads current values + the
     * provenance map for the badges.
     */
    resolvedContentTheme: ResolvedThemeView;
}

export const ThemePreviewContext =
    createContext<ThemePreviewContextValue | null>(null);

/**
 * Read the preview context. Throws when used outside a ThemingBridge —
 * that's a programming error, not a runtime condition (the editor
 * always renders inside the bridge), so failing loudly is correct.
 */
export function useThemePreview(): ThemePreviewContextValue {
    const ctx = useContext(ThemePreviewContext);

    if (!ctx) {
        throw new Error(
            'useThemePreview: must be used inside the consumer app\'s <ThemingBridge>',
        );
    }

    return ctx;
}
