/**
 * Lifecycle for floating overlays (Modal, Sheet, future Drawer / Popover).
 *
 * Owns the four behaviours every overlay needs:
 *
 *   1. Body-scroll lock while `open` is true
 *   2. GSAP enter animation fired when `open` flips to true
 *   3. GSAP exit animation that runs to completion BEFORE `onClose` fires —
 *      so the parent unmounts only after the panel is gone
 *   4. `Escape` key closes the panel via the same exit animation path
 *
 * Consumers supply the panel-specific GSAP enter + exit specs; the
 * backdrop animation is uniform fade-in / fade-out across overlays.
 *
 * Returns the two refs to attach to the backdrop and panel elements,
 * plus the `animateClose` function consumers wire to backdrop clicks
 * and explicit close buttons.
 */

import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';

export interface FloatingPanelAnimation {
    /** Panel enter — `gsap.fromTo(panel, from, to)` fires on open. */
    enter: {
        from: gsap.TweenVars;
        to: gsap.TweenVars;
    };
    /** Panel exit — `gsap.to(panel, exit)` fires on `animateClose()`. */
    exit: gsap.TweenVars;
    /** Backdrop fade-in duration, in seconds. Default 0.25. */
    backdropEnterDuration?: number;
    /** Backdrop fade-out duration, in seconds. Default 0.25. */
    backdropExitDuration?: number;
}

export interface FloatingPanelHandles {
    backdropRef: React.RefObject<HTMLDivElement | null>;
    panelRef: React.RefObject<HTMLDivElement | null>;
    /** Run the exit animation, then call `onClose`. Idempotent. */
    animateClose: () => void;
}

export function useFloatingPanel(
    open: boolean,
    onClose: () => void,
    animation: FloatingPanelAnimation,
): FloatingPanelHandles {
    const backdropRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef(false);

    // Stash the animation spec in a ref so consumers don't have to
    // memoize the object — we only read it at open/close moments.
    const animationRef = useRef(animation);
    animationRef.current = animation;

    // Lock body scroll while open
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    // Animate in
    useEffect(() => {
        if (!open) return;
        closingRef.current = false;
        const { enter, backdropEnterDuration = 0.25 } = animationRef.current;

        if (backdropRef.current) {
            gsap.fromTo(
                backdropRef.current,
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: backdropEnterDuration,
                    ease: 'power2.out',
                },
            );
        }
        if (panelRef.current) {
            gsap.fromTo(panelRef.current, enter.from, enter.to);
        }
    }, [open]);

    const animateClose = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        const { exit, backdropExitDuration = 0.25 } = animationRef.current;

        const tl = gsap.timeline({ onComplete: onClose });
        if (panelRef.current) {
            tl.to(panelRef.current, exit, 0);
        }
        if (backdropRef.current) {
            tl.to(
                backdropRef.current,
                {
                    opacity: 0,
                    duration: backdropExitDuration,
                    ease: 'power2.in',
                },
                0,
            );
        }
    }, [onClose]);

    // Escape closes
    useEffect(() => {
        if (!open) return;

        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') animateClose();
        }

        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [open, animateClose]);

    return { backdropRef, panelRef, animateClose };
}
