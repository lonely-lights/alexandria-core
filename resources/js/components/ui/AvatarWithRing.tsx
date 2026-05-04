import { type CSSProperties } from 'react';

export interface RingSettings {
    type?: string;
    color?: string;
    opacity?: number;
    gradient?: string;
    animation_duration?: number;
}

export interface AvatarRingOption {
    slug: string;
    label: string;
    description: string | null;
    is_animated: boolean;
    settings: RingSettings | null;
}

interface AvatarWithRingProps {
    src?: string | null;
    alt?: string;
    initials?: string;
    size?: number;
    ring?: string;
    ringSettings?: RingSettings | null;
    /** Total ring + gap thickness per side in pixels (default 6) */
    ringThickness?: number;
}

export default function AvatarWithRing({
    src,
    alt = 'Avatar',
    initials = '?',
    size = 128,
    ring = 'none',
    ringSettings,
    ringThickness = 6,
}: AvatarWithRingProps) {
    const avatarSize = size;
    const gapSize = size + ringThickness;
    const ringSize = size + ringThickness * 2;

    const isAnimated = ring === 'animated' || ring === 'rainbow';
    const gradient = ringSettings?.gradient;

    const outerSize = ring !== 'none' ? ringSize : avatarSize;

    return (
        <div className="relative inline-flex flex-shrink-0 items-center justify-center" style={{ width: outerSize, height: outerSize, minWidth: outerSize, minHeight: outerSize }}>
            {/* Ring animation keyframes */}
            {isAnimated && (
                <style>{`
                    @keyframes avatar-ring-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            )}

            {ring !== 'none' && (
                <>
                    {/* Outer ring container (static mask) */}
                    <div
                        className="absolute mask mask-squircle overflow-hidden"
                        style={{ width: ringSize, height: ringSize }}
                    >
                        {ring === 'solid' ? (
                            <div
                                className="h-full w-full"
                                style={{
                                    // DaisyUI 5: --color-primary etc. ship as full
                                    // oklch() strings (not legacy v4's HSL components
                                    // behind --p / --s / --a), so use the v5 name
                                    // directly and color-mix in transparent for the
                                    // opacity blend. Map legacy v4 short slugs
                                    // ('p'/'s'/'a') to v5 names so existing DB
                                    // settings keep working without a migration.
                                    backgroundColor: solidRingColor(ringSettings?.color, ringSettings?.opacity),
                                }}
                            />
                        ) : (
                            <div
                                className="absolute inset-[-50%] h-[200%] w-[200%]"
                                style={{
                                    background: gradient
                                        ? translateLegacyDaisyTokens(gradient)
                                        : 'conic-gradient(from 0deg, var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-primary))',
                                    ...(isAnimated ? {
                                        animation: `avatar-ring-spin ${ringSettings?.animation_duration ?? 3}s linear infinite`,
                                    } : {}),
                                } as CSSProperties}
                            />
                        )}
                    </div>

                    {/* Gap layer */}
                    <div
                        className="absolute mask mask-squircle bg-base-200"
                        style={{ width: gapSize, height: gapSize }}
                    />
                </>
            )}

            {/* Avatar */}
            <div
                className="relative mask mask-squircle overflow-hidden bg-base-300 shadow-xl"
                style={{ width: avatarSize, height: avatarSize }}
            >
                {src ? (
                    <img src={src} alt={alt} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30">
                        <span
                            className="select-none font-bold text-primary/50"
                            style={{ fontSize: avatarSize * 0.4 }}
                        >
                            {initials}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── DaisyUI v4 → v5 token shims ──
 * AvatarRing seed data was authored against DaisyUI 4 (CSS vars
 * --p/--s/--a holding raw HSL components consumed via oklch(...)).
 * DaisyUI 5 ships fully-formed oklch strings under --color-primary
 * /--color-secondary/--color-accent, so wrapping them in oklch()
 * again produces invalid CSS (oklch(oklch(...))) — solid + gradient
 * + animated + rainbow rings all rendered as transparent. Translate
 * on read so existing DB rows keep working without a migration. */

const TOKEN_MAP: Record<string, string> = {
    p: '--color-primary',
    s: '--color-secondary',
    a: '--color-accent',
    n: '--color-neutral',
    b1: '--color-base-100',
    b2: '--color-base-200',
    b3: '--color-base-300',
    bc: '--color-base-content',
    primary: '--color-primary',
    secondary: '--color-secondary',
    accent: '--color-accent',
    neutral: '--color-neutral',
};

function resolveTokenName(slug: string): string {
    return TOKEN_MAP[slug] ?? `--color-${slug}`;
}

function solidRingColor(slug: string | undefined, opacity: number | undefined): string {
    const cssVar = `var(${resolveTokenName(slug ?? 'primary')})`;
    const pct = Math.max(0, Math.min(100, opacity ?? 50));

    return `color-mix(in srgb, ${cssVar} ${pct}%, transparent)`;
}

/**
 * Rewrite a DB-stored CSS string (gradient etc.) from the v4
 * `oklch(var(--X))` form to the v5 `var(--color-X)` form. No-op for
 * strings already authored against v5.
 */
function translateLegacyDaisyTokens(css: string): string {
    return css.replace(/oklch\(\s*var\(--(\w+)\)\s*(\/\s*[^)]+)?\)/g, (_match, slug, alpha) => {
        const v5Var = `var(${resolveTokenName(slug)})`;

        if (!alpha) {
            return v5Var;
        }
        // Preserve `oklch(var(--p) / 50%)` -> color-mix opacity blend.
        const pct = alpha.replace(/[\s/]/g, '');

        return `color-mix(in srgb, ${v5Var} ${pct}, transparent)`;
    });
}
