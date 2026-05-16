import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface EnterAnimationOptions {
    /** Pixel offset for the fade-in y-translation. Default 16. */
    y?: number;
    /** Starting opacity. Default 0. */
    opacity?: number;
    /** Tween duration in seconds. Default 0.25. */
    duration?: number;
    /** GSAP easing string (e.g. `'power2.out'`, `'back.out(1.2)'`). Default `'power2.out'`. */
    ease?: string;
    /**
     * When provided, re-fires the animation whenever `key` changes
     * (e.g. tab switches, view-mode toggles). When omitted, the
     * animation runs once on mount only.
     */
    key?: string | number | null;
}

/**
 * Animates an element in when it mounts (or whenever the `key` option
 * changes). Returns a ref to attach to the element you want to animate.
 *
 * Cleanup: kills any in-flight tween on this element on unmount so
 * onComplete handlers don't fire against a detached node — closes
 * H-EFFECT-7 (gsap-mount-without-cleanup) cluster from Phase 2.H.
 */
export function useEnterAnimation<T extends HTMLElement = HTMLDivElement>(
    options: EnterAnimationOptions = {},
) {
    const ref = useRef<T>(null);
    const { y = 16, opacity = 0, duration = 0.25, ease = 'power2.out', key } = options;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        gsap.fromTo(
            el,
            { y, opacity },
            { y: 0, opacity: 1, duration, ease },
        );

        return () => {
            gsap.killTweensOf(el);
        };
        // Re-fire when `key` changes (tab switches etc.); empty deps
        // when no key — mount-only animation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return ref;
}
