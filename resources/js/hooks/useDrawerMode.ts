import { useCallback, useEffect, useState } from 'react';

export type DrawerMode = 'split' | 'list';

const STORAGE_KEY = 'notes-drawer-mode';
const DEFAULT_MODE: DrawerMode = 'split';

/**
 * `split` — list on the left, inline detail pane on the right (classic
 * drawer feel, good for quick scanning).
 * `list`  — list spans the full drawer row; clicking a note opens the
 * shared NoteModal overlay for a bigger editing canvas.
 */

function loadMode(): DrawerMode {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === 'split' || raw === 'list') return raw;
    } catch {
        // localStorage may be disabled or quota-full; fall through.
    }
    return DEFAULT_MODE;
}

function saveMode(mode: DrawerMode): void {
    try {
        localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        // ignore
    }
}

export function useDrawerMode() {
    const [mode, setModeState] = useState<DrawerMode>(loadMode);

    const setMode = useCallback((next: DrawerMode) => {
        setModeState(next);
        saveMode(next);
    }, []);

    // Cross-tab sync so multiple open tabs stay aligned.
    useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (e.key !== STORAGE_KEY || !e.newValue) return;
            if (e.newValue === 'split' || e.newValue === 'list') {
                setModeState(e.newValue);
            }
        }
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return { mode, setMode };
}
