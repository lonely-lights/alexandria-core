import type { Dispatch, SetStateAction } from 'react';
import type { SavedView } from '@alexandria/types/blueprints';
import type { ColumnFilter } from './modals/FilterModals';

/**
 * Helpers shared by EntriesTab and ConnectionsView for managing
 * column filters + the saved-views list. These were duplicated
 * line-for-line before extraction.
 */

/**
 * Returns a setter/clear pair for a `Record<string, ColumnFilter>`
 * filter map. Each action resets the page to 1 and optionally closes
 * the open filter-modal column. The caller wires the state setters in.
 */
export function createFilterHelpers(
    setColumnFilters: Dispatch<SetStateAction<Record<string, ColumnFilter>>>,
    setPage: Dispatch<SetStateAction<number>>,
    setFilterModalCol?: Dispatch<SetStateAction<string | null>>,
) {
    function setFilter(colKey: string, filter: ColumnFilter | null): void {
        setColumnFilters((prev) => {
            const next = { ...prev };
            if (filter) {
                next[colKey] = filter;
            } else {
                delete next[colKey];
            }
            return next;
        });
        setPage(1);
        setFilterModalCol?.(null);
    }

    function clearAllFilters(): void {
        setColumnFilters({});
        setPage(1);
    }

    return { setFilter, clearAllFilters };
}

/**
 * Reducer-style updater for the local savedViews list after a save.
 * If the saved view existed, update in-place; if the new save is the
 * default, demote any other default. If it's brand-new, append.
 */
export function mergeSavedView(
    prev: SavedView[],
    saved: { id: number; name: string },
    isDefault: boolean,
): SavedView[] {
    const record = {
        id: saved.id,
        name: saved.name,
        is_default: isDefault,
        is_personal: !isDefault,
    };
    const exists = prev.some((v) => v.id === saved.id);
    if (exists) {
        return prev.map((v) =>
            v.id === saved.id
                ? { ...v, ...record }
                : (isDefault ? { ...v, is_default: false } : v),
        );
    }
    return [...prev, record];
}
