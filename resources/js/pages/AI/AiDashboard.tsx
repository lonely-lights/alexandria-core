import { usePage } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import IconTile from '@alexandria/components/ui/IconTile';
import PageHeader from '@alexandria/components/layout/PageHeader';
import NeuralConstellationBg from '@alexandria/components/backgrounds/NeuralConstellationBg';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import useT from '@alexandria/hooks/useT';
import { useVisitedTabs } from '@alexandria/hooks/useVisitedTabs';
import DashboardTab from './Sections/DashboardTab';
import CommandsTab from './Sections/CommandsTab';
import UsageTab from './Sections/UsageTab';
import ModelsTab from './Sections/ModelsTab';
import SettingsTab from './Sections/SettingsTab';
import type { AiDashboardProps } from '@alexandria/types/ai-dashboard';

type Tab = 'dashboard' | 'commands' | 'usage' | 'models' | 'settings';

const TABS: { key: Tab; labelKey: string; icon: string }[] = [
    { key: 'dashboard', labelKey: 'ai.dashboard.tab.dashboard', icon: 'fa-solid fa-gauge' },
    { key: 'commands', labelKey: 'ai.dashboard.tab.commands', icon: 'fa-solid fa-list-check' },
    { key: 'usage', labelKey: 'ai.dashboard.tab.usage', icon: 'fa-solid fa-chart-bar' },
    { key: 'models', labelKey: 'ai.dashboard.tab.models', icon: 'fa-solid fa-microchip' },
    { key: 'settings', labelKey: 'ai.dashboard.tab.settings', icon: 'fa-solid fa-gear' },
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
    const valid: Tab[] = ['dashboard', 'commands', 'usage', 'models', 'settings'];
    return valid.includes(hash) ? hash : 'dashboard';
}

export default function AiDashboard() {
    const t = useT();
    const props = usePage<AiDashboardProps>().props;
    const { project, stats, providers, settings, userSettings } = props;

    const [activeTab, setActiveTab] = useState<Tab>(tabFromHash);
    // Below lg the 5-pill tab row overflows at 375px — collapse to a
    // single trigger + overflow menu, same pattern Notes Dashboard
    // uses on mobile.
    const isMobileAi = useMediaQuery('(max-width: 1023px)');
    const activeTabMeta = TABS.find((t) => t.key === activeTab) ?? TABS[0];

    useEffect(() => {
        window.location.hash = activeTab === 'dashboard' ? '' : `#${activeTab}`;
    }, [activeTab]);

    // Sidebar AI-hub links are hash URLs (/ai/{slug}#commands etc.) —
    // follow hash changes while already mounted so those links switch
    // tabs in place. (The write-effect above re-firing this with the
    // same tab is a no-op.)
    useEffect(() => {
        function onHashChange() {
            setActiveTab(tabFromHash());
        }
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    // Keep-mounted tabs — lazy-mount on first visit, hide (don't
    // unmount) when the user switches away so fetched data, scroll
    // position, and local filter state all survive. Same pattern used
    // on Notes Dashboard.
    const visited = useVisitedTabs(activeTab);

    return (
        <AppLayout title={t('ai.dashboard.breadcrumb')} immersive>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: t('ai.dashboard.breadcrumb') },
                ]}
                tabs={
                    isMobileAi ? (
                        // Mobile: single pill showing the active tab +
                        // overflow menu listing the rest. The pill itself
                        // is the dropdown trigger so the user knows
                        // which tab they're on without a separate label.
                        <DropdownMenu
                            align="right"
                            trigger={
                                <button
                                    type="button"
                                    className="alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                                    style={tabActiveStyle}
                                    aria-label={t('ai.dashboard.tabs.menu_aria', 'Switch tab')}
                                >
                                    <i className={`${activeTabMeta.icon} text-xs`} aria-hidden="true" />
                                    {t(activeTabMeta.labelKey)}
                                    <i className="fa-solid fa-chevron-down text-[10px]" aria-hidden="true" />
                                </button>
                            }
                            items={TABS.map((tab) => ({
                                label: t(tab.labelKey),
                                icon: tab.icon.replace('fa-solid ', ''),
                                onClick: () => setActiveTab(tab.key),
                            }))}
                        />
                    ) : (
                        TABS.map((tab) => (
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
                        ))
                    )
                }
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <IconTile
                        icon="fa-solid fa-bolt"
                        color="primary"
                        variant="solid"
                        animation="beat-fade"
                        // Smaller tile on mobile so it doesn't claim a
                        // quarter of the hero row alongside the heading.
                        size={isMobileAi ? 'sm' : 'lg'}
                        animationStyle={{
                            // Ambient "the AI is thinking" pulse — slow and
                            // subtle, not an attention grab.
                            '--fa-animation-duration': '2.5s',
                            '--fa-beat-fade-opacity': '0.8',
                            '--fa-beat-fade-scale': '1.075',
                        } as CSSProperties}
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                            {t('ai.dashboard.heading.title')}
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm" style={subtitleStyle}>
                            {t('ai.dashboard.heading.subtitle').replace(':project', project.name)}
                        </p>
                    </div>
                </div>
            </PageHeader>

            {/* Relative wrapper — the neural constellation sits
                behind the tab content; `.neural-overlay` scopes it to
                tf themes. */}
            {/* min-h clamped to usable content area so the 2/3 fade
                can fully display on sparse tabs without forcing the
                page beyond the viewport and adding unnecessary scroll. */}
            <div className="relative overflow-hidden min-h-[min(66vh,calc(100vh-var(--navbar-height,3.5rem)))]">
                {/* Top band — 2/3 viewport tall, fades to transparent. */}
                <div className="neural-overlay bg-fade-out pointer-events-none absolute inset-x-0 top-0 h-[66vh] overflow-hidden" aria-hidden="true">
                    <NeuralConstellationBg />
                </div>
                <div className="relative container mx-auto max-w-7xl px-4 py-8">
                {/* Each tab is mounted on first visit and hidden when the
                    user switches away, so tab-switching preserves fetched
                    data, scroll, and local state. `hidden` also removes
                    the subtree from the accessibility tree while inactive. */}
                {visited.has('dashboard') && (
                    <div hidden={activeTab !== 'dashboard'}>
                        <DashboardTab projectId={project.id} stats={stats} />
                    </div>
                )}
                {visited.has('commands') && (
                    <div hidden={activeTab !== 'commands'}>
                        <CommandsTab projectId={project.id} />
                    </div>
                )}
                {visited.has('usage') && (
                    <div hidden={activeTab !== 'usage'}>
                        <UsageTab projectId={project.id} />
                    </div>
                )}
                {visited.has('models') && (
                    <div hidden={activeTab !== 'models'}>
                        <ModelsTab projectId={project.id} providers={providers} />
                    </div>
                )}
                {visited.has('settings') && (
                    <div hidden={activeTab !== 'settings'}>
                        <SettingsTab
                            projectId={project.id}
                            stats={stats}
                            settings={settings}
                            providers={providers}
                            userSettings={userSettings}
                        />
                    </div>
                )}
                </div>
            </div>
        </AppLayout>
    );
}
