import type { ReactNode } from 'react';

export type StatusBadgeVariant =
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'primary'
    | 'secondary'
    | 'neutral';

interface StatusBadgeProps {
    children: ReactNode;
    variant?: StatusBadgeVariant;
    icon?: string;
}

export default function StatusBadge({
    children,
    variant = 'neutral',
    icon,
}: StatusBadgeProps) {
    const palette = STATUS_BADGE_PALETTES[variant];

    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
            style={{
                background: palette.bg,
                color: palette.fg,
                borderRadius: '9999px',
            }}
        >
            {icon && <i className={`${icon} text-[10px]`} />}
            {children}
        </span>
    );
}

const STATUS_BADGE_PALETTES: Record<StatusBadgeVariant, { bg: string; fg: string }> = {
    success: {
        bg: 'var(--theme-status-success-subtle)',
        fg: 'var(--theme-status-success-fill)',
    },
    error: {
        bg: 'var(--theme-status-error-subtle)',
        fg: 'var(--theme-status-error-stroke)',
    },
    warning: {
        bg: 'var(--theme-status-warning-subtle)',
        fg: 'var(--theme-status-warning-fill)',
    },
    info: {
        bg: 'var(--theme-status-info-subtle)',
        fg: 'var(--theme-status-info-fill)',
    },
    primary: {
        bg: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
        fg: 'var(--theme-brand-primary-500)',
    },
    secondary: {
        bg: 'color-mix(in srgb, var(--theme-brand-secondary-500) 12%, transparent)',
        fg: 'var(--theme-brand-secondary-500)',
    },
    neutral: {
        bg: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
        fg: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    },
};
