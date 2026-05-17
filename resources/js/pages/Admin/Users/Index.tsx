import { Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Users → list — Stage 8c.B.
 *
 * Server-driven pagination + filtering. Search and role-filter
 * changes patch the URL via Inertia `router.get(..., { only:
 * ['users', 'filters'] })` which triggers a partial reload of just
 * the table + filter props — no full page render.
 *
 * No DataTable primitive exists in core yet; this is a plain table
 * + filter bar + pagination footer that can be extracted to a
 * shared admin/DataTable.tsx once 8c.C/8c.D have a second consumer
 * shape.
 */

interface UserRow {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
    created_at: string | null;
    email_verified_at: string | null;
    suspended_at: string | null;
    roles: string[];
}

interface RoleOption {
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

interface UsersIndexProps {
    users: Paginator<UserRow>;
    filters: { search: string; role: string };
    availableRoles: RoleOption[];
    [key: string]: unknown;
}

/**
 * Laravel's paginator labels arrive as HTML-entity strings
 * (`&laquo; Previous`, `&raquo; Next`, plus digit page numbers).
 * Decode the two known entities so we can render as plain text —
 * keeps us out of dangerouslySetInnerHTML territory.
 */
function decodePaginatorLabel(label: string): string {
    return label
        .replace(/&laquo;/g, '«')
        .replace(/&raquo;/g, '»');
}

export default function AdminUsersIndex() {
    const t = useT();
    const props = usePage<UsersIndexProps>().props;

    // Local input state — debounced commit so each keystroke doesn't
    // round-trip. URL stays canonical so the table reflects what's
    // shareable.
    const [searchInput, setSearchInput] = useState(props.filters.search);

    useEffect(() => {
        setSearchInput(props.filters.search);
    }, [props.filters.search]);

    const applyFilters = useCallback(
        (next: { search?: string; role?: string }) => {
            const params: Record<string, string> = {};
            const search = next.search ?? props.filters.search;
            const role = next.role ?? props.filters.role;
            if (search) params.search = search;
            if (role) params.role = role;
            router.get('/admin/users', params, {
                only: ['users', 'filters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [props.filters.search, props.filters.role],
    );

    // Debounce search commits (250ms quiet window).
    useEffect(() => {
        if (searchInput === props.filters.search) return;
        const timer = setTimeout(() => {
            applyFilters({ search: searchInput });
        }, 250);
        return () => clearTimeout(timer);
    }, [searchInput, props.filters.search, applyFilters]);

    return (
        <AdminLayout title={t('admin.users.title')} activeKey="users">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.users.title')}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.users.subtitle').replace(
                        ':count',
                        props.users.total.toLocaleString(),
                    )}
                </p>
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
                        placeholder={t('admin.users.search_placeholder')}
                        className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-7 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                </div>
                <select
                    value={props.filters.role}
                    onChange={(e) => applyFilters({ role: e.target.value })}
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                    <option value="">{t('admin.users.filter.all_roles')}</option>
                    {props.availableRoles.map((r) => (
                        <option key={r.name} value={r.name}>
                            {r.display_name}
                        </option>
                    ))}
                </select>
                {(props.filters.search || props.filters.role) && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput('');
                            router.get(
                                '/admin/users',
                                {},
                                {
                                    only: ['users', 'filters'],
                                    preserveScroll: true,
                                    replace: true,
                                },
                            );
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                        {t('admin.users.filter.clear')}
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-2 font-medium">{t('admin.users.col.name')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.users.col.email')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.users.col.roles')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.users.col.status')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.users.col.joined')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {props.users.data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                                    {t('admin.users.empty')}
                                </td>
                            </tr>
                        ) : (
                            props.users.data.map((u) => <UserRowTr key={u.id} user={u} t={t} />)
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            {props.users.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t('admin.users.pagination.range')
                            .replace(':from', String(props.users.from ?? 0))
                            .replace(':to', String(props.users.to ?? 0))
                            .replace(':total', props.users.total.toLocaleString())}
                    </p>
                    <div className="flex items-center gap-1">
                        {props.users.links.map((link, i) => (
                            <PaginatorButton key={i} link={link} />
                        ))}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function UserRowTr({ user, t }: { user: UserRow; t: ReturnType<typeof useT> }) {
    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <td className="px-4 py-2">
                <Link
                    href={`/admin/users/${user.id}`}
                    className="font-medium text-zinc-900 hover:text-rose-700 dark:text-zinc-100 dark:hover:text-rose-300"
                >
                    {user.display_name || user.name}
                </Link>
                {user.display_name && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">@{user.name}</p>
                )}
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{user.email}</td>
            <td className="px-4 py-2">
                {user.roles.length === 0 ? (
                    <span className="text-xs italic text-zinc-400 dark:text-zinc-600">—</span>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                            <span
                                key={role}
                                className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                                {role}
                            </span>
                        ))}
                    </div>
                )}
            </td>
            <td className="px-4 py-2">
                {user.suspended_at ? (
                    <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {t('admin.users.status.suspended')}
                    </span>
                ) : user.email_verified_at ? (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {t('admin.users.status.active')}
                    </span>
                ) : (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {t('admin.users.status.unverified')}
                    </span>
                )}
            </td>
            <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
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
            only={['users', 'filters']}
            preserveScroll
            replace
            className="rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
            {label}
        </Link>
    );
}
