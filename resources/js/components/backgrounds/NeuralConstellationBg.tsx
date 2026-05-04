/**
 * Neural-constellation background for AI surfaces — scattered nodes
 * with faint connecting lines. Individual nodes pulse on long
 * staggered cycles (a "neuron firing" rhythm), and a couple of
 * connections brighten intermittently to suggest signal flow. Uses
 * `currentColor` so the network tints with the active theme.
 *
 * Visibility scoped via `.neural-overlay` in thought-fragments.css —
 * only renders on tf themes.
 */

// Node pulse offsets (seconds) — spread across the 36s cycle so no
// two nodes peak at the same moment. Feels asynchronous, not metronomic.
const NODE_PULSE_OFFSETS = [0, 9, 18, 4, 13, 22, 30, 6, 15, 27, 11, 20, 33, 2];

// Connection pulse offsets — fewer connections animate at any time so
// the viewer's eye doesn't get pulled everywhere at once.
const LINK_PULSE_OFFSETS = [5, 17, 11, 23, 0];

export default function NeuralConstellationBg() {
    // Node positions within the 800×600 tile. Hand-placed to avoid a
    // regular-grid feel while still covering the tile evenly.
    const nodes: Array<[number, number]> = [
        [80, 80], [220, 120], [380, 70], [540, 140], [680, 90],
        [140, 240], [320, 280], [480, 220], [620, 300],
        [60, 380], [240, 420], [400, 380], [560, 460], [720, 400],
    ];

    // Subset of connections between nearby nodes — not all pairs, so
    // the network looks curated rather than a hairball.
    const connections: Array<[number, number]> = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [1, 5], [2, 6], [3, 7], [4, 8],
        [5, 6], [6, 7], [7, 8],
        [5, 9], [5, 10], [6, 10], [6, 11], [7, 11], [7, 12], [8, 12], [8, 13],
        [9, 10], [10, 11], [11, 12], [12, 13],
    ];

    return (
        <svg
            className="h-full w-full text-primary"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern
                    id="neural-constellation"
                    patternUnits="userSpaceOnUse"
                    width="800"
                    height="600"
                >
                    {/* Static base connections — very faint so they
                        read as background structure, not content. */}
                    {connections.map(([a, b], i) => (
                        <line
                            key={`link-${i}`}
                            x1={nodes[a][0]} y1={nodes[a][1]}
                            x2={nodes[b][0]} y2={nodes[b][1]}
                            stroke="currentColor"
                            strokeOpacity="0.04"
                            strokeWidth="0.75"
                        />
                    ))}

                    {/* Pulsing connections — a small subset animates
                        its stroke opacity to suggest a signal passing
                        through that edge. Indexes pick the most
                        visually-central links. */}
                    {[3, 7, 11, 15, 20].map((linkIdx, i) => {
                        const [a, b] = connections[linkIdx];
                        return (
                            <line
                                key={`pulse-link-${i}`}
                                x1={nodes[a][0]} y1={nodes[a][1]}
                                x2={nodes[b][0]} y2={nodes[b][1]}
                                stroke="currentColor"
                                strokeOpacity="0"
                                strokeWidth="1"
                            >
                                <animate
                                    attributeName="stroke-opacity"
                                    values="0; 0.22; 0.22; 0; 0"
                                    keyTimes="0; 0.15; 0.3; 0.45; 1"
                                    dur="28s"
                                    begin={`${LINK_PULSE_OFFSETS[i]}s`}
                                    repeatCount="indefinite"
                                />
                            </line>
                        );
                    })}

                    {/* Node dots — each pulses its opacity on a staggered
                        long cycle so the network feels alive without
                        becoming noisy. */}
                    {nodes.map(([x, y], i) => (
                        <circle
                            key={`node-${i}`}
                            cx={x} cy={y} r="2.5"
                            fill="currentColor"
                            fillOpacity="0.08"
                        >
                            <animate
                                attributeName="fill-opacity"
                                values="0.08; 0.28; 0.28; 0.08; 0.08"
                                keyTimes="0; 0.1; 0.25; 0.4; 1"
                                dur="36s"
                                begin={`${NODE_PULSE_OFFSETS[i]}s`}
                                repeatCount="indefinite"
                            />
                        </circle>
                    ))}
                </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#neural-constellation)" />
        </svg>
    );
}
