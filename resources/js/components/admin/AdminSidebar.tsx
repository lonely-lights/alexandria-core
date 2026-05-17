import { Link, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

import useT from '@alexandria/hooks/useT';
import type { SharedProps } from '@alexandria/types';

/**
 * Admin-panel sidebar — Stage 8c.A.
 *
 * Vertical left-nav chrome distinct from the user-app Navbar:
 * hardcoded zinc/rose palette so the Stage 8b theme cascade does
 * NOT bleed through. The visual intent is "this is an operator
 * tool" — utilitarian, not branded. `dark:` Tailwind variants
 * track the user's light/dark preference via the custom variant
 * declared in app.css.
 *
 * Layout:
 *   - Top: brand + "Admin" badge
 *   - Middle: primary nav (Dashboard / Users / Projects /
 *     Permissions / Registration), flex-grows so future additions
 *     don't squeeze the footer
 *   - Bottom: back-to-app link + current-user identifier
 *
 * The flat NAV_LINKS array is easy to upgrade to grouped sections
 * (e.g. "Site" / "Content" / "System") when the count outgrows a
 * single list — keep it flat for 8c.
 */

interface AdminSidebarProps {
    activeKey?: AdminNavKey;
}

type AdminNavKey =
    | 'dashboard'
    | 'users'
    | 'projects'
    | 'permissions'
    | 'registration';

interface NavLink {
    key: AdminNavKey;
    href: string;
    labelKey: string;
    icon: string;
}

const NAV_LINKS: NavLink[] = [
    {
        key: 'dashboard',
        href: '/admin',
        labelKey: 'admin.nav.dashboard',
        icon: 'fa-solid fa-gauge',
    },
    {
        key: 'users',
        href: '/admin/users',
        labelKey: 'admin.nav.users',
        icon: 'fa-solid fa-users',
    },
    {
        key: 'projects',
        href: '/admin/projects',
        labelKey: 'admin.nav.projects',
        icon: 'fa-solid fa-folder-tree',
    },
    {
        key: 'permissions',
        href: '/admin/permissions',
        labelKey: 'admin.nav.permissions',
        icon: 'fa-solid fa-shield-halved',
    },
    {
        key: 'registration',
        href: '/admin/registration',
        labelKey: 'admin.nav.registration',
        icon: 'fa-solid fa-user-plus',
    },
];

export default function AdminSidebar({ activeKey }: AdminSidebarProps) {
    const t = useT();
    const page = usePage<SharedProps>();
    const userName =
        (page.props.auth?.user?.name as string | undefined) ?? '—';

    return (
        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* Brand + admin badge */}
            <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Alexandria
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    <i className="fa-solid fa-shield-halved text-[8px]" aria-hidden="true" />
                    {t('admin.nav.badge')}
                </span>
            </div>

            {/* Primary nav — flex-grows so footer stays pinned */}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
                <ul className="flex flex-col gap-0.5">
                    {NAV_LINKS.map((link) => (
                        <SidebarLink
                            key={link.key}
                            href={link.href}
                            active={activeKey === link.key}
                            icon={link.icon}
                        >
                            {t(link.labelKey)}
                        </SidebarLink>
                    ))}
                </ul>
            </nav>

            {/* Footer: back-to-app + current user */}
            <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
                <Link
                    href="/dashboard"
                    className="inline-flex w-full items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    <i className="fa-solid fa-arrow-left text-[10px]" aria-hidden="true" />
                    {t('admin.nav.back_to_app')}
                </Link>
                <p className="mt-2 truncate px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {userName}
                </p>
            </div>
        </aside>
    );
}

function SidebarLink({
    href,
    active,
    icon,
    children,
}: {
    href: string;
    active: boolean;
    icon: string;
    children: ReactNode;
}) {
    // Active state uses a left-border accent + tinted bg + tinted text
    // — the conventional sidebar idiom that reads cleanly at a glance.
    const base =
        'flex items-center gap-2.5 rounded-md border-l-2 px-2.5 py-1.5 text-xs font-medium transition';
    const activeClasses =
        'border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-400 dark:bg-rose-950 dark:text-rose-300';
    const idleClasses =
        'border-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800';

    return (
        <li>
            <Link
                href={href}
                className={`${base} ${active ? activeClasses : idleClasses}`}
                aria-current={active ? 'page' : undefined}
            >
                <i className={`${icon} w-3.5 text-center text-[11px]`} aria-hidden="true" />
                {children}
            </Link>
        </li>
    );
}
