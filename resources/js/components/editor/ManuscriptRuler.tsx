import type { CSSProperties } from 'react';

/**
 * Static manuscript ruler for print layout — PROPORTIONAL since the
 * 2026-08-09 ruler-only ruling.
 *
 * The sheet keeps one geometry everywhere and its rendered width IS
 * "8.5 inches" (see pageBreakMath), so the ruler must not measure in
 * CSS inches — a fixed-inch strip lines up with nothing the sheet
 * actually does. Every tick, margin zone, label, and marker is placed
 * as a PERCENTAGE of a strip that wears the same `.alex-sheet-footprint`
 * width (and the same zoom variable) as the paper, so the two agree at
 * any pane size by construction.
 *
 * Horizontal only. The old vertical ruler measured literal inches down
 * a scroll that is many pages long — it described nothing real, and a
 * ruler that lies is worse than no ruler. If a vertical ruler returns,
 * it returns against real pagination.
 *
 * It intentionally follows the familiar Docs/word-processor pattern:
 * shaded margin zones, eighth-inch ticks, inch labels inside the
 * writing area, and indent/margin handles as non-interactive
 * affordances.
 */

type TickDivision = 'whole' | 'half' | 'quarter' | 'eighth';

const PAGE_WIDTH_IN = 8.5;
const MARGIN_IN = 1;
const CONTENT_WIDTH_IN = PAGE_WIDTH_IN - MARGIN_IN * 2;
const EIGHTHS_PER_INCH = 8;
const TOTAL_EIGHTHS = PAGE_WIDTH_IN * EIGHTHS_PER_INCH;

/** Position of the nth eighth-inch, as a percentage of the strip. */
function eighthPercent(n: number): string {
    return `${(n / TOTAL_EIGHTHS) * 100}%`;
}

const MARGIN_PERCENT = `${(MARGIN_IN / PAGE_WIDTH_IN) * 100}%`;
const RIGHT_MARGIN_START_PERCENT = `${((PAGE_WIDTH_IN - MARGIN_IN) / PAGE_WIDTH_IN) * 100}%`;

const horizontalEighthSteps = Array.from(
    { length: TOTAL_EIGHTHS - 1 },
    (_, i) => i + 1,
);

const rulerBaseStyle: CSSProperties = {
    background: 'var(--alex-manuscript-ruler-bg, color-mix(in srgb, var(--theme-base-content) 3%, transparent))',
    color: 'var(--alex-manuscript-ruler-label, color-mix(in srgb, var(--theme-base-content) 56%, transparent))',
    overflow: 'hidden',
};

/* The strip is the ruler's "sheet": same footprint class, same zoom
   variable, so its rendered width tracks the paper exactly. */
const horizontalStripStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    zoom: 'var(--alex-writing-zoom, 1)' as CSSProperties['zoom'],
};

const horizontalMarginStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: MARGIN_PERCENT,
    background: 'var(--alex-manuscript-ruler-margin-bg, color-mix(in srgb, var(--theme-base-content) 12%, transparent))',
};

const horizontalTickStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    width: '1px',
    background: 'var(--alex-manuscript-ruler-tick, color-mix(in srgb, var(--theme-base-content) 36%, transparent))',
};

const horizontalLabelStyle: CSSProperties = {
    position: 'absolute',
    top: '4px',
    transform: 'translateX(-50%)',
    fontSize: '9px',
    lineHeight: 1,
};

const markerColor = 'var(--alex-manuscript-ruler-marker, var(--theme-brand-primary-500))';

function isHorizontalMargin(step: number): boolean {
    return step < MARGIN_IN * EIGHTHS_PER_INCH ||
        step > (PAGE_WIDTH_IN - MARGIN_IN) * EIGHTHS_PER_INCH;
}

function tickDivision(step: number): TickDivision {
    if (step % EIGHTHS_PER_INCH === 0) {
        return 'whole';
    }

    if (step % 4 === 0) {
        return 'half';
    }

    if (step % 2 === 0) {
        return 'quarter';
    }

    return 'eighth';
}

function tickSize(
    step: number,
    sizes: Record<TickDivision, string>,
): string {
    return sizes[tickDivision(step)];
}

function contentLabel(step: number): number | null {
    const contentStep = step - MARGIN_IN * EIGHTHS_PER_INCH;

    if (contentStep <= 0 || contentStep % EIGHTHS_PER_INCH !== 0) {
        return null;
    }

    return contentStep / EIGHTHS_PER_INCH;
}

function HorizontalIndentMarkers() {
    return (
        <>
            <span
                className="alex-manuscript-ruler__first-line-marker"
                style={{
                    position: 'absolute',
                    left: MARGIN_PERCENT,
                    top: '2px',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `6px solid ${markerColor}`,
                    transform: 'translateX(-50%)',
                }}
            />
            <span
                className="alex-manuscript-ruler__left-indent-marker"
                style={{
                    position: 'absolute',
                    left: MARGIN_PERCENT,
                    bottom: '2px',
                    width: '10px',
                    height: '4px',
                    background: markerColor,
                    borderRadius: '1px',
                    transform: 'translateX(-50%)',
                }}
            />
            <span
                className="alex-manuscript-ruler__right-indent-marker"
                style={{
                    position: 'absolute',
                    left: RIGHT_MARGIN_START_PERCENT,
                    bottom: '2px',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: `6px solid ${markerColor}`,
                    transform: 'translateX(-50%)',
                }}
            />
        </>
    );
}

export default function ManuscriptRuler() {
    return (
        <div
            aria-hidden="true"
            className="alex-manuscript-ruler alex-manuscript-ruler--horizontal w-full shrink-0"
            data-manuscript-ruler="horizontal"
            style={{
                ...rulerBaseStyle,
                height: '1.5rem',
                borderBottom: '1px solid var(--alex-manuscript-ruler-border, color-mix(in srgb, var(--theme-base-content) 10%, transparent))',
                scrollbarGutter: 'stable',
            }}
        >
            <div className="alex-sheet-footprint" style={horizontalStripStyle}>
                <div style={{ ...horizontalMarginStyle, left: 0 }} />
                <div style={{ ...horizontalMarginStyle, right: 0 }} />
                {horizontalEighthSteps.map((n) => (
                    <span
                        key={`tick-${n}`}
                        className="alex-manuscript-ruler__tick"
                        data-ruler-tick="horizontal"
                        data-ruler-division={tickDivision(n)}
                        data-ruler-zone={isHorizontalMargin(n) ? 'margin' : 'content'}
                        style={{
                            ...horizontalTickStyle,
                            left: eighthPercent(n),
                            height: tickSize(n, {
                                whole: '9px',
                                half: '7px',
                                quarter: '5px',
                                eighth: '3px',
                            }),
                        }}
                    />
                ))}
                {horizontalEighthSteps.map((n) => {
                    const label = contentLabel(n);

                    return label === null || label >= CONTENT_WIDTH_IN ? null : (
                        <span
                            key={`label-${n}`}
                            style={{ ...horizontalLabelStyle, left: eighthPercent(n) }}
                        >
                            {label}
                        </span>
                    );
                })}
                <HorizontalIndentMarkers />
            </div>
        </div>
    );
}
