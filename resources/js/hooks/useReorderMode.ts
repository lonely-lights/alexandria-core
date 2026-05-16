import { usePersistedPreference } from './usePersistedPreference';

export type ReorderMode = 'drag' | 'arrows';

const STORAGE_KEY = 'alexandria.reorder-mode';

function isReorderMode(raw: string): raw is ReorderMode {
    return raw === 'drag' || raw === 'arrows';
}

/**
 * User preference for list reordering: drag-and-drop vs. up/down arrow buttons.
 * Persists across sessions via localStorage. Per-device; not synced to account.
 */
export function useReorderMode(): [ReorderMode, (m: ReorderMode) => void] {
    return usePersistedPreference<ReorderMode>(STORAGE_KEY, isReorderMode, 'drag');
}
