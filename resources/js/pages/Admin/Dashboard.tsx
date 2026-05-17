import { Link, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin landing dashboard — Stage 8c.A.
 *
 * At-a-glance counters + recent activity. Heavy aggregates (per-
 * project storage breakdowns, per-user audit logs) live on their
 * own substage surfaces; this page stays cheap.
 */

interface RecentSignup {
    id: number;
    name: string;
    email: string;
    created_at: string | null;
}

interface RecentProject {
    id: number;
    name: string;
    slug: string;
    owner_id: number;
    created_at: string | null;
}

interface DashboardProps {
    userStats: { total: number; new_last_7_days: number };
    projectStats: { total: number; created_last_7_days: number };
    entryStats: { total: number };
    recentSignups: RecentSignup[];
    recentProjects: RecentProject[];
    [key: string]: unknown;
}

export default function AdminDashboard() {
    const t = useT();
    const props = usePage<DashboardProps>().props;

    return (
        <AdminLayout title={t('admin.dashboard.title')} activeKey="dashboard">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.dashboard.title')}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.dashboard.subtitle')}
                </p>
            </header>

            <section className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon="fa-solid fa-users"
                    label={t('admin.dashboard.stat.users_total')}
                    value={props.userStats.total}
                    delta={t('admin.dashboard.stat.delta.last_7_days').replace(
                        ':count',
                        String(props.userStats.new_last_7_days),
                    )}
                />
                <StatCard
                    icon="fa-solid fa-folder-tree"
                    label={t('admin.dashboard.stat.projects_total')}
                    value={props.projectStats.total}
                    delta={t('admin.dashboard.stat.delta.last_7_days').replace(
                        ':count',
                        String(props.projectStats.created_last_7_days),
                    )}
                />
                <StatCard
                    icon="fa-solid fa-database"
                    label={t('admin.dashboard.stat.entries_total')}
                    value={props.entryStats.total}
                />
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
                <Panel
                    title={t('admin.dashboard.recent_signups.title')}
                    empty={props.recentSignups.length === 0}
                    emptyLabel={t('admin.dashboard.recent_signups.empty')}
                >
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {props.recentSignups.map((u) => (
                            <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{u.name}</p>
                                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                                </div>
                                <time className="ml-3 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                                    {u.created_at ? formatRelative(u.created_at) : '—'}
                                </time>
                            </li>
                        ))}
                    </ul>
                </Panel>

                <Panel
                    title={t('admin.dashboard.recent_projects.title')}
                    empty={props.recentProjects.length === 0}
                    emptyLabel={t('admin.dashboard.recent_projects.empty')}
                >
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {props.recentProjects.map((p) => (
                            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                                <Link
                                    href={`/p/${p.slug}`}
                                    className="min-w-0 flex-1 truncate font-medium text-zinc-900 hover:text-rose-700 dark:text-zinc-100 dark:hover:text-rose-300"
                                >
                                    {p.name}
                                </Link>
                                <time className="ml-3 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                                    {p.created_at ? formatRelative(p.created_at) : '—'}
                                </time>
                            </li>
                        ))}
                    </ul>
                </Panel>
            </section>
        </AdminLayout>
    );
}

function StatCard({
    icon,
    label,
    value,
    delta,
}: {
    icon: string;
    label: string;
    value: number;
    delta?: string;
}) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <i className={`${icon} text-[11px]`} aria-hidden="true" />
                {label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {value.toLocaleString()}
            </p>
            {delta && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{delta}</p>
            )}
        </div>
    );
}

function Panel({
    title,
    children,
    empty,
    emptyLabel,
}: {
    title: string;
    children: ReactNode;
    empty: boolean;
    emptyLabel: string;
}) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <header className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            </header>
            <div className="px-4 py-2">
                {empty ? (
                    <p className="py-6 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                        {emptyLabel}
                    </p>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

/**
 * Compact relative-time formatter. ~30 LOC of bespoke logic vs.
 * pulling in date-fns just for one admin page.
 */
function formatRelative(iso: string): string {
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}
