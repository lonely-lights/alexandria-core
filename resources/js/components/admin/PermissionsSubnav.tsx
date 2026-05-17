import { Link } from '@inertiajs/react';

import useT from '@alexandria/hooks/useT';

/**
 * Sub-nav strip shared across the three Permissions surfaces
 * (Grid / Roles / Categories). Stage 8c.D.
 *
 * Renders below the page heading; tracks the active section via
 * the `active` prop. Lives outside the sidebar's main nav since
 * these are sub-pages of the same /admin/permissions root.
 */

type SubnavKey = 'grid' | 'roles' | 'categories';

interface PermissionsSubnavProps {
    active: SubnavKey;
}

const TABS: Array<{ key: SubnavKey; href: string; labelKey: string; icon: string }> = [
    { key: 'grid', href: '/admin/permissions', labelKey: 'admin.permissions.subnav.grid', icon: 'fa-table-cells' },
    { key: 'roles', href: '/admin/permissions/roles', labelKey: 'admin.permissions.subnav.roles', icon: 'fa-user-tag' },
    { key: 'categories', href: '/admin/permissions/categories', labelKey: 'admin.permissions.subnav.categories', icon: 'fa-folder' },
];

export default function PermissionsSubnav({ active }: PermissionsSubnavProps) {
    const t = useT();
    return (
        <nav className="mb-6 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
            {TABS.map((tab) => {
                const isActive = active === tab.key;
                return (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition ${
                            isActive
                                ? 'border-rose-500 text-rose-700 dark:border-rose-400 dark:text-rose-300'
                                : 'border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <i className={`fa-solid ${tab.icon} text-[10px]`} aria-hidden="true" />
                        {t(tab.labelKey)}
                    </Link>
                );
            })}
        </nav>
    );
}
