import { usePage } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import IconTile from '@alexandria/components/ui/IconTile';
import PageHeader from '@alexandria/components/layout/PageHeader';
import NeuralConstellationBg from '@alexandria/components/backgrounds/NeuralConstellationBg';
import DashboardTab from './Sections/DashboardTab';
import CommandsTab from './Sections/CommandsTab';
import UsageTab from './Sections/UsageTab';
import ModelsTab from './Sections/ModelsTab';
import SettingsTab from './Sections/SettingsTab';
import type { AiDashboardProps } from '@alexandria/types/ai-dashboard';

type Tab = 'dashboard' | 'commands' | 'usage' | 'models' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-gauge' },
    { key: 'commands', label: 'Commands', icon: 'fa-solid fa-list-check' },
    { key: 'usage', label: 'Usage', icon: 'fa-solid fa-chart-bar' },
    { key: 'models', label: 'Models', icon: 'fa-solid fa-microchip' },
    { key: 'settings', label: 'Settings', icon: 'fa-solid fa-gear' },
];

function tabFromHash(): Tab {
    const hash = window.location.hash.slice(1) as Tab;
    const valid: Tab[] = ['dashboard', 'commands', 'usage', 'models', 'settings'];
    return valid.includes(hash) ? hash : 'dashboard';
}

export default function AiDashboard() {
    const props = usePage().props as unknown as AiDashboardProps;
    const { project, stats, providers, settings, userSettings } = props;

    const [activeTab, setActiveTab] = useState<Tab>(tabFromHash);

    useEffect(() => {
        window.location.hash = activeTab === 'dashboard' ? '' : `#${activeTab}`;
    }, [activeTab]);

    // Keep-mounted tabs — lazy-mount on first visit, hide (don't
    // unmount) when the user switches away so fetched data, scroll
    // position, and local filter state all survive. Same pattern used
    // on Notes Dashboard.
    const [visited, setVisited] = useState<Set<Tab>>(() => new Set([tabFromHash()]));
    useEffect(() => {
        if (visited.has(activeTab)) return;
        setVisited((prev) => {
            const next = new Set(prev);
            next.add(activeTab);
            return next;
        });
    }, [activeTab, visited]);

    return (
        <AppLayout title="AI Dashboard" immersive>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: 'AI Dashboard' },
                ]}
                tabs={
                    <>
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className={`${tab.icon} text-xs`} />
                                {tab.label}
                            </button>
                        ))}
                    </>
                }
            >
                <div className="flex items-center gap-4">
                    <IconTile
                        icon="fa-solid fa-bolt"
                        color="primary"
                        variant="solid"
                        animation="beat-fade"
                        animationStyle={{
                            // Ambient "the AI is thinking" pulse — slow and
                            // subtle, not an attention grab.
                            '--fa-animation-duration': '2.5s',
                            '--fa-beat-fade-opacity': '0.8',
                            '--fa-beat-fade-scale': '1.075',
                        } as CSSProperties}
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">AI</h1>
                        <p className="mt-1 text-sm text-base-content/50">
                            Manage AI features for {project.name}
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
