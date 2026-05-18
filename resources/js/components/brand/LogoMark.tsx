import { type CSSProperties } from 'react';

/**
 * Alexandria logomark — Stage 8f.
 *
 * Four discrete SVG elements (apex / crossbar / two legs) with stable
 * `.alex-mark-*` class hooks so future animation work can transform
 * each block independently. The mark uses `fill="currentColor"`, so
 * the parent element's CSS `color` drives the entire fill — no need
 * to ship light/dark variants.
 *
 * Consumers who want a different brand override by pulling this file
 * up into their own resources/js per the default-views-in-core
 * pattern (see feedback_default_views_in_core).
 *
 * Animation note: each path/rect carries a stable class — `.alex-mark-apex`,
 * `.alex-mark-crossbar`, `.alex-mark-leg-left`, `.alex-mark-leg-right`.
 * The kit can be rearranged via CSS transforms or motion libs into
 * other poses (the design intent reads as "A letter, building, person,
 * shark, etc." per the original brand spec).
 */
interface LogoMarkProps {
    size?: number;
    className?: string;
    style?: CSSProperties;
    /**
     * Accessible label. Defaults to "Alexandria". Set to empty string
     * when the mark is purely decorative beside a wordmark (avoids
     * screen readers announcing "Alexandria Alexandria").
     */
    ariaLabel?: string;
    /**
     * Static pose. `rest` is the canonical static identity (B11
     * dimensions, leg height 10). `extended` is the documented
     * stretched-foundation pose (B12 dimensions, leg height 16 — leg
     * height = crossbar height × φ). For interactive animation,
     * prefer CSS transforms on the `.alex-mark-leg-*` selectors over
     * pose-prop swapping — transforms tween smoothly, attribute
     * swaps don't.
     */
    pose?: 'rest' | 'extended';
}

const LEG_HEIGHT: Record<'rest' | 'extended', number> = {
    rest: 10,
    extended: 16,
};

export default function LogoMark({
    size = 24,
    className,
    style,
    ariaLabel = 'Alexandria',
    pose = 'rest',
}: LogoMarkProps) {
    const decorative = ariaLabel === '';
    const legHeight = LEG_HEIGHT[pose];

    return (
        <svg
            viewBox="0 0 64 64"
            width={size}
            height={size}
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            role={decorative ? 'presentation' : 'img'}
            aria-label={decorative ? undefined : ariaLabel}
            aria-hidden={decorative ? true : undefined}
            className={className}
            style={style}
        >
            {!decorative && <title>{ariaLabel}</title>}
            <path
                className="alex-mark-apex"
                d="M 33.18 13.92 L 39.82 19.08 Q 41 20 39.5 20 L 24.5 20 Q 23 20 24.18 19.08 L 30.82 13.92 Q 32 13 33.18 13.92 Z"
            />
            <path
                className="alex-mark-crossbar"
                d="M 16 26 L 20.5 26 Q 22 26 23.23 26.86 L 30.77 32.14 Q 32 33 33.23 32.14 L 40.77 26.86 Q 42 26 43.5 26 L 48 26 Q 50 26 50 28 L 50 34 Q 50 36 48 36 L 16 36 Q 14 36 14 34 L 14 28 Q 14 26 16 26 Z"
            />
            <rect
                className="alex-mark-leg-left"
                x="10"
                y="42"
                width="16"
                height={legHeight}
                rx="2"
            />
            <rect
                className="alex-mark-leg-right"
                x="38"
                y="42"
                width="16"
                height={legHeight}
                rx="2"
            />
        </svg>
    );
}
