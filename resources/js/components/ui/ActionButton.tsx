import { type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { cn } from '../../lib/utils';

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon?: string;
    label: string;
    variant?: 'primary' | 'ghost' | 'error' | 'secondary' | 'success' | 'warning' | 'outline';
    size?: 'xs' | 'sm' | 'md';
    loading?: boolean;
    href?: string;
}

// Variant → alex-btn class name (theme-token driven, defined in
// core/resources/css/components/buttons.css). DaisyUI's btn-* family
// is intentionally NOT used here so colors track --theme-brand-*
// instead of DaisyUI's preset-frozen --color-primary.
//
// `error` maps to alex-btn--danger (status-error tokens). `success`
// and `warning` don't have dedicated alex-btn variants yet — falling
// back to primary so the button still paints; can be promoted to
// alex-btn--success / --warning when the use case lands.
const VARIANT_CLASSES = {
    primary: 'alex-btn--primary',
    ghost: 'alex-btn--ghost',
    error: 'alex-btn--danger',
    secondary: 'alex-btn--secondary',
    success: 'alex-btn--primary',
    warning: 'alex-btn--primary',
    outline: 'alex-btn--outline',
};

// Size → padding overrides on top of `.alex-btn` (which sets the
// medium-default 0.5rem 1rem). Inline style so the alex-btn base
// padding gets replaced, not stacked.
const SIZE_PADDING: Record<'xs' | 'sm' | 'md', string> = {
    xs: '0.25rem 0.5rem',
    sm: '0.375rem 0.75rem',
    md: '0.5rem 1rem',
};

const SIZE_FONT: Record<'xs' | 'sm' | 'md', string> = {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
};

export default function ActionButton({ icon, label, variant = 'primary', size = 'sm', loading, href, className, disabled, ...props }: ActionButtonProps) {
    const classes = cn(
        'alex-btn',
        VARIANT_CLASSES[variant],
        className,
    );

    // Inline styles drive corner radius + size-specific padding. The
    // alex-btn base in app.css already sets borderRadius via the same
    // token; carrying it here too means callers that pass a custom
    // className can't accidentally override the radius via Tailwind
    // utilities.
    const style: CSSProperties = {
        borderRadius: 'var(--theme-radius-button)',
        padding: SIZE_PADDING[size],
        fontSize: SIZE_FONT[size],
        gap: '0.375rem',
    };

    const content = (
        <>
            {loading
                ? <i className="fa-solid fa-circle-notch fa-spin text-xs" aria-hidden="true" />
                : icon && <i className={`${icon} text-xs w-3.5 text-center`} />}
            {label}
        </>
    );

    if (href && !disabled) {
        return <a href={href} className={classes} style={style}>{content}</a>;
    }

    return (
        <button type="button" className={classes} style={style} disabled={disabled || loading} {...props}>
            {content}
        </button>
    );
}
