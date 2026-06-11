import type { CSSProperties } from 'react';

/**
 * ManuscriptRuler — the Word-style horizontal ruler shown in the
 * manuscript editor's print layout (Stage 8g.1).
 *
 * A static, non-interactive strip pinned between the toolbar and the
 * scrolling page (Word pins its ruler; the page scrolls beneath it).
 * Geometry mirrors the print-layout page exactly: US Letter (8.5in)
 * with 1in side margins, the strip centered the same way the page is.
 * Tick marks every 1/4in across the content zone, taller inch marks
 * numbered 1–6 measured from the left margin (Word convention: inch
 * numbers count the writing area, not the paper edge).
 *
 * Honest limitation: width/margins representation only — no pagination
 * or page-break preview (that arrives with export).
 */

/* US Letter, 1in margins → 6.5in content zone → 26 quarter-inch steps. */
const CONTENT_QUARTERS = 26;

const barStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    height: '1.25rem',
    overflow: 'hidden',
    // Mirror the manuscript scroll container's reserved scrollbar
    // gutter (manuscript.css) so the centered strip and the centered
    // page compute their centers in the same available width.
    scrollbarGutter: 'stable',
};

const stripStyle: CSSProperties = {
    width: '8.5in',
    marginInline: 'auto',
    position: 'relative',
    height: '100%',
};

const marginZoneStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '1in',
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const tickStyle: CSSProperties = {
    position: 'absolute',
    bottom: '2px',
    width: '1px',
    background: 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)',
};

const labelStyle: CSSProperties = {
    position: 'absolute',
    top: '1px',
    transform: 'translateX(-50%)',
    fontSize: '9px',
    lineHeight: 1,
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function ManuscriptRuler() {
    const marks = [];

    // Ticks strictly inside the content zone (1in–7.5in); the zone
    // boundaries themselves read as the margin-shade edges.
    for (let n = 1; n < CONTENT_QUARTERS; n++) {
        const isInch = n % 4 === 0;

        marks.push(
            <span
                key={`tick-${n}`}
                style={{
                    ...tickStyle,
                    left: `calc(1in + ${n} * 0.25in)`,
                    height: isInch ? '6px' : '3px',
                }}
            />,
        );

        if (isInch) {
            marks.push(
                <span
                    key={`label-${n}`}
                    style={{ ...labelStyle, left: `calc(1in + ${n} * 0.25in)` }}
                >
                    {n / 4}
                </span>,
            );
        }
    }

    return (
        <div aria-hidden="true" className="w-full shrink-0" style={barStyle}>
            <div style={stripStyle}>
                <div style={{ ...marginZoneStyle, left: 0 }} />
                <div style={{ ...marginZoneStyle, left: '7.5in' }} />
                {marks}
            </div>
        </div>
    );
}
