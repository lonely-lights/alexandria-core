/**
 * Sidebar — left rail of the new AppShell. v0 stub: project switcher
 * placeholder + nav links list + footer slot. Iterated piece by piece
 * during Stage 3.
 *
 * Reads chrome theme from :root (set by ThemeProvider at the app root).
 */

import type { ReactNode } from 'react';

export interface SidebarNavItem {
    label: string;
    href: string;
    /** FontAwesome class string or ReactNode (SVG, etc.). */
    icon?: ReactNode | string;
    /** Mark as the currently-active route. */
    active?: boolean;
}

export interface SidebarProps {
    /** Nav links rendered as the primary list. */
    items?: SidebarNavItem[];

    /**
     * Slot above the nav items — typically a project switcher or
     * brand block. Iterates during Stage 3 with project/blueprint
     * navigation work.
     */
    header?: ReactNode;

    /**
     * Slot below the nav items — typically account avatar, mode
     * toggle, etc. Iterates during Stage 3.
     */
    footer?: ReactNode;
}

export default function Sidebar({ items = [], header, footer }: SidebarProps) {
    return (
        <aside
            className="alex-shell-sidebar flex flex-col"
            style={{
                width: '16rem',
                background: 'var(--theme-surface-sidebar)',
                borderInlineEnd: '1px solid var(--theme-neutral-300)',
                color: 'var(--theme-surface-on-page)',
            }}
        >
            {header && (
                <div
                    style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--theme-neutral-300)',
                    }}
                >
                    {header}
                </div>
            )}

            <nav
                className="flex-1 overflow-y-auto"
                style={{ padding: '0.75rem' }}
            >
                <ul className="flex flex-col gap-1 list-none p-0 m-0">
                    {items.map((item) => (
                        <li key={item.href}>
                            <a
                                href={item.href}
                                aria-current={item.active ? 'page' : undefined}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.625rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 'var(--theme-radius-button)',
                                    background: item.active
                                        ? 'var(--theme-brand-primary-subtle)'
                                        : 'transparent',
                                    color: item.active
                                        ? 'var(--theme-brand-primary-700)'
                                        : 'var(--theme-surface-on-page)',
                                    fontWeight: item.active ? 600 : 400,
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    transition:
                                        'background var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard)',
                                }}
                            >
                                {item.icon &&
                                    (typeof item.icon === 'string' ? (
                                        <i
                                            className={item.icon}
                                            aria-hidden="true"
                                            style={{
                                                width: '1rem',
                                                textAlign: 'center',
                                            }}
                                        />
                                    ) : (
                                        item.icon
                                    ))}
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            {footer && (
                <div
                    style={{
                        padding: '0.875rem 1.25rem',
                        borderTop: '1px solid var(--theme-neutral-300)',
                    }}
                >
                    {footer}
                </div>
            )}
        </aside>
    );
}
