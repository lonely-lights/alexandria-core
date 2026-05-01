import { useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';

export interface HeroRotatorPanel {
    key: string;
    content: ReactNode;
    ariaLabel?: string;
}

interface HeroRotatorProps {
    panels: HeroRotatorPanel[];
    /** Dwell time per panel, in ms. Default 5000. */
    interval?: number;
    /** Tailwind classes for the outer wrapper. */
    className?: string;
    /** Pause rotation while the user hovers the wrapper. Default true. */
    pauseOnHover?: boolean;
}

/**
 * Rotates through a set of visual panels, cross-fading between them.
 * Each panel is rendered as an absolutely-positioned sibling so the
 * wrapper is sized by whatever contains it — give the outer wrapper
 * a fixed height/width via className.
 *
 * Starts on the first panel and advances by one index on every tick.
 * Passing a single panel is a no-op renderer.
 */
export default function HeroRotator({
    panels,
    interval = 5000,
    className = '',
    pauseOnHover = true,
}: HeroRotatorProps) {
    const [activeIdx, setActiveIdx] = useState(0);
    const pausedRef = useRef(false);
    const panelRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

    // Tick forward. Guarded by pausedRef so hover freezes the rotation
    // without re-subscribing the interval.
    useEffect(() => {
        if (panels.length <= 1) return;
        const timer = window.setInterval(() => {
            if (pausedRef.current) return;
            setActiveIdx((idx) => (idx + 1) % panels.length);
        }, interval);
        return () => window.clearInterval(timer);
    }, [panels.length, interval]);

    // Animate in/out on active change. Same duration + same ease on
    // both sides so the incoming and outgoing panels cross at the
    // midpoint — the switch reads as a single seamless dissolve
    // rather than one fading in after the other.
    useEffect(() => {
        panels.forEach((p, i) => {
            const el = panelRefs.current.get(p.key);
            if (!el) return;
            gsap.to(el, {
                opacity: i === activeIdx ? 1 : 0,
                duration: 0.6,
                ease: 'power2.inOut',
                overwrite: 'auto',
            });
        });
    }, [activeIdx, panels]);

    return (
        <div
            className={`relative ${className}`}
            onMouseEnter={() => { if (pauseOnHover) pausedRef.current = true; }}
            onMouseLeave={() => { if (pauseOnHover) pausedRef.current = false; }}
            aria-roledescription="carousel"
        >
            {panels.map((p, i) => (
                <div
                    key={p.key}
                    ref={(el) => { panelRefs.current.set(p.key, el); }}
                    data-panel-key={p.key}
                    aria-label={p.ariaLabel ?? p.key}
                    aria-hidden={i !== activeIdx}
                    className="absolute inset-0"
                    style={{ opacity: i === 0 ? 1 : 0 }}
                >
                    {p.content}
                </div>
            ))}
        </div>
    );
}
