import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface EnterAnimationOptions {
    y?: number;
    opacity?: number;
    duration?: number;
    ease?: string;
}

/**
 * Animates an element in when it mounts.
 * Attach the returned ref to the element you want to animate.
 */
export function useEnterAnimation<T extends HTMLElement = HTMLDivElement>(
    key: string | number,
    options: EnterAnimationOptions = {},
) {
    const ref = useRef<T>(null);
    const { y = 16, opacity = 0, duration = 0.25, ease = 'power2.out' } = options;

    useEffect(() => {
        if (!ref.current) return;

        gsap.fromTo(
            ref.current,
            { y, opacity },
            { y: 0, opacity: 1, duration, ease },
        );
    }, [key]);

    return ref;
}
