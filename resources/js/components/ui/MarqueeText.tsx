import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";

type Phase = "rest" | "scroll" | "end";

/**
 * Single-line text that ellipsizes when it overflows, then slowly
 * marquees: hold at the start (showing `…`), scroll to reveal the end,
 * hold there, snap back, repeat. Content that fits renders statically.
 *
 * Honors prefers-reduced-motion (stays ellipsized). Wrap in a Tooltip
 * for instant full-text access on hover.
 */
export default function MarqueeText({
    children,
    holdMs = 3000,
    pxPerSecond = 25,
    className,
}: {
    children: ReactNode;
    /** Pause at each end of the scroll cycle. */
    holdMs?: number;
    /** Scroll speed — distance-proportional so long text isn't rushed. */
    pxPerSecond?: number;
    className?: string;
}) {
    const outerRef = useRef<HTMLSpanElement>(null);
    const [phase, setPhase] = useState<Phase>("rest");
    const [distance, setDistance] = useState(0);

    // How far the content overflows its box; re-measured on resize.
    useEffect(() => {
        const outer = outerRef.current;
        if (!outer) return;
        const measure = () =>
            setDistance(Math.max(0, outer.scrollWidth - outer.clientWidth));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(outer);
        return () => ro.disconnect();
    }, [children]);

    // Phase machine: rest —holdMs→ scroll —(distance/speed)→ end —holdMs→ rest
    useEffect(() => {
        if (distance <= 2) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;

        const delay =
            phase === "scroll" ? (distance / pxPerSecond) * 1000 : holdMs;
        const next: Phase =
            phase === "rest" ? "scroll" : phase === "scroll" ? "end" : "rest";
        const timer = setTimeout(() => setPhase(next), delay);
        return () => clearTimeout(timer);
    }, [phase, distance, holdMs, pxPerSecond]);

    const scrolling = phase !== "rest" && distance > 2;

    return (
        <span
            ref={outerRef}
            className={cn(
                "block min-w-0 overflow-hidden whitespace-nowrap",
                !scrolling && "text-ellipsis",
                className,
            )}
        >
            <span
                // Plain inline at rest so the parent's ellipsis can truncate
                // the text; inline-block while moving so transform applies.
                className={scrolling ? "inline-block" : undefined}
                style={
                    scrolling
                        ? {
                              transform: `translateX(-${distance}px)`,
                              transition:
                                  phase === "scroll"
                                      ? `transform ${distance / pxPerSecond}s linear`
                                      : undefined,
                          }
                        : undefined
                }
            >
                {children}
            </span>
        </span>
    );
}
