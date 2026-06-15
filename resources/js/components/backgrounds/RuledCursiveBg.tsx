/**
 * Notebook-paper background - SVG pattern combining the ruled lines and
 * decorative cursive phrases in one coordinate system. patternTransform
 * rotates the whole pattern 23 degrees counterclockwise so lines and text
 * tilt together; baselines sit exactly on their lines because both are
 * authored in the same tile.
 *
 * Tile dimensions (960 x 448, pre-rotation):
 * - 16 ruled lines every 28px
 * - 10 cursive phrases spread across varied x positions - a wide tile
 *   with staggered x's breaks up the column-stacking that a small tile
 *   produces when it repeats.
 * - A <g> inside the pattern is animated with SMIL, slowly translating
 *   along the pattern's x-axis (which, post-rotation, is the direction
 *   of the ruled lines). Translating by one full tile width loops
 *   seamlessly because the next tile is identical.
 */

// Begin-time offsets (seconds) for each phrase's fade cycle. Chosen so
// the 10 fades feel independent rather than metronomic - no two phrases
// start their visible window at the same instant, and the stagger spans
// the full 36s cycle so at any moment roughly half the phrases are
// visible while the others are resting.
const PHRASE_FADE_OFFSETS = [0, 12, 5, 28, 17, 3, 22, 9, 31, 14];

export default function RuledCursiveBg() {
    const lines = Array.from({ length: 16 }, (_, i) => (i + 1) * 28);
    // [x, baselineY, phrase]. y values shifted up 2px from each line's
    // y so the baseline sits just above the ruled line, not flush on it.
    const phrases: Array<[number, number, string]> = [
        [40, 54, 'every idea a home'],
        [540, 110, 'characters remember'],
        [180, 166, 'worlds grow'],
        [720, 222, 'drafts upon drafts'],
        [60, 278, 'keep writing'],
        [420, 334, 'the margins are yours'],
        [800, 390, 'one note at a time'],
        [140, 446, 'nothing gets lost'],
        [600, 82, 'a story has thousands'],
        [280, 250, 'pages of wonder'],
    ];

    return (
        <svg
            className="h-full w-full"
            style={{ color: 'var(--theme-base-content)' }}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern
                    id="ruled-cursive"
                    patternUnits="userSpaceOnUse"
                    width="960"
                    height="448"
                    patternTransform="rotate(-23)"
                >
                    {/* Static ruled lines - stable backdrop. Dashed +
                        low opacity so they read as light pencil rule
                        marks rather than hard printed lines. */}
                    {lines.map((y) => (
                        <line
                            key={`line-${y}`}
                            x1="0"
                            y1={y}
                            x2="960"
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity="0.05"
                            strokeWidth="1"
                            strokeDasharray="4 5"
                            strokeLinecap="round"
                        />
                    ))}
                    {/* Cursive phrases fade in/out at staggered times.
                        Each phrase holds its visible state for ~16s and
                        its invisible state for ~14s, with ~3s transitions
                        on each edge. Pre-defined begin offsets space the
                        fades so no two phrases peak at the same moment. */}
                    {phrases.map(([x, y, text], i) => (
                        <text
                            key={`text-${y}-${x}`}
                            x={x}
                            y={y}
                            fontFamily="Caveat, Comic Sans MS, cursive"
                            fontSize="24"
                            fill="currentColor"
                            fillOpacity="0"
                        >
                            <animate
                                attributeName="fill-opacity"
                                values="0; 0.14; 0.14; 0; 0"
                                keyTimes="0; 0.1; 0.55; 0.65; 1"
                                dur="36s"
                                begin={`${PHRASE_FADE_OFFSETS[i]}s`}
                                repeatCount="indefinite"
                            />
                            {text}
                        </text>
                    ))}
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ruled-cursive)" />
        </svg>
    );
}
