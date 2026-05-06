/**
 * Button — Alexandria-native primary button primitive.
 *
 * Variants:
 *   - primary    (brand-primary fill, content-color text)
 *   - secondary  (brand-secondary)
 *   - accent     (brand-accent)
 *   - ghost      (transparent, on-page text, hover surface-sunken)
 *   - outline    (transparent, primary-coloured stroke + text; inverts to
 *                 filled on hover)
 *   - danger     (status-error fill)
 *
 * Sizes: sm | md | lg.
 *
 * Disabled and loading states render at 40% opacity with cursor not-allowed.
 * Hover behavior is defined globally in core/resources/css/components/buttons.css
 * via `.alex-btn--{variant}` selectors — inline styles can't reach :hover.
 *
 * Icon prop accepts a FontAwesome class string (`'fa-solid fa-arrow-right'`)
 * or any ReactNode (SVG, custom JSX). `iconPosition` (default 'after') puts
 * it before or after the text.
 *
 * For Inertia link-shaped destinations use `<ButtonLink>` instead.
 */

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'ghost'
    | 'outline'
    | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

/** FontAwesome class string or any ReactNode (SVG, custom JSX, etc.). */
export type ButtonIcon = ReactNode | string;

export type ButtonIconPosition = 'before' | 'after';

export interface ButtonStyleProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    disabled?: boolean;
}

export interface ButtonProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
        ButtonStyleProps {
    children: ReactNode;
    loading?: boolean;

    /** FontAwesome class string or ReactNode (SVG / custom JSX). */
    icon?: ButtonIcon;

    /** Where the icon sits relative to the text. Default 'after'. */
    iconPosition?: ButtonIconPosition;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled,
    icon,
    iconPosition = 'after',
    children,
    className = '',
    ...rest
}: ButtonProps) {
    const isDisabled = disabled || loading;
    const iconElement = renderIcon(icon);

    return (
        <button
            type={rest.type ?? 'button'}
            disabled={isDisabled}
            className={`alex-btn alex-btn--${variant} ${className}`}
            style={buttonStyles({
                variant,
                size,
                fullWidth,
                disabled: isDisabled,
            })}
            {...rest}
        >
            {loading && (
                <span
                    aria-hidden="true"
                    className="inline-block animate-spin"
                >
                    ⟳
                </span>
            )}
            {!loading && iconPosition === 'before' && iconElement}
            {children}
            {!loading && iconPosition === 'after' && iconElement}
        </button>
    );
}

// ============================================================================
// Shared style logic + icon helper — exported so <ButtonLink> shares verbatim
// ============================================================================

/**
 * Structural styles only — fill / foreground / border live in
 * resources/css/components/buttons.css keyed to .alex-btn--{variant}.
 * Inline beats CSS specificity, so anything we want :hover-able stays
 * out of this object.
 */
export function buttonStyles({
    size = 'md',
    fullWidth = false,
    disabled = false,
}: ButtonStyleProps): CSSProperties {
    const s = SIZE_STYLES[size];

    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: fullWidth ? '100%' : undefined,
        fontWeight: 600,
        textDecoration: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 'var(--theme-radius-button)',
        transition:
            'background var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard), color var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard), border-color var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard), opacity var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard)',
        padding: s.padding,
        fontSize: s.fontSize,
        opacity: disabled ? 0.4 : 1,
    };
}

/**
 * Render a button icon. String → FontAwesome `<i>` tag (decorative,
 * aria-hidden). ReactNode → rendered verbatim. Falsy → nothing.
 */
export function renderIcon(icon: ButtonIcon | undefined): ReactNode {
    if (!icon) {
        return null;
    }

    if (typeof icon === 'string') {
        return <i className={icon} aria-hidden="true" />;
    }

    return icon;
}

const SIZE_STYLES: Record<ButtonSize, { padding: string; fontSize: string }> = {
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
    md: { padding: '0.5rem 1rem', fontSize: '1rem' },
    lg: { padding: '0.75rem 1.5rem', fontSize: '1.125rem' },
};
