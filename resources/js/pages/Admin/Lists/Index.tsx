import { Link, router, useForm, usePage } from '@inertiajs/react';
import { type ReactNode, type SubmitEvent, useCallback, useEffect, useState } from 'react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Lists → index — Stage 8c.E.3 Phase 2.
 *
 * Lists are admin-defined cohorts that grant capabilities to
 * members (auto-role, explicit permissions, feature flags). Index
 * surfaces all lists (instance + project scope) with member counts
 * and supports search/scope-filter via partial reload. Create flow
 * is a modal that POSTs to /admin/lists then redirects to the new
 * list's Show page.
 *
 * Follows the same partial-reload + URL-canonical pattern as the
 * Users/Projects indexes.
 */

interface ListRow {
    id: number;
    name: string;
    slug: string;
    scope: 'instance' | 'project';
    project_id: number | null;
    auto_role_id: number | null;
    users_count: number;
    created_at: string | null;
}

interface RoleOption {
    id: number;
    name: string;
    display_name: string;
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Paginator<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginatorLink[];
}

interface ListsIndexProps {
    lists: Paginator<ListRow>;
    filters: { scope: string | null; q: string | null };
    autoRoleOptions: RoleOption[];
    [key: string]: unknown;
}

function decodePaginatorLabel(label: string): string {
    return label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»');
}

export default function AdminListsIndex() {
    const t = useT();
    const props = usePage<ListsIndexProps>().props;

    const [searchInput, setSearchInput] = useState(props.filters.q ?? '');
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        setSearchInput(props.filters.q ?? '');
    }, [props.filters.q]);

    const applyFilters = useCallback(
        (next: { q?: string; scope?: string }) => {
            const params: Record<string, string> = {};
            const q = next.q ?? props.filters.q ?? '';
            const scope = next.scope ?? props.filters.scope ?? '';
            if (q) params.q = q;
            if (scope) params.scope = scope;
            router.get('/admin/lists', params, {
                only: ['lists', 'filters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [props.filters.q, props.filters.scope],
    );

    useEffect(() => {
        if (searchInput === (props.filters.q ?? '')) return;
        const timer = setTimeout(() => applyFilters({ q: searchInput }), 250);
        return () => clearTimeout(timer);
    }, [searchInput, props.filters.q, applyFilters]);

    return (
        <AdminLayout title={t('admin.lists.title')} activeKey="lists">
            <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {t('admin.lists.title')}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {t('admin.lists.subtitle')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                >
                    <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
                    {t('admin.lists.create')}
                </button>
            </header>

            {/* Filter bar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-64 flex-1">
                    <i
                        className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={t('admin.lists.search_placeholder')}
                        className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-7 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                </div>
                <select
                    value={props.filters.scope ?? ''}
                    onChange={(e) => applyFilters({ scope: e.target.value })}
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                    <option value="">{t('admin.lists.filter.all_scopes')}</option>
                    <option value="instance">{t('admin.lists.scope.instance')}</option>
                    <option value="project">{t('admin.lists.scope.project')}</option>
                </select>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-2 font-medium">{t('admin.lists.col.name')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.lists.col.scope')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.lists.col.members')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.lists.col.auto_role')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.lists.col.created')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {props.lists.data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                                    {t('admin.lists.empty')}
                                </td>
                            </tr>
                        ) : (
                            props.lists.data.map((row) => (
                                <ListRowTr key={row.id} row={row} t={t} autoRoleOptions={props.autoRoleOptions} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            {props.lists.last_page > 1 && (
                <div className="mt-4 flex items-center justify-end gap-1">
                    {props.lists.links.map((link, i) => (
                        <PaginatorButton key={i} link={link} />
                    ))}
                </div>
            )}

            {createOpen && (
                <CreateListModal
                    autoRoleOptions={props.autoRoleOptions}
                    onClose={() => setCreateOpen(false)}
                />
            )}
        </AdminLayout>
    );
}

function ListRowTr({
    row,
    t,
    autoRoleOptions,
}: {
    row: ListRow;
    t: ReturnType<typeof useT>;
    autoRoleOptions: RoleOption[];
}) {
    const role = row.auto_role_id
        ? autoRoleOptions.find((r) => r.id === row.auto_role_id)
        : null;

    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <td className="px-4 py-2">
                <Link
                    href={`/admin/lists/${row.id}`}
                    className="font-medium text-zinc-900 hover:text-rose-700 dark:text-zinc-100 dark:hover:text-rose-300"
                >
                    {row.name}
                </Link>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{row.slug}</p>
            </td>
            <td className="px-4 py-2">
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {t(`admin.lists.scope.${row.scope}`)}
                </span>
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{row.users_count.toLocaleString()}</td>
            <td className="px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300">
                {role ? role.display_name : <span className="italic text-zinc-400 dark:text-zinc-600">—</span>}
            </td>
            <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
            </td>
        </tr>
    );
}

function PaginatorButton({ link }: { link: PaginatorLink }) {
    const label = decodePaginatorLabel(link.label);
    if (link.url === null) {
        return (
            <span className="rounded-md px-2 py-1 text-xs text-zinc-400 dark:text-zinc-600">
                {label}
            </span>
        );
    }
    if (link.active) {
        return (
            <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {label}
            </span>
        );
    }
    return (
        <Link
            href={link.url}
            only={['lists', 'filters']}
            preserveScroll
            replace
            className="rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
            {label}
        </Link>
    );
}

function CreateListModal({
    autoRoleOptions,
    onClose,
}: {
    autoRoleOptions: RoleOption[];
    onClose: () => void;
}) {
    const t = useT();
    const form = useForm({
        name: '',
        slug: '',
        description: '',
        scope: 'instance' as 'instance' | 'project',
        project_id: null as number | null,
        auto_role_id: null as number | null,
    });

    function submit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        form.post('/admin/lists', {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.lists.create')}
                </h2>
                <form onSubmit={submit} className="space-y-3">
                    <Field label={t('admin.lists.field.name')} error={form.errors.name}>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            required
                            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                    </Field>
                    <Field label={t('admin.lists.field.slug')} error={form.errors.slug}>
                        <input
                            type="text"
                            value={form.data.slug}
                            onChange={(e) => form.setData('slug', e.target.value)}
                            placeholder="auto-generated"
                            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                    </Field>
                    <Field label={t('admin.lists.field.description')} error={form.errors.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                    </Field>
                    <Field label={t('admin.lists.field.scope')} error={form.errors.scope}>
                        <select
                            value={form.data.scope}
                            onChange={(e) => form.setData('scope', e.target.value as 'instance' | 'project')}
                            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                            <option value="instance">{t('admin.lists.scope.instance')}</option>
                            <option value="project">{t('admin.lists.scope.project')}</option>
                        </select>
                    </Field>
                    <Field label={t('admin.lists.field.auto_role')} error={form.errors.auto_role_id}>
                        <select
                            value={form.data.auto_role_id ?? ''}
                            onChange={(e) =>
                                form.setData(
                                    'auto_role_id',
                                    e.target.value ? Number(e.target.value) : null,
                                )
                            }
                            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                            <option value="">{t('admin.lists.field.no_auto_role')}</option>
                            {autoRoleOptions.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.display_name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                        >
                            {t('admin.lists.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

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
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
            {children}
            {error && <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">{error}</span>}
        </label>
    );
}
