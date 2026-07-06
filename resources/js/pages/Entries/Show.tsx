import { usePage, router } from '@inertiajs/react';
import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useCmdK } from '@alexandria/hooks/useCmdK';
import useT from '@alexandria/hooks/useT';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import CommandPalette from '@alexandria/components/search/CommandPalette';
import { projectSearch } from '@alexandria/lib/projectSearch';
import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import ActionButton from '@alexandria/components/ui/ActionButton';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import IconTile from '@alexandria/components/ui/IconTile';
import type { EntryShowProps } from '@alexandria/types/entries';
import AppearancesCard from './Sections/AppearancesCard';
import OverviewTab from './Sections/OverviewTab';
import AttributesTab from './Sections/AttributesTab';
import RelationshipsTab from './Sections/RelationshipsTab';
import ConnectionsTab from './Sections/ConnectionsTab';
import MentionsTab from './Sections/MentionsTab';
import HistoryTab from './Sections/HistoryTab';
import TimelineTab from './Sections/TimelineTab';
import TreeView from '@alexandria/pages/Blueprints/Sections/TreeView';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import MediaSection from '@alexandria/components/media/MediaSection';
import EntrySettingsModal from './Sections/modals/EntrySettingsModal';

/* ── Tabs ── */

type Tab = 'overview' | 'structure' | 'attributes' | 'relationships' | 'connections' | 'mentions' | 'mentioned_in' | 'media' | 'history' | 'timeline';

/* ── Theme-token style recipes ──
   Tab buttons + structure-settings popover repaint from --theme-*
   tokens so preset swaps reach this chrome alongside the rest. */

const tabBtnBase: CSSProperties = {
    fontSize: '0.875rem',
    padding: '0.375rem 0.75rem',
    borderRadius: 'var(--theme-radius-button)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
};

const tabBtnActiveStyle: CSSProperties = {
    ...tabBtnBase,
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

const tabBtnIdleStyle: CSSProperties = {
    ...tabBtnBase,
    background: 'transparent',
    color: 'var(--theme-base-content)',
};

const thumbRingStyle: CSSProperties = {
    boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const summaryStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const structureLabelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const structureBadgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.0625rem 0.375rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: 'var(--theme-radius-badge)',
    background: 'var(--theme-brand-secondary-500)',
    color: 'var(--theme-brand-secondary-content)',
};

const configBtnStyle: CSSProperties = {
    fontSize: '0.75rem',
    padding: '0.125rem 0.5rem',
    borderRadius: 'var(--theme-radius-button)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
};

const popoverStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid var(--theme-base-300)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.15)',
};

const popoverHeaderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const popoverFooterStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const writingChipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginTop: '0.25rem',
    fontSize: '0.6875rem',
    padding: '0.125rem 0.5rem',
    borderRadius: 'var(--theme-radius-badge)',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    textDecoration: 'none',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
};

const popoverHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const popoverPrimaryIconStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
};

const popoverLabelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const popoverHelperStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const popoverInputStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    color: 'var(--theme-base-content)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    width: '100%',
};

const modeBtnActiveStyle: CSSProperties = {
    flex: 1,
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--theme-radius-button)',
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
};

const modeBtnIdleStyle: CSSProperties = {
    flex: 1,
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--theme-radius-button)',
    background: 'transparent',
    color: 'var(--theme-base-content)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
};

const saveBtnStyle: CSSProperties = {
    fontSize: '0.75rem',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--theme-radius-button)',
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

/* ── Page ── */

export default function EntryShow() {
    const t = useT();
    const props = usePage<EntryShowProps>().props;
    const { project, blueprint, entry, contentHtml, summaryHtml, dynamicProperties, relationships, relationshipBlueprints, connections, mentions, mentionedIn, appearances, history, infoboxBlocks, timelineEvents, timelineEpoch } = props;

    const [showStructureConfig, setShowStructureConfig] = useState(false);
    const [localStructureSettings, setLocalStructureSettings] = useState<{ children_label?: string; max_depth?: number; show_as?: 'tree' | 'list' }>(
        (entry.metadata?.structure_settings ?? {}) as { children_label?: string; max_depth?: number; show_as?: 'tree' | 'list' },
    );
    const structureConfigRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!showStructureConfig) return;
        function handleClick(e: MouseEvent) {
            if (structureConfigRef.current && !structureConfigRef.current.contains(e.target as Node)) {
                setShowStructureConfig(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showStructureConfig]);

    function saveStructureSettings() {
        fetch(`/api/v1/entries/${entry.id}/meta`, {
            method: 'PATCH',
            headers: csrfHeaders(),
            body: JSON.stringify({ structure_settings: localStructureSettings }),
        }).then(() => {
            setShowStructureConfig(false);
            router.reload({ only: ['entry'] });
        });
    }

    const [activeTab, setActiveTab] = useState<Tab>(() => {
        const hash = window.location.hash.slice(1) as Tab;
        const validTabs: Tab[] = ['overview', 'structure', 'attributes', 'relationships', 'connections', 'mentions', 'mentioned_in', 'history', 'timeline'];
        return validTabs.includes(hash) ? hash : 'overview';
    });
    const [searchOpen, setSearchOpen] = useState(false);
    // Stage 8b M3 — Entry settings modal (theme override panel).
    const [settingsOpen, setSettingsOpen] = useState(false);

    const iconClass = blueprint.icon.includes(' ') ? blueprint.icon : `fa-solid ${blueprint.icon}`;
    const writingWorkSlug = (entry.metadata?.writing as { work_slug?: string } | undefined)?.work_slug ?? null;

    // Sync hash
    useEffect(() => {
        window.location.hash = activeTab === 'overview' ? '' : `#${activeTab}`;
    }, [activeTab]);

    useCmdK(useCallback(() => setSearchOpen(true), []));

    // Dropdown menu items — tabs that aren't pinned to the bar
    const menuItems: Array<{ label: string; icon: string; key: Tab; badge?: string | number }> = [];

    if (dynamicProperties.length > 0) {
        menuItems.push({ key: 'attributes', label: t('entries.show.menu.attributes'), icon: 'fa-solid fa-list', badge: dynamicProperties.length });
    }
    if (relationships.length > 0) {
        menuItems.push({ key: 'relationships', label: t('entries.show.menu.relationships'), icon: 'fa-solid fa-diagram-project', badge: relationships.length });
    }
    if (mentions.length > 0) {
        menuItems.push({ key: 'mentions', label: t('entries.show.menu.mentions'), icon: 'fa-solid fa-at', badge: mentions.length });
    }
    if (mentionedIn.length > 0) {
        menuItems.push({ key: 'mentioned_in', label: t('entries.show.menu.mentioned_in'), icon: 'fa-solid fa-reply', badge: mentionedIn.length });
    }
    menuItems.push({ key: 'media', label: t('entries.show.menu.media'), icon: 'fa-solid fa-images' });
    if (history.length > 0) {
        menuItems.push({ key: 'history', label: t('entries.show.menu.history'), icon: 'fa-solid fa-clock-rotate-left' });
    }

    // Build dropdown items with navigation links at the bottom
    const dropdownItems = [
        ...menuItems.map((item) => ({
            label: item.label,
            icon: item.icon,
            badge: item.badge,
            onClick: () => setActiveTab(item.key),
        })),
        ...(menuItems.length > 0 ? [{ divider: true as const }] : []),
        ...(blueprint.show_tree_view ? [{ label: t('entries.show.menu.view_in_tree'), icon: 'fa-solid fa-sitemap', href: `/p/${project.slug}/${blueprint.slug}#tree` }] : []),
        { label: t('entries.show.menu.all_plural').replace(':plural', blueprint.plural_name), icon: blueprint.icon, href: `/p/${project.slug}/${blueprint.slug}` },
    ];

    return (
        <AppLayout title={`${entry.name} - ${project.name}`} immersive onSearchToggle={() => setSearchOpen(true)}>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: blueprint.name, href: `/p/${project.slug}/${blueprint.slug}`, icon: blueprint.icon },
                    { label: entry.name },
                ]}
                actions={
                    <div className="flex items-center gap-2">
                        {entry.can.update && (
                            <ActionButton
                                icon="fa-solid fa-palette"
                                label={t('entries.show.entry_settings')}
                                onClick={() => setSettingsOpen(true)}
                                variant="ghost"
                                size="md"
                            />
                        )}
                        <ActionButton
                            icon="fa-solid fa-pencil"
                            label={t('entries.show.edit_entry')}
                            href={`/p/${project.slug}/${blueprint.slug}/${entry.slug}/edit`}
                            size="md"
                        />
                    </div>
                }
                tabs={
                    <>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className="alex-view-toggle-btn"
                            data-active={activeTab === 'overview' ? 'true' : 'false'}
                            style={activeTab === 'overview' ? tabBtnActiveStyle : tabBtnIdleStyle}
                        >
                            <i className="fa-solid fa-eye text-xs" /> {t('entries.show.tab.overview')}
                        </button>
                        {entry.has_children && (
                            <button
                                onClick={() => setActiveTab('structure')}
                                className="alex-view-toggle-btn"
                                data-active={activeTab === 'structure' ? 'true' : 'false'}
                                style={activeTab === 'structure' ? tabBtnActiveStyle : tabBtnIdleStyle}
                            >
                                <i className="fa-solid fa-sitemap text-xs" /> {t('entries.show.tab.structure')}
                            </button>
                        )}
                        {timelineEvents.length > 0 && (
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className="alex-view-toggle-btn"
                                data-active={activeTab === 'timeline' ? 'true' : 'false'}
                                style={activeTab === 'timeline' ? tabBtnActiveStyle : tabBtnIdleStyle}
                            >
                                <i className="fa-solid fa-timeline text-xs" /> {t('entries.show.tab.timeline')}
                            </button>
                        )}
                        {connections.length > 0 && (
                            <button
                                onClick={() => setActiveTab('connections')}
                                className="alex-view-toggle-btn"
                                data-active={activeTab === 'connections' ? 'true' : 'false'}
                                style={activeTab === 'connections' ? tabBtnActiveStyle : tabBtnIdleStyle}
                            >
                                <i className="fa-solid fa-share-nodes text-xs" /> {t('entries.show.tab.connections')}
                            </button>
                        )}
                        {dropdownItems.length > 0 && (
                            <DropdownMenu items={dropdownItems} />
                        )}
                    </>
                }
            >
                <div className="flex items-center gap-4">
                    {entry.thumbnail_url ? (
                        <img
                            src={entry.thumbnail_url}
                            alt={entry.name}
                            className="h-14 w-14 flex-shrink-0 object-cover shadow-md"
                            style={{ ...thumbRingStyle, borderRadius: 'var(--theme-radius-card)' }}
                        />
                    ) : (
                        <div style={{ ...thumbRingStyle, borderRadius: 'var(--theme-radius-card)' }}>
                            <IconTile icon={iconClass} className="shadow-md" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold">{entry.name}</h1>
                        {summaryHtml && (
                            <MentionAwareContent
                                html={summaryHtml}
                                className="entry-summary-links mt-1 text-sm"
                                style={summaryStyle}
                            />
                        )}
                        {writingWorkSlug && (
                            <a href={`/works/${project.slug}/${writingWorkSlug}`} style={writingChipStyle}>
                                <i className="fa-solid fa-feather" />
                                {t('entries.show.open_in_writing')}
                            </a>
                        )}
                    </div>
                </div>
            </PageHeader>

            {/* Tab content */}
            <div className="container mx-auto max-w-7xl px-4 py-8">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <OverviewTab
                            contentHtml={contentHtml}
                            entry={entry}
                            infoboxBlocks={infoboxBlocks}
                        />
                        {appearances !== undefined && appearances.length > 0 && (
                            <AppearancesCard appearances={appearances} projectSlug={project.slug} />
                        )}
                    </div>
                )}

                {activeTab === 'attributes' && (
                    <AttributesTab properties={dynamicProperties} />
                )}

                {activeTab === 'relationships' && (
                    <RelationshipsTab
                        entryId={entry.id}
                        projectId={project.id}
                        relationshipBlueprints={relationshipBlueprints}
                    />
                )}

                {activeTab === 'connections' && (
                    <ConnectionsTab
                        connections={connections}
                        projectSlug={project.slug}
                    />
                )}

                {activeTab === 'mentions' && (
                    <MentionsTab entries={mentions} title={t('entries.show.mentions_title.mentions')} />
                )}

                {activeTab === 'mentioned_in' && (
                    <MentionsTab entries={mentionedIn} title={t('entries.show.mentions_title.mentioned_in')} />
                )}

                {activeTab === 'media' && (
                    <MediaSection modelType="entries" modelId={entry.id} showGallery={true} />
                )}
                {activeTab === 'history' && (
                    <HistoryTab history={history} />
                )}
                {activeTab === 'structure' && (
                    <div className="space-y-3">
                        {/* Structure toolbar — consistent position between tree/list modes */}
                        <div className="flex items-center gap-2">
                            {localStructureSettings.children_label && (
                                <span className="text-sm font-semibold" style={structureLabelStyle}>{localStructureSettings.children_label}</span>
                            )}
                            <span style={structureBadgeStyle}>{entry.children_count ?? 0}</span>
                            <div className="flex-1" />
                            <div className="relative" ref={structureConfigRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowStructureConfig(!showStructureConfig)}
                                    className="alex-view-toggle-btn"
                                    style={configBtnStyle}
                                >
                                    <i className="fa-solid fa-gear text-xs" /> {t('entries.show.structure.configure')}
                                </button>
                                {showStructureConfig && (
                                    <div className="absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden" style={popoverStyle}>
                                        <div className="px-3 py-2" style={popoverHeaderStyle}>
                                            <span className="text-xs font-medium" style={popoverHeadingStyle}>
                                                <i className="fa-solid fa-sliders mr-1" style={popoverPrimaryIconStyle} />
                                                {t('entries.show.structure.heading')}
                                            </span>
                                        </div>
                                        <div className="space-y-3 p-3">
                                            <div>
                                                <label className="mb-1 block text-[11px]" style={popoverLabelStyle}>{t('entries.show.structure.section_label')}</label>
                                                <input
                                                    type="text"
                                                    placeholder={t('entries.show.structure.section_placeholder')}
                                                    style={popoverInputStyle}
                                                    value={localStructureSettings.children_label ?? ''}
                                                    onChange={(e) => setLocalStructureSettings({ ...localStructureSettings, children_label: e.target.value || undefined })}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[11px]" style={popoverLabelStyle}>{t('entries.show.structure.display_mode')}</label>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setLocalStructureSettings({ ...localStructureSettings, show_as: 'tree' })}
                                                        style={(!localStructureSettings.show_as || localStructureSettings.show_as === 'tree') ? modeBtnActiveStyle : modeBtnIdleStyle}
                                                    >
                                                        <i className="fa-solid fa-sitemap text-[10px]" /> {t('entries.show.structure.mode_tree')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setLocalStructureSettings({ ...localStructureSettings, show_as: 'list' })}
                                                        style={localStructureSettings.show_as === 'list' ? modeBtnActiveStyle : modeBtnIdleStyle}
                                                    >
                                                        <i className="fa-solid fa-list text-[10px]" /> {t('entries.show.structure.mode_list')}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[11px]" style={popoverLabelStyle}>{t('entries.show.structure.max_depth')}</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        placeholder={t('entries.show.structure.max_depth_placeholder')}
                                                        style={{ ...popoverInputStyle, width: '5rem' }}
                                                        value={localStructureSettings.max_depth ?? ''}
                                                        onChange={(e) => setLocalStructureSettings({ ...localStructureSettings, max_depth: e.target.value ? parseInt(e.target.value) : undefined })}
                                                    />
                                                    <span className="text-[11px]" style={popoverHelperStyle}>
                                                        {!localStructureSettings.max_depth
                                                            ? t('entries.show.structure.all_levels')
                                                            : t(localStructureSettings.max_depth === 1 ? 'entries.show.structure.levels.singular' : 'entries.show.structure.levels.plural').replace(':count', String(localStructureSettings.max_depth))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end px-3 py-2" style={popoverFooterStyle}>
                                            <button type="button" onClick={saveStructureSettings} style={saveBtnStyle}>{t('entries.show.structure.save')}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tree/List content */}
                        <TreeView
                            projectId={project.id}
                            blueprint={blueprint}
                            project={project}
                            rootEntryId={entry.id}
                            structureSettings={localStructureSettings}
                        />
                    </div>
                )}
                {activeTab === 'timeline' && (
                    <TimelineTab events={timelineEvents} epoch={timelineEpoch} />
                )}
            </div>

            {/* Command Palette */}
            <CommandPalette
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                onSearch={projectSearch(project.slug)}
            />

            {/* Entry settings (Stage 8b M3 — theme override; future panels plug into same shell). */}
            <EntrySettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                project={{ slug: project.slug }}
                blueprint={{ slug: blueprint.slug }}
                entry={entry}
            />
        </AppLayout>
    );
}
