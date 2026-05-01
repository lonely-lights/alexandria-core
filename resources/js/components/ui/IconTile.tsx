import type { CSSProperties } from 'react';

export type DaisyColor = 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';

/**
 * FontAwesome built-in animations (FA 6+). Pass the animation name
 * without the `fa-` prefix. Use `animationStyle` to override
 * FontAwesome's CSS vars (duration, delay, iterations, scale, etc.).
 *
 * Common vars the caller can set:
 *   --fa-animation-duration, --fa-animation-delay,
 *   --fa-animation-iteration-count, --fa-animation-timing,
 *   --fa-beat-scale, --fa-fade-opacity, --fa-bounce-height, etc.
 *
 * See https://docs.fontawesome.com/web/style/animate for the full list.
 */
export type FaAnimation =
    | 'spin'
    | 'spin-pulse'
    | 'spin-reverse'
    | 'beat'
    | 'fade'
    | 'beat-fade'
    | 'bounce'
    | 'flip'
    | 'shake';

/**
 * Visual style:
 * - 'tint'  — soft colored tile (`bg-{color}/10`) with colored icon.
 *   Quiet, themeable; suits sidebar / list contexts.
 * - 'solid' — full-color tile with a dark overlay in the bottom-right
 *   corner to create two real shades. Louder; good for the app's primary
 *   hero icons where the tile itself is part of the branding.
 */
export type IconTileVariant = 'tint' | 'solid';

interface IconTileProps {
    /** Full FontAwesome class, e.g. "fa-solid fa-sticky-note". */
    icon: string;
    /** DaisyUI semantic color token. Default 'primary'. */
    color?: DaisyColor;
    /** Visual style. Default 'tint' — soft colored tile, quiet themeable look. */
    variant?: IconTileVariant;
    /** Override the icon color (Tailwind class). Defaults vary by variant. */
    iconColor?: string;
    /** FontAwesome animation to apply. */
    animation?: FaAnimation;
    /** Tile footprint. Default 'lg' — the reference proportion from the
     *  Blueprint Show page (56×56 with a 24px icon, ≈43% icon-to-tile ratio). */
    size?: 'sm' | 'md' | 'lg';
    /** Inline style for the icon, primarily for --fa-* animation vars. */
    animationStyle?: CSSProperties;
    /** Extra classes merged onto the tile wrapper. */
    className?: string;
}

// Fully-written class strings so Tailwind's JIT content scanner detects them.
const TILE_BG_SOLID: Record<DaisyColor, string> = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    accent: 'bg-accent',
    neutral: 'bg-neutral',
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
};

const TILE_BG_TINT: Record<DaisyColor, string> = {
    primary: 'bg-primary/10',
    secondary: 'bg-secondary/10',
    accent: 'bg-accent/10',
    neutral: 'bg-neutral/10',
    info: 'bg-info/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    error: 'bg-error/10',
};

const TINT_ICON_COLOR: Record<DaisyColor, string> = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
    neutral: 'text-neutral',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
};

const SOLID_ICON_COLOR: Record<DaisyColor, string> = {
    primary: 'text-primary-content',
    secondary: 'text-secondary-content',
    accent: 'text-accent-content',
    neutral: 'text-neutral-content',
    info: 'text-info-content',
    success: 'text-success-content',
    warning: 'text-warning-content',
    error: 'text-error-content',
};

// Sizes target the same icon-to-tile ratio (~42–43%) used on the
// Blueprint Show page: 56 × 24 on lg. sm/md are scaled-down siblings.
const SIZE_CLASSES: Record<NonNullable<IconTileProps['size']>, { tile: string; icon: string }> = {
    sm: { tile: 'h-10 w-10 rounded-lg', icon: 'text-base' },
    md: { tile: 'h-12 w-12 rounded-xl', icon: 'text-xl' },
    lg: { tile: 'h-14 w-14 rounded-2xl', icon: 'text-2xl' },
};

/**
 * Decorative icon tile used in page headers and section heroes.
 *
 * Two variants:
 * - `tint`  (default) — soft colored tile + colored icon.
 * - `solid` — full-color tile with a transparent→black/30 gradient
 *   overlay in the bottom-right for two real shades.
 *
 * Default size is `lg` (56×56 with a 24px icon) — the reference
 * proportion used on the Blueprint Show page.
 *
 * Examples:
 *   <IconTile icon="fa-solid fa-cube" color="primary" />
 *   <IconTile icon="fa-solid fa-sticky-note" color="secondary" variant="solid" />
 *   <IconTile icon="fa-solid fa-bell" color="warning" animation="shake" />
 */
export default function IconTile({
    icon,
    color = 'primary',
    variant = 'tint',
    iconColor,
    animation,
    size = 'lg',
    animationStyle,
    className,
}: IconTileProps) {
    const dims = SIZE_CLASSES[size];
    const bgClass = variant === 'solid' ? TILE_BG_SOLID[color] : TILE_BG_TINT[color];
    const defaultIconColor = variant === 'solid' ? SOLID_ICON_COLOR[color] : TINT_ICON_COLOR[color];
    const textColor = iconColor ?? defaultIconColor;
    const animClass = animation ? `fa-${animation}` : '';

    return (
        <div
            className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden ${dims.tile} ${bgClass}${className ? ` ${className}` : ''}`}
        >
            {/* Solid variant gets a transparent→dark overlay so the tile
                reads as two shades of the same color; tint variant leaves
                the bg alone since the /10 alpha is already soft. */}
            {variant === 'solid' && (
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/30" aria-hidden="true" />
            )}
            <i
                className={`${icon} ${animClass} relative ${dims.icon} ${textColor}`.trim()}
                style={animationStyle}
                aria-hidden="true"
            />
        </div>
    );
}
