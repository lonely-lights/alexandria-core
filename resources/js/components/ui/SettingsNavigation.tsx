import type { ReactNode } from 'react';

/** Shared category navigation for settings and inspection panels. */
export function NavItem({
    icon,
    label,
    active,
    onClick,
    trailing,
}: {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
    trailing?: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className="alex-row flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
            style={
                active
                    ? {
                          background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
                          color: 'var(--theme-brand-primary-500)',
                      }
                    : { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' }
            }
        >
            <i className={`${icon} w-4 shrink-0 text-center text-xs`} aria-hidden="true" />
            <span className="min-w-0 flex-1">{label}</span>
            {trailing}
        </button>
    );
}

export function NavGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="mb-2">
            <div
                className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}
            >
                {title}
            </div>
            {children}
        </div>
    );
}
