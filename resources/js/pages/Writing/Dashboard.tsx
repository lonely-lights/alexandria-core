import { Link, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import useT, { type Translator } from '@alexandria/hooks/useT';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import IconTile from '@alexandria/components/ui/IconTile';
import { workUrl, writingUrl } from '@alexandria/lib/urls';

import WorkCard, { type WorkRow } from './Sections/WorkCard';

/**
 * Global writing dashboard.
 *
 * /writing groups every reachable work under its project. Project headings
 * link into the project-scoped /p/{project}/writing surface, while work cards
 * still enter the editor workspace through /p/{project}/works/{work}.
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

const subtitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const projectCountStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const groupHeaderStyle: CSSProperties = {
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

function relativeTime(iso: string | null, t: Translator): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return t('writing.dashboard.just_now');
    if (minutes < 60)
        return t('writing.dashboard.minutes_ago').replace(
            ':count',
            String(minutes),
        );
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return t('writing.dashboard.hours_ago').replace(
            ':count',
            String(hours),
        );
    return t('writing.dashboard.days_ago').replace(
        ':count',
        String(Math.floor(hours / 24)),
    );
}

function groupWorks(works: WorkRow[]): Array<[string | null, WorkRow[]]> {
    const groupMap = new Map<string | null, WorkRow[]>();

    for (const work of works) {
        const key = work.group ?? null;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(work);
    }

    return [...groupMap.entries()].sort(([a], [b]) => {
        if (a === null) return 1;
        if (b === null) return -1;
        return a.localeCompare(b);
    });
}

export default function WritingDashboard() {
    const t = useT();
    const {
        projects,
        recentSections = [],
        continueUrl,
    } = usePage<WritingDashboardProps>().props;

    const isMobileWriting = useMediaQuery('(max-width: 1023px)');

    return (
        <AppLayout
            title={t('writing.dashboard.title')}
            immersive
            fabActions={null}
        >
            <PageHeader breadcrumbs={[{ label: t('writing.dashboard.title') }]}>
                <div className="flex items-center gap-3 sm:gap-4">
                    <IconTile
                        icon="fa-solid fa-feather-pointed"
                        color="accent"
                        variant="solid"
                        animation="beat-fade"
                        size={isMobileWriting ? 'sm' : 'lg'}
                        animationStyle={
                            {
                                '--fa-animation-duration': '2.5s',
                                '--fa-beat-fade-opacity': '0.8',
                                '--fa-beat-fade-scale': '1.075',
                            } as CSSProperties
                        }
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                            {t('writing.dashboard.title')}
                        </h1>
                        <p
                            className="mt-1 text-xs sm:text-sm"
                            style={subtitleStyle}
                        >
                            {t('writing.dashboard.intro')}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="container mx-auto max-w-7xl px-4 py-8">
                {projects.length === 0 ? (
                    <div
                        className="px-6 py-16 text-center text-sm italic"
                        style={emptyStateStyle}
                    >
                        {t('writing.dashboard.empty')}
                    </div>
                ) : (
                    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
                        <div className="flex min-w-0 flex-col gap-8">
                            {projects.map((project) => (
                                <section key={project.id} className="min-w-0">
                                    <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                        <Link
                                            href={writingUrl(project.slug)}
                                            className="alex-dash-row-title font-serif text-lg font-bold tracking-tight no-underline"
                                            style={{
                                                color: 'var(--theme-base-content)',
                                            }}
                                        >
                                            {project.name}
                                        </Link>
                                        <span
                                            className="text-xs"
                                            style={projectCountStyle}
                                        >
                                            {t(
                                                'writing.dashboard.work_count',
                                            ).replace(
                                                ':count',
                                                project.works.length.toLocaleString(),
                                            )}
                                        </span>
                                    </div>

                                    {groupWorks(project.works).map(
                                        ([groupKey, works]) => (
                                            <div
                                                key={groupKey ?? '__standalone'}
                                                className="mb-5 last:mb-0"
                                            >
                                                <h3
                                                    className="mb-2 text-xs font-semibold uppercase tracking-wide"
                                                    style={groupHeaderStyle}
                                                >
                                                    {groupKey ??
                                                        t(
                                                            'writing.dashboard.ungrouped',
                                                        )}
                                                </h3>
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    {works.map((work) => (
                                                        <WorkCard
                                                            key={work.id}
                                                            work={work}
                                                            projectSlug={
                                                                project.slug
                                                            }
                                                            t={t}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </section>
                            ))}
                        </div>

                        {(continueUrl || recentSections.length > 0) && (
                            <aside className="order-first flex flex-col gap-4 xl:sticky xl:top-6 xl:order-none">
                                {continueUrl && (
                                    <div>
                                        <Link
                                            href={continueUrl}
                                            style={continueButtonStyle}
                                        >
                                            <i
                                                className="fa-solid fa-feather"
                                                aria-hidden="true"
                                            />
                                            {t('writing.dashboard.continue')}
                                        </Link>
                                    </div>
                                )}

                                {recentSections.length > 0 && (
                                    <div>
                                        <h2
                                            className="mb-3 text-xs font-semibold uppercase tracking-wide"
                                            style={groupHeaderStyle}
                                        >
                                            {t(
                                                'writing.dashboard.recent_sections',
                                            )}
                                        </h2>
                                        <div className="flex flex-col gap-2">
                                            {recentSections.map((section) => (
                                                <Link
                                                    key={section.id}
                                                    href={workUrl(section.project_slug, section.work_slug, section.slug)}
                                                    className="flex items-center justify-between px-3 py-2.5 no-underline transition-opacity hover:opacity-80"
                                                    style={
                                                        recentSectionRowStyle
                                                    }
                                                >
                                                    <div className="min-w-0">
                                                        <span
                                                            className="block truncate text-sm font-medium"
                                                            style={{
                                                                color: 'var(--theme-base-content)',
                                                            }}
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
                                                        {relativeTime(
                                                            section.updated_at,
                                                            t,
                                                        )}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </aside>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
