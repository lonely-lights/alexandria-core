import { useCallback, useEffect, useState } from 'react';

export type DrawerHeight = 'partial' | 'tall' | 'full';

const STORAGE_KEY = 'notes-drawer-height';
const DEFAULT_HEIGHT: DrawerHeight = 'tall';

/**
 * Height presets for the Notes drawer.
 *
 * - `partial`: 40vh — enough to peek at the list without blocking the
 *   underlying page.
 * - `tall`: 65vh — the default, same feel as the previous fixed
 *   h-[60vh] but with a touch more room.
 * - `full`: leaves the navbar visible so users can still switch
 *   context without closing the drawer. Uses the `--navbar-height`
 *   CSS var set by AppLayout; falls back to 3.5rem when unset.
 */
const HEIGHT_CLASSES: Record<DrawerHeight, string> = {
    partial: 'h-[40vh]',
    tall: 'h-[65vh]',
    full: 'h-[calc(100vh-var(--navbar-height,3.5rem))]',
};

function loadHeight(): DrawerHeight {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === 'partial' || raw === 'tall' || raw === 'full') return raw;
    } catch {
        // ignore — localStorage can be disabled or quota-full
    }
    return DEFAULT_HEIGHT;
}

function saveHeight(height: DrawerHeight): void {
    try {
        localStorage.setItem(STORAGE_KEY, height);
    } catch {
        // ignore
    }
}

/**
 * React hook that manages the drawer's `partial | tall | full` height
 * with localStorage persistence. Returns the current height key, its
 * Tailwind className, and a setter that both updates state and
 * persists.
 */
export function useDrawerHeight() {
    const [height, setHeightState] = useState<DrawerHeight>(loadHeight);

    const setHeight = useCallback((next: DrawerHeight) => {
        setHeightState(next);
        saveHeight(next);
    }, []);

    // Cross-tab sync: another tab that changes this setting should
    // propagate here. Keeps the drawer behavior consistent when a
    // user has multiple tabs open.
    useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (e.key !== STORAGE_KEY || !e.newValue) return;
            if (e.newValue === 'partial' || e.newValue === 'tall' || e.newValue === 'full') {
                setHeightState(e.newValue);
            }
        }
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return {
        height,
        setHeight,
        className: HEIGHT_CLASSES[height],
    };
}
