import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon?: string;
    label: string;
    variant?: 'primary' | 'ghost' | 'error' | 'secondary' | 'success' | 'warning';
    size?: 'xs' | 'sm' | 'md';
    loading?: boolean;
    href?: string;
}

const VARIANT_CLASSES = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    error: 'btn-ghost text-error',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
};

const SIZE_CLASSES = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
};

export default function ActionButton({ icon, label, variant = 'primary', size = 'sm', loading, href, className, disabled, ...props }: ActionButtonProps) {
    const classes = cn(
        'btn gap-1.5',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
    );

    // Corner radius rides on --theme-radius-button so it tracks the
    // active theme's roundedness preference (soft / sharp / pill)
    // rather than DaisyUI's --radius-field. Inline style beats DaisyUI's
    // .btn radius on specificity.
    const style = { borderRadius: 'var(--theme-radius-button)' };

    const content = (
        <>
            {loading ? <span className="loading loading-spinner loading-xs" /> : icon && <i className={`${icon} text-xs w-3.5 text-center`} />}
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
