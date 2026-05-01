/**
 * Theme system: ThemeProvider, useTheme, ThemeMode, ThemePreference.
 *
 * Stage 1 ships single-source theme management (light/dark/system).
 * Stage 2's per-entity theming (task #55) extends this — kept intentionally
 * future-friendly via four seam choices:
 *   1. Hook returns an object (not a tuple) — additive fields are non-breaking.
 *   2. ThemeProvider accepts a `scope` prop so themes can apply to any
 *      DOM element, not just <html>.
 *   3. `getResolvedTheme(context)` is the single read boundary the cascade
 *      resolver will replace.
 *   4. Theme names are strings, not an enum, so the catalog can grow.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { csrfHeaders } from '../lib/csrfHeaders';

export type ThemeMode = 'dark' | 'light';
/** User's saved preference — the literal string shape for storage/transport.
 *  Paper is currently the only theme family; presets land in the Theme
 *  Refactor (see docs/features/themes/THEME_REFACTOR_PLAN.md). */
export type ThemePreference = `tf-${ThemeMode}` | 'system';

const STORAGE_KEY = 'theme';
const VALID_THEME = /^tf-(dark|light)$/;

interface ThemeState {
    /** Currently applied color mode (resolved against OS when followSystem). */
    mode: ThemeMode;
    /** True when the user has chosen to follow their OS color-scheme setting. */
    followSystem: boolean;
    setMode: (m: ThemeMode) => void;
    setFollowSystem: (on: boolean) => void;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

interface AuthShared {
    user?: unknown;
    preferences?: { theme?: string };
}

function resolvePrefersDark(): boolean {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Compute applied mode from the saved preference + localStorage + OS.
 *
 * This is the single canonical read boundary for resolving the active theme
 * (seam adjustment 3). Stage 2's cascade resolver — which will fold in
 * blueprint and entry overrides — replaces this function only; consumers
 * keep the same `useTheme()` shape.
 */
function getResolvedTheme(serverPreference: string | undefined): { mode: ThemeMode; followSystem: boolean } {
    if (typeof window === 'undefined') {
        return { mode: 'dark', followSystem: false };
    }

    const pref = serverPreference ?? localStorage.getItem(STORAGE_KEY);

    if (pref === 'system') {
        return { mode: resolvePrefersDark() ? 'dark' : 'light', followSystem: true };
    }

    if (pref && VALID_THEME.test(pref)) {
        const [, mode] = pref.split('-') as ['tf', ThemeMode];
        return { mode, followSystem: false };
    }

    // No pref — first-time visitor. Mode follows OS.
    return { mode: resolvePrefersDark() ? 'dark' : 'light', followSystem: false };
}

interface ThemeProviderProps {
    children: ReactNode;
    /**
     * DOM element to apply data-theme to. Defaults to document.documentElement.
     * Stage 2's per-entity theming will use this to scope themes to a child
     * container instead of the whole document.
     */
    scope?: HTMLElement | null;
}

/**
 * Wrap any themeable page in this provider. Reads the current user's
 * theme preference from the Inertia auth shared prop on mount and syncs
 * future changes back to the server (for logged-in users) plus localStorage.
 */
export function ThemeProvider({ children, scope }: ThemeProviderProps) {
    const page = usePage();
    const auth = (page.props as { auth?: AuthShared | null }).auth;
    const isAuthed = !!auth?.user;
    const serverPreference = auth?.preferences?.theme;

    const [{ mode, followSystem }, setState] = useState(() => getResolvedTheme(serverPreference));

    const apply = useCallback((m: ThemeMode) => {
        const target = scope ?? document.documentElement;
        target.setAttribute('data-theme', `tf-${m}`);
    }, [scope]);

    useEffect(() => {
        apply(mode);
    }, [mode, apply]);

    // Sync local state when the server-shared theme preference changes
    // (e.g. after a successful Inertia form submit elsewhere).
    useEffect(() => {
        if (serverPreference === undefined) return;
        const next = getResolvedTheme(serverPreference);
        setState((s) =>
            s.mode === next.mode && s.followSystem === next.followSystem
                ? s
                : next
        );
    }, [serverPreference]);

    // When following the OS, re-apply mode on system changes.
    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = (e: MediaQueryListEvent) => {
            setState((s) =>
                s.followSystem ? { ...s, mode: e.matches ? 'dark' : 'light' } : s
            );
        };
        mql.addEventListener('change', listener);
        return () => mql.removeEventListener('change', listener);
    }, []);

    /** Save the user's preference to localStorage and (if logged in) to the server. */
    const persistPreference = useCallback((preference: ThemePreference) => {
        try {
            localStorage.setItem(STORAGE_KEY, preference);
        } catch { /* storage may be disabled */ }

        if (isAuthed) {
            // Direct fetch — not router.put — so Inertia's progress bar
            // never appears for what is a background quick-toggle. The
            // local state is already authoritative, so we don't need the
            // `only: ['auth']` round-trip to refresh shared props.
            // X-Silent tells the controller to skip the flash message.
            fetch('/account/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Silent': 'true',
                    ...csrfHeaders(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ theme: preference }),
            }).catch(() => { /* silent — localStorage still reflects the change */ });
        }
    }, []);

    const setMode = useCallback((m: ThemeMode) => {
        setState((s) => {
            // Explicit mode change implies the user is no longer following OS.
            const next = { ...s, mode: m, followSystem: false };
            persistPreference(`tf-${next.mode}`);
            return next;
        });
    }, [persistPreference]);

    const setFollowSystem = useCallback((on: boolean) => {
        setState((s) => {
            if (on) {
                const osMode: ThemeMode = resolvePrefersDark() ? 'dark' : 'light';
                persistPreference('system');
                return { ...s, followSystem: true, mode: osMode };
            }
            persistPreference(`tf-${s.mode}`);
            return { ...s, followSystem: false };
        });
    }, [persistPreference]);

    const toggleMode = useCallback(() => setMode(mode === 'dark' ? 'light' : 'dark'), [mode, setMode]);

    return (
        <ThemeContext.Provider value={{ mode, followSystem, setMode, setFollowSystem, toggleMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Consume theme state inside any descendant of <ThemeProvider />.
 * Calling this outside the provider returns null — callers should
 * handle that case (render nothing) to support the same component
 * living on non-themeable pages.
 */
export function useTheme(): ThemeState | null {
    return useContext(ThemeContext);
}
