import { usePage } from '@inertiajs/react';
import { useState, type CSSProperties } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import IconTile from '@alexandria/components/ui/IconTile';
import PageHeader from '@alexandria/components/layout/PageHeader';
import useT from '@alexandria/hooks/useT';
import { useVisitedTabs } from '@alexandria/hooks/useVisitedTabs';
import WorkbenchRoutingTab from './Sections/WorkbenchRoutingTab';
import WorkbenchCreationTab from './Sections/WorkbenchCreationTab';
import type { WorkbenchProps } from '@alexandria/types/workbench';
import { aiUrl, projectUrl } from '@alexandria/lib/urls';

export type WorkbenchLevel = 'routing' | 'creation';

const TABS: { key: WorkbenchLevel; labelKey: string; icon: string }[] = [
    { key: 'routing', labelKey: 'ai.workbench.tab.routing', icon: 'fa-solid fa-route' },
    { key: 'creation', labelKey: 'ai.workbench.tab.creation', icon: 'fa-solid fa-wand-magic-sparkles' },
];

const tabActiveStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const tabIdleStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const subtitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const statStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
};

function tabFromHash(): WorkbenchLevel {
    const hash = window.location.hash.slice(1) as WorkbenchLevel;
    return ['routing', 'creation'].includes(hash) ? hash : 'routing';
}

/**
 * Sorting Workbench — standard two-bar PageHeader (title hero +
 * breadcrumb strip, matching every other page) with the Routing|Creation
 * level tabs in the strip and the queue stats as title-bar actions.
 * Below the header the active level fills the remaining viewport height
 * via a two-pane rail + detail split (see WorkbenchRoutingTab /
 * WorkbenchCreationTab) — nothing in the page itself scrolls on lg+;
 * every list scrolls internally. Below `lg` the contract relaxes: panes
 * stack and the page scrolls normally.
 *
 * Navbar clearance comes from PageHeader itself (immersive AppLayout,
 * no pt-20), so the viewport-fit budget is simply `lg:h-screen` on the
 * wrapper with the header shrink-0 and the panes flex-1.
 */
export default function Workbench() {
    const t = useT();
    const props = usePage<WorkbenchProps>().props;
    const { project, blueprints, notebooks, unsorted_count, pending_count } = props;

    const [activeTab, setActiveTab] = useState<WorkbenchLevel>(tabFromHash);

    // Persist the level in the URL hash so a refresh lands where the user was.
    function changeTab(tab: WorkbenchLevel) {
        setActiveTab(tab);
        window.history.replaceState(null, '', `#${tab}`);
    }
    const visited = useVisitedTabs(activeTab);

    // fabActions off: the quick-note FAB floats over the sticky action bars (owner).
    return (
        <AppLayout title={t('ai.workbench.breadcrumb')} immersive fabActions={null}>
            <div className="flex flex-col lg:h-screen lg:overflow-hidden">
                <div className="shrink-0">
                    <PageHeader
                        breadcrumbs={[
                            { label: project.name, href: projectUrl(project.slug) },
                            { label: t('ai.dashboard.breadcrumb'), href: aiUrl(project.slug) },
                            { label: t('ai.workbench.breadcrumb') },
                        ]}
                        tabs={TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => changeTab(tab.key)}
                                className="alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                                style={activeTab === tab.key ? tabActiveStyle : tabIdleStyle}
                                aria-pressed={activeTab === tab.key}
                            >
                                <i className={`${tab.icon} text-xs`} aria-hidden="true" />
                                {t(tab.labelKey)}
                            </button>
                        ))}
                        actions={
                            <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                                <span style={statStyle}>
                                    <i className="fa-solid fa-inbox mr-1.5" aria-hidden="true" />
                                    {t('ai.workbench.roster.unsorted').replace(':count', String(unsorted_count))}
                                </span>
                                <span style={statStyle}>
                                    <i className="fa-solid fa-hourglass-half mr-1.5" aria-hidden="true" />
                                    {t('ai.workbench.roster.pending').replace(':count', String(pending_count))}
                                </span>
                            </div>
                        }
                    >
                        <div className="flex items-center gap-3 sm:gap-4">
                            <IconTile icon="fa-solid fa-route" color="primary" variant="solid" size="lg" />
                            <div className="min-w-0 flex-1">
                                <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                                    {t('ai.workbench.heading.title')}
                                </h1>
                                <p className="mt-1 text-xs sm:text-sm" style={subtitleStyle}>
                                    {t('ai.workbench.heading.subtitle').replace(':project', project.name)}
                                </p>
                            </div>
                        </div>
                    </PageHeader>
                </div>

                <div className="min-h-0 flex-1">
                    {visited.has('routing') && (
                        <div hidden={activeTab !== 'routing'} className="h-full min-h-0">
                            <WorkbenchRoutingTab
                                projectSlug={project.slug}
                                blueprints={blueprints}
                                notebooks={notebooks}
                                unsorted_count={unsorted_count}
                                pending_count={pending_count}
                            />
                        </div>
                    )}
                    {visited.has('creation') && (
                        <div hidden={activeTab !== 'creation'} className="h-full min-h-0">
                            <WorkbenchCreationTab
                                projectSlug={project.slug}
                                projectId={project.id}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
