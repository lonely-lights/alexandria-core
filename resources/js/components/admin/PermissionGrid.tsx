import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import useT from '@alexandria/hooks/useT';

/**
 * Permission-grid table — Stage 8c.D.
 *
 * Renders one table per package: roles across the top (sticky
 * row header), permissions down the side (sticky col header),
 * checkbox at each intersection.
 *
 * Toggle is optimistic — local state flips immediately, PATCH
 * fires, and if the server returns a non-2xx the row reverts
 * and a console error logs. `readOnly` mode renders disabled
 * checkboxes for the project-scoped grids (CRUD lives in each
 * project's members tab).
 */

export interface PermissionRow {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    category_id: number | null;
    package_slug: string | null;
}

export interface RoleColumn {
    id: number;
    name: string;
    display_name: string;
    rank: number;
    project_id: number | null;
}

interface PermissionGridProps {
    roles: RoleColumn[];
    permissions: PermissionRow[];
    /** role_id → list of permission_ids the role currently holds. */
    assignments: Record<number, number[]>;
    readOnly?: boolean;
}

export default function PermissionGrid({
    roles,
    permissions,
    assignments,
    readOnly = false,
}: PermissionGridProps) {
    const t = useT();
    // Local assignments mirror so optimistic toggle has a target.
    // Stored as Set<string> with `role:permission` keys for O(1) lookup.
    const [held, setHeld] = useState<Set<string>>(() => buildHeldSet(assignments));

    // Resync when the parent passes a new assignments snapshot
    // (e.g. after a server-side mutation reloaded the page).
    useEffect(() => {
        setHeld(buildHeldSet(assignments));
    }, [assignments]);

    function toggle(roleId: number, permissionId: number) {
        if (readOnly) return;
        const key = `${roleId}:${permissionId}`;
        const wasHeld = held.has(key);
        const nextState = !wasHeld;

        // Optimistic flip
        setHeld((prev) => {
            const next = new Set(prev);
            if (nextState) next.add(key);
            else next.delete(key);
            return next;
        });

        router.patch(
            '/admin/permissions/toggle',
            {
                role_id: roleId,
                permission_id: permissionId,
                state: nextState,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    // Revert local state on failure + surface noisily
                    // so the operator knows the click didn't stick.
                    setHeld((prev) => {
                        const next = new Set(prev);
                        if (wasHeld) next.add(key);
                        else next.delete(key);
                        return next;
                    });
                },
            },
        );
    }

    if (permissions.length === 0) {
        return (
            <p className="px-3 py-6 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                {t('admin.permissions.grid.no_permissions')}
            </p>
        );
    }

    if (roles.length === 0) {
        return (
            <p className="px-3 py-6 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                {t('admin.permissions.grid.no_roles')}
            </p>
        );
    }

    return (
        <div className="overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950/40">
                    <tr>
                        <th className="sticky left-0 z-20 border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                            {t('admin.permissions.grid.col.permission')}
                        </th>
                        {roles.map((role) => (
                            <th
                                key={role.id}
                                className="border-b border-zinc-200 px-2 py-2 text-center text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                                title={role.name}
                            >
                                {role.display_name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {permissions.map((perm) => (
                        <tr
                            key={perm.id}
                            className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                        >
                            <td className="sticky left-0 z-10 border-b border-r border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                                <div className="font-medium">{perm.display_name}</div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {perm.name}
                                </div>
                            </td>
                            {roles.map((role) => {
                                const key = `${role.id}:${perm.id}`;
                                const checked = held.has(key);
                                return (
                                    <td
                                        key={role.id}
                                        className="border-b border-zinc-100 px-2 py-1.5 text-center dark:border-zinc-800"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={readOnly}
                                            onChange={() => toggle(role.id, perm.id)}
                                            aria-label={`${role.display_name}: ${perm.display_name}`}
                                            className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-rose-600 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900"
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function buildHeldSet(assignments: Record<number, number[]>): Set<string> {
    const set = new Set<string>();
    for (const [roleId, permIds] of Object.entries(assignments)) {
        for (const permId of permIds) {
            set.add(`${roleId}:${permId}`);
        }
    }
    return set;
}
