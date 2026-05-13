import type { CSSProperties } from "react";

export type DaisyColor =
    | "primary"
    | "secondary"
    | "accent"
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "error";

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
    | "spin"
    | "spin-pulse"
    | "spin-reverse"
    | "beat"
    | "fade"
    | "beat-fade"
    | "bounce"
    | "flip"
    | "shake";

/**
 * Visual style:
 * - 'tint'  — soft colored tile (color at 10% alpha) with colored icon.
 *   Quiet, themeable; suits sidebar / list contexts.
 * - 'solid' — full-color tile with a dark overlay in the bottom-right
 *   corner to create two real shades. Louder; good for the app's primary
 *   hero icons where the tile itself is part of the branding.
 */
export type IconTileVariant = "tint" | "solid";

interface IconTileProps {
    /** Full FontAwesome class, e.g. "fa-solid fa-sticky-note". */
    icon: string;
    /** Semantic color token. Default 'primary'. */
    color?: DaisyColor;
    /** Visual style. Default 'tint' — soft colored tile, quiet themeable look. */
    variant?: IconTileVariant;
    /** Override the icon color. Pass a CSS color value (e.g. `'var(--theme-base-content)'`
     *  or `'#fff'`). Defaults vary by variant. */
    iconColor?: string;
    /** FontAwesome animation to apply. */
    animation?: FaAnimation;
    /** Tile footprint. Default 'lg' — the reference proportion from the
     *  Blueprint Show page (56×56 with a 24px icon, ≈43% icon-to-tile ratio). */
    size?: "sm" | "md" | "lg";
    /** Inline style for the icon, primarily for --fa-* animation vars. */
    animationStyle?: CSSProperties;
    /** Extra classes merged onto the tile wrapper. */
    className?: string;
}

/* ── Theme-token color map ────────────────────────────────────────
 * Resolves each DaisyUI-style semantic color name to the right theme
 * tokens so a preset swap repaints the tile. Brand colors (primary/
 * secondary/accent) route through `--theme-brand-*`; status colors
 * (info/success/warning/error) route through `--theme-status-*-fill`
 * + `-stroke` + `-content`; neutral falls back to base-content for
 * a monochrome variant.
 *
 *   - `fill`    — solid-variant background and tint base color.
 *   - `icon`    — tint-variant icon color (saturated, not the soft fill).
 *   - `content` — solid-variant icon color (high-contrast text-on-fill).
 */
const COLOR_TOKENS: Record<
    DaisyColor,
    { fill: string; icon: string; content: string }
> = {
    primary: {
        fill: "var(--theme-brand-primary-500)",
        icon: "var(--theme-brand-primary-500)",
        content: "var(--theme-brand-primary-content)",
    },
    secondary: {
        fill: "var(--theme-brand-secondary-500)",
        icon: "var(--theme-brand-secondary-500)",
        content: "var(--theme-brand-secondary-content)",
    },
    accent: {
        fill: "var(--theme-brand-accent-500)",
        icon: "var(--theme-brand-accent-500)",
        content: "var(--theme-brand-accent-content)",
    },
    neutral: {
        fill: "var(--theme-base-content)",
        icon: "var(--theme-base-content)",
        content: "var(--theme-base-100)",
    },
    info: {
        fill: "var(--theme-status-info-fill)",
        icon: "var(--theme-status-info-stroke)",
        content: "var(--theme-status-info-content)",
    },
    success: {
        fill: "var(--theme-status-success-fill)",
        icon: "var(--theme-status-success-stroke)",
        content: "var(--theme-status-success-content)",
    },
    warning: {
        fill: "var(--theme-status-warning-fill)",
        icon: "var(--theme-status-warning-stroke)",
        content: "var(--theme-status-warning-content)",
    },
    error: {
        fill: "var(--theme-status-error-fill)",
        icon: "var(--theme-status-error-stroke)",
        content: "var(--theme-status-error-content)",
    },
};

// Sizes target the same icon-to-tile ratio (~42–43%) used on the
// Blueprint Show page: 56 × 24 on lg. sm/md are scaled-down siblings.
const SIZE_CLASSES: Record<
    NonNullable<IconTileProps["size"]>,
    { tile: string; icon: string }
> = {
    sm: { tile: "h-10 w-10 rounded-lg", icon: "text-base" },
    md: { tile: "h-12 w-12 rounded-xl", icon: "text-xl" },
    lg: { tile: "h-14 w-14 rounded-2xl", icon: "text-2xl" },
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
    color = "primary",
    variant = "tint",
    iconColor,
    animation,
    size = "lg",
    animationStyle,
    className,
}: IconTileProps) {
    const dims = SIZE_CLASSES[size];
    const tokens = COLOR_TOKENS[color];
    const tileBg =
        variant === "solid"
            ? tokens.fill
            : `color-mix(in srgb, ${tokens.icon} 10%, transparent)`;
    const defaultIconColor = variant === "solid" ? tokens.content : tokens.icon;
    const resolvedIconColor = iconColor ?? defaultIconColor;
    const animClass = animation ? `fa-${animation}` : "";

    return (
        <div
            className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden ${dims.tile}${className ? ` ${className}` : ""}`}
            style={{ background: tileBg }}
        >
            {/* Solid variant gets a transparent→dark overlay so the tile
                reads as two shades of the same color; tint variant leaves
                the bg alone since the 10% alpha is already soft. */}
            {variant === "solid" && (
                <div
                    className="absolute inset-0 bg-gradient-to-br from-transparent to-black/30"
                    aria-hidden="true"
                />
            )}
            <i
                className={`${icon} ${animClass} relative ${dims.icon}`.trim()}
                style={{ color: resolvedIconColor, ...animationStyle }}
                aria-hidden="true"
            />
        </div>
    );
}
