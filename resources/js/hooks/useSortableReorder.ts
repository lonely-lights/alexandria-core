import { useEffect, useRef, type RefObject } from 'react';
import Sortable, { type SortableEvent } from 'sortablejs';

/**
 * Wire SortableJS to a container ref for drag-to-reorder interactions.
 * On drop, reverts the DOM mutation that SortableJS performs (so React
 * stays authoritative over the DOM) and forwards the index change to
 * the caller. The caller updates its own state; React re-renders.
 *
 * `enabled` lets the caller gate activation (e.g. only enable when a
 * menu/dialog containing the sortable list is open).
 *
 * `options.group` enables cross-container drags (shared SortableJS
 * group name). When a drag ends across containers, `options.onMoveAcross`
 * fires with the item id, target parent id (null = root), and new index —
 * containers must set `data-sortable-parent` and items `data-section-id`.
 */

export interface SortableReorderOptions {
    /** Shared SortableJS group name enabling drags across containers. */
    group?: string;
    /**
     * Cross-container drop handler. Containers must set
     * `data-sortable-parent` ('root' or a parent id) and items
     * `data-section-id`. The DOM mutation is reverted before this
     * fires — the caller persists the move and lets fresh props
     * re-render the tree.
     */
    onMoveAcross?: (itemId: number, toParentId: number | null, newIndex: number) => void;
}

export function useSortableReorder(
    ref: RefObject<HTMLElement | null>,
    onReorder: (oldIndex: number, newIndex: number) => void,
    enabled: boolean = true,
    options?: SortableReorderOptions,
): void {
    // Keep the latest callbacks without re-wiring Sortable on every
    // parent re-render — a classic ref-based stability trick.
    const onReorderRef = useRef(onReorder);
    onReorderRef.current = onReorder;
    const onMoveAcrossRef = useRef(options?.onMoveAcross);
    onMoveAcrossRef.current = options?.onMoveAcross;
    const group = options?.group;

    useEffect(() => {
        if (!enabled) return;
        const el = ref.current;
        if (!el) return;

        const sortable = Sortable.create(el, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'opacity-30',
            ...(group ? { group } : {}),
            onEnd: (evt: SortableEvent) => {
                const { oldIndex, newIndex, from, to, item } = evt;
                if (oldIndex == null || newIndex == null) return;

                // Revert SortableJS's DOM mutation so React remains the
                // source of truth (same-list and cross-list alike).
                if (item.parentNode) {
                    item.parentNode.removeChild(item);
                }
                const refNode = from.children[oldIndex];
                if (refNode) {
                    from.insertBefore(item, refNode);
                } else {
                    from.appendChild(item);
                }

                if (to !== from) {
                    const parentAttr = to.getAttribute('data-sortable-parent');
                    const itemId = Number(item.getAttribute('data-section-id'));
                    if (parentAttr !== null && Number.isFinite(itemId)) {
                        onMoveAcrossRef.current?.(
                            itemId,
                            parentAttr === 'root' ? null : Number(parentAttr),
                            newIndex,
                        );
                    }
                    return;
                }

                onReorderRef.current(oldIndex, newIndex);
            },
        });

        return () => sortable.destroy();
    }, [ref, enabled, group]);
}
