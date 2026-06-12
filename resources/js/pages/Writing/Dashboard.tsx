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

interface WritingDashboardProps {
    projects: DashboardProject[];
    hasProjects: boolean;
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

export default function WritingDashboard() {
    const t = useT();
    const { projects } = usePage<WritingDashboardProps>().props;

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
