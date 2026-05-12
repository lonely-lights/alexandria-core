import type { CSSProperties, ReactNode } from 'react';

/**
 * FramedCard — colored card with a soft "matted frame" treatment.
 *
 * Two-layer mechanism:
 *   1. Outer `<div>` carries the soft fuzzy outer line (box-shadow with
 *      spread + blur) and the translucent mat surface that becomes the
 *      visible band between the line and the body. Its padding sets the
 *      band thickness.
 *   2. Inner `<div>` carries the colored body fill at a slightly
 *      smaller border-radius (concentric corners) so the mat reads as
 *      an even ribbon all the way around.
 *
 * Why two divs instead of `border` + inset-box-shadow on one:
 *   - The mat sits on the page background, not on the colored fill.
 *     A translucent white *over* the colored fill would blend with it
 *     and read as tinted white. Giving the mat its own layer (with the
 *     fill *above* it in document order) means the two surfaces never
 *     blend — the mat reads as true neutral white-on-page-bg.
 *
 * Why box-shadow for the outer line, not border:
 *   - `border` is hard-edged. To get the soft fuzzy outer feel we need
 *     a `box-shadow` with a small spread (the visible core) and some
 *     blur (the falloff). Three independent dials — opacity, spread,
 *     blur — give expressive control over visibility / thickness /
 *     softness that `border-width` alone can't reach.
 *
 * Design system notes:
 *   - The default tunings are calibrated against the dark page-bg
 *     scenario where the mat's 15% white reads as a soft halo. On
 *     light themes the same recipe will read more subtly because the
 *     mat blends with a light page rather than catching contrast.
 *   - This component is the "personality" alternative to the standard
 *     drop-shadow card recipe used elsewhere (e.g., the AI Dashboard's
 *     paper-board cards). When a surface should feel framed, atmospheric,
 *     or set apart, use FramedCard. When it should feel solid and
 *     elevated, use a regular Card with the drop-shadow treatment.
 *
 * Usage:
 *
 *   <FramedCard fill="var(--theme-brand-primary-500)">
 *       <h3 className="text-base font-bold">Title</h3>
 *       <p>Body content goes here.</p>
 *   </FramedCard>
 *
 * The `fill` prop is required — this card style is designed for
 * colored bodies. For an uncolored variant, use `<Card>` instead.
 */

export interface FramedCardProps {
    /** Required — the colored background of the card body. Pass a
     *  theme token (`var(--theme-brand-primary-500)`) or a literal
     *  color. The text color defaults to `--theme-brand-primary-content`. */
    fill: string;

    /** Card content. */
    children: ReactNode;

    /** Optional text color override. Defaults to the brand-primary
     *  content token (typically white-ish across themes). */
    textColor?: string;

    /** Padding inside the body div. Defaults to `1.25rem`. */
    bodyPadding?: string;

    /** Width of the visible mat band in pixels. Defaults to `5`. */
    matWidth?: number;

    /** Extra Tailwind classes for layout (e.g. width / sizing). */
    className?: string;
}

const OUTER_RADIUS = 'var(--theme-radius-card)';

export default function FramedCard({
    fill,
    children,
    textColor = 'var(--theme-brand-primary-content)',
    bodyPadding = '1.25rem',
    matWidth = 5,
    className = '',
}: FramedCardProps) {
    const outerStyle: CSSProperties = {
        // Translucent white mat — sits on the page background so the
        // 85% transparency reveals page-bg tones, not brand-fill bleed.
        background: 'color-mix(in srgb, #fff 15%, transparent)',
        borderRadius: OUTER_RADIUS,
        // Soft fuzzy outer line via box-shadow (spread + blur, no
        // hard `border`). 0.5px spread = thin solid core; 2px blur =
        // soft falloff; 60% white opacity for visibility on dark pages.
        boxShadow: '0 0 2px 0.5px color-mix(in srgb, #fff 60%, transparent)',
        padding: `${matWidth}px`,
    };

    const innerStyle: CSSProperties = {
        background: fill,
        color: textColor,
        // Inner radius = outer radius minus the mat width so the
        // corners nest concentrically (otherwise the inner's square
        // corners peek out at the outer's rounded corners).
        borderRadius: `calc(${OUTER_RADIUS} - ${matWidth}px)`,
        padding: bodyPadding,
    };

    return (
        <div className={className} style={outerStyle}>
            <div className="overflow-hidden" style={innerStyle}>
                {children}
            </div>
        </div>
    );
}
