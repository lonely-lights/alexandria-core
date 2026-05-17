import { Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Projects → list — Stage 8c.C.
 *
 * Cross-tenant project list with search + status filter
 * (active / locked / archived). Server-driven pagination via
 * Inertia partial reloads — same pattern as Admin/Users/Index.
 *
 * Privacy guardrail: admin sees project metadata only. Row links
 * to the admin project detail (metadata-only view), NOT to the
 * actual /p/{slug} project shell.
 */

interface ProjectOwner {
    id: number;
    name: string;
    display_name: string | null;
}

interface ProjectRow {
    id: number;
    name: string;
    slug: string;
    logline: string | null;
    owner: ProjectOwner | null;
    blueprints_count: number;
    entries_count: number;
    created_at: string | null;
    locked_at: string | null;
    archived_at: string | null;
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

interface ProjectsIndexProps {
    projects: Paginator<ProjectRow>;
    filters: { search: string; status: string };
    [key: string]: unknown;
}

function decodePaginatorLabel(label: string): string {
    return label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»');
}

export default function AdminProjectsIndex() {
    const t = useT();
    const props = usePage<ProjectsIndexProps>().props;

    const [searchInput, setSearchInput] = useState(props.filters.search);

    useEffect(() => {
        setSearchInput(props.filters.search);
    }, [props.filters.search]);

    const applyFilters = useCallback(
        (next: { search?: string; status?: string }) => {
            const params: Record<string, string> = {};
            const search = next.search ?? props.filters.search;
            const status = next.status ?? props.filters.status;
            if (search) params.search = search;
            if (status) params.status = status;
            router.get('/admin/projects', params, {
                only: ['projects', 'filters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [props.filters.search, props.filters.status],
    );

    useEffect(() => {
        if (searchInput === props.filters.search) return;
        const timer = setTimeout(() => {
            applyFilters({ search: searchInput });
        }, 250);
        return () => clearTimeout(timer);
    }, [searchInput, props.filters.search, applyFilters]);

    return (
        <AdminLayout title={t('admin.projects.title')} activeKey="projects">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.projects.title')}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.projects.subtitle').replace(
                        ':count',
                        props.projects.total.toLocaleString(),
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
                        placeholder={t('admin.projects.search_placeholder')}
                        className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-7 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                </div>
                <select
                    value={props.filters.status}
                    onChange={(e) => applyFilters({ status: e.target.value })}
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                    <option value="">{t('admin.projects.filter.all_statuses')}</option>
                    <option value="active">{t('admin.projects.status.active')}</option>
                    <option value="locked">{t('admin.projects.status.locked')}</option>
                    <option value="archived">{t('admin.projects.status.archived')}</option>
                </select>
                {(props.filters.search || props.filters.status) && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput('');
                            router.get(
                                '/admin/projects',
                                {},
                                {
                                    only: ['projects', 'filters'],
                                    preserveScroll: true,
                                    replace: true,
                                },
                            );
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                        {t('admin.projects.filter.clear')}
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-2 font-medium">{t('admin.projects.col.name')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.projects.col.owner')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.projects.col.entries')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.projects.col.status')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.projects.col.created')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {props.projects.data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                                    {t('admin.projects.empty')}
                                </td>
                            </tr>
                        ) : (
                            props.projects.data.map((p) => <ProjectRowTr key={p.id} project={p} t={t} />)
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            {props.projects.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t('admin.projects.pagination.range')
                            .replace(':from', String(props.projects.from ?? 0))
                            .replace(':to', String(props.projects.to ?? 0))
                            .replace(':total', props.projects.total.toLocaleString())}
                    </p>
                    <div className="flex items-center gap-1">
                        {props.projects.links.map((link, i) => (
                            <PaginatorButton key={i} link={link} />
                        ))}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function ProjectRowTr({ project, t }: { project: ProjectRow; t: ReturnType<typeof useT> }) {
    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <td className="px-4 py-2">
                <Link
                    href={`/admin/projects/${project.id}`}
                    className="font-medium text-zinc-900 hover:text-rose-700 dark:text-zinc-100 dark:hover:text-rose-300"
                >
                    {project.name}
                </Link>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{project.slug}</p>
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                {project.owner ? (
                    project.owner.display_name || project.owner.name
                ) : (
                    <span className="italic text-zinc-400">{t('admin.projects.no_owner')}</span>
                )}
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                {project.entries_count.toLocaleString()}
                <span className="ml-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    / {project.blueprints_count} {t('admin.projects.col.blueprints')}
                </span>
            </td>
            <td className="px-4 py-2">
                <StatusPill project={project} t={t} />
            </td>
            <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                {project.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}
            </td>
        </tr>
    );
}

function StatusPill({ project, t }: { project: ProjectRow; t: ReturnType<typeof useT> }) {
    if (project.locked_at) {
        return (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {t('admin.projects.status.locked')}
            </span>
        );
    }
    if (project.archived_at) {
        return (
            <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {t('admin.projects.status.archived')}
            </span>
        );
    }
    return (
        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {t('admin.projects.status.active')}
        </span>
    );
}

function PaginatorButton({ link }: { link: PaginatorLink }) {
    const label = decodePaginatorLabel(link.label);
    if (link.url === null) {
        return <span className="rounded-md px-2 py-1 text-xs text-zinc-400 dark:text-zinc-600">{label}</span>;
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
            only={['projects', 'filters']}
            preserveScroll
            replace
            className="rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
            {label}
        </Link>
    );
}
