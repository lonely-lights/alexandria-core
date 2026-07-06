import { Link, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import IconTile from '@alexandria/components/ui/IconTile';

import WorkCard, { type WorkRow } from './Sections/WorkCard';

/**
 * Global writing dashboard — Stage 8g.1 (Plan 3 Task 5).
 *
 * /writing groups every work the user can reach under its project —
 * the cross-project counterpart to the per-project works index
 * (Writing/Index). Read-only surface: creation lives per-project, so
 * there's no create button here; each project's heading row links to
 * its works index instead. Projects without works are filtered out
 * server-side; `hasProjects` keeps the empty-state wording honest.
 */

interface DashboardProject {
    id: number;
    name: string;
    slug: string;
    works: WorkRow[];
}

interface RecentSection {
    id: number;
    title: string;
    slug: string;
    work_slug: string;
    work_title: string;
    project_slug: string;
    word_count: number;
    updated_at: string | null;
}

interface WritingDashboardProps {
    projects: DashboardProject[];
    hasProjects: boolean;
    recentSections: RecentSection[];
    continueUrl: string | null;
    [key: string]: unknown;
}

/* ── Theme styles ── */

const subtitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const projectCountStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const emptyStateStyle: CSSProperties = {
    background: 'var(--theme-surface-card)',
    border: '1px dashed var(--theme-neutral-300)',
    borderRadius: 'var(--theme-radius-card)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const recentSectionRowStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid var(--theme-base-400)',
    borderRadius: 'var(--theme-radius-button)',
};

const continueButtonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1.25rem',
    borderRadius: 'var(--theme-radius-button)',
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    fontWeight: 600,
    fontSize: '0.875rem',
    textDecoration: 'none',
    transition: 'opacity 150ms ease',
};

/** Render relative time from an ISO 8601 timestamp. */
function relativeTime(iso: string | null): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export default function WritingDashboard() {
    const t = useT();
    const { projects, recentSections = [], continueUrl } =
        usePage<WritingDashboardProps>().props;

    // Smaller hero tile on mobile so it doesn't claim a quarter of the
    // hero row alongside the heading — same breakpoint Writing/Index uses.
    const isMobileWriting = useMediaQuery('(max-width: 1023px)');

    return (
        <AppLayout title={t('writing.dashboard.title')} immersive fabActions={null}>
            <PageHeader
                breadcrumbs={[{ label: t('writing.dashboard.title') }]}
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <IconTile
                        icon="fa-solid fa-feather-pointed"
                        color="accent"
                        variant="solid"
                        animation="beat-fade"
                        size={isMobileWriting ? 'sm' : 'lg'}
                        animationStyle={{
                            // Slow ambient pulse, matching the Notes/AI
                            // dashboard heroes — presence, not alarm.
                            '--fa-animation-duration': '2.5s',
                            '--fa-beat-fade-opacity': '0.8',
                            '--fa-beat-fade-scale': '1.075',
                        } as CSSProperties}
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                            {t('writing.dashboard.title')}
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm" style={subtitleStyle}>
                            {t('writing.dashboard.intro')}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="container mx-auto max-w-7xl px-4 py-8">
                {/* Continue writing shortcut — only renders when the user
                    has at least one recently-edited section. */}
                {continueUrl && (
                    <div className="mb-6">
                        <Link href={continueUrl} style={continueButtonStyle}>
                            <i className="fa-solid fa-feather" aria-hidden="true" />
                            {t('writing.dashboard.continue')}
                        </Link>
                    </div>
                )}

                {/* Recent sections — the 8 most recently-touched sections
                    across all accessible projects; each row links directly
                    into the workspace. Hidden when empty (fresh account or
                    all works deleted). */}
                {recentSections.length > 0 && (
                    <div className="mb-8">
                        <h2
                            className="mb-3 text-xs font-semibold uppercase tracking-wide"
                            style={{
                                color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                            }}
                        >
                            {t('writing.dashboard.recent_sections')}
                        </h2>
                        <div className="flex flex-col gap-2">
                            {recentSections.map((section) => (
                                <Link
                                    key={section.id}
                                    href={`/works/${section.project_slug}/${section.work_slug}/${section.slug}`}
                                    className="flex items-center justify-between px-4 py-3 no-underline transition-opacity hover:opacity-80"
                                    style={recentSectionRowStyle}
                                >
                                    <div className="min-w-0">
                                        <span
                                            className="block truncate text-sm font-medium"
                                            style={{ color: 'var(--theme-base-content)' }}
                                        >
                                            {section.title}
                                        </span>
                                        <span
                                            className="block truncate text-xs"
                                            style={{
                                                color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                                            }}
                                        >
                                            {section.work_title}
                                        </span>
                                    </div>
                                    <span
                                        className="ml-4 flex-shrink-0 text-xs"
                                        style={{
                                            color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
                                        }}
                                    >
                                        {relativeTime(section.updated_at)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {projects.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm italic" style={emptyStateStyle}>
                        {t('writing.dashboard.empty')}
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {projects.map((project) => (
                            <section key={project.id}>
                                <div className="mb-3 flex items-baseline gap-2">
                                    <Link
                                        href={`/works/${project.slug}`}
                                        className="alex-dash-row-title font-serif text-lg font-bold tracking-tight no-underline"
                                        style={{ color: 'var(--theme-base-content)' }}
                                    >
                                        {project.name}
                                    </Link>
                                    <span className="text-xs" style={projectCountStyle}>
                                        {t('writing.dashboard.work_count').replace(
                                            ':count',
                                            project.works.length.toLocaleString(),
                                        )}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {project.works.map((work) => (
                                        <WorkCard
                                            key={work.id}
                                            work={work}
                                            projectSlug={project.slug}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
