import { useState, useEffect } from 'react';

/**
 * Track whether a CSS media query currently matches. Useful when render
 * decisions need to differ between viewport sizes (e.g. collapsing
 * inline tabs into a dropdown menu on mobile).
 *
 * Returns `false` during SSR / before the first paint.
 *
 *   const isMobile = useMediaQuery('(max-width: 639px)');
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia(query);
        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
        mql.addEventListener('change', handler);
        // Sync once on mount in case the value changed before the
        // listener attached (e.g. user resized before React hydrated).
        setMatches(mql.matches);
        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

export default useMediaQuery;
