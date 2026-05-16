import { usePersistedPreference } from './usePersistedPreference';

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

function isDrawerHeight(raw: string): raw is DrawerHeight {
    return raw === 'partial' || raw === 'tall' || raw === 'full';
}

/**
 * React hook that manages the drawer's `partial | tall | full` height
 * with localStorage persistence + cross-tab sync. Returns the current
 * height key, its Tailwind className, and a setter.
 */
export function useDrawerHeight() {
    const [height, setHeight] = usePersistedPreference<DrawerHeight>(
        STORAGE_KEY,
        isDrawerHeight,
        DEFAULT_HEIGHT,
    );

    return {
        height,
        setHeight,
        className: HEIGHT_CLASSES[height],
    };
}
