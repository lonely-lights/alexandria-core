import { useCallback, useEffect, useRef } from 'react';

interface UseHoverOffDismissOptions {
    /**
     * Milliseconds the pointer may sit off the tracked region before
     * `onDismiss` fires. `null`/`undefined`/`0` (or anything <= 0) keeps
     * the feature off — the returned handlers become no-ops so callers
     * can wire them unconditionally without an extra branch.
     */
    delayMs?: number | null;
    /** Invoked once the pointer has been off the region for `delayMs`. */
    onDismiss: () => void;
}

interface UseHoverOffDismissHandlers {
    /** Wire onto every element in the "stays open" region (enter). */
    handlePointerEnter: () => void;
    /** Wire onto every element in the "stays open" region (leave). */
    handlePointerLeave: () => void;
}

/**
 * Hover-off auto-dismiss timer for a multi-element region (e.g. a
 * trigger + its portaled menu, which are separate DOM subtrees and so
 * can't share a single mouseenter/mouseleave pair).
 *
 * Pure timer bookkeeping only — no DOM access. Entering ANY element the
 * caller wired `handlePointerEnter` to cancels the pending timer;
 * leaving ANY of them (re)starts it. A quick hop between two adjacent
 * elements in the region is safe as long as the enter event on the
 * next element fires before `delayMs` elapses, which real pointer
 * movement always satisfies.
 *
 * `onDismiss` is read through a ref so callers can pass an inline
 * closure without re-arming the hook's callbacks (and therefore
 * without resetting an in-flight timer) on every render.
 */
export function useHoverOffDismiss({
    delayMs,
    onDismiss,
}: UseHoverOffDismissOptions): UseHoverOffDismissHandlers {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onDismissRef = useRef(onDismiss);
    onDismissRef.current = onDismiss;

    const enabled = typeof delayMs === 'number' && delayMs > 0;

    const clear = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Cancel a pending timer the moment the feature is disabled (delay
    // unset, or the caller flips its own "should this be armed at all"
    // condition — e.g. the menu closing by some other path — into the
    // delay it passes in), and on unmount.
    useEffect(() => {
        if (!enabled) {
            clear();
        }

        return clear;
    }, [enabled, clear]);

    const handlePointerEnter = useCallback(() => {
        if (!enabled) return;
        clear();
    }, [enabled, clear]);

    const handlePointerLeave = useCallback(() => {
        if (!enabled) return;
        clear();
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            onDismissRef.current();
        }, delayMs as number);
    }, [enabled, clear, delayMs]);

    return { handlePointerEnter, handlePointerLeave };
}
