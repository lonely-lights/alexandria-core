import { router, useForm, usePage } from '@inertiajs/react';
import { useState, type ReactNode, type SubmitEvent } from 'react';

import PermissionsSubnav from '@alexandria/components/admin/PermissionsSubnav';
import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Permissions → Roles CRUD — Stage 8c.D.
 *
 * App-level roles only (project-scoped roles are managed via
 * each project's own member tab). Inline create form at the top,
 * list of existing roles below with inline edit toggle + delete
 * (cascade-warn when the role has users assigned).
 */

interface RoleRow {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    rank: number;
    project_id: number | null;
    category_id: number | null;
    category: { id: number; name: string } | null;
    users_count: number;
}

interface CategoryRef {
    id: number;
    name: string;
    slug: string;
}

interface RolesPageProps {
    roles: RoleRow[];
    categories: CategoryRef[];
    [key: string]: unknown;
}

export default function AdminPermissionsRoles() {
    const t = useT();
    const props = usePage<RolesPageProps>().props;
    const [editingId, setEditingId] = useState<number | null>(null);

    return (
        <AdminLayout title={t('admin.permissions.roles.title')} activeKey="permissions">
            <header className="mb-2">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.permissions.roles.title')}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.permissions.roles.subtitle')}
                </p>
            </header>

            <PermissionsSubnav active="roles" />

            <CreateRoleForm categories={props.categories} t={t} />

            <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-2 font-medium">{t('admin.permissions.roles.col.name')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.permissions.roles.col.category')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.permissions.roles.col.rank')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.permissions.roles.col.users')}</th>
                            <th className="px-4 py-2 font-medium text-right">{t('admin.permissions.roles.col.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {props.roles.map((role) =>
                            editingId === role.id ? (
                                <EditRoleRow
                                    key={role.id}
                                    role={role}
                                    categories={props.categories}
                                    onCancel={() => setEditingId(null)}
                                    onSaved={() => setEditingId(null)}
                                    t={t}
                                />
                            ) : (
                                <DisplayRoleRow
                                    key={role.id}
                                    role={role}
                                    siblingRoles={props.roles.filter((r) => r.id !== role.id)}
                                    onEdit={() => setEditingId(role.id)}
                                    t={t}
                                />
                            ),
                        )}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}

function CreateRoleForm({
    categories,
    t,
}: {
    categories: CategoryRef[];
    t: ReturnType<typeof useT>;
}) {
    const form = useForm({
        name: '',
        display_name: '',
        description: '',
        category_id: '',
        rank: 50,
    });

    function submit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        form.post('/admin/permissions/roles', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <form
            onSubmit={submit}
            className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
            <Field label={t('admin.permissions.roles.field.name')} error={form.errors.name}>
                <input
                    type="text"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder="role-slug"
                    className={inputCls}
                />
            </Field>
            <Field label={t('admin.permissions.roles.field.display_name')} error={form.errors.display_name}>
                <input
                    type="text"
                    value={form.data.display_name}
                    onChange={(e) => form.setData('display_name', e.target.value)}
                    className={inputCls}
                />
            </Field>
            <Field label={t('admin.permissions.roles.field.category')}>
                <select
                    value={form.data.category_id}
                    onChange={(e) => form.setData('category_id', e.target.value)}
                    className={inputCls}
                >
                    <option value="">{t('admin.permissions.roles.field.no_category')}</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label={t('admin.permissions.roles.field.rank')} error={form.errors.rank}>
                <input
                    type="number"
                    value={form.data.rank}
                    min={0}
                    max={999}
                    onChange={(e) => form.setData('rank', Number(e.target.value))}
                    className={inputCls}
                />
            </Field>
            <div className="flex items-end">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="w-full rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-400"
                >
                    {form.processing ? t('common.saving') : t('admin.permissions.roles.create')}
                </button>
            </div>
        </form>
    );
}

function DisplayRoleRow({
    role,
    siblingRoles,
    onEdit,
    t,
}: {
    role: RoleRow;
    siblingRoles: RoleRow[];
    onEdit: () => void;
    t: ReturnType<typeof useT>;
}) {
    function destroy() {
        let reassign: string | null = null;
        if (role.users_count > 0) {
            const names = siblingRoles
                .map((r) => `  ${r.id}: ${r.display_name}`)
                .join('\n');
            reassign = window.prompt(
                t('admin.permissions.roles.delete_cascade_prompt')
                    .replace(':users', String(role.users_count))
                    .replace(':roles', names),
                '',
            );
            if (reassign === null) return; // user cancelled
        } else if (!window.confirm(t('admin.permissions.roles.delete_confirm'))) {
            return;
        }
        router.delete(`/admin/permissions/roles/${role.id}`, {
            data: reassign ? { reassign_to_role_id: Number(reassign) } : {},
            preserveScroll: true,
        });
    }

    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <td className="px-4 py-2">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{role.display_name}</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{role.name}</div>
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                {role.category?.name ?? <span className="italic text-zinc-400">—</span>}
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{role.rank}</td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{role.users_count}</td>
            <td className="px-4 py-2 text-right">
                <button
                    type="button"
                    onClick={onEdit}
                    className="mr-2 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                    {t('common.edit')}
                </button>
                <button
                    type="button"
                    onClick={destroy}
                    className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                >
                    {t('common.delete')}
                </button>
            </td>
        </tr>
    );
}

function EditRoleRow({
    role,
    categories,
    onCancel,
    onSaved,
    t,
}: {
    role: RoleRow;
    categories: CategoryRef[];
    onCancel: () => void;
    onSaved: () => void;
    t: ReturnType<typeof useT>;
}) {
    const form = useForm({
        display_name: role.display_name,
        description: role.description ?? '',
        category_id: role.category_id ? String(role.category_id) : '',
        rank: role.rank,
    });

    // No event param — invoked via a button onClick (not a form
    // submit), so no preventDefault is needed.
    function submit() {
        form.patch(`/admin/permissions/roles/${role.id}`, {
            preserveScroll: true,
            onSuccess: onSaved,
        });
    }

    return (
        <tr className="bg-zinc-50 dark:bg-zinc-800/30">
            <td className="px-4 py-2">
                <input
                    type="text"
                    value={form.data.display_name}
                    onChange={(e) => form.setData('display_name', e.target.value)}
                    className={inputCls}
                />
                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{role.name}</div>
            </td>
            <td className="px-4 py-2">
                <select
                    value={form.data.category_id}
                    onChange={(e) => form.setData('category_id', e.target.value)}
                    className={inputCls}
                >
                    <option value="">{t('admin.permissions.roles.field.no_category')}</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    value={form.data.rank}
                    min={0}
                    max={999}
                    onChange={(e) => form.setData('rank', Number(e.target.value))}
                    className={`${inputCls} w-20`}
                />
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{role.users_count}</td>
            <td className="px-4 py-2 text-right">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={form.processing}
                    className="mr-2 text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                    {t('common.cancel')}
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={form.processing}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50 dark:text-rose-400 dark:hover:text-rose-300"
                >
                    {form.processing ? t('common.saving') : t('common.save')}
                </button>
            </td>
        </tr>
    );
}

const inputCls =
    'w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {label}
            </label>
            <div className="mt-1">{children}</div>
            {error && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
    );
}
