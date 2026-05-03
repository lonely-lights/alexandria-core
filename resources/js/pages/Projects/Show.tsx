import { usePage } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCmdK } from '@alexandria/hooks/useCmdK';
import gsap from 'gsap';
import AppLayout from '@alexandria/layouts/AppLayout';
import StatsBar from '@alexandria/components/projects/StatsBar';
import CommandPalette from '@alexandria/components/search/CommandPalette';
import DashboardTab from './Sections/DashboardTab';
import ActivityTab from './Sections/ActivityTab';
import SettingsTab from './Sections/SettingsTab';
import ArchiveTab from './Sections/ArchiveTab';
import PageHeader from '@alexandria/components/layout/PageHeader';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Tooltip from '@alexandria/components/ui/Tooltip';
import IconTile from '@alexandria/components/ui/IconTile';
import UserLink from '@alexandria/components/ui/UserHoverCard';
import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import { classificationLabel } from '@alexandria/config/classifications';
import type { ProjectShowProps, BlueprintCard } from '@alexandria/types/projects';

type ClassificationTab = 'standard' | 'relationship' | 'list' | 'structural';
type Tab = ClassificationTab | 'activity' | 'archive' | 'settings';

export default function ProjectShow() {
    const props = usePage().props as unknown as ProjectShowProps;
    const { project, stats, dashboardBlueprints, settings } = props;
    const blueprints: BlueprintCard[] = (props as unknown as { blueprints: BlueprintCard[] }).blueprints ?? [];

    const [activeTab, setActiveTab] = useState<Tab>(() => {
        const hash = window.location.hash.slice(1);
        if (hash === 'relationships') return 'relationship';
        if (hash === 'lists') return 'list';
        if (hash === 'structures') return 'structural';
        if (hash === 'activity') return 'activity';
        if (hash === 'archive' && project.can.update) return 'archive';
        if (hash === 'settings' && project.can.update) return 'settings';
        return 'standard';
    });
    const [searchOpen, setSearchOpen] = useState(false);

    // View mode per classification — persisted in session
    type ViewMode = 'expanded' | 'list';
    const VIEW_DEFAULTS: Record<ClassificationTab, ViewMode> = {
        standard: 'expanded',
        relationship: 'list',
        list: 'list',
        structural: 'expanded',
    };

    const [viewModes, setViewModes] = useState<Record<ClassificationTab, ViewMode>>(() => {
        const stored = sessionStorage.getItem(`project-${project.id}-view-modes`);
        if (stored) {
            try { return { ...VIEW_DEFAULTS, ...JSON.parse(stored) }; } catch { /* ignore */ }
        }
        return { ...VIEW_DEFAULTS };
    });

    function toggleViewMode(tab: ClassificationTab) {
        setViewModes((prev) => {
            const next = { ...prev, [tab]: prev[tab] === 'expanded' ? 'list' : 'expanded' };
            sessionStorage.setItem(`project-${project.id}-view-modes`, JSON.stringify(next));
            return next;
        });
    }

    // Sync hash with tab
    useEffect(() => {
        const hashMap: Record<Tab, string> = {
            standard: '',
            relationship: '#relationships',
            list: '#lists',
            structural: '#structures',
            activity: '#activity',
            archive: '#archive',
            settings: '#settings',
        };
        window.location.hash = hashMap[activeTab] ?? '';
    }, [activeTab]);

    useCmdK(useCallback(() => setSearchOpen(true), []));

    // Classification counts
    const classificationCounts: Record<string, number> = {};
    for (const bp of blueprints) {
        classificationCounts[bp.classification] = (classificationCounts[bp.classification] ?? 0) + 1;
    }

    // Filter blueprints for active classification tab
    const isClassificationTab = ['standard', 'relationship', 'list', 'structural'].includes(activeTab);
    const filteredBlueprints = isClassificationTab
        ? dashboardBlueprints.filter((bp) => bp.classification === activeTab)
        : [];

    // For non-dashboard blueprints in classification tabs, show all of that type
    const allFilteredBlueprints = isClassificationTab
        ? blueprints.filter((bp) => bp.classification === activeTab)
        : [];

    // 3-dot menu items
    const menuItems = [
        { label: 'Activity', icon: 'fa-solid fa-clock-rotate-left', onClick: () => setActiveTab('activity') },
        { label: 'AI Batches', icon: 'fa-solid fa-brain', href: `/p/${project.slug}/ai/batches` },
        ...(project.can.update ? [
            { divider: true as const },
            { label: 'Archive', icon: 'fa-solid fa-box-archive', badge: stats.archived_count > 0 ? stats.archived_count : undefined, onClick: () => setActiveTab('archive') },
            { label: 'Settings', icon: 'fa-solid fa-gear', onClick: () => setActiveTab('settings') },
        ] : []),
    ];

    return (
        <AppLayout title={project.name} immersive onSearchToggle={() => setSearchOpen(true)}>
            <PageHeader
                breadcrumbs={[
                    { label: project.name },
                ]}
                tabs={
                    <>
                        <button
                            onClick={() => setActiveTab('standard')}
                            className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === 'standard' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            <i className="fa-solid fa-file text-xs" /> {classificationLabel('standard')}
                            {(classificationCounts.standard ?? 0) > 0 && (
                                <span className="badge badge-sm">{classificationCounts.standard}</span>
                            )}
                        </button>
                        {(classificationCounts.relationship ?? 0) > 0 && (
                            <button
                                onClick={() => setActiveTab('relationship')}
                                className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === 'relationship' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className="fa-solid fa-diagram-project text-xs" /> Relationships
                                <span className="badge badge-sm">{classificationCounts.relationship}</span>
                            </button>
                        )}
                        {(classificationCounts.list ?? 0) > 0 && (
                            <button
                                onClick={() => setActiveTab('list')}
                                className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className="fa-solid fa-list text-xs" /> Lists
                                <span className="badge badge-sm">{classificationCounts.list}</span>
                            </button>
                        )}
                        {(classificationCounts.structural ?? 0) > 0 && (
                            <button
                                onClick={() => setActiveTab('structural')}
                                className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === 'structural' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className="fa-solid fa-sitemap text-xs" /> Structures
                                <span className="badge badge-sm">{classificationCounts.structural}</span>
                            </button>
                        )}
                        <DropdownMenu items={menuItems} />
                    </>
                }
            >
                <div className="flex items-center gap-4">
                    {project.page_image_url ? (
                        <img
                            src={project.page_image_url}
                            alt={project.name}
                            className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover"
                        />
                    ) : (
                        <IconTile icon="fa-solid fa-globe" />
                    )}
                    <div>
                        <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">{project.name}</h1>
                        <p className="mt-1 text-sm text-base-content/50">
                            By: <UserLink userId={project.owner.id} href={`/u/${project.owner.username.toLowerCase()}`} className="font-bold text-primary hover:underline">{project.owner.display_name ?? project.owner.name}</UserLink>
                        </p>
                    </div>
                </div>

                {project.summary_html && (
                    <MentionAwareContent
                        html={project.summary_html}
                        className="prose prose-sm mt-4 max-w-none text-base-content/70"
                    />
                )}
                {project.logline && (
                    <p className="mt-2 text-xs italic text-base-content/50">
                        {project.logline}
                    </p>
                )}

                {project.contents_html && (
                    <ExpandableContents html={project.contents_html} />
                )}
            </PageHeader>

            {/* Stats */}
            <StatsBar stats={stats} />

            {/* Tab Content */}
            <div className="container mx-auto max-w-7xl px-4 py-8">
                {isClassificationTab && (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-base-content/50">
                                {classificationLabel(activeTab)} Blueprints
                                <span className="badge badge-primary badge-sm">{allFilteredBlueprints.length}</span>
                            </h2>
                            <div className="flex items-center gap-2">
                                {/* View toggle */}
                                <div className="flex overflow-hidden rounded-lg border border-base-300">
                                    <Tooltip content="Expanded view">
                                        <button
                                            type="button"
                                            onClick={() => viewModes[activeTab as ClassificationTab] !== 'expanded' && toggleViewMode(activeTab as ClassificationTab)}
                                            className={`btn btn-xs rounded-none border-0 gap-1 ${viewModes[activeTab as ClassificationTab] === 'expanded' ? 'btn-primary' : 'btn-ghost'}`}
                                        >
                                            <i className="fa-solid fa-grid-2 text-[10px]" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="List view">
                                        <button
                                            type="button"
                                            onClick={() => viewModes[activeTab as ClassificationTab] !== 'list' && toggleViewMode(activeTab as ClassificationTab)}
                                            className={`btn btn-xs rounded-none border-0 gap-1 ${viewModes[activeTab as ClassificationTab] === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                                        >
                                            <i className="fa-solid fa-list text-[10px]" />
                                        </button>
                                    </Tooltip>
                                </div>
                                {project.can.update && (
                                    <ActionButton
                                        icon="fa-solid fa-plus"
                                        label="New Blueprint"
                                        href={`/p/${project.slug}/blueprints/create`}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Blueprint cards */}
                        <DashboardTab
                            dashboardBlueprints={filteredBlueprints}
                            allBlueprints={allFilteredBlueprints}
                            classification={activeTab as ClassificationTab}
                            viewMode={viewModes[activeTab as ClassificationTab]}
                        />
                    </div>
                )}

                {activeTab === 'activity' && (
                    <ActivityTab projectId={project.id} />
                )}

                {activeTab === 'archive' && (
                    <ArchiveTab projectId={project.id} />
                )}

                {activeTab === 'settings' && settings && (
                    <SettingsTab project={project} settings={settings} />
                )}
            </div>

            {/* Command Palette */}
            <CommandPalette
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                projectSlug={project.slug}
            />
        </AppLayout>
    );
}

/* ── Expandable Contents ── */
function ExpandableContents({ html }: { html: string }) {
    const [expanded, setExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    function toggle() {
        const wrapper = wrapperRef.current;
        const content = contentRef.current;
        if (!wrapper || !content) return;

        if (expanded) {
            gsap.to(wrapper, {
                height: 0,
                duration: 0.3,
                ease: 'power2.inOut',
                onComplete: () => setExpanded(false),
            });
        } else {
            setExpanded(true);
            gsap.fromTo(wrapper,
                { height: 0 },
                { height: content.scrollHeight, duration: 0.3, ease: 'power2.inOut', onComplete: () => { wrapper.style.height = 'auto'; } },
            );
        }
    }

    return (
        <div className="mt-4">
            <button
                type="button"
                onClick={toggle}
                className="flex items-center gap-2 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
                <i className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
                {expanded ? 'Hide Details' : 'Show Details'}
            </button>
            <div ref={wrapperRef} className="overflow-hidden" style={{ height: 0 }}>
                <div ref={contentRef}>
                    <MentionAwareContent
                        html={html}
                        className="prose prose-sm mt-3 max-w-none text-base-content/70"
                    />
                </div>
            </div>
        </div>
    );
}
