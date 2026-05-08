import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import AppLayout from '../layouts/AppLayout';

type ProjectViewMode = 'grid' | 'rows' | 'table';
const PROJECT_VIEW_STORAGE_KEY = 'dashboard:project-view';

interface DashboardProject {
    id: number;
    name: string;
    slug: string;
    logline: string | null;
    entries_count: number;
    blueprints_count: number;
    members_count: number;
    page_image_url: string | null;
    banner_url: string | null;
    last_activity: string | null;
    last_activity_timestamp: number | null;
}

interface RecentEntry {
    id: number;
    name: string;
    slug: string;
    summary: string | null;
    blueprint_name: string | null;
    blueprint_icon: string | null;
    project_name: string | null;
    project_slug: string | null;
    updated_at: string | null;
}

interface DashboardStats {
    projects: number;
    entries: number;
    blueprints: number;
}

interface DashboardGreeting {
    name: string;
}

function greetingForHour(hour: number): string {
    if (hour < 5) return 'Late night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
}

interface DashboardProps {
    projects: DashboardProject[];
    recentEntries: RecentEntry[];
    stats: DashboardStats;
    greeting: DashboardGreeting;
}

export default function Dashboard() {
    const { projects, recentEntries, stats, greeting } = usePage<{ props: DashboardProps }>().props as unknown as DashboardProps;

    const [viewMode, setViewMode] = useState<ProjectViewMode>('grid');
    const [greetingTime, setGreetingTime] = useState<string>(() => greetingForHour(new Date().getHours()));

    // Refresh the greeting every minute so it updates if the user crosses a
    // time-of-day boundary while sitting on the dashboard.
    useEffect(() => {
        const id = window.setInterval(() => {
            setGreetingTime(greetingForHour(new Date().getHours()));
        }, 60_000);
        return () => window.clearInterval(id);
    }, []);

    // Load persisted view-mode preference.
    useEffect(() => {
        try {
            const stored = localStorage.getItem(PROJECT_VIEW_STORAGE_KEY);
            if (stored === 'grid' || stored === 'rows' || stored === 'table') {
                setViewMode(stored);
            }
        } catch { /* storage unavailable */ }
    }, []);

    function changeViewMode(mode: ProjectViewMode) {
        setViewMode(mode);
        try { localStorage.setItem(PROJECT_VIEW_STORAGE_KEY, mode); } catch { /* noop */ }
    }

    const projectsSection = (
        <section className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                    <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">Projects</h2>
                    <span className="badge badge-sm badge-ghost">
                        {projects.length} {projects.length === 1 ? 'world' : 'worlds'}
                    </span>
                </div>
                <ViewToggle current={viewMode} onChange={changeViewMode} />
            </div>

            {projects.length === 0 ? (
                <EmptyState
                    icon="fa-folder-open"
                    title="No projects yet"
                    description="Create your first project to start building your world."
                />
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            ) : viewMode === 'rows' ? (
                <div className="space-y-3">
                    {projects.map((project) => (
                        <ProjectRow key={project.id} project={project} />
                    ))}
                </div>
            ) : (
                <ProjectTable projects={projects} />
            )}
        </section>
    );

    const recentSection = (
        <section>
            <h2 className="mb-5 font-serif text-2xl md:text-3xl font-bold tracking-tight">Recent</h2>
            {recentEntries.length > 0 ? (
                <div className="divide-y divide-base-content/5 rounded-2xl border border-base-content/10 bg-base-200/50 overflow-hidden">
                    {recentEntries.map((entry) => (
                        <RecentEntryRow key={entry.id} entry={entry} />
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-base-content/10 bg-base-200/50 p-8 text-center">
                    <p className="text-sm text-base-content/50">No recent activity</p>
                </div>
            )}
        </section>
    );

    return (
        <AppLayout title="Dashboard">
            <div className="container mx-auto max-w-7xl px-4 py-8 lg:py-12">
                {/* Greeting header + inline quick actions */}
                <header className="mb-10 grid grid-cols-1 items-end gap-6 lg:grid-cols-[1fr_auto] lg:gap-10">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[.25em] text-primary/80 mb-2">
                            {greetingTime}
                        </div>
                        <h1 className="font-serif text-5xl md:text-6xl font-bold leading-none tracking-tight">
                            {greeting.name}.
                        </h1>
                        <p className="mt-3 text-base text-base-content/60">
                            Your worldbuilding at a glance.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <QuickActionTile href="/profile" icon="fa-user-gear" label="Profile" />
                        <QuickActionTile href="/ai/suggestions" icon="fa-wand-magic-sparkles" label="AI suggestions" />
                        <QuickActionTile href="/settings#pref-appearance" icon="fa-palette" label="Appearance" />
                    </div>
                </header>

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-3 md:gap-5 mb-10">
                    <StatTile label="Projects" value={stats.projects} icon="fa-folder-tree" accent="text-primary" />
                    <StatTile label="Entries" value={stats.entries} icon="fa-file-lines" accent="text-secondary" />
                    <StatTile label="Blueprints" value={stats.blueprints} icon="fa-cubes" accent="text-accent" />
                </div>

                {/* Two-column layout is consistent across view modes — only the
                    INTERNAL rendering of the Projects column changes. */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)] gap-8">
                    {projectsSection}
                    <aside className="min-w-0 space-y-8">
                        {recentSection}
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}

/* ─────────────────── sub-components ─────────────────── */

function StatTile({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
    return (
        <div className="rounded-2xl border border-base-content/10 bg-base-200/50 p-5">
            <div className="flex items-center gap-2 mb-3">
                <i className={`fa-solid ${icon} text-sm ${accent}`} aria-hidden="true" />
                <div className="text-[11px] font-semibold uppercase tracking-[.25em] text-base-content/50">{label}</div>
            </div>
            <div className="font-serif text-4xl md:text-5xl font-bold tracking-tight">{value}</div>
        </div>
    );
}

function ProjectCard({ project }: { project: DashboardProject }) {
    return (
        <a
            href={`/p/${project.slug}`}
            className="group block overflow-hidden rounded-2xl border border-base-content/10 bg-base-200 shadow-sm transition-all hover:shadow-lg hover:border-primary/30"
        >
            {/* Banner */}
            {project.banner_url ? (
                <div
                    className="h-28 w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{ backgroundImage: `url(${project.banner_url})` }}
                />
            ) : (
                <div className="h-28 w-full bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20" />
            )}

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start gap-4">
                    {project.page_image_url ? (
                        <img
                            src={project.page_image_url}
                            alt={project.name}
                            className="-mt-12 h-16 w-16 flex-shrink-0 rounded-xl border-4 border-base-200 object-cover shadow-md"
                        />
                    ) : (
                        <div className="-mt-12 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-4 border-base-200 bg-base-300 shadow-md">
                            <i className="fa-solid fa-globe text-xl text-base-content/30" aria-hidden="true" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1 pt-1">
                        <h3 className="font-serif text-xl font-bold leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
                            {project.name}
                        </h3>
                    </div>
                </div>

                {project.logline && (
                    <p className="mt-3 text-sm text-base-content/60 line-clamp-2 leading-relaxed">{project.logline}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/50">
                    <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-file-lines text-primary/50" aria-hidden="true" />
                        {project.entries_count}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-cubes text-secondary/50" aria-hidden="true" />
                        {project.blueprints_count}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-users text-accent/50" aria-hidden="true" />
                        {project.members_count}
                    </span>
                </div>
            </div>
        </a>
    );
}

function RecentEntryRow({ entry }: { entry: RecentEntry }) {
    const iconClass = entry.blueprint_icon
        ? (entry.blueprint_icon.includes(' ') ? entry.blueprint_icon : `fa-solid ${entry.blueprint_icon}`)
        : 'fa-solid fa-file';

    return (
        <a
            href={`/p/${entry.project_slug}/${entry.blueprint_name?.toLowerCase()}/${entry.slug}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-base-300/50"
        >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-300">
                <i className={`${iconClass} text-sm text-base-content/60`} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.name}</p>
                <p className="text-xs text-base-content/50 truncate">
                    {entry.blueprint_name} · {entry.project_name}
                </p>
            </div>
            <span className="flex-shrink-0 text-xs text-base-content/40">{entry.updated_at}</span>
        </a>
    );
}

function QuickActionTile({ href, icon, label }: { href: string; icon: string; label: string }) {
    return (
        <a
            href={href}
            className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-base-content/10 bg-base-200/50 px-4 py-5 text-center transition-all hover:border-primary/30 hover:bg-base-200"
            aria-label={label}
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <i className={`fa-solid ${icon} text-2xl`} aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold leading-tight truncate w-full">{label}</span>
        </a>
    );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="rounded-2xl border-2 border-dashed border-base-content/10 bg-base-200/30 px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-base-300">
                <i className={`fa-solid ${icon} text-2xl text-base-content/30`} aria-hidden="true" />
            </div>
            <h3 className="font-serif text-xl font-bold">{title}</h3>
            <p className="mt-1 text-sm text-base-content/60">{description}</p>
        </div>
    );
}

function ViewToggle({ current, onChange }: { current: ProjectViewMode; onChange: (m: ProjectViewMode) => void }) {
    const buttons: Array<{ key: ProjectViewMode; icon: string; label: string }> = [
        { key: 'grid', icon: 'fa-grip', label: 'Grid' },
        { key: 'rows', icon: 'fa-bars', label: 'Rows' },
        { key: 'table', icon: 'fa-table', label: 'Table' },
    ];
    return (
        <div
            className="inline-flex items-center rounded-full p-1 bg-base-200 border border-base-content/10"
            role="tablist"
            aria-label="Project view mode"
        >
            {buttons.map((b) => {
                const active = current === b.key;
                return (
                    <button
                        key={b.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-label={b.label}
                        title={b.label}
                        onClick={() => onChange(b.key)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
                            active
                                ? 'bg-primary text-primary-content shadow-sm'
                                : 'text-base-content/60 hover:text-base-content'
                        }`}
                    >
                        <i className={`fa-solid ${b.icon}`} aria-hidden="true" />
                    </button>
                );
            })}
        </div>
    );
}

function ProjectRow({ project }: { project: DashboardProject }) {
    return (
        <a
            href={`/p/${project.slug}`}
            className="group flex items-stretch overflow-hidden rounded-2xl border border-base-content/10 bg-base-200 transition-all hover:shadow-lg hover:border-primary/30"
        >
            {/* Left media — banner or gradient */}
            <div className="relative hidden sm:block w-40 flex-shrink-0 overflow-hidden">
                {project.banner_url ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.04]"
                        style={{ backgroundImage: `url(${project.banner_url})` }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20" />
                )}
            </div>

            {/* Content */}
            <div className="flex flex-1 min-w-0 items-center gap-5 p-5">
                {project.page_image_url ? (
                    <img
                        src={project.page_image_url}
                        alt={project.name}
                        className="h-16 w-16 flex-shrink-0 rounded-xl border-2 border-base-content/10 object-cover"
                    />
                ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 border-base-content/10 bg-base-300">
                        <i className="fa-solid fa-globe text-xl text-base-content/30" aria-hidden="true" />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-xl font-bold leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
                        {project.name}
                    </h3>
                    {project.logline && (
                        <p className="mt-1 text-sm text-base-content/60 line-clamp-1">{project.logline}</p>
                    )}
                </div>

                <div className="hidden md:flex flex-shrink-0 items-center gap-5 text-xs text-base-content/60">
                    <StatPair icon="fa-file-lines" value={project.entries_count} label="entries" accent="text-primary/60" />
                    <StatPair icon="fa-cubes" value={project.blueprints_count} label="blueprints" accent="text-secondary/60" />
                    <StatPair icon="fa-users" value={project.members_count} label="members" accent="text-accent/60" />
                    {project.last_activity && (
                        <div className="flex flex-col items-end leading-tight">
                            <span className="text-[10px] uppercase tracking-wider text-base-content/40">Updated</span>
                            <span className="font-medium text-base-content/70">{project.last_activity}</span>
                        </div>
                    )}
                </div>

                <i
                    className="fa-solid fa-chevron-right text-base-content/30 transition-transform group-hover:translate-x-1 group-hover:text-primary/60"
                    aria-hidden="true"
                />
            </div>
        </a>
    );
}

function StatPair({ icon, value, label, accent }: { icon: string; value: number; label: string; accent: string }) {
    return (
        <div className="flex flex-col items-center leading-tight">
            <div className="flex items-center gap-1.5 font-semibold text-base-content/80">
                <i className={`fa-solid ${icon} ${accent}`} aria-hidden="true" />
                <span>{value}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-base-content/40">{label}</span>
        </div>
    );
}

function ProjectTable({ projects }: { projects: DashboardProject[] }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-base-content/10 bg-base-200/50">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-base-content/10">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.2em] text-base-content/50">Project</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em] text-base-content/50">Entries</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em] text-base-content/50">Blueprints</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em] text-base-content/50">Members</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em] text-base-content/50">Updated</th>
                        <th className="px-2 py-3" aria-hidden="true" />
                    </tr>
                </thead>
                <tbody>
                    {projects.map((project) => (
                        <tr
                            key={project.id}
                            className="group border-b border-base-content/5 last:border-b-0 transition-colors hover:bg-base-300/40 cursor-pointer"
                            onClick={() => { window.location.href = `/p/${project.slug}`; }}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {project.page_image_url ? (
                                        <img
                                            src={project.page_image_url}
                                            alt=""
                                            className="h-10 w-10 flex-shrink-0 rounded-lg border border-base-content/10 object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-base-content/10 bg-base-300">
                                            <i className="fa-solid fa-globe text-sm text-base-content/30" aria-hidden="true" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <a
                                            href={`/p/${project.slug}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="font-serif text-base font-bold tracking-tight group-hover:text-primary transition-colors truncate block"
                                        >
                                            {project.name}
                                        </a>
                                        {project.logline && (
                                            <p className="text-xs text-base-content/50 line-clamp-1">{project.logline}</p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums">{project.entries_count}</td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums">{project.blueprints_count}</td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums">{project.members_count}</td>
                            <td className="px-4 py-3 text-right text-xs text-base-content/60 whitespace-nowrap">
                                {project.last_activity ?? '—'}
                            </td>
                            <td className="px-2 py-3 text-right">
                                <i
                                    className="fa-solid fa-chevron-right text-xs text-base-content/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary/60"
                                    aria-hidden="true"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
