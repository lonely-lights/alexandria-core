import { useCallback, useEffect, useRef, useState } from 'react';
import type { KanbanColumnData, KanbanCardData } from './types';

export interface KanbanModel {
    columns: KanbanColumnData[];
    /** Optimistic local move: reposition a card into a new column without
        waiting for server confirmation. Returns the previous state so
        callers can roll back on PATCH failure. */
    moveCard: (cardId: number, toKey: string | null) => KanbanColumnData[];
    /** Force-reset the local columns (e.g. after a successful refetch). */
    reset: (next: KanbanColumnData[]) => void;
}

export function useKanbanModel(initial: KanbanColumnData[]): KanbanModel {
    const [columns, setColumns] = useState<KanbanColumnData[]>(initial);

    // Hold a live ref to `columns` so `moveCard` can snapshot the current
    // state without taking `columns` as a useCallback dep (which would
    // invalidate the callback on every change and cascade into caller
    // render loops).
    const columnsRef = useRef<KanbanColumnData[]>(columns);
    useEffect(() => {
        columnsRef.current = columns;
    }, [columns]);

    // Sync with upstream when a new columns array arrives (new fetch,
    // different blueprint, etc.). Reference equality is intentional —
    // callers must produce a new array when they want to reset.
    useEffect(() => {
        setColumns(initial);
    }, [initial]);

    const moveCard = useCallback((cardId: number, toKey: string | null): KanbanColumnData[] => {
        const snapshot = columnsRef.current;
        setColumns((prev) => {
            let moved: KanbanCardData | null = null;
            const stripped = prev.map((col) => {
                const keep = col.entries.filter((e) => {
                    if (e.id === cardId) {
                        moved = e;

                        return false;
                    }

                    return true;
                });

                return { ...col, entries: keep };
            });
            if (!moved) return prev;

            // Insert into target column; if target doesn't exist yet
            // (e.g. previously-empty column that was filtered out), bail.
            return stripped.map((col) =>
                col.key === toKey ? { ...col, entries: [...col.entries, moved as KanbanCardData] } : col,
            );
        });

        return snapshot;
    }, []);

    // Stable reference so consumers can put `reset` in their own
    // useCallback / useEffect dep arrays without re-firing every render.
    const reset = useCallback((next: KanbanColumnData[]) => {
        setColumns(next);
    }, []);

    return { columns, moveCard, reset };
}
