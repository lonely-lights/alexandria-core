import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import useT from '@alexandria/hooks/useT';

/**
 * Multi-select app-level role editor — Stage 8c.B.
 *
 * Checkbox list of every available role; save fires `syncAppRoles`
 * server-side via PATCH /admin/users/{user}/roles. Dirty detection
 * compares the current set against the initial set so the save
 * button only activates on real change.
 */

interface RoleOption {
    name: string;
    display_name: string;
}

interface UserRoleEditorProps {
    userId: number;
    initialRoles: string[];
    availableRoles: RoleOption[];
}

export default function UserRoleEditor({
    userId,
    initialRoles,
    availableRoles,
}: UserRoleEditorProps) {
    const t = useT();
    const [selected, setSelected] = useState<Set<string>>(new Set(initialRoles));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSelected(new Set(initialRoles));
    }, [initialRoles]);

    const dirty =
        selected.size !== initialRoles.length ||
        initialRoles.some((r) => !selected.has(r));

    function toggle(role: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(role)) {
                next.delete(role);
            } else {
                next.add(role);
            }
            return next;
        });
    }

    function save() {
        setSaving(true);
        router.patch(
            `/admin/users/${userId}/roles`,
            { roles: Array.from(selected) },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    }

    function cancel() {
        setSelected(new Set(initialRoles));
    }

    return (
        <div className="space-y-3">
            <ul className="space-y-1.5">
                {availableRoles.map((role) => {
                    const checked = selected.has(role.name);
                    return (
                        <li key={role.name}>
                            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(role.name)}
                                    className="h-3.5 w-3.5 rounded border-zinc-300 text-rose-600 focus:ring-rose-400 dark:border-zinc-600 dark:bg-zinc-900"
                                />
                                <span className="text-zinc-900 dark:text-zinc-100">
                                    {role.display_name}
                                </span>
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {role.name}
                                </span>
                            </label>
                        </li>
                    );
                })}
            </ul>

            {dirty && (
                <div className="flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-400"
                    >
                        {saving ? t('common.saving') : t('admin.users.role_editor.save')}
                    </button>
                    <button
                        type="button"
                        onClick={cancel}
                        disabled={saving}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            )}
        </div>
    );
}
