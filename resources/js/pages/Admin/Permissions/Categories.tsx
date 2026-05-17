import { router, useForm, usePage } from '@inertiajs/react';
import { useState, type ReactNode, type SubmitEvent } from 'react';

import PermissionsSubnav from '@alexandria/components/admin/PermissionsSubnav';
import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Permissions → Categories CRUD — Stage 8c.D.
 *
 * Categories group roles or permissions. Inline create form +
 * editable list, delete with confirm (foreign-key SET NULL means
 * roles/permissions in this category get orphaned cleanly per
 * the create_role_permission_categories migration).
 */

interface CategoryRow {
    id: number;
    name: string;
    slug: string;
    type: string;
    description: string | null;
    icon: string | null;
    sort: number;
    roles_count: number;
    permissions_count: number;
}

interface CategoriesPageProps {
    categories: CategoryRow[];
    [key: string]: unknown;
}

export default function AdminPermissionsCategories() {
    const t = useT();
    const props = usePage<CategoriesPageProps>().props;
    const [editingId, setEditingId] = useState<number | null>(null);

    return (
        <AdminLayout title={t('admin.permissions.categories.title')} activeKey="permissions">
            <header className="mb-2">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.permissions.categories.title')}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.permissions.categories.subtitle')}
                </p>
            </header>

            <PermissionsSubnav active="categories" />

            <CreateCategoryForm t={t} />

            <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-2 font-medium">{t('admin.permissions.categories.col.name')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.permissions.categories.col.type')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.permissions.categories.col.contents')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.permissions.categories.col.sort')}</th>
                            <th className="px-4 py-2 font-medium text-right">{t('admin.permissions.categories.col.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {props.categories.map((cat) =>
                            editingId === cat.id ? (
                                <EditCategoryRow
                                    key={cat.id}
                                    category={cat}
                                    onCancel={() => setEditingId(null)}
                                    onSaved={() => setEditingId(null)}
                                    t={t}
                                />
                            ) : (
                                <DisplayCategoryRow
                                    key={cat.id}
                                    category={cat}
                                    onEdit={() => setEditingId(cat.id)}
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

function CreateCategoryForm({ t }: { t: ReturnType<typeof useT> }) {
    const form = useForm({
        name: '',
        type: 'role',
        description: '',
        icon: '',
        sort: 0,
    });

    function submit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        form.post('/admin/permissions/categories', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <form
            onSubmit={submit}
            className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
            <Field label={t('admin.permissions.categories.field.name')} error={form.errors.name}>
                <input
                    type="text"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    className={inputCls}
                />
            </Field>
            <Field label={t('admin.permissions.categories.field.type')}>
                <select
                    value={form.data.type}
                    onChange={(e) => form.setData('type', e.target.value)}
                    className={inputCls}
                >
                    <option value="role">{t('admin.permissions.categories.type.roles')}</option>
                    <option value="permission">{t('admin.permissions.categories.type.permissions')}</option>
                </select>
            </Field>
            <Field label={t('admin.permissions.categories.field.icon')}>
                <input
                    type="text"
                    value={form.data.icon}
                    onChange={(e) => form.setData('icon', e.target.value)}
                    placeholder="fa-solid fa-folder"
                    className={inputCls}
                />
            </Field>
            <Field label={t('admin.permissions.categories.field.sort')}>
                <input
                    type="number"
                    value={form.data.sort}
                    min={0}
                    max={999}
                    onChange={(e) => form.setData('sort', Number(e.target.value))}
                    className={inputCls}
                />
            </Field>
            <div className="flex items-end">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="w-full rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-400"
                >
                    {form.processing ? t('common.saving') : t('admin.permissions.categories.create')}
                </button>
            </div>
        </form>
    );
}

function DisplayCategoryRow({
    category,
    onEdit,
    t,
}: {
    category: CategoryRow;
    onEdit: () => void;
    t: ReturnType<typeof useT>;
}) {
    function destroy() {
        const contents = category.roles_count + category.permissions_count;
        if (
            contents > 0 &&
            !window.confirm(
                t('admin.permissions.categories.delete_orphan_confirm')
                    .replace(':count', String(contents)),
            )
        ) {
            return;
        }
        if (contents === 0 && !window.confirm(t('admin.permissions.categories.delete_confirm'))) {
            return;
        }
        router.delete(`/admin/permissions/categories/${category.id}`, { preserveScroll: true });
    }

    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                    {category.icon && (
                        <i className={`${category.icon} text-xs text-zinc-500 dark:text-zinc-400`} aria-hidden="true" />
                    )}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{category.name}</span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{category.slug}</div>
            </td>
            <td className="px-4 py-2">
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {category.type}
                </span>
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                {category.type === 'role'
                    ? `${category.roles_count} ${t('admin.permissions.categories.roles_label')}`
                    : `${category.permissions_count} ${t('admin.permissions.categories.permissions_label')}`}
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{category.sort}</td>
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

function EditCategoryRow({
    category,
    onCancel,
    onSaved,
    t,
}: {
    category: CategoryRow;
    onCancel: () => void;
    onSaved: () => void;
    t: ReturnType<typeof useT>;
}) {
    const form = useForm({
        name: category.name,
        description: category.description ?? '',
        icon: category.icon ?? '',
        sort: category.sort,
    });

    // No event param — invoked via a button onClick (not a form
    // submit), so no preventDefault is needed.
    function submit() {
        form.patch(`/admin/permissions/categories/${category.id}`, {
            preserveScroll: true,
            onSuccess: onSaved,
        });
    }

    return (
        <tr className="bg-zinc-50 dark:bg-zinc-800/30">
            <td className="px-4 py-2">
                <input
                    type="text"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    className={inputCls}
                />
                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{category.slug}</div>
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{category.type}</td>
            <td className="px-4 py-2">
                <input
                    type="text"
                    value={form.data.icon}
                    onChange={(e) => form.setData('icon', e.target.value)}
                    className={inputCls}
                />
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    value={form.data.sort}
                    min={0}
                    max={999}
                    onChange={(e) => form.setData('sort', Number(e.target.value))}
                    className={`${inputCls} w-20`}
                />
            </td>
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
