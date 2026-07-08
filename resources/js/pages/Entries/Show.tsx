import { usePage, router } from '@inertiajs/react';
import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import { useCmdK } from '@alexandria/hooks/useCmdK';
import useT from '@alexandria/hooks/useT';
import useEntitlements from '@alexandria/hooks/useEntitlements';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import CommandPalette from '@alexandria/components/search/CommandPalette';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';
import { projectSearch } from '@alexandria/lib/projectSearch';
import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import IconTile from '@alexandria/components/ui/IconTile';
import Ribbon from '@alexandria/ribbon/Ribbon';
import type { RibbonGates } from '@alexandria/ribbon/types';
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
import type { EntriesRibbonContext } from './ribbon/entriesRibbonContext';
import { registerEntriesRibbon } from './ribbon/entriesRibbonTabs';

registerEntriesRibbon();

/* ── Tabs ── */

type Tab = 'overview' | 'structure' | 'attributes' | 'relationships' | 'connections' | 'mentions' | 'mentioned_in' | 'media' | 'history' | 'timeline';

/* ── Theme-token style recipes ──
   Structure-settings popover + thumbnail repaint from --theme-*
   tokens so preset swaps reach this chrome alongside the rest.
   (Tab-button styles removed in Stage 11 Slice 4 — navigation moved
   to the ribbon View band.) */

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
    const entitlements = useEntitlements();
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
    // Stage 11 Slice 4 — delete confirmation modal.
    const [deleteOpen, setDeleteOpen] = useState(false);

    const iconClass = blueprint.icon.includes(' ') ? blueprint.icon : `fa-solid ${blueprint.icon}`;
    const writingWorkSlug = (entry.metadata?.writing as { work_slug?: string } | undefined)?.work_slug ?? null;

    // Sync hash
    useEffect(() => {
        window.location.hash = activeTab === 'overview' ? '' : `#${activeTab}`;
    }, [activeTab]);

    useCmdK(useCallback(() => setSearchOpen(true), []));

    // ── Ribbon wiring ─────────────────────────────────────────────────────────

    const entriesGates: RibbonGates = {
        can: {
            'entry.update': entry.can.update,
            'entry.delete': entry.can.delete,
        },
        entitlements,
    };

    const editHref = `/p/${project.slug}/${blueprint.slug}/${entry.slug}/edit`;

    const blueprintHref = `/p/${project.slug}/${blueprint.slug}`;

    const ribbonCtx = useMemo<EntriesRibbonContext>(() => ({
        activeTab,
        hasChildren: entry.has_children,
        hasTimelineEvents: timelineEvents.length > 0,
        hasConnections: connections.length > 0,
        hasAttributes: dynamicProperties.length > 0,
        hasRelationships: relationships.length > 0,
        hasMentions: mentions.length > 0,
        hasMentionedIn: mentionedIn.length > 0,
        hasHistory: history.length > 0,
        editHref,
        showTreeView: blueprint.show_tree_view,
        allEntriesLabel: t('entries.show.menu.all_plural').replace(':plural', blueprint.plural_name),
        actions: {
            setTab: (tab) => setActiveTab(tab),
            openSettings: () => setSettingsOpen(true),
            editEntry: () => router.visit(editHref),
            deleteEntry: () => setDeleteOpen(true),
            goToBlueprint: () => router.visit(blueprintHref),
            goToTree: () => router.visit(`${blueprintHref}#tree`),
        },
    }), [
        activeTab,
        entry.has_children,
        entry.can.update,
        entry.can.delete,
        timelineEvents.length,
        connections.length,
        dynamicProperties.length,
        relationships.length,
        mentions.length,
        mentionedIn.length,
        history.length,
        editHref,
        blueprint.show_tree_view,
        blueprint.plural_name,
        blueprintHref,
    ]);

    return (
        <AppLayout title={`${entry.name} - ${project.name}`} immersive onSearchToggle={() => setSearchOpen(true)}>
            {/* PageHeader: breadcrumbs + title block (actions + tab row moved to ribbon). */}
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: blueprint.name, href: `/p/${project.slug}/${blueprint.slug}`, icon: blueprint.icon },
                    { label: entry.name },
                ]}
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
                            <a href={`/works/${project.slug}/${writingWorkSlug}`} className="alex-writing-chip" style={writingChipStyle}>
                                <i className="fa-solid fa-feather" />
                                {t('entries.show.open_in_writing')}
                            </a>
                        )}
                    </div>
                </div>
            </PageHeader>

            {/*
              * Entry ribbon — plain band below the PageHeader.
              * Mount strategy: AppLayout's navbar stays; the ribbon sits between
              * the PageHeader title bar and the content area (no merged-header
              * needed — this is a standard content page, not a navbar-less
              * workspace). bandTabId="view" keeps navigation controls always
              * visible in the icon band; the File tab drops down as a menu.
              */}
            <Ribbon
                setKey="entries"
                context={ribbonCtx}
                gates={entriesGates}
                bandTabId="view"
            />

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

            {/* Delete confirmation (Stage 11 Slice 4 — ribbon File tab → delete-entry control). */}
            <ConfirmModal
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => {
                    router.delete(`/p/${project.slug}/${blueprint.slug}/${entry.slug}`, {
                        onSuccess: () => setDeleteOpen(false),
                    });
                }}
                title={t('entries.ribbon.delete.title')}
                message={t('entries.ribbon.delete.message').replace(':name', entry.name)}
                confirmLabel={t('entries.ribbon.delete.confirm')}
                variant="danger"
            />
        </AppLayout>
    );
}
