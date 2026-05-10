import { usePage } from '@inertiajs/react';
import { useEffect, useState, type CSSProperties } from 'react';

import AppLayout from '../layouts/AppLayout';
import useT from '@alexandria/hooks/useT';

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

interface DashboardProps {
    projects: DashboardProject[];
    recentEntries: RecentEntry[];
    stats: DashboardStats;
    greeting: DashboardGreeting;
}

/**
 * Returns a translation key suffix for the time-of-day greeting prefix.
 * Resolved by the caller against the `dashboard.greeting.*` lang bag so
 * the rendered copy ("Good morning", "Good afternoon", etc.) localises
 * with the rest of the page.
 */
function greetingKeyForHour(hour: number): string {
    if (hour < 5) return 'late_night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
}

const subtleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };
const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const strokeBorder: CSSProperties = { borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' };
const surfaceTinted: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

export default function Dashboard() {
    const { projects, recentEntries, stats, greeting } = usePage<{ props: DashboardProps }>().props as unknown as DashboardProps;
    const t = useT();

    const [viewMode, setViewMode] = useState<ProjectViewMode>('grid');
    const [greetingKey, setGreetingKey] = useState<string>(() => greetingKeyForHour(new Date().getHours()));

    // Refresh the greeting every minute so it updates if the user crosses a
    // time-of-day boundary while sitting on the dashboard.
    useEffect(() => {
        const id = window.setInterval(() => {
            setGreetingKey(greetingKeyForHour(new Date().getHours()));
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
                    <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
                        {t('dashboard.section.projects')}
                    </h2>
                    <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                            background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                            color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                        }}
                    >
                        {projects.length}{' '}
                        {projects.length === 1
                            ? t('dashboard.section.world_singular')
                            : t('dashboard.section.world_plural')}
                    </span>
                </div>
                <ViewToggle current={viewMode} onChange={changeViewMode} t={t} />
            </div>

            {projects.length === 0 ? (
                <EmptyState
                    icon="fa-folder-open"
                    title={t('dashboard.empty.projects.title')}
                    description={t('dashboard.empty.projects.description')}
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
                        <ProjectRow key={project.id} project={project} t={t} />
                    ))}
                </div>
            ) : (
                <ProjectTable projects={projects} t={t} />
            )}
        </section>
    );

    const recentSection = (
        <section>
            <h2 className="mb-5 font-serif text-2xl md:text-3xl font-bold tracking-tight">
                {t('dashboard.section.recent')}
            </h2>
            {recentEntries.length > 0 ? (
                <div
                    className="overflow-hidden border"
                    style={{
                        background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                    }}
                >
                    {recentEntries.map((entry, index) => (
                        <RecentEntryRow
                            key={entry.id}
                            entry={entry}
                            isLast={index === recentEntries.length - 1}
                        />
                    ))}
                </div>
            ) : (
                <div
                    className="border p-8 text-center"
                    style={{
                        background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                    }}
                >
                    <p className="text-sm" style={fadedText}>
                        {t('dashboard.empty.recent.text')}
                    </p>
                </div>
            )}
        </section>
    );

    return (
        <AppLayout title={t('dashboard.page.title')}>
            <div className="container mx-auto max-w-7xl px-4 py-8 lg:py-12">
                {/* Greeting header + inline quick actions */}
                <header className="mb-10 grid grid-cols-1 items-end gap-6 lg:grid-cols-[1fr_auto] lg:gap-10">
                    <div>
                        <div
                            className="text-[11px] font-semibold uppercase tracking-[.25em] mb-2"
                            style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 80%, transparent)' }}
                        >
                            {t(`dashboard.greeting.${greetingKey}`)}
                        </div>
                        <h1 className="font-serif text-5xl md:text-6xl font-bold leading-none tracking-tight">
                            {greeting.name}.
                        </h1>
                        <p className="mt-3 text-base" style={subtleText}>
                            {t('dashboard.page.tagline')}
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <QuickActionTile href="/profile" icon="fa-user-gear" label={t('dashboard.quick.profile')} />
                        <QuickActionTile href="/ai/suggestions" icon="fa-wand-magic-sparkles" label={t('dashboard.quick.ai_suggestions')} />
                        <QuickActionTile href="/settings#pref-appearance" icon="fa-palette" label={t('dashboard.quick.appearance')} />
                    </div>
                </header>

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-3 md:gap-5 mb-10">
                    <StatTile label={t('dashboard.stat.projects')} value={stats.projects} icon="fa-folder-tree" accent="var(--theme-brand-primary-500)" />
                    <StatTile label={t('dashboard.stat.entries')} value={stats.entries} icon="fa-file-lines" accent="var(--theme-brand-secondary-500)" />
                    <StatTile label={t('dashboard.stat.blueprints')} value={stats.blueprints} icon="fa-cubes" accent="var(--theme-brand-accent-500)" />
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
        <div
            className="border p-5"
            style={{
                background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
                borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                borderRadius: 'var(--theme-radius-card)',
            }}
        >
            <div className="flex items-center gap-2 mb-3">
                <i className={`fa-solid ${icon} text-sm`} style={{ color: accent }} aria-hidden="true" />
                <div
                    className="text-[11px] font-semibold uppercase tracking-[.25em]"
                    style={fadedText}
                >
                    {label}
                </div>
            </div>
            <div className="font-serif text-4xl md:text-5xl font-bold tracking-tight">{value}</div>
        </div>
    );
}

function ProjectCard({ project }: { project: DashboardProject }) {
    return (
        <a href={`/p/${project.slug}`} className="alex-dash-card group block overflow-hidden">
            {/* Banner */}
            {project.banner_url ? (
                <div
                    className="alex-dash-banner-img h-28 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${project.banner_url})` }}
                />
            ) : (
                <div
                    className="h-28 w-full"
                    style={{
                        background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 10%, transparent), color-mix(in srgb, var(--theme-brand-accent-500) 20%, transparent))',
                    }}
                />
            )}

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start gap-4">
                    {project.page_image_url ? (
                        <img
                            src={project.page_image_url}
                            alt={project.name}
                            className="-mt-12 h-16 w-16 flex-shrink-0 object-cover"
                            style={{
                                borderRadius: 'var(--theme-radius-card)',
                                border: '4px solid var(--theme-base-surface)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                            }}
                        />
                    ) : (
                        <div
                            className="-mt-12 flex h-16 w-16 flex-shrink-0 items-center justify-center"
                            style={{
                                borderRadius: 'var(--theme-radius-card)',
                                border: '4px solid var(--theme-base-surface)',
                                background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                            }}
                        >
                            <i
                                className="fa-solid fa-globe text-xl"
                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                                aria-hidden="true"
                            />
                        </div>
                    )}
                    <div className="min-w-0 flex-1 pt-1">
                        <h3 className="alex-dash-card-title font-serif text-xl font-bold leading-tight tracking-tight truncate">
                            {project.name}
                        </h3>
                    </div>
                </div>

                {project.logline && (
                    <p className="mt-3 text-sm line-clamp-2 leading-relaxed" style={subtleText}>
                        {project.logline}
                    </p>
                )}

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={fadedText}>
                    <span className="flex items-center gap-1.5">
                        <i
                            className="fa-solid fa-file-lines"
                            style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 50%, transparent)' }}
                            aria-hidden="true"
                        />
                        {project.entries_count}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <i
                            className="fa-solid fa-cubes"
                            style={{ color: 'color-mix(in srgb, var(--theme-brand-secondary-500) 50%, transparent)' }}
                            aria-hidden="true"
                        />
                        {project.blueprints_count}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <i
                            className="fa-solid fa-users"
                            style={{ color: 'color-mix(in srgb, var(--theme-brand-accent-500) 50%, transparent)' }}
                            aria-hidden="true"
                        />
                        {project.members_count}
                    </span>
                </div>
            </div>
        </a>
    );
}

function RecentEntryRow({ entry, isLast }: { entry: RecentEntry; isLast: boolean }) {
    const iconClass = entry.blueprint_icon
        ? (entry.blueprint_icon.includes(' ') ? entry.blueprint_icon : `fa-solid ${entry.blueprint_icon}`)
        : 'fa-solid fa-file';

    return (
        <a
            href={`/p/${entry.project_slug}/${entry.blueprint_name?.toLowerCase()}/${entry.slug}`}
            className="alex-dash-recent-row flex items-center gap-3 px-4 py-3"
            style={{
                borderBottom: isLast
                    ? 'none'
                    : '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
            }}
        >
            <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center"
                style={{
                    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                    borderRadius: 'var(--theme-radius-button)',
                }}
            >
                <i className={`${iconClass} text-sm`} style={subtleText} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.name}</p>
                <p className="text-xs truncate" style={fadedText}>
                    {entry.blueprint_name} · {entry.project_name}
                </p>
            </div>
            <span className="flex-shrink-0 text-xs" style={microText}>{entry.updated_at}</span>
        </a>
    );
}

function QuickActionTile({ href, icon, label }: { href: string; icon: string; label: string }) {
    return (
        <a
            href={href}
            className="alex-dash-quick-tile group flex min-w-0 flex-col items-center gap-2 px-4 py-5 text-center"
            aria-label={label}
        >
            <div
                className="alex-dash-quick-tile-icon flex h-12 w-12 items-center justify-center"
                style={{
                    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
                    color: 'var(--theme-brand-primary-500)',
                    borderRadius: 'var(--theme-radius-card)',
                }}
            >
                <i className={`fa-solid ${icon} text-2xl`} aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold leading-tight truncate w-full">{label}</span>
        </a>
    );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div
            className="px-4 py-16 text-center"
            style={{
                background: 'color-mix(in srgb, var(--theme-base-content) 2%, transparent)',
                border: '2px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                borderRadius: 'var(--theme-radius-card)',
            }}
        >
            <div
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)' }}
            >
                <i
                    className={`fa-solid ${icon} text-2xl`}
                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                    aria-hidden="true"
                />
            </div>
            <h3 className="font-serif text-xl font-bold">{title}</h3>
            <p className="mt-1 text-sm" style={subtleText}>{description}</p>
        </div>
    );
}

function ViewToggle({ current, onChange, t }: { current: ProjectViewMode; onChange: (m: ProjectViewMode) => void; t: (k: string) => string }) {
    const buttons: Array<{ key: ProjectViewMode; icon: string; label: string }> = [
        { key: 'grid', icon: 'fa-grip', label: t('dashboard.view.grid') },
        { key: 'rows', icon: 'fa-bars', label: t('dashboard.view.rows') },
        { key: 'table', icon: 'fa-table', label: t('dashboard.view.table') },
    ];
    return (
        <div
            className="alex-dash-view-toggle inline-flex items-center rounded-full p-1"
            role="tablist"
            aria-label={t('dashboard.view.aria_label')}
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
                        className="alex-dash-view-btn flex h-7 w-7 items-center justify-center rounded-full text-xs"
                    >
                        <i className={`fa-solid ${b.icon}`} aria-hidden="true" />
                    </button>
                );
            })}
        </div>
    );
}

function ProjectRow({ project, t }: { project: DashboardProject; t: (k: string) => string }) {
    // Layout reads as a snapshot of the project page header:
    //   ┌──────────────────────────────────┐
    //   │ ┌──┐ Banner (top 1/3, full)      │
    //   ├─┤  ├────────────────────────────-┤
    //   │ └──┘ Name                        │
    //   │      Stats · Updated             │
    //   └──────────────────────────────────┘
    // Banner is a full-width strip across the top 1/3 and the image
    // sits on a floating absolute layer that overlaps the banner /
    // content boundary, so its top edge pokes up into the banner —
    // mirroring the way an avatar sits over a cover photo.
    return (
        <a
            href={`/p/${project.slug}`}
            className="alex-dash-row group relative flex flex-col overflow-hidden"
            style={{ height: '6.5rem' }}
        >
            {/* Banner — full-width strip, top 1/3 */}
            <div className="relative flex-[1] overflow-hidden">
                {project.banner_url ? (
                    <div
                        className="alex-dash-banner-img absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${project.banner_url})` }}
                    />
                ) : (
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(to right, color-mix(in srgb, var(--theme-brand-primary-500) 22%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 14%, transparent), color-mix(in srgb, var(--theme-brand-accent-500) 22%, transparent))',
                        }}
                    />
                )}
            </div>

            {/* Bottom row — content only; the image floats on its own layer above. */}
            <div className="flex flex-[2] min-w-0 items-center sm:pl-20">
                {/* Content cell — name, stats, updated */}
                <div className="flex flex-1 min-w-0 items-center gap-5 px-5">
                    <div className="min-w-0 flex-1">
                        <h3 className="alex-dash-row-title font-serif text-xl font-bold leading-tight tracking-tight truncate">
                            {project.name}
                        </h3>
                        {project.logline && (
                            <p className="mt-1 text-sm line-clamp-1" style={subtleText}>
                                {project.logline}
                            </p>
                        )}
                    </div>

                    <div className="hidden md:flex flex-shrink-0 items-center gap-5 text-sm" style={subtleText}>
                        <StatPair icon="fa-file-lines" value={project.entries_count} label={t('dashboard.row.entries')} accent="var(--theme-brand-primary-500)" />
                        <StatPair icon="fa-cubes" value={project.blueprints_count} label={t('dashboard.row.blueprints')} accent="var(--theme-brand-secondary-500)" />
                        <StatPair icon="fa-users" value={project.members_count} label={t('dashboard.row.members')} accent="var(--theme-brand-accent-500)" />
                        {project.last_activity && (
                            <div className="flex flex-col items-end leading-tight">
                                <span
                                    className="text-[11px] font-semibold uppercase tracking-wider"
                                    style={fadedText}
                                >
                                    {t('dashboard.row.updated')}
                                </span>
                                <span
                                    className="text-sm font-medium"
                                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 75%, transparent)' }}
                                >
                                    {project.last_activity}
                                </span>
                            </div>
                        )}
                    </div>

                    <i
                        className="alex-dash-row-chevron fa-solid fa-chevron-right"
                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Floating image — overlaps the banner / content boundary so
                the top edge pokes up into the banner like an avatar over
                a cover photo. Anchored to the card's left edge with a
                small inset so the image's rounded corners are visible. */}
            <div
                className="absolute hidden sm:flex items-center justify-center"
                style={{
                    left: '0.5rem',
                    top: '1rem',
                    width: '4.5rem',
                    height: '4.5rem',
                }}
            >
                {project.page_image_url ? (
                    <img
                        src={project.page_image_url}
                        alt={project.name}
                        className="h-full w-full object-cover"
                        style={{
                            borderRadius: 'var(--theme-radius-card)',
                            border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
                        }}
                    />
                ) : (
                    <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                            borderRadius: 'var(--theme-radius-card)',
                            border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                            background: 'var(--theme-base-surface)',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
                        }}
                    >
                        <i
                            className="fa-solid fa-globe text-2xl"
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                            aria-hidden="true"
                        />
                    </div>
                )}
            </div>
        </a>
    );
}

function StatPair({ icon, value, label, accent }: { icon: string; value: number; label: string; accent: string }) {
    return (
        <div className="flex flex-col items-center leading-tight">
            <div
                className="flex items-center gap-1.5 text-base font-semibold"
                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 85%, transparent)' }}
            >
                <i className={`fa-solid ${icon}`} style={{ color: accent }} aria-hidden="true" />
                <span>{value}</span>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={fadedText}>{label}</span>
        </div>
    );
}

function ProjectTable({ projects, t }: { projects: DashboardProject[]; t: (k: string) => string }) {
    const headerStyle: CSSProperties = {
        ...fadedText,
        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    };
    return (
        <div
            className="overflow-x-auto border"
            style={{
                ...surfaceTinted,
                background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
                borderRadius: 'var(--theme-radius-card)',
            }}
        >
            <table className="w-full text-sm">
                <thead>
                    <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }}>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.project')}</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.entries')}</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.blueprints')}</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.members')}</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.updated')}</th>
                        <th className="px-2 py-3" aria-hidden="true" />
                    </tr>
                </thead>
                <tbody>
                    {projects.map((project, index) => (
                        <tr
                            key={project.id}
                            className="alex-dash-table-row group cursor-pointer"
                            style={{
                                borderBottom: index === projects.length - 1
                                    ? 'none'
                                    : '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                            }}
                            onClick={() => { window.location.href = `/p/${project.slug}`; }}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {project.page_image_url ? (
                                        <img
                                            src={project.page_image_url}
                                            alt=""
                                            className="h-10 w-10 flex-shrink-0 object-cover"
                                            style={{
                                                borderRadius: 'var(--theme-radius-button)',
                                                ...strokeBorder,
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                                            style={{
                                                borderRadius: 'var(--theme-radius-button)',
                                                border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                                                background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                            }}
                                        >
                                            <i
                                                className="fa-solid fa-globe text-sm"
                                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                                                aria-hidden="true"
                                            />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <a
                                            href={`/p/${project.slug}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="alex-dash-table-title font-serif text-base font-bold tracking-tight truncate block"
                                        >
                                            {project.name}
                                        </a>
                                        {project.logline && (
                                            <p className="text-xs line-clamp-1" style={fadedText}>{project.logline}</p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums">{project.entries_count}</td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums">{project.blueprints_count}</td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums">{project.members_count}</td>
                            <td className="px-4 py-3 text-right text-xs whitespace-nowrap" style={subtleText}>
                                {project.last_activity ?? '—'}
                            </td>
                            <td className="px-2 py-3 text-right">
                                <i
                                    className="alex-dash-table-chevron fa-solid fa-chevron-right text-xs"
                                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
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
