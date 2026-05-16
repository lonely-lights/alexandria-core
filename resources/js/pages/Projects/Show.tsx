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
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import { classificationLabel } from '@alexandria/config/classifications';
import type { ProjectShowProps, BlueprintCard } from '@alexandria/types/projects';

type ClassificationTab = 'standard' | 'relationship' | 'list' | 'structural';
type Tab = ClassificationTab | 'activity' | 'archive' | 'settings';

/* ── Theme styles ── */

const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' };

// Tabs use a chunkier 0.75rem radius to match legacy's `rounded-xl`
// override on the btn-sm base. The default --theme-radius-button is
// 0.5rem which reads too tight for this chrome treatment — the active
// pill is meant to feel softer / more inviting than a standard CTA.
const tabActiveStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: '0.75rem',
};

const tabIdleStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: '0.75rem',
};

// Count badges use the page-surface / text contrast pair so the chip
// reads as inverted against whatever it sits on — dark chip + light
// text on a light page, light chip + dark text on a dark page. Inside
// the active yellow pill this gives a base-100 chip that contrasts
// against the bright fill, matching legacy's DaisyUI `badge` base
// (bg-base-100 + text-base-content) treatment.
const tabCountBadgeStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.375rem',
    fontSize: '0.6875rem',
    fontWeight: 500,
    lineHeight: 1,
};

const tabActiveCountBadgeStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.375rem',
    fontSize: '0.6875rem',
    fontWeight: 500,
    lineHeight: 1,
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

// View toggle is desktop-only chrome (collapses to the dot menu on
// mobile). At desktop, bump the click target up so it doesn't read as a
// pinprick — 32×32 satisfies WCAG 2.5.8 (target size minimum) and stays
// proportional to the New Blueprint CTA next to it.
function viewToggleBtnStyle(active: boolean): CSSProperties {
    const base: CSSProperties = {
        padding: '0.5rem 0.625rem',
        border: 'none',
        fontSize: '0.75rem',
        minWidth: '2rem',
        minHeight: '2rem',
    };
    if (active) {
        return {
            ...base,
            background: 'var(--theme-brand-primary-500)',
            color: 'var(--theme-brand-primary-content)',
        };
    }
    return {
        ...base,
        background: 'transparent',
        color: 'var(--theme-base-content)',
    };
}

const ownerLinkStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    fontWeight: 700,
};

const detailsToggleStyle: CSSProperties = {
    // Muted base-content tint so the trigger reads as auxiliary chrome,
    // not a primary CTA. Legacy uses a similarly subdued treatment.
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    transition: 'color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

export default function ProjectShow() {
    const t = useT();
    // Below 1024px the 4 inline classification tabs + 3-dot menu +
    // breadcrumb overflow the breadcrumb strip, so collapse all four
    // tabs into the 3-dot menu. We branch on isMobile to skip rendering
    // the buttons entirely rather than using a `hidden lg:inline-flex`
    // class — that keeps the DOM clean and avoids any chance of CSS
    // specificity collisions hiding the wrong element.
    const isMobile = useMediaQuery('(max-width: 1023px)');
    const props = usePage<ProjectShowProps>().props;
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
    // Hero description collapses by default on mobile — the summary is
    // usually a 3-5 line pitch, which on a 375px viewport pushes the
    // blueprint cards off the fold entirely. Desktop has no collapse:
    // there's room for the full description above the cards.
    const [summaryExpanded, setSummaryExpanded] = useState(false);

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

    // 3-dot menu items. On mobile (below sm:) the inline classification
    // tab buttons are hidden, so we prepend them here as menu entries
    // — that's the only access path to those views below 640px.
    const classificationMenuItems = isMobile ? [
        { label: classificationLabel('standard'), icon: 'fa-solid fa-file', onClick: () => setActiveTab('standard'), badge: classificationCounts.standard ?? undefined },
        ...((classificationCounts.relationship ?? 0) > 0 ? [
            { label: t('projects.show.tab.relationships'), icon: 'fa-solid fa-diagram-project', onClick: () => setActiveTab('relationship'), badge: classificationCounts.relationship },
        ] : []),
        ...((classificationCounts.list ?? 0) > 0 ? [
            { label: t('projects.show.tab.lists'), icon: 'fa-solid fa-list', onClick: () => setActiveTab('list'), badge: classificationCounts.list },
        ] : []),
        ...((classificationCounts.structural ?? 0) > 0 ? [
            { label: t('projects.show.tab.structures'), icon: 'fa-solid fa-sitemap', onClick: () => setActiveTab('structural'), badge: classificationCounts.structural },
        ] : []),
        { divider: true as const },
    ] : [];

    // View-mode toggle becomes a dot-menu entry on mobile. The inline
    // toggle row gets crowded against "Page Blueprints / count / +New
    // Blueprint" below 1024px — moving it into the menu keeps the row
    // legible and avoids creating a 4th competing CTA above each tab.
    // Only present when the active tab is a classification (the toggle
    // doesn't apply to activity / archive / settings).
    const viewModeMenuItems = (isMobile && isClassificationTab) ? [
        {
            label: viewModes[activeTab as ClassificationTab] === 'expanded'
                ? t('projects.show.view_toggle.list')
                : t('projects.show.view_toggle.expanded'),
            icon: viewModes[activeTab as ClassificationTab] === 'expanded'
                ? 'fa-solid fa-list'
                : 'fa-solid fa-grid-2',
            onClick: () => toggleViewMode(activeTab as ClassificationTab),
        },
        { divider: true as const },
    ] : [];

    const menuItems = [
        ...classificationMenuItems,
        ...viewModeMenuItems,
        { label: t('projects.show.menu.activity'), icon: 'fa-solid fa-clock-rotate-left', onClick: () => setActiveTab('activity') },
        { label: t('projects.show.menu.ai_batches'), icon: 'fa-solid fa-brain', href: `/ai/${project.slug}#commands` },
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
                className="alex-btn alex-project-tab inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
                style={{ ...(active ? tabActiveStyle : tabIdleStyle), lineHeight: 1 }}
                aria-pressed={active}
            >
                <i className={`${icon} text-[11px]`} aria-hidden="true" />
                {label}
                {count !== undefined && count > 0 && (
                    <span style={active ? tabActiveCountBadgeStyle : tabCountBadgeStyle}>{count}</span>
                )}
            </button>
        );
    }

    // On mobile, the PageHeader's breadcrumb strip would render with
    // only an orphaned right-aligned dot menu — a visually empty strip
    // stacked above StatsBar. So we drop the strip entirely on mobile
    // and re-home the dot menu inside StatsBar (via the `menu` prop)
    // so it shares one horizontal band with the project stats. Desktop
    // keeps the classification tab pills in the strip as before.
    const dropdownMenu = <DropdownMenu items={menuItems} />;
    const pageHeaderTabs = !isMobile ? (
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
            {dropdownMenu}
        </>
    ) : undefined;

    return (
        <AppLayout title={project.name} immersive onSearchToggle={() => setSearchOpen(true)}>
            <PageHeader tabs={pageHeaderTabs}>
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
                        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight">{project.name}</h1>
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
                    <div className="mt-4">
                        <MentionAwareContent
                            html={project.summary_html}
                            // line-clamp-3 only fires when summaryExpanded
                            // is false AND we're below sm: — the
                            // sm:!line-clamp-none reset gives desktop the
                            // full text regardless of state.
                            className={`prose prose-sm max-w-none sm:line-clamp-none ${summaryExpanded ? '' : 'line-clamp-3'} [&_h2]:!text-xl sm:[&_h2]:!text-2xl md:[&_h2]:!text-3xl`}
                            style={bodyText}
                        />
                        <button
                            type="button"
                            onClick={() => setSummaryExpanded((v) => !v)}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium sm:hidden"
                            style={detailsToggleStyle}
                        >
                            <i
                                className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-200 ${summaryExpanded ? 'rotate-90' : ''}`}
                                aria-hidden="true"
                            />
                            {summaryExpanded ? t('projects.show.read_less') : t('projects.show.read_more')}
                        </button>
                    </div>
                )}
                {project.logline && (
                    <p className="mt-2 text-xs italic" style={labelText}>
                        {project.logline}
                    </p>
                )}

                {project.contents_html && (
                    <ExpandableContents
                        html={project.contents_html}
                        t={t}
                        // Mobile: the summary's "Read More" already
                        // drives ExpandableContents via summaryExpanded
                        // (single toggle reveals both blocks). Desktop:
                        // leave it uncontrolled — its own "Show Details"
                        // button governs the deeper history while the
                        // summary above stays always-visible.
                        controlledExpanded={isMobile ? summaryExpanded : undefined}
                    />
                )}
            </PageHeader>

            {/* Stats — on mobile, hosts the dot menu so we don't render
                an orphan breadcrumb strip just to hold it. */}
            <StatsBar stats={stats} menu={isMobile ? dropdownMenu : undefined} />

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
                                {/* View toggle — desktop only. Mobile uses the
                                    dot menu entry to flip view modes. */}
                                {!isMobile && (
                                    <div style={viewToggleWrapStyle}>
                                        <Tooltip content={t('projects.show.view_toggle.expanded')}>
                                            <button
                                                type="button"
                                                onClick={() => viewModes[activeTab as ClassificationTab] !== 'expanded' && toggleViewMode(activeTab as ClassificationTab)}
                                                className="alex-btn inline-flex items-center justify-center"
                                                style={viewToggleBtnStyle(viewModes[activeTab as ClassificationTab] === 'expanded')}
                                                aria-pressed={viewModes[activeTab as ClassificationTab] === 'expanded'}
                                                aria-label={t('projects.show.view_toggle.expanded')}
                                            >
                                                <i className="fa-solid fa-grid-2 text-xs" aria-hidden="true" />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content={t('projects.show.view_toggle.list')}>
                                            <button
                                                type="button"
                                                onClick={() => viewModes[activeTab as ClassificationTab] !== 'list' && toggleViewMode(activeTab as ClassificationTab)}
                                                className="alex-btn inline-flex items-center justify-center"
                                                style={viewToggleBtnStyle(viewModes[activeTab as ClassificationTab] === 'list')}
                                                aria-pressed={viewModes[activeTab as ClassificationTab] === 'list'}
                                                aria-label={t('projects.show.view_toggle.list')}
                                            >
                                                <i className="fa-solid fa-list text-xs" aria-hidden="true" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                )}
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

/* ── Expandable Contents ──
 * When `controlledExpanded` is omitted the component owns its own
 * open/closed state and renders its own toggle button (desktop
 * behaviour). When `controlledExpanded` is a boolean the parent
 * drives expansion and the internal button is hidden — used on
 * mobile so a single "Read More" affordance reveals both the
 * clamped summary AND this deeper-history block in one tap, rather
 * than asking the user to find and tap two separate toggles. */
interface ExpandableContentsProps {
    html: string;
    t: ReturnType<typeof useT>;
    controlledExpanded?: boolean;
}

function ExpandableContents({ html, t, controlledExpanded }: ExpandableContentsProps) {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isControlled = controlledExpanded !== undefined;
    const expanded = isControlled ? controlledExpanded : internalExpanded;
    const contentRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const prevExpanded = useRef(expanded);

    // Run the height animation whenever expanded flips, regardless of
    // whether the change came from the internal toggle button (desktop)
    // or the parent's controlled prop (mobile shared toggle).
    useEffect(() => {
        if (prevExpanded.current === expanded) return;
        prevExpanded.current = expanded;

        const wrapper = wrapperRef.current;
        const content = contentRef.current;
        if (!wrapper || !content) return;

        if (expanded) {
            gsap.fromTo(wrapper,
                { height: 0 },
                { height: content.scrollHeight, duration: 0.3, ease: 'power2.inOut', onComplete: () => { wrapper.style.height = 'auto'; } },
            );
        } else {
            gsap.to(wrapper, {
                height: 0,
                duration: 0.3,
                ease: 'power2.inOut',
            });
        }
        // Kill the in-flight tween + onComplete handler if the component
        // unmounts mid-animation — closes H-EFFECT-7 family.
        return () => { gsap.killTweensOf(wrapper); };
    }, [expanded]);

    return (
        <div className="mt-4">
            {!isControlled && (
                <button
                    type="button"
                    onClick={() => setInternalExpanded((v) => !v)}
                    className="flex items-center gap-2 text-xs font-medium"
                    style={detailsToggleStyle}
                >
                    <i
                        className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}
                        aria-hidden="true"
                    />
                    {expanded ? t('projects.show.hide_details') : t('projects.show.show_details')}
                </button>
            )}
            <div ref={wrapperRef} className="overflow-hidden" style={{ height: 0 }}>
                <div ref={contentRef}>
                    <MentionAwareContent
                        html={html}
                        className="prose prose-sm mt-3 max-w-none [&_h2]:!text-xl sm:[&_h2]:!text-2xl md:[&_h2]:!text-3xl"
                        style={bodyText}
                    />
                </div>
            </div>
        </div>
    );
}
