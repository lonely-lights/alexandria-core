import { useEffect, useState } from 'react';

/** Keep closing content mounted for the workspace's 220 ms panel transition. */
export default function useCollapsePresence(open: boolean): boolean {
    const [retained, setRetained] = useState(open);

    if (open && !retained) {
        setRetained(true);
    }

    useEffect(() => {
        if (open) {
            return;
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const timeout = window.setTimeout(() => setRetained(false), reducedMotion ? 0 : 220);

        return () => window.clearTimeout(timeout);
    }, [open]);

    return open || retained;
}
