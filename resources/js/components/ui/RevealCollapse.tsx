import type { ReactNode } from 'react';

interface RevealCollapseProps {
    open: boolean;
    children: ReactNode;
    /** Milliseconds for the open/close transition. Defaults to 250. */
    durationMs?: number;
    /** Tailwind class added to the inner container (e.g. spacing). */
    innerClassName?: string;
}

/**
 * Slide-down on open, slide-up on close. Uses the `grid-template-rows:
 * 0fr → 1fr` transition trick so the container animates to the natural
 * height of its children without JS measurement.
 *
 * The inner wrapper owns `overflow: hidden` so content clips cleanly
 * while the row height animates.
 */
export default function RevealCollapse({
    open,
    children,
    durationMs = 250,
    innerClassName = '',
}: RevealCollapseProps) {
    return (
        <div
            className="grid transition-[grid-template-rows] ease-out"
            style={{
                gridTemplateRows: open ? '1fr' : '0fr',
                transitionDuration: `${durationMs}ms`,
            }}
        >
            <div className={`min-h-0 overflow-hidden ${innerClassName}`}>{children}</div>
        </div>
    );
}
