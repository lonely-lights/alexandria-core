import { usePage, router } from '@inertiajs/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useCmdK } from '@alexandria/hooks/useCmdK';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import CommandPalette from '@alexandria/components/search/CommandPalette';
import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import ActionButton from '@alexandria/components/ui/ActionButton';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import IconTile from '@alexandria/components/ui/IconTile';
import type { InfoboxBlock } from '@alexandria/components/entries/Infobox';
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

/* ── Types ── */

interface EntryShowProject {
    id: number;
    name: string;
    slug: string;
}

interface EntryShowBlueprint {
    id: number;
    name: string;
    slug: string;
    icon: string;
    classification: string;
    is_linkable: boolean;
    show_tree_view: boolean;
    plural_name: string;
    content_renderer: string;
}

export interface EntryShowEntry {
    id: number;
    name: string;
    slug: string;
    summary: string | null;
    content: string | null;
    sort_order: number;
    is_stub: boolean;
    parent_id: number | null;
    metadata: Record<string, unknown> | null;
    has_children: boolean;
    children_count: number;
    thumbnail_url: string | null;
    created_at: string | null;
    updated_at: string | null;
    can: {
        update: boolean;
        delete: boolean;
    };
}

export interface DynamicProperty {
    label: string;
    value: unknown;
    type: string;
    url: string | null;
    entry_id?: number;
    entry_ids?: number[];
    entry_urls?: string[];
}

export interface RelationshipRow {
    entry: {
        id: number;
        name: string;
        slug: string;
        icon: string;
        blueprint_name: string;
        blueprint_slug: string;
        url: string;
    };
    blueprint_name: string;
    label: string | null;
    metadata: Array<{ label: string; value: unknown; url: string | null }>;
    subtitle_html: string | null;
}

export interface ConnectionSection {
    title: string;
    description: string | null;
    items: Array<{
        hub: {
            id: number;
            name: string;
            slug: string;
            icon: string;
            blueprint_name: string;
            blueprint_slug?: string;
            url: string;
        };
        pass_through: Array<{
            id: number;
            name: string;
            slug: string;
            icon: string;
            blueprint_name: string;
            url: string;
        }>;
    }>;
}

export interface MentionEntry {
    id: number;
    name: string;
    slug: string;
    icon: string;
    blueprint_name: string;
    url: string;
    mention_count: number;
}

export interface HistoryRecord {
    id: number;
    batch_id: string | null;
    change_type: string;
    field_name: string | null;
    previous_value: string | null;
    new_value: string | null;
    change_summary: string | null;
    created_at: string | null;
    user: { name: string; display_name: string | null } | null;
}

interface EntryShowProps {
    project: EntryShowProject;
    blueprint: EntryShowBlueprint;
    entry: EntryShowEntry;
    contentHtml: string | null;
    summaryHtml: string | null;
    dynamicProperties: DynamicProperty[];
    relationships: RelationshipRow[];
    relationshipBlueprints: Record<string, { slug: string; name: string; fields: Array<{ name: string; label: string; type: string }> }>;
    connections: ConnectionSection[];
    mentions: MentionEntry[];
    mentionedIn: MentionEntry[];
    history: HistoryRecord[];
    infoboxBlocks: InfoboxBlock[];
    timelineEvents: Array<{
        id: number;
        name: string;
        slug: string;
        url: string;
        summary: string | null;
        start_date: string | null;
        end_date: string | null;
        group_key: string | null;
        group_id: number | null;
        is_stub: boolean;
    }>;
    timelineEpoch: {
        event_type: string;
        date: string;
        label: string;
    } | null;
}

/* ── Tabs ── */

type Tab = 'overview' | 'structure' | 'attributes' | 'relationships' | 'connections' | 'mentions' | 'mentioned_in' | 'media' | 'history' | 'timeline';

/* ── Page ── */

export default function EntryShow() {
    const props = usePage().props as unknown as EntryShowProps;
    const { project, blueprint, entry, contentHtml, summaryHtml, dynamicProperties, relationships, relationshipBlueprints, connections, mentions, mentionedIn, history, infoboxBlocks, timelineEvents, timelineEpoch } = props;

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

    const iconClass = blueprint.icon.includes(' ') ? blueprint.icon : `fa-solid ${blueprint.icon}`;

    // Sync hash
    useEffect(() => {
        window.location.hash = activeTab === 'overview' ? '' : `#${activeTab}`;
    }, [activeTab]);

    useCmdK(useCallback(() => setSearchOpen(true), []));

    // Dropdown menu items — tabs that aren't pinned to the bar
    const menuItems: Array<{ label: string; icon: string; key: Tab; badge?: string | number }> = [];

    if (dynamicProperties.length > 0) {
        menuItems.push({ key: 'attributes', label: 'Attributes', icon: 'fa-solid fa-list', badge: dynamicProperties.length });
    }
    if (relationships.length > 0) {
        menuItems.push({ key: 'relationships', label: 'Relationships', icon: 'fa-solid fa-diagram-project', badge: relationships.length });
    }
    if (mentions.length > 0) {
        menuItems.push({ key: 'mentions', label: 'Mentions', icon: 'fa-solid fa-at', badge: mentions.length });
    }
    if (mentionedIn.length > 0) {
        menuItems.push({ key: 'mentioned_in', label: 'Mentioned In', icon: 'fa-solid fa-reply', badge: mentionedIn.length });
    }
    menuItems.push({ key: 'media', label: 'Media', icon: 'fa-solid fa-images' });
    if (history.length > 0) {
        menuItems.push({ key: 'history', label: 'History', icon: 'fa-solid fa-clock-rotate-left' });
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
        ...(blueprint.show_tree_view ? [{ label: 'View in Tree', icon: 'fa-solid fa-sitemap', href: `/p/${project.slug}/${blueprint.slug}#tree` }] : []),
        { label: `All ${blueprint.plural_name}`, icon: blueprint.icon, href: `/p/${project.slug}/${blueprint.slug}` },
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
                    <ActionButton
                        icon="fa-solid fa-pencil"
                        label="Edit Entry"
                        href={`/p/${project.slug}/${blueprint.slug}/${entry.slug}/edit`}
                        size="md"
                    />
                }
                tabs={
                    <>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            <i className="fa-solid fa-eye text-xs" /> Overview
                        </button>
                        {entry.has_children && (
                            <button
                                onClick={() => setActiveTab('structure')}
                                className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === 'structure' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className="fa-solid fa-sitemap text-xs" /> Structure
                            </button>
                        )}
                        {timelineEvents.length > 0 && (
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className="fa-solid fa-timeline text-xs" /> Timeline
                            </button>
                        )}
                        {connections.length > 0 && (
                            <button
                                onClick={() => setActiveTab('connections')}
                                className={`btn btn-sm gap-1.5 rounded-xl ${activeTab === 'connections' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <i className="fa-solid fa-share-nodes text-xs" /> Connections
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
                            className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover shadow-md ring-1 ring-base-content/5"
                        />
                    ) : (
                        <IconTile icon={iconClass} className="shadow-md ring-1 ring-base-content/5" />
                    )}
                    <div>
                        <h1 className="text-3xl font-bold">{entry.name}</h1>
                        {summaryHtml && (
                            <MentionAwareContent
                                html={summaryHtml}
                                className="entry-summary-links mt-1 text-sm text-base-content/60"
                            />
                        )}
                    </div>
                </div>
            </PageHeader>

            {/* Tab content */}
            <div className="container mx-auto max-w-7xl px-4 py-8">
                {activeTab === 'overview' && (
                    <OverviewTab
                        contentHtml={contentHtml}
                        entry={entry}
                        infoboxBlocks={infoboxBlocks}
                    />
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
                    <MentionsTab entries={mentions} title="Entries Mentioned" />
                )}

                {activeTab === 'mentioned_in' && (
                    <MentionsTab entries={mentionedIn} title="Mentioned In" />
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
                                <span className="text-sm font-semibold text-base-content/70">{localStructureSettings.children_label}</span>
                            )}
                            <span className="badge badge-secondary badge-sm">{entry.children_count ?? 0}</span>
                            <div className="flex-1" />
                            <div className="relative" ref={structureConfigRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowStructureConfig(!showStructureConfig)}
                                    className="btn btn-ghost btn-xs gap-1"
                                >
                                    <i className="fa-solid fa-gear text-xs" /> Configure
                                </button>
                                {showStructureConfig && (
                                    <div className="absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-xl">
                                        <div className="border-b border-base-content/10 px-3 py-2">
                                            <span className="text-xs font-medium text-base-content/70">
                                                <i className="fa-solid fa-sliders mr-1 text-primary" />
                                                Structure Settings
                                            </span>
                                        </div>
                                        <div className="space-y-3 p-3">
                                            <div>
                                                <label className="mb-1 block text-[11px] text-base-content/40">Section Label</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., Adaptations, Chapters"
                                                    className="input input-bordered input-sm w-full"
                                                    value={localStructureSettings.children_label ?? ''}
                                                    onChange={(e) => setLocalStructureSettings({ ...localStructureSettings, children_label: e.target.value || undefined })}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[11px] text-base-content/40">Display Mode</label>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setLocalStructureSettings({ ...localStructureSettings, show_as: 'tree' })}
                                                        className={`btn btn-xs flex-1 gap-1 ${(!localStructureSettings.show_as || localStructureSettings.show_as === 'tree') ? 'btn-primary' : 'btn-ghost border-base-content/10'}`}
                                                    >
                                                        <i className="fa-solid fa-sitemap text-[10px]" /> Tree
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setLocalStructureSettings({ ...localStructureSettings, show_as: 'list' })}
                                                        className={`btn btn-xs flex-1 gap-1 ${localStructureSettings.show_as === 'list' ? 'btn-primary' : 'btn-ghost border-base-content/10'}`}
                                                    >
                                                        <i className="fa-solid fa-list text-[10px]" /> List
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[11px] text-base-content/40">Max Depth</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        placeholder="All"
                                                        className="input input-bordered input-sm w-20"
                                                        value={localStructureSettings.max_depth ?? ''}
                                                        onChange={(e) => setLocalStructureSettings({ ...localStructureSettings, max_depth: e.target.value ? parseInt(e.target.value) : undefined })}
                                                    />
                                                    <span className="text-[11px] text-base-content/30">
                                                        {!localStructureSettings.max_depth ? 'All levels' : `${localStructureSettings.max_depth} level${localStructureSettings.max_depth > 1 ? 's' : ''}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end border-t border-base-content/10 px-3 py-2">
                                            <button type="button" onClick={saveStructureSettings} className="btn btn-primary btn-xs">Save</button>
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
                projectSlug={project.slug}
            />
        </AppLayout>
    );
}
