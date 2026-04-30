import { useEffect, useRef, type RefObject } from 'react';
import Sortable from 'sortablejs';

/**
 * Wire SortableJS to a container ref for drag-to-reorder interactions.
 * On drop, reverts the DOM mutation that SortableJS performs (so React
 * stays authoritative over the DOM) and forwards the index change to
 * the caller. The caller updates its own state; React re-renders.
 *
 * `enabled` lets the caller gate activation (e.g. only enable when a
 * menu/dialog containing the sortable list is open).
 */
export function useSortableReorder(
    ref: RefObject<HTMLElement | null>,
    onReorder: (oldIndex: number, newIndex: number) => void,
    enabled: boolean = true,
): void {
    // Keep the latest onReorder without re-wiring Sortable on every
    // parent re-render — a classic ref-based stability trick.
    const onReorderRef = useRef(onReorder);
    onReorderRef.current = onReorder;

    useEffect(() => {
        if (!enabled) return;
        const el = ref.current;
        if (!el) return;

        const sortable = Sortable.create(el, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'opacity-30',
            onEnd: (evt) => {
                const { oldIndex, newIndex, from, item } = evt;
                if (oldIndex == null || newIndex == null) return;
                // Revert SortableJS's DOM mutation so React remains the
                // source of truth. State update below re-renders in the
                // new order.
                from.removeChild(item);
                const refNode = from.children[oldIndex];
                if (refNode) {
                    from.insertBefore(item, refNode);
                } else {
                    from.appendChild(item);
                }
                onReorderRef.current(oldIndex, newIndex);
            },
        });

        return () => sortable.destroy();
    }, [ref, enabled]);
}
