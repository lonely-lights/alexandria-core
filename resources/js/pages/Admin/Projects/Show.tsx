import { Link, usePage } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';

import ProjectActionDropdown from '@alexandria/components/admin/ProjectActionDropdown';
import ProjectTransferModal from '@alexandria/components/admin/ProjectTransferModal';
import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Projects → detail — Stage 8c.C.
 *
 * Metadata-only view. NO entry content, NO entry list, NO links
 * from member rows to entries (privacy guardrail per scope
 * decision). Surfaces: owner, status pills, member roster (names
 * + project-scoped roles), storage breakdown (totals + counts).
 */

interface OwnerSummary {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
}

interface ProjectDetail {
    id: number;
    name: string;
    slug: string;
    logline: string | null;
    summary: string | null;
    owner: OwnerSummary | null;
    created_at: string | null;
    updated_at: string | null;
    locked_at: string | null;
    archived_at: string | null;
}

interface StorageBreakdown {
    entries: number;
    media_files: number;
    media_bytes: number;
}

interface MemberRow {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
    roles: string[];
}

interface ProjectsShowProps {
    project: ProjectDetail;
    storage: StorageBreakdown;
    members: MemberRow[];
    [key: string]: unknown;
}

export default function AdminProjectsShow() {
    const t = useT();
    const props = usePage<ProjectsShowProps>().props;
    const { project, storage, members } = props;
    const [transferOpen, setTransferOpen] = useState(false);

    return (
        <AdminLayout
            title={`${project.name} — ${t('admin.projects.title')}`}
            activeKey="projects"
        >
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Link href="/admin/projects" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                    {t('admin.projects.title')}
                </Link>
                <i className="fa-solid fa-chevron-right text-[8px]" aria-hidden="true" />
                <span className="text-zinc-700 dark:text-zinc-300">{project.name}</span>
            </nav>

            {/* Header card */}
            <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                {project.name}
                            </h1>
                            <StatusPill project={project} t={t} />
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{project.slug}</p>
                        {project.logline && (
                            <p className="mt-2 text-sm italic text-zinc-700 dark:text-zinc-300">
                                {project.logline}
                            </p>
                        )}
                        {project.summary && (
                            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{project.summary}</p>
                        )}
                    </div>
                    <ProjectActionDropdown
                        projectId={project.id}
                        isLocked={project.locked_at !== null}
                        isArchived={project.archived_at !== null}
                        onTransferClick={() => setTransferOpen(true)}
                    />
                </div>
            </div>

            {/* Two columns: facts + storage */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card title={t('admin.projects.detail.facts')}>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                        <Fact
                            label={t('admin.projects.detail.fact.owner')}
                            value={
                                project.owner
                                    ? `${project.owner.display_name || project.owner.name} (${project.owner.email})`
                                    : '—'
                            }
                        />
                        <Fact
                            label={t('admin.projects.detail.fact.created')}
                            value={
                                project.created_at
                                    ? new Date(project.created_at).toLocaleDateString()
                                    : '—'
                            }
                        />
                        <Fact
                            label={t('admin.projects.detail.fact.updated')}
                            value={
                                project.updated_at
                                    ? new Date(project.updated_at).toLocaleDateString()
                                    : '—'
                            }
                        />
                        <Fact
                            label={t('admin.projects.detail.fact.locked')}
                            value={
                                project.locked_at
                                    ? new Date(project.locked_at).toLocaleDateString()
                                    : '—'
                            }
                        />
                        <Fact
                            label={t('admin.projects.detail.fact.archived')}
                            value={
                                project.archived_at
                                    ? new Date(project.archived_at).toLocaleDateString()
                                    : '—'
                            }
                        />
                    </dl>
                </Card>

                <Card title={t('admin.projects.detail.storage')}>
                    <dl className="grid grid-cols-3 gap-3 text-sm">
                        <Stat
                            label={t('admin.projects.detail.stat.entries')}
                            value={storage.entries.toLocaleString()}
                        />
                        <Stat
                            label={t('admin.projects.detail.stat.media_files')}
                            value={storage.media_files.toLocaleString()}
                        />
                        <Stat
                            label={t('admin.projects.detail.stat.storage_size')}
                            value={formatBytes(storage.media_bytes)}
                        />
                    </dl>
                </Card>
            </div>

            {/* Member roster — full-width */}
            <Card title={t('admin.projects.detail.members')} className="mt-4">
                {members.length === 0 ? (
                    <p className="py-6 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                        {t('admin.projects.detail.members_empty')}
                    </p>
                ) : (
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {members.map((m) => (
                            <li
                                key={m.id}
                                className="flex items-center justify-between py-2 text-sm"
                            >
                                <div className="min-w-0">
                                    <Link
                                        href={`/admin/users/${m.id}`}
                                        className="font-medium text-zinc-900 hover:text-rose-700 dark:text-zinc-100 dark:hover:text-rose-300"
                                    >
                                        {m.display_name || m.name}
                                    </Link>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{m.email}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                    {m.roles.length === 0 ? (
                                        <span className="text-[11px] italic text-zinc-400 dark:text-zinc-600">
                                            —
                                        </span>
                                    ) : (
                                        m.roles.map((role) => (
                                            <span
                                                key={role}
                                                className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                            >
                                                {role}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <ProjectTransferModal
                open={transferOpen}
                onClose={() => setTransferOpen(false)}
                projectId={project.id}
                currentOwnerId={project.owner?.id ?? null}
            />
        </AdminLayout>
    );
}

function StatusPill({ project, t }: { project: ProjectDetail; t: ReturnType<typeof useT> }) {
    if (project.locked_at) {
        return (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {t('admin.projects.status.locked')}
            </span>
        );
    }
    if (project.archived_at) {
        return (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {t('admin.projects.status.archived')}
            </span>
        );
    }
    return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {t('admin.projects.status.active')}
        </span>
    );
}

function Card({
    title,
    children,
    className,
}: {
    title: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className ?? ''}`}>
            <header className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            </header>
            <div className="p-4">{children}</div>
        </div>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <>
            <dt className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="col-span-2 text-sm text-zinc-900 dark:text-zinc-100">{value}</dd>
        </>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</dd>
        </div>
    );
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
