/**
 * Button — Alexandria-native primary button primitive.
 *
 * Variants:
 *   - primary    (brand-primary fill, content-color text)
 *   - secondary  (brand-secondary)
 *   - accent     (brand-accent)
 *   - ghost      (transparent, on-page text, hover surface-sunken)
 *   - outline    (transparent, primary-coloured stroke + text)
 *   - danger     (status-error fill)
 *
 * Sizes: sm | md | lg.
 *
 * Disabled and loading states render at 50% opacity with cursor-not-allowed.
 * For Inertia link-shaped destinations use `<ButtonLink>` instead.
 */

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export type ButtonVariant =
    | 'primary' | 'secondary' | 'accent'
    | 'ghost' | 'outline' | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    disabled?: boolean;
}

export interface ButtonProps extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    ButtonStyleProps {
    children: ReactNode;
    loading?: boolean;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled,
    children,
    className = '',
    ...rest
}: ButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <button
            type={rest.type ?? 'button'}
            disabled={isDisabled}
            className={`alex-btn ${className}`}
            style={buttonStyles({ variant, size, fullWidth, disabled: isDisabled })}
            {...rest}
        >
            {loading && (
                <span
                    aria-hidden="true"
                    className="inline-block animate-spin"
                    style={{ marginInlineEnd: '0.5rem' }}
                >
                    ⟳
                </span>
            )}
            {children}
        </button>
    );
}

// ============================================================================
// Shared style logic — exported so <ButtonLink> shares it verbatim
// ============================================================================

export function buttonStyles({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
}: ButtonStyleProps): CSSProperties {
    const v = VARIANT_STYLES[variant];
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
        transition: 'background var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), opacity var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
        border: v.border ?? 'none',
        background: v.background,
        color: v.color,
        padding: s.padding,
        fontSize: s.fontSize,
        opacity: disabled ? 0.4 : 1,
    };
}

const VARIANT_STYLES: Record<ButtonVariant, {
    background: string;
    color: string;
    border?: string;
}> = {
    primary: {
        background: 'var(--theme-brand-primary-500)',
        color: 'var(--theme-brand-primary-content)',
    },
    secondary: {
        background: 'var(--theme-brand-secondary-500)',
        color: 'var(--theme-brand-secondary-content)',
    },
    accent: {
        background: 'var(--theme-brand-accent-500)',
        color: 'var(--theme-brand-accent-content)',
    },
    ghost: {
        background: 'transparent',
        color: 'var(--theme-surface-on-page)',
    },
    outline: {
        background: 'transparent',
        color: 'var(--theme-brand-primary-500)',
        border: '1px solid var(--theme-brand-primary-500)',
    },
    danger: {
        background: 'var(--theme-status-error-fill)',
        color: 'var(--theme-status-error-content)',
    },
};

const SIZE_STYLES: Record<ButtonSize, { padding: string; fontSize: string }> = {
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
    md: { padding: '0.5rem 1rem',      fontSize: '1rem' },
    lg: { padding: '0.75rem 1.5rem',   fontSize: '1.125rem' },
};
