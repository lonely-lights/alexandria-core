import { usePersistedPreference } from './usePersistedPreference';

export type DrawerMode = 'split' | 'list';

const STORAGE_KEY = 'notes-drawer-mode';
const DEFAULT_MODE: DrawerMode = 'split';

/**
 * `split` — list on the left, inline detail pane on the right (classic
 * drawer feel, good for quick scanning).
 * `list`  — list spans the full drawer row; clicking a note opens the
 * shared NoteModal overlay for a bigger editing canvas.
 */

function isDrawerMode(raw: string): raw is DrawerMode {
    return raw === 'split' || raw === 'list';
}

export function useDrawerMode() {
    const [mode, setMode] = usePersistedPreference<DrawerMode>(
        STORAGE_KEY,
        isDrawerMode,
        DEFAULT_MODE,
    );

    return { mode, setMode };
}
