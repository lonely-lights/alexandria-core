/**
 * Persist a user-selected subset of columns to localStorage, with safe
 * fallback to a default list when nothing is stored or the stored value
 * is corrupt. Unknown column keys (removed since the user last saved)
 * are filtered out so stale entries don't crash the UI.
 */
export function createColumnPersistence<T extends string>(
    storageKey: string,
    allColumns: readonly T[],
    defaultColumns: readonly T[],
): { load: () => T[]; save: (cols: T[]) => void } {
    function load(): T[] {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw) as T[];
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.filter((c) => (allColumns as readonly string[]).includes(c));
                }
            }
        } catch {
            // corrupt JSON or access denied — fall through to default
        }
        return [...defaultColumns];
    }

    function save(cols: T[]): void {
        localStorage.setItem(storageKey, JSON.stringify(cols));
    }

    return { load, save };
}
