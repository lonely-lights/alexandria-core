/**
 * Blueprint-paper grid background — engineering/architectural feel
 * to match the Blueprints section. A fine sub-grid (20px) nested
 * inside a major grid (100px), both drawn in `currentColor` so they
 * tint with the active theme. Subtle node-pulse animation: a handful
 * of grid intersections brighten briefly on a long, staggered cycle,
 * suggesting schema nodes "lighting up" without becoming distracting.
 *
 * Scoped visibility via `.grid-overlay` (thought-fragments.css) — the
 * ambient motif only shows on tf themes.
 */

// Pulse begin-time offsets (seconds) for each node. Chosen so the
// 12 pulses feel asynchronous rather than metronomic — at any moment
// roughly 1-2 are visibly lit.
const NODE_PULSE_OFFSETS = [0, 7, 15, 22, 4, 30, 11, 26, 18, 2, 24, 13];

export default function BlueprintGridBg() {
    // Intersections chosen to spread across the 600×600 tile. Each
    // sits on a major grid crossing so the pulse reads as "the grid
    // itself lit up," not an orphan dot.
    const nodes: Array<[number, number]> = [
        [100, 100],
        [300, 100],
        [500, 100],
        [200, 200],
        [400, 200],
        [100, 300],
        [300, 300],
        [500, 300],
        [200, 400],
        [400, 400],
        [100, 500],
        [300, 500],
    ];

    return (
        <svg
            className="h-full w-full"
            style={{ color: "var(--theme-base-content)" }}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Fine sub-grid — 20px spacing, barely-there. */}
                <pattern
                    id="bp-sub-grid"
                    patternUnits="userSpaceOnUse"
                    width="20"
                    height="20"
                >
                    <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.04"
                        strokeWidth="0.5"
                    />
                </pattern>

                {/* Major grid — 100px spacing, slightly stronger. */}
                <pattern
                    id="bp-major-grid"
                    patternUnits="userSpaceOnUse"
                    width="100"
                    height="100"
                >
                    <rect width="100" height="100" fill="url(#bp-sub-grid)" />
                    <path
                        d="M 100 0 L 0 0 0 100"
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.08"
                        strokeWidth="1"
                    />
                </pattern>

                {/* Node-pulse pattern — tiles the 12 nodes across a
                    600px square. Each <circle> fades its own opacity
                    over a 24s cycle, offset so they stagger. */}
                <pattern
                    id="bp-nodes"
                    patternUnits="userSpaceOnUse"
                    width="600"
                    height="600"
                >
                    {nodes.map(([x, y], i) => (
                        <circle
                            key={`${x}-${y}`}
                            cx={x}
                            cy={y}
                            r="2.5"
                            fill="currentColor"
                            fillOpacity="0"
                        >
                            <animate
                                attributeName="fill-opacity"
                                values="0; 0.18; 0.18; 0; 0"
                                keyTimes="0; 0.1; 0.35; 0.5; 1"
                                dur="24s"
                                begin={`${NODE_PULSE_OFFSETS[i]}s`}
                                repeatCount="indefinite"
                            />
                        </circle>
                    ))}
                </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#bp-major-grid)" />
            <rect width="100%" height="100%" fill="url(#bp-nodes)" />
        </svg>
    );
}
