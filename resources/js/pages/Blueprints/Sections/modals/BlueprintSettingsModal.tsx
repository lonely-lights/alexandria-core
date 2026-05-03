import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import Sortable from 'sortablejs';
import Modal from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import ActionButton from '@alexandria/components/ui/ActionButton';
import { useReorderMode } from '@alexandria/hooks/useReorderMode';
import ReorderModeToggle from '@alexandria/components/ui/ReorderModeToggle';
import Input from '@alexandria/components/form/Input';
import Textarea from '@alexandria/components/form/Textarea';
import Select from '@alexandria/components/form/Select';
import { FIELD_TYPES } from '@alexandria/config/fieldTypes';
import MediaSection from '@alexandria/components/media/MediaSection';
import { classificationLabel } from '@alexandria/config/classifications';
import { useBlueprintFields } from '@alexandria/hooks/useBlueprintFields';
import TemporalFieldConfig from '@alexandria/components/form/TemporalFieldConfig';
import { useForm, router } from '@inertiajs/react';
import InfoboxDesigner from '../InfoboxTab';
import type { FormDataConvertible } from '@inertiajs/core';
import type { BlueprintDetail, SiblingBlueprint, AvailableColumn } from '@alexandria/types/blueprints';
import type { TimelineConfig } from '@alexandria/types/timeline';
import { defaultTimelineConfig } from '@alexandria/types/timeline';
import { TimelineActivationPanel, TimelineSettingsPanel, TimelineSourcesPanel } from './settings/TimelinePanels';
import { TreeActivationPanel } from './settings/TreePanels';
import KanbanPanel from './settings/KanbanPanel';
import GraphPanel from './settings/GraphPanel';
import RevealCollapse from '@alexandria/components/ui/RevealCollapse';
import SubtitleBuilderModal from './settings/SubtitleBuilderModal';
import FieldTypesHelp from '@alexandria/components/blueprints/FieldTypesHelp';
import HelpModal from '@alexandria/components/ui/HelpModal';

/* ── Panel Header ── */

function PanelHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
    return (
        <>
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
                <div>
                    <h2 className="text-sm font-semibold text-base-content">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-xs text-base-content/50">{description}</p>
                    )}
                </div>
                {action && <div className="flex-shrink-0">{action}</div>}
            </div>
            <div className="mx-5 border-b border-base-content/10" />
        </>
    );
}

/* ── Column Configuration Modal ── */

export function ColumnConfigModal({ open, onClose, columns, sortableColumns, availableColumns, onChange, onSortableChange, blueprintName, blueprint, project, listableBlueprints, relationshipBlueprints, referencingRelationshipBlueprints, initialMenu, timelineConfig, onTimelineConfigChange, timelineBlueprints }: {
    open: boolean;
    onClose: () => void;
    columns: string[];
    sortableColumns: string[];
    availableColumns: AvailableColumn[];
    onChange: (columns: string[]) => void;
    onSortableChange: (sortable: string[]) => void;
    blueprintName: string;
    blueprint?: BlueprintDetail;
    project?: { slug: string };
    listableBlueprints?: SiblingBlueprint[];
    relationshipBlueprints?: SiblingBlueprint[];
    referencingRelationshipBlueprints?: SiblingBlueprint[];
    initialMenu?: string;
    timelineConfig?: TimelineConfig;
    onTimelineConfigChange?: (config: TimelineConfig) => void;
    timelineBlueprints?: Array<{ id: number; name: string; slug: string; icon: string; fields: Array<{ name: string; label: string; type: string; target_blueprint_slug: string | null }> }>;
}) {
    // Local state so changes apply on close, not live
    const [localColumns, setLocalColumns] = useState<string[]>(columns);
    const [localSortable, setLocalSortable] = useState<string[]>(sortableColumns);

    // In-panel help modal state (Fields panel — field type reference)
    const [showFieldsHelp, setShowFieldsHelp] = useState(false);

    // Menu state
    type MenuPanel = 'columns' | 'main' | 'settings' | 'media' | 'fields' | 'relationships' | 'infobox' | 'display' | 'timeline' | 'kanban' | 'tree' | 'graph';
    const [activeMenu, setActiveMenu] = useState<MenuPanel>(
        (initialMenu as MenuPanel) ?? 'columns'
    );
    // Sync when opened
    useEffect(() => {
        if (open) {
            setLocalColumns(columns);
            setLocalSortable(sortableColumns);
            if (initialMenu) setActiveMenu(initialMenu as MenuPanel);
        }
    }, [open, columns, sortableColumns, initialMenu]);

    const activeList = localColumns
        .map((key) => availableColumns.find((c) => c.key === key))
        .filter(Boolean) as AvailableColumn[];

    const inactiveList = availableColumns.filter((c) => !localColumns.includes(c.key));

    // SortableJS for drag-and-drop reordering
    const sortableRef = useRef<HTMLDivElement>(null);
    const sortableInstance = useRef<Sortable | null>(null);

    useEffect(() => {
        if (!open || !sortableRef.current) return;

        sortableInstance.current = Sortable.create(sortableRef.current, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'opacity-30',
            onEnd: (evt: Sortable.SortableEvent) => {
                const { oldIndex, newIndex } = evt;
                if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
                setLocalColumns((prev) => {
                    const next = [...prev];
                    const [moved] = next.splice(oldIndex, 1);
                    next.splice(newIndex, 0, moved);
                    return next;
                });
            },
        });

        return () => {
            sortableInstance.current?.destroy();
            sortableInstance.current = null;
        };
    }, [open, localColumns.length]);

    function removeColumn(key: string) {
        if (localColumns.length <= 1) return;
        setLocalColumns((prev) => prev.filter((c) => c !== key));
    }

    function addColumn(key: string) {
        setLocalColumns((prev) => [...prev, key]);
    }

    function handleApply() {
        onChange(localColumns);
        onSortableChange(localSortable);
        onClose();
    }

    function toggleSortable(key: string) {
        setLocalSortable((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    }

    function columnBadges(col: AvailableColumn) {
        const isSortableActive = localSortable.includes(col.key);

        return (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {col.type === 'field' && (
                    <span className="badge badge-info badge-xs px-2 py-2">Custom</span>
                )}
                {col.type === 'native' && (
                    <span className="badge badge-primary badge-xs px-2 py-2">Native</span>
                )}
                {col.type === 'calculated' && (
                    <span className="badge badge-warning badge-xs px-2 py-2">Calculated</span>
                )}
                <Tooltip content={isSortableActive ? 'Disable sorting' : 'Enable sorting'}>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSortable(col.key); }}
                        className={`badge badge-xs gap-1 px-2 py-2 transition-all ${
                            isSortableActive
                                ? 'badge-success text-success-content'
                                : 'badge-success/40 opacity-40'
                        }`}
                    >
                        <i className="fa-solid fa-sort text-[8px]" /> Sortable
                    </button>
                </Tooltip>
            </div>
        );
    }

    function NavItem({ menu, icon, label }: { menu: MenuPanel; icon: string; label: string }) {
        const active = activeMenu === menu;
        return (
            <button
                type="button"
                onClick={() => setActiveMenu(menu)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                    active
                        ? 'bg-primary/10 text-primary'
                        : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                }`}
            >
                <i className={`${icon} w-4 text-center text-xs`} />
                <span>{label}</span>
            </button>
        );
    }

    function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
        return (
            <div className="mb-2">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                    {title}
                </div>
                {children}
            </div>
        );
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-5xl">
            <div className="flex h-[85vh] flex-col">
                {/* Title bar */}
                <div className="flex items-center justify-between border-b border-base-content/10 bg-base-300 px-4 py-2.5">
                    <span className="text-sm font-semibold text-base-content">
                        Blueprint Settings: <span className="text-primary">{blueprintName}</span>
                    </span>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content">
                        <i className="fa-solid fa-xmark text-xs" />
                    </button>
                </div>

                {/* Body: left nav + right pane */}
                <div className="flex flex-1 overflow-hidden">
                    <nav className="w-56 shrink-0 overflow-y-auto border-r border-base-content/10 bg-base-200/40 py-3">
                        {blueprint && (
                            <>
                                <NavGroup title="General">
                                    <NavItem menu="main" icon="fa-solid fa-id-card" label="Main" />
                                    <NavItem menu="settings" icon="fa-solid fa-gear" label="Settings" />
                                </NavGroup>

                                <NavGroup title="Data">
                                    {blueprint.classification !== 'structural' && (
                                        <NavItem menu="fields" icon="fa-solid fa-layer-group" label="Fields" />
                                    )}
                                    <NavItem menu="relationships" icon="fa-solid fa-diagram-project" label="Relationships" />
                                    <NavItem menu="infobox" icon="fa-solid fa-table-cells" label="Infobox" />
                                    {blueprint.classification === 'relationship' && (
                                        <NavItem menu="display" icon="fa-solid fa-eye" label="Display" />
                                    )}
                                    <NavItem menu="media" icon="fa-solid fa-image" label="Media" />
                                </NavGroup>
                            </>
                        )}

                        <NavGroup title="Display">
                            <NavItem menu="columns" icon="fa-solid fa-table-list" label="Table" />
                            {blueprint && !['structural', 'relationship'].includes(blueprint.classification) && (
                                <>
                                    <NavItem menu="tree" icon="fa-solid fa-sitemap" label="Hierarchy" />
                                    <NavItem menu="timeline" icon="fa-solid fa-timeline" label="Timeline" />
                                </>
                            )}
                            {blueprint && ['standard', 'list'].includes(blueprint.classification) && (
                                <>
                                    <NavItem menu="kanban" icon="fa-solid fa-table-columns" label="Kanban" />
                                    <NavItem menu="graph" icon="fa-solid fa-diagram-project" label="Graph" />
                                </>
                            )}
                        </NavGroup>
                    </nav>

                    {/* Right pane */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-base-100">

            {/* Columns panel */}
            {activeMenu === 'columns' && (() => {
                const inactiveNative = inactiveList.filter((c) => c.type === 'native');
                const inactiveField = inactiveList.filter((c) => c.type === 'field');
                const inactiveCalc = inactiveList.filter((c) => c.type === 'calculated');

                function AvailableItem({ col }: { col: AvailableColumn }) {
                    return (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => addColumn(col.key)}
                            onKeyDown={(e) => e.key === 'Enter' && addColumn(col.key)}
                            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-base-content/10 px-2.5 py-2 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
                        >
                            <i className="fa-solid fa-plus text-[10px] text-base-content/25" />
                            <span className="ml-0.5 text-sm text-base-content/60">{col.label}</span>
                        </div>
                    );
                }

                return (
                    <>
                        <PanelHeader
                            title="Table"
                            description="Which columns appear on the entry list and their sort behavior."
                        />
                        <div className="flex flex-1 flex-col overflow-hidden">
                            <div className="grid flex-1 grid-cols-2 gap-0 divide-x divide-base-300 overflow-hidden">
                                {/* Left: Active columns (sortable) */}
                                <div className="flex flex-col overflow-hidden p-5">
                                    <h4 className="mb-3 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-base-content/40">
                                        Table View Columns
                                    </h4>
                                    <div ref={sortableRef} className="flex-1 space-y-1.5 overflow-y-auto pr-2">
                                        {activeList.map((col) => (
                                            <div key={col.key} data-key={col.key} className="flex items-center gap-3 rounded-xl border border-base-content/10 bg-base-200 px-3 py-2.5 transition-colors hover:border-base-content/20">
                                                <i className="drag-handle fa-solid fa-grip-vertical cursor-grab text-sm text-base-content/25 active:cursor-grabbing" />
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-sm font-medium">{col.label}</span>
                                                    {columnBadges(col)}
                                                </div>
                                                <Tooltip content="Remove column" variant="error">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeColumn(col.key)}
                                                        disabled={localColumns.length <= 1}
                                                        className="btn btn-ghost btn-xs rounded-lg text-base-content/30 hover:text-error disabled:opacity-20"
                                                    >
                                                        <i className="fa-solid fa-arrow-right text-xs" />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        ))}
                                        {activeList.length === 0 && (
                                            <p className="py-8 text-center text-sm italic text-base-content/30">Add columns from the right</p>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Available columns grouped by type */}
                                <div className="flex flex-col overflow-hidden p-5">
                                    <h4 className="mb-3 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-base-content/40">
                                        Available Columns
                                    </h4>
                                    {inactiveList.length > 0 ? (
                                        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                                            {inactiveNative.length > 0 && (
                                                <div>
                                                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/60">Native</p>
                                                    <div className="space-y-1">
                                                        {inactiveNative.map((col) => <AvailableItem key={col.key} col={col} />)}
                                                    </div>
                                                </div>
                                            )}
                                            {inactiveField.length > 0 && (
                                                <div>
                                                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-info/60">Custom Fields</p>
                                                    <div className="space-y-1">
                                                        {inactiveField.map((col) => <AvailableItem key={col.key} col={col} />)}
                                                    </div>
                                                </div>
                                            )}
                                            {inactiveCalc.length > 0 && (
                                                <div>
                                                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-warning/60">Calculated</p>
                                                    <div className="space-y-1">
                                                        {inactiveCalc.map((col) => <AvailableItem key={col.key} col={col} />)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="py-8 text-center text-sm italic text-base-content/30">All columns are visible</p>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between border-t border-base-content/10 px-5 py-3">
                                <p className="text-xs text-base-content/40">
                                    {localColumns.length} column{localColumns.length !== 1 ? 's' : ''} selected
                                </p>
                                <div className="flex gap-2">
                                    <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={onClose} />
                                    <ActionButton icon="fa-solid fa-check" label="Apply" onClick={handleApply} />
                                </div>
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* Main panel (Identity) */}
            {activeMenu === 'main' && blueprint && project && (
                <>
                    <PanelHeader
                        title="Main"
                        description="Identity, icon, and top-level description for this blueprint."
                    />
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <BlueprintMainPanel
                            blueprint={blueprint}
                            project={project}
                            onClose={onClose}
                            referencingRelationshipBlueprints={referencingRelationshipBlueprints ?? []}
                        />
                    </div>
                </>
            )}

            {/* Media panel */}
            {activeMenu === 'media' && blueprint && (
                <>
                    <PanelHeader
                        title="Media"
                        description="Avatar, banner, and attached files."
                    />
                    <div className="flex-1 overflow-y-auto p-4">
                        <MediaSection modelType="blueprints" modelId={blueprint.id} />
                    </div>
                </>
            )}

            {/* Settings panel (Behavior) */}
            {activeMenu === 'settings' && blueprint && project && (
                <>
                    <PanelHeader
                        title="Settings"
                        description="Classification, behaviors, and listing options."
                    />
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <BlueprintSettingsPanel
                            blueprint={blueprint}
                            project={project}
                            onClose={onClose}
                        />
                    </div>
                </>
            )}

            {/* Fields panel */}
            {activeMenu === 'fields' && blueprint && project && (
                <>
                    <PanelHeader
                        title="Fields"
                        description="Define the blueprint's custom fields and their types."
                        action={
                            <button
                                type="button"
                                onClick={() => setShowFieldsHelp(true)}
                                aria-label="Open field type reference"
                                title="Field type reference"
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-base-content/10 text-base-content/50 transition-colors hover:border-info/30 hover:bg-info/5 hover:text-info"
                            >
                                <i className="fa-solid fa-question text-xs" />
                            </button>
                        }
                    />
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <BlueprintFieldsPanel
                            blueprint={blueprint}
                            project={project}
                            listableBlueprints={listableBlueprints ?? []}
                            relationshipBlueprints={relationshipBlueprints ?? []}
                            onClose={onClose}
                        />
                    </div>
                    <HelpModal
                        open={showFieldsHelp}
                        onClose={() => setShowFieldsHelp(false)}
                        title="Field Types"
                        description="What each field type is for, with examples."
                    >
                        <FieldTypesHelp />
                    </HelpModal>
                </>
            )}

            {/* Relationships panel */}
            {activeMenu === 'relationships' && blueprint && (
                <>
                    <PanelHeader
                        title="Relationships"
                        description="How entries in this blueprint connect to other blueprints."
                    />
                    <div className="flex-1 overflow-y-auto">
                        <BlueprintRelationshipsPanel
                            blueprint={blueprint}
                            relationshipBlueprints={relationshipBlueprints ?? []}
                            referencingRelationshipBlueprints={referencingRelationshipBlueprints ?? []}
                        />
                    </div>
                </>
            )}

            {/* Infobox Designer */}
            {activeMenu === 'infobox' && blueprint && project && (
                <>
                    <PanelHeader
                        title="Infobox"
                        description="Configure the entry-page infobox fields and layout."
                    />
                    <div className="flex-1 overflow-y-auto">
                        <InfoboxDesigner
                            projectSlug={project.slug}
                            blueprintSlug={blueprint.slug}
                            schema={blueprint.infobox_schema}
                            fields={blueprint.fields}
                            relationshipBlueprints={relationshipBlueprints ?? []}
                        />
                    </div>
                </>
            )}

            {/* Display Config (relationship blueprints) */}
            {activeMenu === 'display' && blueprint && project && blueprint.classification === 'relationship' && (
                <>
                    <PanelHeader
                        title="Display"
                        description="Configure how edges are displayed for relationship blueprints."
                    />
                    <div className="flex-1 overflow-y-auto">
                        <RelationshipDisplayPanel blueprint={blueprint} project={project} />
                    </div>
                </>
            )}

            {/* Tree / Hierarchy Configuration */}
            {activeMenu === 'tree' && blueprint && project && (
                <>
                    <PanelHeader
                        title="Hierarchy"
                        description="Enable and configure the tree view of entries."
                    />
                    <div className="flex-1 overflow-y-auto p-5">
                        <TreeActivationPanel blueprint={blueprint} project={project} />
                        <p className="mt-3 text-[11px] text-base-content/50">
                            Per-entry structure (what to call children, how deep to
                            render, tree-vs-list display) is configured on each
                            entry's page — open any entry and use the Structure tab's
                            Configure button.
                        </p>
                    </div>
                </>
            )}

            {/* Timeline Configuration */}
            {activeMenu === 'timeline' && blueprint && project && (
                <>
                    <PanelHeader
                        title="Timeline"
                        description="Enable and configure the timeline view of entries."
                    />
                    <div className="flex-1 overflow-y-auto">
                        <div className="space-y-0">
                            <div className="p-5 pb-0">
                                <TimelineActivationPanel blueprint={blueprint} project={project} />
                            </div>

                            {/* Date field config — slides down when Timeline is enabled.
                                TimelineSettingsPanel owns its own p-5 so no extra
                                padding wrapper is needed here. */}
                            <RevealCollapse open={blueprint.enable_timeline}>
                                {onTimelineConfigChange && (
                                    <TimelineSettingsPanel
                                        config={timelineConfig ?? defaultTimelineConfig()}
                                        onChange={onTimelineConfigChange}
                                        availableColumns={availableColumns}
                                    />
                                )}
                            </RevealCollapse>

                            {/* Timeline Sources — for blueprints that CONSUME timeline data.
                                Always visible (independent of this blueprint's own
                                enable_timeline state). */}
                            {timelineBlueprints && timelineBlueprints.length > 0 && (
                                <TimelineSourcesPanel
                                    blueprint={blueprint}
                                    project={project}
                                    timelineBlueprints={timelineBlueprints}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Kanban Configuration */}
            {activeMenu === 'kanban' && blueprint && project && (
                <>
                    <PanelHeader
                        title="Kanban"
                        description="Enable and configure the kanban board view of entries."
                    />
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <KanbanPanel
                            blueprint={blueprint}
                            project={project}
                            availableColumns={availableColumns}
                        />
                    </div>
                </>
            )}

            {/* Graph Configuration */}
            {activeMenu === 'graph' && blueprint && project && (
                <>
                    <PanelHeader
                        title="Graph"
                        description="Enable and configure the graph view of entry relationships."
                    />
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <GraphPanel
                            blueprint={blueprint}
                            project={project}
                            availableColumns={availableColumns}
                            relationshipBlueprints={relationshipBlueprints ?? []}
                            referencingRelationshipBlueprints={referencingRelationshipBlueprints ?? []}
                        />
                    </div>
                </>
            )}

                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* ── Blueprint Main Panel (Identity) ── */

function BlueprintMainPanel({ blueprint, project, onClose, referencingRelationshipBlueprints }: {
    blueprint: BlueprintDetail;
    project: { slug: string };
    onClose: () => void;
    referencingRelationshipBlueprints: SiblingBlueprint[];
}) {
    const form = useForm({
        name: blueprint.name,
        slug: blueprint.slug,
        description: blueprint.description ?? '',
        icon: blueprint.icon,
        // Preserve existing values that won't be edited here
        show_on_dashboard: blueprint.show_on_dashboard,
        is_linkable: blueprint.is_linkable,
        is_hub: blueprint.is_hub,
        show_tree_view: blueprint.show_tree_view,
        enable_timeline: blueprint.enable_timeline,
        classification: blueprint.classification,
        list_selection_mode: blueprint.list_selection_mode,
    });

    const iconClass = form.data.icon.includes(' ') ? form.data.icon : `fa-solid ${form.data.icon}`;

    function handleSave() {
        form.put(`/p/${project.slug}/${blueprint.slug}`, { onSuccess: () => onClose() });
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto">
                {/* Identity — golden-ratio split: Name/Description on left, Icon on right */}
                <div className="grid gap-4 p-5" style={{ gridTemplateColumns: '1.618fr 1fr' }}>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.currentTarget.value)}
                                error={form.errors.name}
                                maxLength={255}
                            />
                            <Input
                                label="Slug"
                                value={form.data.slug}
                                onChange={(e) => form.setData('slug', e.currentTarget.value)}
                                error={form.errors.slug}
                                className="font-mono"
                                maxLength={255}
                            />
                        </div>
                        <Textarea
                            label="Description"
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.currentTarget.value)}
                            placeholder="What is this blueprint used for?"
                            rows={4}
                            maxLength={2000}
                        />
                    </div>
                    <div className="form-control w-full">
                        <label className="label py-1"><span className="label-text text-xs text-base-content/50">Icon</span></label>
                        <div className="flex flex-col items-center gap-3">
                            <Input
                                value={form.data.icon}
                                onChange={(e) => form.setData('icon', e.currentTarget.value)}
                                placeholder="fa-solid fa-user"
                                className="w-full font-mono text-xs"
                                hint={<>Use a <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">FontAwesome</a> icon class</>}
                            />
                            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <i className={`${iconClass} text-4xl text-primary`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* About — unified sub-section for read-only metadata */}
                <PanelHeader title="About" description="Read-only properties set when this blueprint was created." />
                <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between rounded-xl border border-base-content/10 px-4 py-3">
                        <div>
                            <span className="text-sm font-medium">Classification</span>
                            <p className="text-xs text-base-content/50">Set at creation</p>
                        </div>
                        <span className="badge badge-primary badge-sm font-bold">
                            {classificationLabel(blueprint.classification)}
                        </span>
                    </div>
                    {form.data.classification === 'list' && (
                        <div className="flex items-center justify-between rounded-xl border border-base-content/10 px-4 py-3">
                            <div>
                                <span className="text-sm font-medium">Selection Mode</span>
                                <p className="text-xs text-base-content/50">How entries can be selected</p>
                            </div>
                            <select
                                value={form.data.list_selection_mode}
                                onChange={(e) => form.setData('list_selection_mode', e.target.value as 'single' | 'multiple')}
                                className="select select-bordered select-sm rounded-lg"
                            >
                                <option value="single">Single</option>
                                <option value="multiple">Multiple</option>
                            </select>
                        </div>
                    )}
                    {referencingRelationshipBlueprints.length > 0 && (
                        <div className="rounded-xl border border-info/30 bg-info/5 p-4">
                            <h4 className="mb-2 text-xs font-semibold text-info">
                                <i className="fa-solid fa-circle-info mr-1" /> Referenced By
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {referencingRelationshipBlueprints.map((rb) => (
                                    <span key={rb.id} className="badge badge-ghost badge-sm gap-1 px-2 py-1.5">
                                        <i className={`${rb.icon ? (rb.icon.includes(' ') ? rb.icon : `fa-solid ${rb.icon}`) : 'fa-solid fa-link'} text-[10px]`} />
                                        {rb.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-base-content/10 px-5 py-3">
                <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={onClose} />
                <ActionButton icon="fa-solid fa-check" label="Save" onClick={handleSave} loading={form.processing} />
            </div>
        </>
    );
}

/* ── Blueprint Settings Panel (Behavior) ── */

function BlueprintSettingsPanel({ blueprint, project, onClose }: {
    blueprint: BlueprintDetail;
    project: { slug: string };
    onClose: () => void;
}) {
    const form = useForm({
        // Preserve identity values
        name: blueprint.name,
        description: blueprint.description ?? '',
        icon: blueprint.icon,
        // Editable behavior values
        show_on_dashboard: blueprint.show_on_dashboard,
        is_linkable: blueprint.is_linkable,
        is_hub: blueprint.is_hub,
        show_tree_view: blueprint.show_tree_view,
        enable_timeline: blueprint.enable_timeline,
        classification: blueprint.classification,
        list_selection_mode: blueprint.list_selection_mode,
    });

    function handleSave() {
        form.put(`/p/${project.slug}/${blueprint.slug}`, { onSuccess: () => onClose() });
    }

    return (
        <>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-content/10 px-4 py-3 transition-colors hover:bg-base-200/50">
                    <div>
                        <span className="text-sm font-medium">Show on Dashboard</span>
                        <p className="text-xs text-base-content/50">Display entries on the project dashboard</p>
                    </div>
                    <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={form.data.show_on_dashboard}
                        onChange={(e) => form.setData('show_on_dashboard', e.target.checked)}
                    />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-content/10 px-4 py-3 transition-colors hover:bg-base-200/50">
                    <div>
                        <span className="text-sm font-medium">Allow Wiki Links</span>
                        <p className="text-xs text-base-content/50">Enable [[wiki link]] references to entries of this type</p>
                    </div>
                    <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={form.data.is_linkable}
                        onChange={(e) => form.setData('is_linkable', e.target.checked)}
                    />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-content/10 px-4 py-3 transition-colors hover:bg-base-200/50">
                    <div>
                        <span className="text-sm font-medium">Navigation Hub</span>
                        <p className="text-xs text-base-content/50">Use as a navigation hub in the sidebar</p>
                    </div>
                    <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={form.data.is_hub}
                        onChange={(e) => form.setData('is_hub', e.target.checked)}
                    />
                </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-base-content/10 px-5 py-3">
                <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={onClose} />
                <ActionButton icon="fa-solid fa-check" label="Save" onClick={handleSave} loading={form.processing} />
            </div>
        </>
    );
}

/* ── Blueprint Fields Panel (Schema > Fields) ── */

function BlueprintFieldsPanel({ blueprint, project, listableBlueprints, relationshipBlueprints, onClose }: {
    blueprint: BlueprintDetail;
    project: { slug: string };
    listableBlueprints: SiblingBlueprint[];
    relationshipBlueprints: SiblingBlueprint[];
    onClose: () => void;
}) {

    const { fields, expandedIndex, setExpandedIndex, addField, removeField, moveField, reorderFields, updateField, updateValidationRule } = useBlueprintFields(blueprint.fields);
    const [saving, setSaving] = useState(false);
    const [reorderMode, setReorderMode] = useReorderMode();
    const fieldsListRef = useRef<HTMLDivElement>(null);

    // SortableJS for fields drag reorder — only active when reorderMode === 'drag'
    useEffect(() => {
        if (reorderMode !== 'drag') return;
        const el = fieldsListRef.current;
        if (!el) return;
        const sortable = Sortable.create(el, {
            handle: '.fields-drag-handle',
            animation: 150,
            ghostClass: 'opacity-30',
            onEnd: (evt) => {
                const { oldIndex, newIndex, from, item } = evt;
                if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
                // Revert DOM so React stays in control
                from.removeChild(item);
                const ref = from.children[oldIndex];
                ref ? from.insertBefore(item, ref) : from.appendChild(item);
                reorderFields(oldIndex, newIndex);
            },
        });
        return () => sortable.destroy();
    }, [fields.length, reorderMode, reorderFields]);

    function handleSave() {
        setSaving(true);
        router.put(`/p/${project.slug}/${blueprint.slug}`, {
            name: blueprint.name, description: blueprint.description ?? '', icon: blueprint.icon,
            show_on_dashboard: blueprint.show_on_dashboard, is_linkable: blueprint.is_linkable,
            is_hub: blueprint.is_hub, show_tree_view: blueprint.show_tree_view, enable_timeline: blueprint.enable_timeline,
            classification: blueprint.classification,
            list_selection_mode: blueprint.list_selection_mode,
            fields: JSON.parse(JSON.stringify(fields)),
            infobox_schema: JSON.parse(JSON.stringify(blueprint.infobox_schema)),
        } as Record<string, FormDataConvertible>, { onSuccess: () => { setSaving(false); onClose(); }, onError: () => setSaving(false) });
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-2 flex justify-end">
                    <ReorderModeToggle mode={reorderMode} onChange={setReorderMode} />
                </div>
                <div ref={fieldsListRef} className="space-y-1.5">
                    {fields.map((field, index) => {
                        const tc = FIELD_TYPES[field.type] ?? FIELD_TYPES.text;
                        const isExpanded = expandedIndex === index;

                        return (
                            <div key={`${field.id ?? 'new'}-${index}`} className="overflow-hidden rounded-xl border border-base-content/10 transition-all hover:border-base-content/20">
                                {/* Header */}
                                <div className="flex cursor-pointer items-center gap-3 px-3 py-2" onClick={() => setExpandedIndex(isExpanded ? null : index)}>
                                    {reorderMode === 'drag' && (
                                        <div
                                            className="fields-drag-handle flex-shrink-0 cursor-grab text-base-content/25 active:cursor-grabbing"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <i className="fa-solid fa-grip-vertical text-sm" />
                                        </div>
                                    )}
                                    <i className={`${tc.icon} ${tc.color} w-4 text-center text-xs`} />
                                    <div className="min-w-0 flex-1">
                                        <span className="text-sm font-medium">
                                            {field.label || <span className="italic text-base-content/30">Untitled</span>}
                                        </span>
                                        <span className="ml-2 font-mono text-xs text-base-content/30">{field.name || ''}</span>
                                    </div>
                                    {field.is_required && <span className="badge badge-error badge-xs">Req</span>}
                                    {reorderMode === 'arrows' && (
                                        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                                            <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="btn btn-ghost btn-xs rounded disabled:opacity-20">
                                                <i className="fa-solid fa-chevron-up text-[9px]" />
                                            </button>
                                            <button type="button" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="btn btn-ghost btn-xs rounded disabled:opacity-20">
                                                <i className="fa-solid fa-chevron-down text-[9px]" />
                                            </button>
                                        </div>
                                    )}
                                    <i className={`fa-solid fa-chevron-right text-[9px] text-base-content/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div className="border-t border-base-content/10 bg-base-200 px-3 py-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input label="Label" size="xs" value={field.label} onChange={(e) => updateField(index, { label: e.currentTarget.value })} autoFocus />
                                            <Input label="Key" size="xs" value={field.name} onChange={(e) => updateField(index, { name: e.currentTarget.value })} className="font-mono" />
                                            <Select
                                                label="Type" size="xs" value={field.type}
                                                onChange={(e) => updateField(index, { type: e.currentTarget.value })}
                                                options={Object.entries(FIELD_TYPES).map(([k, c]) => ({ value: k, label: c.label }))}
                                            />
                                            <Input label="Help Text" size="xs" value={field.description ?? ''} onChange={(e) => updateField(index, { description: e.currentTarget.value || null })} placeholder="Optional" />
                                        </div>

                                        <div className="mt-2 flex items-center justify-between">
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={field.is_required} onChange={(e) => updateField(index, { is_required: e.target.checked })} />
                                                <span className="text-xs">Required</span>
                                            </label>
                                            <button type="button" onClick={() => removeField(index)} className="btn btn-ghost btn-xs text-error">
                                                <i className="fa-solid fa-trash text-[10px]" />
                                            </button>
                                        </div>

                                        {/* Entry Reference config */}
                                        {field.type === 'entry_reference' && (
                                            <div className="mt-2 space-y-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                                                <Select
                                                    label="Choose List" size="xs"
                                                    value={(field.validation_rules.target_blueprint_slug as string) ?? ''}
                                                    onChange={(e) => updateValidationRule(index, 'target_blueprint_slug', e.currentTarget.value || null)}
                                                    placeholder="Select a list..."
                                                    options={listableBlueprints.map((bp) => ({ value: bp.slug, label: bp.name }))}
                                                />
                                            </div>
                                        )}

                                        {field.type === 'relationship_manager' && (
                                            <div className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                                                <Select
                                                    label="Relationship Blueprint" size="xs"
                                                    value={(field.validation_rules.target_relationship_blueprint_slug as string) ?? ''}
                                                    onChange={(e) => updateValidationRule(index, 'target_relationship_blueprint_slug', e.currentTarget.value || null)}
                                                    placeholder="Select type..."
                                                    options={relationshipBlueprints.map((bp) => ({ value: bp.slug, label: bp.name }))}
                                                />
                                            </div>
                                        )}

                                        {field.type === 'temporal' && (
                                            <TemporalFieldConfig
                                                field={field}
                                                index={index}
                                                listableBlueprints={listableBlueprints}
                                                onUpdateRule={updateValidationRule}
                                                size="xs"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {fields.length === 0 && (
                        <p className="py-6 text-center text-sm italic text-base-content/30">No fields defined</p>
                    )}
                </div>

                {/* Add field */}
                <button type="button" onClick={addField} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-base-content/10 py-2 text-xs text-base-content/50 transition-colors hover:border-primary/30 hover:text-primary">
                    <i className="fa-solid fa-plus" /> Add Field
                </button>

            </div>

            <div className="flex items-center justify-between border-t border-base-content/10 px-5 py-3">
                <p className="text-xs text-base-content/40">{fields.length} field{fields.length !== 1 ? 's' : ''}</p>
                <div className="flex gap-2">
                    <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={onClose} />
                    <ActionButton icon="fa-solid fa-check" label="Save" onClick={handleSave} loading={saving} />
                </div>
            </div>
        </>
    );
}

/* ── Blueprint Relationships Panel ── */

function BlueprintRelationshipsPanel({ blueprint, relationshipBlueprints, referencingRelationshipBlueprints }: {
    blueprint: BlueprintDetail;
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
}) {
    const [showUnused, setShowUnused] = useState(false);

    const connected = referencingRelationshipBlueprints;
    const connectedIds = new Set(connected.map((r) => r.id));
    const unused = relationshipBlueprints.filter((r) => !connectedIds.has(r.id));

    // Derive project slug from the current URL
    const projectSlug = window.location.pathname.split('/')[2] ?? '';

    function RelCard({ rb, isActive }: { rb: SiblingBlueprint; isActive: boolean }) {
        const icon = rb.icon ? (rb.icon.includes(' ') ? rb.icon : `fa-solid ${rb.icon}`) : 'fa-solid fa-diagram-project';
        return (
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${isActive ? 'border-base-content/10' : 'border-dashed border-base-content/10'}`}>
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-rose-500/10' : 'bg-base-300/50'}`}>
                    <i className={`${icon} text-sm ${isActive ? 'text-rose-500' : 'text-base-content/40'}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <a href={`/p/${projectSlug}/${rb.slug}`} className={`text-sm font-medium hover:text-primary hover:underline ${isActive ? '' : 'text-base-content/60'}`}>
                        {rb.name}
                    </a>
                </div>
                {isActive ? (
                    <span className="badge badge-success badge-sm">Active</span>
                ) : (
                    <span className="badge badge-ghost badge-sm">Unused</span>
                )}
            </div>
        );
    }

    return (
        <div className="p-5">
            <p className="mb-4 text-xs text-base-content/50">
                Relationships define how {blueprint.name} entries connect to other entries.
                Active relationships appear on entry pages and in the Infobox.
            </p>

            {connected.length === 0 && unused.length === 0 ? (
                <div className="py-8 text-center">
                    <i className="fa-solid fa-diagram-project mb-3 text-3xl text-base-content/20" />
                    <p className="font-medium text-base-content/50">No relationship blueprints in this project</p>
                    <p className="mt-1 text-sm text-base-content/30">
                        Create a relationship blueprint to start connecting entries.
                    </p>
                </div>
            ) : (
                <>
                    {/* Active relationships */}
                    {connected.length > 0 ? (
                        <div className="space-y-2">
                            {connected.map((rb) => <RelCard key={rb.id} rb={rb} isActive />)}
                        </div>
                    ) : (
                        <p className="py-3 text-center text-sm italic text-base-content/30">
                            No active relationships for {blueprint.name}.
                        </p>
                    )}

                    {/* Unused relationships (collapsed) */}
                    {unused.length > 0 && (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => setShowUnused(!showUnused)}
                                className="flex items-center gap-2 text-xs text-base-content/40 transition-colors hover:text-base-content/60"
                            >
                                <i className={`fa-solid fa-chevron-right text-[10px] transition-transform ${showUnused ? 'rotate-90' : ''}`} />
                                {unused.length} other relationship {unused.length === 1 ? 'blueprint' : 'blueprints'} in project
                            </button>
                            {showUnused && (
                                <div className="mt-2 space-y-2">
                                    {unused.map((rb) => <RelCard key={rb.id} rb={rb} isActive={false} />)}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Create new */}
            <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-base-content/10 py-2.5 text-xs text-base-content/50 transition-colors hover:border-primary/30 hover:text-primary"
                onClick={() => { /* TODO: create relationship blueprint */ }}
            >
                <i className="fa-solid fa-plus" /> Create Relationship Blueprint
            </button>
        </div>
    );
}

const FIELD_TYPE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
    text: { bg: 'rgba(148,163,184,0.35)', text: '#cbd5e1' },
    textarea: { bg: 'rgba(129,140,248,0.35)', text: '#c7d2fe' },
    integer: { bg: 'rgba(96,165,250,0.35)', text: '#bfdbfe' },
    boolean: { bg: 'rgba(52,211,153,0.35)', text: '#a7f3d0' },
    date: { bg: 'rgba(251,191,36,0.35)', text: '#fde68a' },
    datetime: { bg: 'rgba(251,191,36,0.35)', text: '#fde68a' },
    entry_reference: { bg: 'rgba(167,139,250,0.35)', text: '#ddd6fe' },
    relationship_manager: { bg: 'rgba(251,113,133,0.35)', text: '#fecdd3' },
    temporal: { bg: 'rgba(45,212,191,0.35)', text: '#99f6e4' },
};

/* ── Relationship Display Configuration Panel ── */

function RelationshipDisplayPanel({ blueprint, project }: {
    blueprint: BlueprintDetail;
    project: { slug: string };
}) {
    const metadata = (blueprint as unknown as { metadata?: Record<string, unknown> }).metadata ?? {};
    const displayConfig = (metadata.display_config ?? {}) as Record<string, unknown>;
    const [hiddenFields, setHiddenFields] = useState<string[]>(
        (displayConfig.hidden_fields as string[] | undefined) ?? []
    );
    const [subtitleModalOpen, setSubtitleModalOpen] = useState(false);
    const [subtitleData, setSubtitleData] = useState<Record<string, unknown>>(displayConfig);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const hasSubtitle = !!(subtitleData.subtitle_template as string);

    function toggleHiddenField(fieldName: string) {
        setHiddenFields((prev) => {
            const next = prev.includes(fieldName)
                ? prev.filter((f) => f !== fieldName)
                : [...prev, fieldName];
            setDirty(true);
            return next;
        });
    }

    function handleSubtitleChange(data: Record<string, unknown>) {
        setSubtitleData(data);
        setDirty(true);
    }

    function save() {
        setSaving(true);
        const newMetadata = {
            ...metadata,
            display_config: {
                ...subtitleData,
                hidden_fields: hiddenFields,
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(`/p/${project.slug}/${blueprint.slug}`, {
            name: blueprint.name,
            description: blueprint.description ?? '',
            icon: blueprint.icon,
            classification: blueprint.classification,
            show_on_dashboard: blueprint.show_on_dashboard,
            is_linkable: blueprint.is_linkable,
            is_hub: blueprint.is_hub,
            metadata: newMetadata,
        } as any, {
            preserveScroll: true,
            onSuccess: () => { setDirty(false); setSaving(false); },
            onError: () => setSaving(false),
        });
    }

    // Need to import SubtitleBuilderModal from InfoboxTab — but it's in a different file.
    // For now, reuse the same SubtitleBuilderModal pattern via the InfoboxDesigner's export.
    // Actually, let's use a simpler inline approach since the modal is tightly coupled.

    return (
        <div className="p-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-base-content/70">Display Configuration</h3>
                    <p className="mt-0.5 text-xs text-base-content/40">
                        Control how this relationship's data appears on entry pages.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {dirty && <span className="text-xs text-warning">Unsaved</span>}
                    <ActionButton icon="fa-solid fa-save" label="Save" size="xs" onClick={save} loading={saving} disabled={!dirty} />
                </div>
            </div>

            {/* Hidden Fields */}
            <div className="mt-4">
                <label className="text-xs font-semibold text-base-content/60">Visible Fields</label>
                <p className="mb-2 mt-0.5 text-[11px] text-base-content/30">
                    Uncheck fields to hide them from the Relationships tab on entry pages.
                </p>
                <div className="space-y-1.5">
                    {blueprint.fields.map((field) => {
                        const badge = FIELD_TYPE_BADGE_STYLES[field.type] ?? { bg: 'rgba(128,128,128,0.15)', text: '#888' };
                        return (
                        <label key={field.name} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-base-content/5">
                            <input
                                type="checkbox"
                                checked={!hiddenFields.includes(field.name)}
                                onChange={() => toggleHiddenField(field.name)}
                                className="checkbox checkbox-xs checkbox-primary"
                            />
                            <span className="flex-1 text-xs font-medium text-base-content/70">{field.label}</span>
                            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: badge.bg, color: badge.text }}>{titleCase(field.type)}</span>
                        </label>
                        );
                    })}
                </div>
            </div>

            {/* Subtitle Template */}
            <div className="mt-5">
                <label className="text-xs font-semibold text-base-content/60">Subtitle Template</label>
                <p className="mb-2 mt-0.5 text-[11px] text-base-content/30">
                    A formatted line shown below each related entry. Uses the same builder as the Infobox.
                </p>
                <button
                    type="button"
                    onClick={() => setSubtitleModalOpen(true)}
                    className="flex w-full items-center justify-between rounded-lg border border-base-content/10 bg-base-200 px-3 py-2 text-left text-xs transition-colors hover:border-primary/30 hover:bg-base-300/60"
                >
                    <span className={hasSubtitle ? 'text-base-content/70' : 'text-base-content/30'}>
                        {hasSubtitle ? 'Subtitle configured' : 'No subtitle'}
                    </span>
                    <i className={`fa-solid ${hasSubtitle ? 'fa-pen' : 'fa-plus'} text-[10px] text-base-content/30`} />
                </button>
            </div>

            {/* Reuse SubtitleBuilderModal from InfoboxTab */}
            <SubtitleBuilderModal
                open={subtitleModalOpen}
                onClose={() => setSubtitleModalOpen(false)}
                data={subtitleData}
                onChange={handleSubtitleChange}
                blueprintFields={blueprint.fields}
            />
        </div>
    );
}

function titleCase(str: string): string {
    return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

