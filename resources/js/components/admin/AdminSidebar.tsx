import { Link, usePage } from '@inertiajs/react';
import { type ReactNode, useEffect, useState } from 'react';

import LogoLockup from '@alexandria/components/brand/LogoLockup';
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
    // `string & {}` keeps AdminNavKey autocomplete while admitting
    // consumer-app keys registered via registerAdminNavGroups.
    activeKey?: AdminNavKey | (string & {});
}

type AdminNavKey =
    | 'dashboard'
    | 'users'
    | 'projects'
    | 'permissions'
    | 'registration'
    | 'invite-tokens'
    | 'lists'
    | 'emails';

interface NavLink {
    key: AdminNavKey | (string & {});
    href: string;
    labelKey: string;
    icon: string;
}

interface NavGroup {
    key: string;
    labelKey: string;
    links: NavLink[];
}

/** Public shape for consumer-app admin nav groups. */
export interface AdminNavGroup {
    labelKey: string;
    items: Array<{ key: string; href: string; labelKey: string; icon: string }>;
}

/**
 * Consumer-app extension point — extra nav groups rendered after the
 * built-ins. Registered once at app boot (same pattern as the
 * Settings slot registry); core ships no consumer concerns here, the
 * host app decides what an "extra" group is (store admin, saas ops…).
 */
let extraNavGroups: NavGroup[] = [];

export function registerAdminNavGroups(groups: AdminNavGroup[]): void {
    extraNavGroups = [
        ...extraNavGroups,
        ...groups.map((group, index) => ({
            key: `extra-${index}-${group.labelKey}`,
            labelKey: group.labelKey,
            links: group.items,
        })),
    ];
}

// Dashboard sits above the section headers (no group label) — the
// landing surface for the panel, more visually prominent without a
// section divider trying to categorize a single item.
const DASHBOARD_LINK: NavLink = {
    key: 'dashboard',
    href: '/admin',
    labelKey: 'admin.nav.dashboard',
    icon: 'fa-solid fa-gauge',
};

// Grouped navigation — section headers between groups so the admin
// IA can grow without becoming an undifferentiated dump.
//
// Growth plan:
//   - "operations" group lands when redirect tracking + logs arrive
//   - "billing" group lands when Stage 8d / 8j ship (subscriptions,
//     purchases, store admin)
//   - new substages slot into the existing group they belong to;
//     truly new domains get a new group + lang key
const NAV_GROUPS: NavGroup[] = [
    {
        key: 'people',
        labelKey: 'admin.nav.section.people',
        links: [
            { key: 'users', href: '/admin/users', labelKey: 'admin.nav.users', icon: 'fa-solid fa-users' },
            { key: 'permissions', href: '/admin/permissions', labelKey: 'admin.nav.permissions', icon: 'fa-solid fa-shield-halved' },
        ],
    },
    {
        key: 'access',
        labelKey: 'admin.nav.section.access',
        links: [
            { key: 'registration', href: '/admin/registration', labelKey: 'admin.nav.registration', icon: 'fa-solid fa-user-plus' },
            { key: 'invite-tokens', href: '/admin/invite-tokens', labelKey: 'admin.nav.invite_tokens', icon: 'fa-solid fa-key' },
            { key: 'lists', href: '/admin/lists', labelKey: 'admin.nav.lists', icon: 'fa-solid fa-list-check' },
        ],
    },
    {
        key: 'content',
        labelKey: 'admin.nav.section.content',
        links: [
            { key: 'projects', href: '/admin/projects', labelKey: 'admin.nav.projects', icon: 'fa-solid fa-folder-tree' },
        ],
    },
    {
        key: 'communications',
        labelKey: 'admin.nav.section.communications',
        links: [
            { key: 'emails', href: '/admin/emails', labelKey: 'admin.nav.emails', icon: 'fa-solid fa-envelope' },
        ],
    },
];

export default function AdminSidebar({ activeKey }: AdminSidebarProps) {
    const t = useT();
    const page = usePage<SharedProps>();
    const userName =
        (page.props.auth?.user?.name as string | undefined) ?? '—';

    return (
        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* Brand lockup + admin badge — stacked because Cinzel
                uppercase + tracking pushes "Alexandria" wide enough that
                a horizontal badge overflows the 224px sidebar. Stacking
                gives the lockup the full row and tucks the badge
                directly underneath. */}
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <LogoLockup size="sm" className="text-zinc-900 dark:text-zinc-100" />
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    <i className="fa-solid fa-shield-halved text-[8px]" aria-hidden="true" />
                    {t('admin.nav.badge')}
                </span>
            </div>

            {/* Primary nav — flex-grows so footer stays pinned. Dashboard
                floats free above the section headers; everything else is
                grouped by domain so the IA grows by category rather than
                degenerating into a flat dump. */}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
                {/* Dashboard — unsectioned, sits above the headers */}
                <ul className="mb-3 flex flex-col gap-0.5">
                    <SidebarLink
                        href={DASHBOARD_LINK.href}
                        active={activeKey === DASHBOARD_LINK.key}
                        icon={DASHBOARD_LINK.icon}
                    >
                        {t(DASHBOARD_LINK.labelKey)}
                    </SidebarLink>
                </ul>

                {[...NAV_GROUPS, ...extraNavGroups].map((group) => (
                    <div key={group.key} className="mb-3 last:mb-0">
                        <h3 className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                            {t(group.labelKey)}
                        </h3>
                        <ul className="flex flex-col gap-0.5">
                            {group.links.map((link) => (
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
                    </div>
                ))}
            </nav>

            {/* Footer: back-to-app + mode toggle + current user */}
            <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard"
                        className="inline-flex flex-1 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <i className="fa-solid fa-arrow-left text-[10px]" aria-hidden="true" />
                        {t('admin.nav.back_to_app')}
                    </Link>
                    <AdminModeToggle />
                </div>
                <p className="mt-2 truncate px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {userName}
                </p>
            </div>
        </aside>
    );
}

/**
 * Inline light/dark toggle for the admin sidebar. Deliberately
 * bypasses the legacy useTheme() React context — direct DOM
 * manipulation on document.documentElement.dataset.theme is the
 * single signal Tailwind's `dark:` custom-variant reads, so we
 * just write that. Local React state mirrors the DOM so the icon
 * stays in sync with the current mode.
 *
 * localStorage persistence matches the legacy provider's storage
 * key + value shape, so the choice survives across navigations
 * (the legacy provider's getResolvedTheme reads the same key on
 * mount and re-applies). Server-side persistence happens via the
 * legacy provider when the user navigates to a non-admin page.
 */
function AdminModeToggle() {
    const [mode, setMode] = useState<'dark' | 'light'>(() => {
        if (typeof document === 'undefined') return 'dark';
        return document.documentElement.dataset.theme === 'tf-light' ? 'light' : 'dark';
    });

    // Keep React state synced if some other surface (legacy
    // ModeToggle elsewhere in the app, system pref change) flips the
    // theme while we're mounted.
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const observer = new MutationObserver(() => {
            const next = root.dataset.theme === 'tf-light' ? 'light' : 'dark';
            setMode((prev) => (prev === next ? prev : next));
        });
        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const toggle = () => {
        const next = mode === 'dark' ? 'light' : 'dark';
        setMode(next);
        const root = document.documentElement;
        root.setAttribute('data-theme', `tf-${next}`);
        // Belt-and-suspenders — also toggle the .dark class so Tailwind's
        // default class-based dark variant fires even if the @custom-variant
        // in app.css ever drifts or fails to compile.
        root.classList.toggle('dark', next === 'dark');
        try {
            localStorage.setItem('theme', `tf-${next}`);
        } catch {
            // localStorage may be disabled — DOM update is authoritative
        }
    };

    return (
        <button
            type="button"
            onClick={toggle}
            className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <i className={`fa-solid ${mode === 'dark' ? 'fa-sun' : 'fa-moon'} text-[11px]`} aria-hidden="true" />
        </button>
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
