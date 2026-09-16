import { useEffect, useState } from 'react';

/**
 * Re-render on any scroll or resize, at most once per animation frame.
 *
 * The selection bubbles position themselves with viewport coordinates
 * from `coordsAtPos`, measured during render. A scroll is not an editor
 * transaction, so without this they stayed frozen where they were drawn
 * while the selected text scrolled away underneath them. The scroll
 * listener runs in the capture phase so nested scrollports (the
 * continuous flow's own container, a bounded editor pane) count too,
 * even though `scroll` does not bubble.
 */
export function useViewportTick(): number {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let frame = 0;

        const schedule = () => {
            if (frame !== 0) {
                return;
            }

            frame = window.requestAnimationFrame(() => {
                frame = 0;
                setTick((value) => value + 1);
            });
        };

        window.addEventListener('scroll', schedule, { capture: true, passive: true });
        window.addEventListener('resize', schedule);

        return () => {
            window.removeEventListener('scroll', schedule, { capture: true });
            window.removeEventListener('resize', schedule);

            if (frame !== 0) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, []);

    return tick;
}
