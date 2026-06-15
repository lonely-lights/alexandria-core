import type { CSSProperties } from 'react';

/**
 * Static manuscript ruler for print layout.
 *
 * The geometry mirrors US Letter: 8.5in x 11in with 1in margins.
 * It intentionally follows the familiar Docs/word-processor pattern:
 * shaded margin zones, eighth-inch ticks, inch labels inside the
 * writing area, and blue indent/margin handles as non-interactive
 * affordances. Width/margins representation only; exporting owns true
 * pagination later.
 */

type RulerOrientation = 'horizontal' | 'vertical';
type TickDivision = 'whole' | 'half' | 'quarter' | 'eighth';

interface ManuscriptRulerProps {
    orientation?: RulerOrientation;
}

const PAGE_WIDTH_IN = 8.5;
const PAGE_HEIGHT_IN = 11;
const MARGIN_IN = 1;
const CONTENT_WIDTH_IN = PAGE_WIDTH_IN - MARGIN_IN * 2;
const CONTENT_HEIGHT_IN = PAGE_HEIGHT_IN - MARGIN_IN * 2;
const EIGHTHS_PER_INCH = 8;

const horizontalEighthSteps = Array.from(
    { length: PAGE_WIDTH_IN * EIGHTHS_PER_INCH - 1 },
    (_, i) => i + 1,
);

const verticalEighthSteps = Array.from(
    { length: PAGE_HEIGHT_IN * EIGHTHS_PER_INCH - 1 },
    (_, i) => i + 1,
);

const rulerBaseStyle: CSSProperties = {
    background: 'var(--alex-manuscript-ruler-bg, color-mix(in srgb, var(--theme-base-content) 3%, transparent))',
    color: 'var(--alex-manuscript-ruler-label, color-mix(in srgb, var(--theme-base-content) 56%, transparent))',
    overflow: 'hidden',
};

const horizontalStripStyle: CSSProperties = {
    width: `${PAGE_WIDTH_IN}in`,
    height: '100%',
    marginInline: 'auto',
    position: 'relative',
};

const verticalStripStyle: CSSProperties = {
    width: '100%',
    height: `${PAGE_HEIGHT_IN}in`,
    marginBlock: '1.5rem',
    position: 'relative',
};

const horizontalMarginStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: `${MARGIN_IN}in`,
    background: 'var(--alex-manuscript-ruler-margin-bg, color-mix(in srgb, var(--theme-base-content) 12%, transparent))',
};

const verticalMarginStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: `${MARGIN_IN}in`,
    background: 'var(--alex-manuscript-ruler-margin-bg, color-mix(in srgb, var(--theme-base-content) 12%, transparent))',
};

const horizontalTickStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    width: '1px',
    background: 'var(--alex-manuscript-ruler-tick, color-mix(in srgb, var(--theme-base-content) 36%, transparent))',
};

const verticalTickStyle: CSSProperties = {
    position: 'absolute',
    right: 0,
    height: '1px',
    background: 'var(--alex-manuscript-ruler-tick, color-mix(in srgb, var(--theme-base-content) 36%, transparent))',
};

const horizontalLabelStyle: CSSProperties = {
    position: 'absolute',
    top: '4px',
    transform: 'translateX(-50%)',
    fontSize: '9px',
    lineHeight: 1,
};

const verticalLabelStyle: CSSProperties = {
    position: 'absolute',
    right: '15px',
    transform: 'translateY(-50%)',
    fontSize: '9px',
    lineHeight: 1,
};

const markerColor = 'var(--alex-manuscript-ruler-marker, var(--theme-brand-primary-500))';

function isHorizontalMargin(step: number): boolean {
    return step < MARGIN_IN * EIGHTHS_PER_INCH ||
        step > (PAGE_WIDTH_IN - MARGIN_IN) * EIGHTHS_PER_INCH;
}

function isVerticalMargin(step: number): boolean {
    return step < MARGIN_IN * EIGHTHS_PER_INCH ||
        step > (PAGE_HEIGHT_IN - MARGIN_IN) * EIGHTHS_PER_INCH;
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
                    left: `${MARGIN_IN}in`,
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
                    left: `${MARGIN_IN}in`,
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
                    left: `${MARGIN_IN + CONTENT_WIDTH_IN}in`,
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

function HorizontalRuler() {
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
            <div style={horizontalStripStyle}>
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
                            left: `calc(${n} * 0.125in)`,
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
                            style={{ ...horizontalLabelStyle, left: `calc(${n} * 0.125in)` }}
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

function VerticalRuler() {
    return (
        <div
            aria-hidden="true"
            className="alex-manuscript-ruler alex-manuscript-ruler--vertical hidden shrink-0 md:block"
            data-manuscript-ruler="vertical"
            style={{
                ...rulerBaseStyle,
                width: '2rem',
                borderRight: '1px solid var(--alex-manuscript-ruler-border, color-mix(in srgb, var(--theme-base-content) 10%, transparent))',
            }}
        >
            <div style={verticalStripStyle}>
                <div style={{ ...verticalMarginStyle, top: 0 }} />
                <div style={{ ...verticalMarginStyle, bottom: 0 }} />
                {verticalEighthSteps.map((n) => (
                    <span
                        key={`tick-${n}`}
                        className="alex-manuscript-ruler__tick"
                        data-ruler-tick="vertical"
                        data-ruler-division={tickDivision(n)}
                        data-ruler-zone={isVerticalMargin(n) ? 'margin' : 'content'}
                        style={{
                            ...verticalTickStyle,
                            top: `calc(${n} * 0.125in)`,
                            width: tickSize(n, {
                                whole: '12px',
                                half: '10px',
                                quarter: '7px',
                                eighth: '4px',
                            }),
                        }}
                    />
                ))}
                {verticalEighthSteps.map((n) => {
                    const label = contentLabel(n);

                    return label === null || label >= CONTENT_HEIGHT_IN ? null : (
                        <span
                            key={`label-${n}`}
                            style={{ ...verticalLabelStyle, top: `calc(${n} * 0.125in)` }}
                        >
                            {label}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

export default function ManuscriptRuler({ orientation = 'horizontal' }: ManuscriptRulerProps) {
    return orientation === 'vertical' ? <VerticalRuler /> : <HorizontalRuler />;
}
