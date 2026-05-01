import { useState, useEffect } from 'react';

export type ReorderMode = 'drag' | 'arrows';

const STORAGE_KEY = 'alexandria.reorder-mode';

function readStored(): ReorderMode {
    if (typeof window === 'undefined') return 'drag';
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'arrows' ? 'arrows' : 'drag';
}

/**
 * User preference for list reordering: drag-and-drop vs. up/down arrow buttons.
 * Persists across sessions via localStorage. Per-device; not synced to account.
 */
export function useReorderMode(): [ReorderMode, (m: ReorderMode) => void] {
    const [mode, setModeState] = useState<ReorderMode>(() => readStored());

    useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (e.key === STORAGE_KEY && (e.newValue === 'drag' || e.newValue === 'arrows')) {
                setModeState(e.newValue);
            }
        }
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const setMode = (m: ReorderMode) => {
        window.localStorage.setItem(STORAGE_KEY, m);
        setModeState(m);
    };

    return [mode, setMode];
}
