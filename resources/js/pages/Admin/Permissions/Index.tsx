import { usePage } from '@inertiajs/react';
import { useState } from 'react';

import PermissionGrid, {
    type PermissionRow,
    type RoleColumn,
} from '@alexandria/components/admin/PermissionGrid';
import PermissionsSubnav from '@alexandria/components/admin/PermissionsSubnav';
import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Permissions → main grid view — Stage 8c.D.
 *
 * Two sections:
 *   - App-level grid (editable) — one table per registered
 *     package, app-level roles across the top.
 *   - Per-project grids (read-only collapsible cards) — each
 *     project's local roles + their assignments. CRUD on
 *     project-scoped roles lives in the project's members tab,
 *     not here.
 */

interface PackageRef {
    slug: string;
    name: string;
    version: string | null;
}

interface ProjectGrid {
    id: number;
    name: string;
    slug: string;
    roles: RoleColumn[];
    assignments: Record<number, number[]>;
}

interface PermissionsIndexProps {
    packages: PackageRef[];
    permissionsByPackage: Record<string, PermissionRow[]>;
    appRoles: RoleColumn[];
    assignments: Record<number, number[]>;
    projectGrids: ProjectGrid[];
    [key: string]: unknown;
}

export default function AdminPermissionsIndex() {
    const t = useT();
    const props = usePage<PermissionsIndexProps>().props;

    return (
        <AdminLayout title={t('admin.permissions.title')} activeKey="permissions">
            <header className="mb-2">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.permissions.title')}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.permissions.subtitle')}
                </p>
            </header>

            <PermissionsSubnav active="grid" />

            {/* App-level grid (editable) — one section per package */}
            <section className="space-y-6">
                {props.packages.length === 0 ? (
                    <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                        {t('admin.permissions.no_packages')}
                    </p>
                ) : (
                    props.packages.map((pkg) => {
                        const perms = props.permissionsByPackage[pkg.slug] ?? [];
                        return (
                            <PackageSection
                                key={pkg.slug}
                                pkg={pkg}
                                permissions={perms}
                                roles={props.appRoles}
                                assignments={props.assignments}
                                t={t}
                            />
                        );
                    })
                )}
            </section>

            {/* Project-scoped grids (read-only, collapsible) */}
            {props.projectGrids.length > 0 && (
                <section className="mt-10">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {t('admin.permissions.per_project_section')}
                    </h2>
                    <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {t('admin.permissions.per_project_subtitle')}
                    </p>
                    <div className="space-y-3">
                        {props.projectGrids.map((pg) => (
                            <ProjectGridSection
                                key={pg.id}
                                projectGrid={pg}
                                permissions={Object.values(props.permissionsByPackage).flat()}
                                t={t}
                            />
                        ))}
                    </div>
                </section>
            )}
        </AdminLayout>
    );
}

function PackageSection({
    pkg,
    permissions,
    roles,
    assignments,
    t,
}: {
    pkg: PackageRef;
    permissions: PermissionRow[];
    roles: RoleColumn[];
    assignments: Record<number, number[]>;
    t: ReturnType<typeof useT>;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {pkg.name}
                </h2>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {pkg.slug}
                    {pkg.version ? ` · ${pkg.version}` : ''} · {permissions.length}{' '}
                    {t('admin.permissions.grid.permissions_label')}
                </span>
            </header>
            <PermissionGrid
                roles={roles}
                permissions={permissions}
                assignments={assignments}
            />
        </div>
    );
}

function ProjectGridSection({
    projectGrid,
    permissions,
    t,
}: {
    projectGrid: ProjectGrid;
    permissions: PermissionRow[];
    t: ReturnType<typeof useT>;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            >
                <div className="flex items-center gap-2">
                    <i
                        className={`fa-solid fa-chevron-right text-[10px] text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`}
                        aria-hidden="true"
                    />
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {projectGrid.name}
                    </h3>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {projectGrid.roles.length} {t('admin.permissions.grid.roles_label')}
                </span>
            </button>
            {open && (
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <PermissionGrid
                        roles={projectGrid.roles}
                        permissions={permissions}
                        assignments={projectGrid.assignments}
                        readOnly
                    />
                </div>
            )}
        </div>
    );
}
