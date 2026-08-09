import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

import {
    MARGIN_X_EVENT,
    MARGIN_X_MAX_IN,
    MARGIN_X_MIN_IN,
    type MarginXEventDetail,
} from '@alexandria/pages/Writing/pageMargins';

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

interface ManuscriptRulerProps {
    /** Side margin in proportional inches — the draggable value. */
    marginXIn?: number;
}

const PAGE_WIDTH_IN = 8.5;
const EIGHTHS_PER_INCH = 8;
const TOTAL_EIGHTHS = PAGE_WIDTH_IN * EIGHTHS_PER_INCH;

/** Position of the nth eighth-inch, as a percentage of the strip. */
function eighthPercent(n: number): string {
    return `${(n / TOTAL_EIGHTHS) * 100}%`;
}

function inchPercent(inches: number): string {
    return `${(inches / PAGE_WIDTH_IN) * 100}%`;
}

/** Drags snap to the ruler's own resolution. */
function snapToEighth(inches: number): number {
    return Math.round(inches * EIGHTHS_PER_INCH) / EIGHTHS_PER_INCH;
}

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

function isHorizontalMargin(step: number, marginXIn: number): boolean {
    return step < marginXIn * EIGHTHS_PER_INCH ||
        step > (PAGE_WIDTH_IN - marginXIn) * EIGHTHS_PER_INCH;
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

function contentLabel(step: number, marginXIn: number): number | null {
    // marginXIn snaps to eighths, so this stays integral.
    const contentStep = step - Math.round(marginXIn * EIGHTHS_PER_INCH);

    if (contentStep <= 0 || contentStep % EIGHTHS_PER_INCH !== 0) {
        return null;
    }

    return contentStep / EIGHTHS_PER_INCH;
}

/**
 * The draggable margin handles. Only MARGINS drag — the old first-line
 * indent triangle is gone until the wiki format can store paragraph
 * indents (same deferred class as selection-level font size). Drags
 * snap to eighths and announce through the MARGIN_X_EVENT window event;
 * the Workspace owns the value and threads it back down as a prop.
 */
function MarginHandles({
    marginXIn,
    stripRef,
}: {
    marginXIn: number;
    stripRef: RefObject<HTMLDivElement | null>;
}) {
    const draggingRef = useRef<'left' | 'right' | null>(null);

    const announce = (value: number, commit: boolean) => {
        window.dispatchEvent(
            new CustomEvent<MarginXEventDetail>(MARGIN_X_EVENT, {
                detail: { marginXIn: value, commit },
            }),
        );
    };

    const valueFromPointer = (clientX: number, side: 'left' | 'right'): number => {
        const rect = stripRef.current?.getBoundingClientRect();

        if (rect === undefined || rect.width === 0) {
            return marginXIn;
        }

        const inches = ((clientX - rect.left) / rect.width) * PAGE_WIDTH_IN;
        const raw = side === 'left' ? inches : PAGE_WIDTH_IN - inches;

        return Math.min(
            MARGIN_X_MAX_IN,
            Math.max(MARGIN_X_MIN_IN, snapToEighth(raw)),
        );
    };

    const handleDown = (side: 'left' | 'right') => (event: ReactPointerEvent<HTMLSpanElement>) => {
        draggingRef.current = side;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    const handleMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
        const side = draggingRef.current;

        if (side === null) {
            return;
        }

        announce(valueFromPointer(event.clientX, side), false);
    };

    const handleUp = (event: ReactPointerEvent<HTMLSpanElement>) => {
        const side = draggingRef.current;

        if (side === null) {
            return;
        }

        draggingRef.current = null;
        announce(valueFromPointer(event.clientX, side), true);
    };

    const grabStyle: CSSProperties = {
        position: 'absolute',
        bottom: '1px',
        width: '10px',
        height: '6px',
        background: markerColor,
        borderRadius: '1px',
        transform: 'translateX(-50%)',
        cursor: 'ew-resize',
        touchAction: 'none',
    };

    return (
        <>
            <span
                className="alex-manuscript-ruler__margin-handle"
                data-ruler-margin-handle="left"
                style={{ ...grabStyle, left: inchPercent(marginXIn) }}
                onPointerDown={handleDown('left')}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={() => {
                    draggingRef.current = null;
                }}
            />
            <span
                className="alex-manuscript-ruler__margin-handle"
                data-ruler-margin-handle="right"
                style={{ ...grabStyle, left: inchPercent(PAGE_WIDTH_IN - marginXIn) }}
                onPointerDown={handleDown('right')}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={() => {
                    draggingRef.current = null;
                }}
            />
        </>
    );
}

export default function ManuscriptRuler({ marginXIn = 1 }: ManuscriptRulerProps) {
    const stripRef = useRef<HTMLDivElement | null>(null);

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
            <div ref={stripRef} className="alex-sheet-footprint" style={horizontalStripStyle}>
                <div style={{ ...horizontalMarginStyle, left: 0, width: inchPercent(marginXIn) }} />
                <div style={{ ...horizontalMarginStyle, right: 0, width: inchPercent(marginXIn) }} />
                {horizontalEighthSteps.map((n) => (
                    <span
                        key={`tick-${n}`}
                        className="alex-manuscript-ruler__tick"
                        data-ruler-tick="horizontal"
                        data-ruler-division={tickDivision(n)}
                        data-ruler-zone={isHorizontalMargin(n, marginXIn) ? 'margin' : 'content'}
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
                    const label = contentLabel(n, marginXIn);

                    return label === null ||
                        label >= PAGE_WIDTH_IN - marginXIn * 2 ? null : (
                        <span
                            key={`label-${n}`}
                            style={{ ...horizontalLabelStyle, left: eighthPercent(n) }}
                        >
                            {label}
                        </span>
                    );
                })}
                <MarginHandles marginXIn={marginXIn} stripRef={stripRef} />
            </div>
        </div>
    );
}
