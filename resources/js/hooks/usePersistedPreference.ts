import { useCallback, useEffect, useState } from 'react';

/**
 * Per-device user preference backed by `localStorage` with cross-tab
 * sync via the `storage` event. Replaces ~3 near-identical hooks
 * (`useDrawerHeight`, `useDrawerMode`, `useReorderMode`) that each
 * reimplemented the same shape.
 *
 * Pass an `isValid` type-guard that narrows a `string` (what
 * localStorage returns) down to your preference's union type — the
 * hook discards unknown values and falls back to the default. This
 * keeps invalid stored values (older app versions, manual tampering)
 * from breaking the consumer:
 *
 *     type DrawerMode = 'split' | 'list';
 *     const isMode = (v: string): v is DrawerMode =>
 *         v === 'split' || v === 'list';
 *
 *     const [mode, setMode] = usePersistedPreference<DrawerMode>(
 *         'notes-drawer-mode',
 *         isMode,
 *         'split',
 *     );
 *
 * Cross-tab sync: when another tab writes the same key, the `storage`
 * event fires here and updates local state. Same window does NOT fire
 * the event for its own writes, which is fine — the setter already
 * updated local state synchronously.
 *
 * SSR-safe: reads `typeof window` before touching `localStorage`.
 * Storage failures (quota, disabled, sandbox) are swallowed — the
 * preference falls back to the default and the app keeps working.
 */
export function usePersistedPreference<T extends string>(
    storageKey: string,
    isValid: (raw: string) => raw is T,
    defaultValue: T,
): [T, (next: T) => void] {
    const [value, setValueState] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw !== null && isValid(raw)) return raw;
        } catch {
            // localStorage disabled / quota-full — fall through
        }
        return defaultValue;
    });

    const setValue = useCallback(
        (next: T) => {
            setValueState(next);
            try {
                window.localStorage.setItem(storageKey, next);
            } catch {
                // ignore — state already updated, persistence is best-effort
            }
        },
        [storageKey],
    );

    // Cross-tab sync: another tab that changes this setting should
    // propagate here. Same-tab writes are handled synchronously by
    // setValue above (the storage event fires for other tabs only).
    useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (e.key !== storageKey || e.newValue === null) return;
            if (isValid(e.newValue)) {
                setValueState(e.newValue);
            }
        }
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [storageKey, isValid]);

    return [value, setValue];
}
