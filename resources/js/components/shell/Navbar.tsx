/**
 * Navbar — top bar of the new AppShell. v0 stub: brand on the left,
 * search trigger / account avatar on the right. Iterated piece by
 * piece during Stage 3.
 *
 * Reads chrome theme from :root (set by ThemeProvider at the app root).
 */

import type { ReactNode } from 'react';

export interface NavbarProps {
    /** Brand label. Defaults to "Alexandria". */
    brand?: ReactNode;

    /**
     * Slot for top-right actions (cmd-K trigger, notifications, account
     * avatar, etc.). Iterated as Stage 3 progresses.
     */
    actions?: ReactNode;
}

export default function Navbar({ brand = 'Alexandria', actions }: NavbarProps) {
    return (
        <header
            className="alex-shell-navbar flex items-center justify-between"
            style={{
                height: '3.5rem',
                paddingInline: '1.25rem',
                background: 'var(--theme-surface-header)',
                borderBottom: '1px solid var(--theme-neutral-300)',
                color: 'var(--theme-surface-on-page)',
            }}
        >
            <div
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: 'var(--theme-typography-heading-family)' }}
            >
                {brand}
            </div>
            {actions && (
                <div className="flex items-center gap-2">{actions}</div>
            )}
        </header>
    );
}
