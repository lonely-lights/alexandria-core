import type { ButtonHTMLAttributes } from 'react';

import Button, { type ButtonSize, type ButtonVariant } from './Button';
import ButtonLink from './ButtonLink';

type ActionButtonVariant =
    | 'primary'
    | 'ghost'
    | 'error'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'outline';

interface ActionButtonProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon?: string;
    label: string;
    variant?: ActionButtonVariant;
    size?: Extract<ButtonSize, 'xs' | 'sm' | 'md'>;
    loading?: boolean;
    href?: string;
}

/**
 * Legacy compatibility wrapper. Prefer Button / ButtonLink in new code.
 */
export default function ActionButton({
    icon,
    label,
    variant = 'primary',
    size = 'sm',
    loading,
    href,
    className,
    disabled,
    ...props
}: ActionButtonProps) {
    const mappedVariant = mapVariant(variant);
    const iconElement = icon ? (
        <i className={`${icon} text-xs w-3.5 text-center`} aria-hidden="true" />
    ) : undefined;

    if (href && !disabled) {
        return (
            <ButtonLink
                href={href}
                external
                variant={mappedVariant}
                size={size}
                icon={iconElement}
                iconPosition="before"
                className={className}
            >
                {label}
            </ButtonLink>
        );
    }

    return (
        <Button
            type="button"
            variant={mappedVariant}
            size={size}
            loading={loading}
            disabled={disabled || loading}
            icon={iconElement}
            iconPosition="before"
            className={className}
            {...props}
        >
            {label}
        </Button>
    );
}

function mapVariant(variant: ActionButtonVariant): ButtonVariant {
    const variants: Record<ActionButtonVariant, ButtonVariant> = {
        primary: 'primary',
        ghost: 'ghost',
        error: 'danger',
        secondary: 'secondary',
        success: 'primary',
        warning: 'primary',
        outline: 'outline',
    };

    return variants[variant];
}
