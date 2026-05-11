import { usePage } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { useCmdK } from '@alexandria/hooks/useCmdK';
import gsap from 'gsap';
import AppLayout from '@alexandria/layouts/AppLayout';
import StatsBar from '@alexandria/components/projects/StatsBar';
import CommandPalette from '@alexandria/components/search/CommandPalette';
import { projectSearch } from '@alexandria/lib/projectSearch';
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
import useT from '@alexandria/hooks/useT';
import { classificationLabel } from '@alexandria/config/classifications';
import type { ProjectShowProps, BlueprintCard } from '@alexandria/types/projects';

type ClassificationTab = 'standard' | 'relationship' | 'list' | 'structural';
type Tab = ClassificationTab | 'activity' | 'archive' | 'settings';

/* ── Theme styles ── */

const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' };

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

const tabCountBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
};

const tabActiveCountBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-content) 25%, transparent)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
};

const sectionCountBadgeStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
};

const viewToggleWrapStyle: CSSProperties = {
    display: 'flex',
    overflow: 'hidden',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

function viewToggleBtnStyle(active: boolean): CSSProperties {
    if (active) {
        return {
            background: 'var(--theme-brand-primary-500)',
            color: 'var(--theme-brand-primary-content)',
            padding: '0.25rem 0.5rem',
            border: 'none',
            fontSize: '0.75rem',
        };
    }
    return {
        background: 'transparent',
        color: 'var(--theme-base-content)',
        padding: '0.25rem 0.5rem',
        border: 'none',
        fontSize: '0.75rem',
    };
}

const ownerLinkStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    fontWeight: 700,
};

const detailsToggleStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    transition: 'color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

export default function ProjectShow() {
    const t = useT();
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
        { label: t('projects.show.menu.activity'), icon: 'fa-solid fa-clock-rotate-left', onClick: () => setActiveTab('activity') },
        { label: t('projects.show.menu.ai_batches'), icon: 'fa-solid fa-brain', href: `/p/${project.slug}/ai/batches` },
        ...(project.can.update ? [
            { divider: true as const },
            { label: t('projects.show.menu.archive'), icon: 'fa-solid fa-box-archive', badge: stats.archived_count > 0 ? stats.archived_count : undefined, onClick: () => setActiveTab('archive') },
            { label: t('projects.show.menu.settings'), icon: 'fa-solid fa-gear', onClick: () => setActiveTab('settings') },
        ] : []),
    ];

    function TabButton({ tab, icon, label, count }: { tab: Tab; icon: string; label: string; count?: number }) {
        const active = activeTab === tab;
        return (
            <button
                type="button"
                onClick={() => setActiveTab(tab)}
                className="alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                style={active ? tabActiveStyle : tabIdleStyle}
                aria-pressed={active}
            >
                <i className={`${icon} text-xs`} aria-hidden="true" />
                {label}
                {count !== undefined && count > 0 && (
                    <span style={active ? tabActiveCountBadgeStyle : tabCountBadgeStyle}>{count}</span>
                )}
            </button>
        );
    }

    return (
        <AppLayout title={project.name} immersive onSearchToggle={() => setSearchOpen(true)}>
            <PageHeader
                breadcrumbs={[{ label: project.name }]}
                tabs={
                    <>
                        <TabButton
                            tab="standard"
                            icon="fa-solid fa-file"
                            label={classificationLabel('standard')}
                            count={classificationCounts.standard ?? 0}
                        />
                        {(classificationCounts.relationship ?? 0) > 0 && (
                            <TabButton
                                tab="relationship"
                                icon="fa-solid fa-diagram-project"
                                label={t('projects.show.tab.relationships')}
                                count={classificationCounts.relationship}
                            />
                        )}
                        {(classificationCounts.list ?? 0) > 0 && (
                            <TabButton
                                tab="list"
                                icon="fa-solid fa-list"
                                label={t('projects.show.tab.lists')}
                                count={classificationCounts.list}
                            />
                        )}
                        {(classificationCounts.structural ?? 0) > 0 && (
                            <TabButton
                                tab="structural"
                                icon="fa-solid fa-sitemap"
                                label={t('projects.show.tab.structures')}
                                count={classificationCounts.structural}
                            />
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
                        <p className="mt-1 text-sm" style={labelText}>
                            {t('projects.show.owned_by')}{' '}
                            <UserLink
                                userId={project.owner.id}
                                href={`/u/${project.owner.username.toLowerCase()}`}
                                className="hover:underline"
                                style={ownerLinkStyle}
                            >
                                {project.owner.display_name ?? project.owner.name}
                            </UserLink>
                        </p>
                    </div>
                </div>

                {project.summary_html && (
                    <MentionAwareContent
                        html={project.summary_html}
                        className="prose prose-sm mt-4 max-w-none"
                        style={bodyText}
                    />
                )}
                {project.logline && (
                    <p className="mt-2 text-xs italic" style={labelText}>
                        {project.logline}
                    </p>
                )}

                {project.contents_html && (
                    <ExpandableContents html={project.contents_html} t={t} />
                )}
            </PageHeader>

            {/* Stats */}
            <StatsBar stats={stats} />

            {/* Tab Content */}
            <div className="container mx-auto max-w-7xl px-4 py-8">
                {isClassificationTab && (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-sm font-semibold" style={labelText}>
                                {t('projects.show.blueprints_heading').replace(':classification', classificationLabel(activeTab))}
                                <span style={sectionCountBadgeStyle}>{allFilteredBlueprints.length}</span>
                            </h2>
                            <div className="flex items-center gap-2">
                                {/* View toggle */}
                                <div style={viewToggleWrapStyle}>
                                    <Tooltip content={t('projects.show.view_toggle.expanded')}>
                                        <button
                                            type="button"
                                            onClick={() => viewModes[activeTab as ClassificationTab] !== 'expanded' && toggleViewMode(activeTab as ClassificationTab)}
                                            className="alex-btn inline-flex items-center gap-1"
                                            style={viewToggleBtnStyle(viewModes[activeTab as ClassificationTab] === 'expanded')}
                                            aria-pressed={viewModes[activeTab as ClassificationTab] === 'expanded'}
                                            aria-label={t('projects.show.view_toggle.expanded')}
                                        >
                                            <i className="fa-solid fa-grid-2 text-[10px]" aria-hidden="true" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={t('projects.show.view_toggle.list')}>
                                        <button
                                            type="button"
                                            onClick={() => viewModes[activeTab as ClassificationTab] !== 'list' && toggleViewMode(activeTab as ClassificationTab)}
                                            className="alex-btn inline-flex items-center gap-1"
                                            style={viewToggleBtnStyle(viewModes[activeTab as ClassificationTab] === 'list')}
                                            aria-pressed={viewModes[activeTab as ClassificationTab] === 'list'}
                                            aria-label={t('projects.show.view_toggle.list')}
                                        >
                                            <i className="fa-solid fa-list text-[10px]" aria-hidden="true" />
                                        </button>
                                    </Tooltip>
                                </div>
                                {project.can.update && (
                                    <ActionButton
                                        icon="fa-solid fa-plus"
                                        label={t('projects.show.new_blueprint')}
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
                onSearch={projectSearch(project.slug)}
            />
        </AppLayout>
    );
}

/* ── Expandable Contents ── */
function ExpandableContents({ html, t }: { html: string; t: ReturnType<typeof useT> }) {
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
                className="flex items-center gap-2 text-xs font-medium"
                style={detailsToggleStyle}
            >
                <i
                    className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                />
                {expanded ? t('projects.show.hide_details') : t('projects.show.show_details')}
            </button>
            <div ref={wrapperRef} className="overflow-hidden" style={{ height: 0 }}>
                <div ref={contentRef}>
                    <MentionAwareContent
                        html={html}
                        className="prose prose-sm mt-3 max-w-none"
                        style={bodyText}
                    />
                </div>
            </div>
        </div>
    );
}
