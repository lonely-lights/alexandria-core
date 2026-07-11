import { usePage } from '@inertiajs/react';
import { useState, type CSSProperties } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import IconTile from '@alexandria/components/ui/IconTile';
import NeuralConstellationBg from '@alexandria/components/backgrounds/NeuralConstellationBg';
import useT from '@alexandria/hooks/useT';
import { useVisitedTabs } from '@alexandria/hooks/useVisitedTabs';
import WorkbenchRoutingTab from './Sections/WorkbenchRoutingTab';
import WorkbenchCreationTab from './Sections/WorkbenchCreationTab';
import type { WorkbenchProps } from '@alexandria/types/workbench';

type Tab = 'routing' | 'creation';

const TABS: { key: Tab; labelKey: string; icon: string }[] = [
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


function tabFromHash(): Tab {
    const hash = window.location.hash.slice(1) as Tab;
    return ['routing', 'creation'].includes(hash) ? hash : 'routing';
}

export default function Workbench() {
    const t = useT();
    const props = usePage<WorkbenchProps>().props;
    const { project, blueprints, notebooks, unsorted_count, pending_count } = props;

    const [activeTab, setActiveTab] = useState<Tab>(tabFromHash);
    const visited = useVisitedTabs(activeTab);

    return (
        <AppLayout title={t('ai.workbench.breadcrumb')} immersive>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: t('ai.dashboard.breadcrumb'), href: `/ai/${project.slug}` },
                    { label: t('ai.workbench.breadcrumb') },
                ]}
                tabs={TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className="alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                        style={activeTab === tab.key ? tabActiveStyle : tabIdleStyle}
                        aria-pressed={activeTab === tab.key}
                    >
                        <i className={`${tab.icon} text-xs`} aria-hidden="true" />
                        {t(tab.labelKey)}
                    </button>
                ))}
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <IconTile
                        icon="fa-solid fa-route"
                        color="primary"
                        variant="solid"
                        size="lg"
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                            {t('ai.workbench.heading.title')}
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm" style={subtitleStyle}>
                            {t('ai.workbench.heading.subtitle').replace(':project', project.name)}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="relative overflow-hidden min-h-[min(66vh,calc(100vh-var(--navbar-height,3.5rem)))]">
                <div className="neural-overlay bg-fade-out pointer-events-none absolute inset-x-0 top-0 h-[66vh] overflow-hidden" aria-hidden="true">
                    <NeuralConstellationBg />
                </div>
                <div className="relative container mx-auto max-w-7xl px-4 py-8">
                    {visited.has('routing') && (
                        <div hidden={activeTab !== 'routing'}>
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
                        <div hidden={activeTab !== 'creation'}>
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
