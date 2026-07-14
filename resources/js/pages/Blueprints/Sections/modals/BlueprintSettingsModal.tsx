import { useEffect, useState } from "react";
import Modal from "@alexandria/components/ui/Modal";
import MediaSection from "@alexandria/components/media/MediaSection";
import useT from "@alexandria/hooks/useT";
import InfoboxDesigner from "../InfoboxTab";
import type {
    BlueprintDetail,
    SiblingBlueprint,
    AvailableColumn,
} from "@alexandria/types/blueprints";
import type { TimelineConfig } from "@alexandria/types/timeline";
import { defaultTimelineConfig } from "@alexandria/types/timeline";
import {
    TimelineActivationPanel,
    TimelineSettingsPanel,
    TimelineSourcesPanel,
} from "./settings/TimelinePanels";
import {
    TreeActivationPanel,
    TreeChildrenBlueprintsPanel,
} from "./settings/TreePanels";
import KanbanPanel from "./settings/KanbanPanel";
import GraphPanel from "./settings/GraphPanel";
import RevealCollapse from "@alexandria/components/ui/RevealCollapse";
import BlueprintAiPanel from "./settings/BlueprintAiPanel";
import BlueprintBehaviorPanel from "./settings/BlueprintBehaviorPanel";
import BlueprintThemePanel from "./settings/BlueprintThemePanel";
import BlueprintFieldsPanel from "./settings/BlueprintFieldsPanel";
import BlueprintMainPanel from "./settings/BlueprintMainPanel";
import BlueprintRelationshipsPanel from "./settings/BlueprintRelationshipsPanel";
import ColumnsPanel from "./settings/ColumnsPanel";
import { NavGroup, NavItem } from "./settings/Nav";
import PanelHeader from "./settings/PanelHeader";
import RelationshipDisplayPanel from "./settings/RelationshipDisplayPanel";
import FieldTypesHelp from "@alexandria/components/blueprints/FieldTypesHelp";
import HelpModal from "@alexandria/components/ui/HelpModal";
import {
    closeBtnStyle,
    helperStyle,
    navSidebarStyle,
    primaryTextStyle,
    rightPaneStyle,
    titleBarStyle,
} from "./settings/settingsPanelStyles";

/* ── Column Configuration Modal ── */

export function ColumnConfigModal({
    open,
    onClose,
    columns,
    sortableColumns,
    availableColumns,
    onChange,
    onSortableChange,
    blueprintName,
    blueprint,
    project,
    listableBlueprints,
    relationshipBlueprints,
    referencingRelationshipBlueprints,
    initialMenu,
    timelineConfig,
    onTimelineConfigChange,
    timelineBlueprints,
}: {
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
    timelineBlueprints?: Array<{
        id: number;
        name: string;
        slug: string;
        icon: string;
        fields: Array<{
            name: string;
            label: string;
            type: string;
            target_blueprint_slug: string | null;
        }>;
    }>;
}) {
    const t = useT();

    // In-panel help modal state (Fields panel — field type reference)
    const [showFieldsHelp, setShowFieldsHelp] = useState(false);

    // Menu state
    type MenuPanel =
        | "columns"
        | "main"
        | "settings"
        | "ai"
        | "theme"
        | "media"
        | "fields"
        | "relationships"
        | "infobox"
        | "display"
        | "timeline"
        | "kanban"
        | "tree"
        | "graph";
    const [activeMenu, setActiveMenu] = useState<MenuPanel>(
        (initialMenu as MenuPanel) ?? "columns",
    );
    // Sync the active menu when the modal opens with a fresh initialMenu.
    useEffect(() => {
        if (open && initialMenu) setActiveMenu(initialMenu as MenuPanel);
    }, [open, initialMenu]);

    const navProps = (menu: MenuPanel) => ({
        active: activeMenu === menu,
        onClick: () => setActiveMenu(menu),
    });

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-5xl">
            <div className="flex h-[85vh] flex-col">
                {/* Title bar */}
                <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={titleBarStyle}
                >
                    <span className="text-sm font-semibold">
                        {t("blueprints.bp_settings.title")}{" "}
                        <span style={primaryTextStyle}>{blueprintName}</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                        style={closeBtnStyle}
                    >
                        <i className="fa-solid fa-xmark text-xs" />
                    </button>
                </div>

                {/* Body: left nav + right pane */}
                <div className="flex flex-1 overflow-hidden">
                    <nav
                        className="w-56 shrink-0 overflow-y-auto py-3"
                        style={navSidebarStyle}
                    >
                        {blueprint && (
                            <>
                                <NavGroup
                                    title={t(
                                        "blueprints.bp_settings.nav.general",
                                    )}
                                >
                                    <NavItem
                                        {...navProps("main")}
                                        icon="fa-solid fa-id-card"
                                        label={t(
                                            "blueprints.bp_settings.nav.main",
                                        )}
                                    />
                                    <NavItem
                                        {...navProps("settings")}
                                        icon="fa-solid fa-gear"
                                        label={t(
                                            "blueprints.bp_settings.nav.settings",
                                        )}
                                    />
                                    <NavItem
                                        {...navProps("ai")}
                                        icon="fa-solid fa-wand-magic-sparkles"
                                        label={t(
                                            "blueprints.bp_settings.nav.ai",
                                        )}
                                    />
                                    <NavItem
                                        {...navProps("theme")}
                                        icon="fa-solid fa-palette"
                                        label={t(
                                            "blueprints.bp_settings.nav.theme",
                                        )}
                                    />
                                </NavGroup>

                                <NavGroup
                                    title={t("blueprints.bp_settings.nav.data")}
                                >
                                    {blueprint.classification !==
                                        "structural" && (
                                        <NavItem
                                            {...navProps("fields")}
                                            icon="fa-solid fa-layer-group"
                                            label={t(
                                                "blueprints.bp_settings.nav.fields",
                                            )}
                                        />
                                    )}
                                    <NavItem
                                        {...navProps("relationships")}
                                        icon="fa-solid fa-diagram-project"
                                        label={t(
                                            "blueprints.bp_settings.nav.relationships",
                                        )}
                                    />
                                    <NavItem
                                        {...navProps("infobox")}
                                        icon="fa-solid fa-table-cells"
                                        label={t(
                                            "blueprints.bp_settings.nav.infobox",
                                        )}
                                    />
                                    {blueprint.classification ===
                                        "relationship" && (
                                        <NavItem
                                            {...navProps("display")}
                                            icon="fa-solid fa-eye"
                                            label={t(
                                                "blueprints.bp_settings.nav.display",
                                            )}
                                        />
                                    )}
                                    <NavItem
                                        {...navProps("media")}
                                        icon="fa-solid fa-image"
                                        label={t(
                                            "blueprints.bp_settings.nav.media",
                                        )}
                                    />
                                </NavGroup>
                            </>
                        )}

                        <NavGroup
                            title={t(
                                "blueprints.bp_settings.nav.display_group",
                            )}
                        >
                            <NavItem
                                {...navProps("columns")}
                                icon="fa-solid fa-table-list"
                                label={t("blueprints.bp_settings.nav.table")}
                            />
                            {blueprint &&
                                blueprint.classification !== "relationship" && (
                                    <NavItem
                                        {...navProps("tree")}
                                        icon="fa-solid fa-sitemap"
                                        label={t(
                                            "blueprints.bp_settings.nav.hierarchy",
                                        )}
                                    />
                                )}
                            {blueprint &&
                                !["structural", "relationship"].includes(
                                    blueprint.classification,
                                ) && (
                                    <NavItem
                                        {...navProps("timeline")}
                                        icon="fa-solid fa-timeline"
                                        label={t(
                                            "blueprints.bp_settings.nav.timeline",
                                        )}
                                    />
                                )}
                            {blueprint &&
                                ["standard", "list"].includes(
                                    blueprint.classification,
                                ) && (
                                    <>
                                        <NavItem
                                            {...navProps("kanban")}
                                            icon="fa-solid fa-table-columns"
                                            label={t(
                                                "blueprints.bp_settings.nav.kanban",
                                            )}
                                        />
                                        <NavItem
                                            {...navProps("graph")}
                                            icon="fa-solid fa-diagram-project"
                                            label={t(
                                                "blueprints.bp_settings.nav.graph",
                                            )}
                                        />
                                    </>
                                )}
                        </NavGroup>
                    </nav>

                    {/* Right pane */}
                    <div
                        className="flex flex-1 flex-col overflow-hidden"
                        style={rightPaneStyle}
                    >
                        {/* Columns panel */}
                        {activeMenu === "columns" && (
                            <ColumnsPanel
                                open={open}
                                availableColumns={availableColumns}
                                initialColumns={columns}
                                initialSortableColumns={sortableColumns}
                                onChange={onChange}
                                onSortableChange={onSortableChange}
                                onCancel={onClose}
                            />
                        )}

                        {/* Main panel (Identity) */}
                        {activeMenu === "main" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.main.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.main.description",
                                    )}
                                />
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    <BlueprintMainPanel
                                        blueprint={blueprint}
                                        project={project}
                                        onClose={onClose}
                                        referencingRelationshipBlueprints={
                                            referencingRelationshipBlueprints ??
                                            []
                                        }
                                    />
                                </div>
                            </>
                        )}

                        {/* Media panel */}
                        {activeMenu === "media" && blueprint && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.media.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.media.description",
                                    )}
                                />
                                <div className="flex-1 overflow-y-auto p-4">
                                    <MediaSection
                                        modelType="blueprints"
                                        modelId={blueprint.id}
                                    />
                                </div>
                            </>
                        )}

                        {/* Settings panel (Behavior) */}
                        {activeMenu === "settings" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.behavior.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.behavior.description",
                                    )}
                                />
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    <BlueprintBehaviorPanel
                                        blueprint={blueprint}
                                        project={project}
                                        onClose={onClose}
                                    />
                                </div>
                            </>
                        )}

                        {/* AI Sorting panel (Stage 8g.0 P4) */}
                        {activeMenu === "ai" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t("blueprints.bp_settings.ai.title")}
                                    description={t(
                                        "blueprints.bp_settings.ai.description",
                                    )}
                                />
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    <BlueprintAiPanel
                                        blueprint={blueprint}
                                        project={project}
                                        onClose={onClose}
                                    />
                                </div>
                            </>
                        )}

                        {/* Theme panel (Stage 8b M2) */}
                        {activeMenu === "theme" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.theme.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.theme.description",
                                    )}
                                />
                                <div className="flex flex-1 flex-col overflow-y-auto">
                                    <BlueprintThemePanel
                                        blueprint={blueprint}
                                        project={project}
                                    />
                                </div>
                            </>
                        )}

                        {/* Fields panel */}
                        {activeMenu === "fields" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.fields.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.fields.description",
                                    )}
                                    action={
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowFieldsHelp(true)
                                            }
                                            aria-label={t(
                                                "blueprints.bp_settings.fields.help_aria",
                                            )}
                                            title={t(
                                                "blueprints.bp_settings.fields.help_tooltip",
                                            )}
                                            className="alex-btn alex-btn--ghost flex h-7 w-7 items-center justify-center"
                                            style={{
                                                border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                                                borderRadius: "9999px",
                                                color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
                                            }}
                                        >
                                            <i className="fa-solid fa-question text-xs" />
                                        </button>
                                    }
                                />
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    <BlueprintFieldsPanel
                                        blueprint={blueprint}
                                        project={project}
                                        listableBlueprints={
                                            listableBlueprints ?? []
                                        }
                                        relationshipBlueprints={
                                            relationshipBlueprints ?? []
                                        }
                                        onClose={onClose}
                                    />
                                </div>
                                <HelpModal
                                    open={showFieldsHelp}
                                    onClose={() => setShowFieldsHelp(false)}
                                    title={t(
                                        "blueprints.bp_settings.fields.help_title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.fields.help_description",
                                    )}
                                >
                                    <FieldTypesHelp />
                                </HelpModal>
                            </>
                        )}

                        {/* Relationships panel */}
                        {activeMenu === "relationships" && blueprint && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.relationships.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.relationships.description",
                                    )}
                                />
                                <div className="flex-1 overflow-y-auto">
                                    <BlueprintRelationshipsPanel
                                        blueprint={blueprint}
                                        relationshipBlueprints={
                                            relationshipBlueprints ?? []
                                        }
                                        referencingRelationshipBlueprints={
                                            referencingRelationshipBlueprints ??
                                            []
                                        }
                                    />
                                </div>
                            </>
                        )}

                        {/* Infobox Designer */}
                        {activeMenu === "infobox" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.infobox.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.infobox.description",
                                    )}
                                />
                                <div className="flex-1 overflow-y-auto">
                                    <InfoboxDesigner
                                        projectSlug={project.slug}
                                        blueprintSlug={blueprint.slug}
                                        schema={blueprint.infobox_schema}
                                        fields={blueprint.fields}
                                        relationshipBlueprints={
                                            relationshipBlueprints ?? []
                                        }
                                    />
                                </div>
                            </>
                        )}

                        {/* Display Config (relationship blueprints) */}
                        {activeMenu === "display" &&
                            blueprint &&
                            project &&
                            blueprint.classification === "relationship" && (
                                <>
                                    <PanelHeader
                                        title={t(
                                            "blueprints.bp_settings.display.title",
                                        )}
                                        description={t(
                                            "blueprints.bp_settings.display.description",
                                        )}
                                    />
                                    <div className="flex-1 overflow-y-auto">
                                        <RelationshipDisplayPanel
                                            blueprint={blueprint}
                                            project={project}
                                        />
                                    </div>
                                </>
                            )}

                        {/* Tree / Hierarchy Configuration */}
                        {activeMenu === "tree" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.hierarchy.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.hierarchy.description",
                                    )}
                                />
                                <div className="flex-1 overflow-y-auto p-5">
                                    {blueprint.classification !==
                                        "structural" && (
                                        <>
                                            <TreeActivationPanel
                                                blueprint={blueprint}
                                                project={project}
                                            />
                                            <p
                                                className="mt-3 text-[11px]"
                                                style={helperStyle}
                                            >
                                                {t(
                                                    "blueprints.bp_settings.hierarchy.note",
                                                )}
                                            </p>
                                        </>
                                    )}
                                    <TreeChildrenBlueprintsPanel
                                        blueprint={blueprint}
                                        project={project}
                                    />
                                </div>
                            </>
                        )}

                        {/* Timeline Configuration */}
                        {activeMenu === "timeline" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.timeline.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.timeline.description",
                                    )}
                                />
                                <div className="flex-1 overflow-y-auto">
                                    <div className="space-y-0">
                                        <div className="p-5 pb-0">
                                            <TimelineActivationPanel
                                                blueprint={blueprint}
                                                project={project}
                                            />
                                        </div>

                                        {/* Date field config — slides down when Timeline is enabled.
                                TimelineSettingsPanel owns its own p-5 so no extra
                                padding wrapper is needed here. */}
                                        <RevealCollapse
                                            open={blueprint.enable_timeline}
                                        >
                                            {onTimelineConfigChange && (
                                                <TimelineSettingsPanel
                                                    config={
                                                        timelineConfig ??
                                                        defaultTimelineConfig()
                                                    }
                                                    onChange={
                                                        onTimelineConfigChange
                                                    }
                                                    availableColumns={
                                                        availableColumns
                                                    }
                                                />
                                            )}
                                        </RevealCollapse>

                                        {/* Timeline Sources — for blueprints that CONSUME timeline data.
                                Always visible (independent of this blueprint's own
                                enable_timeline state). */}
                                        {timelineBlueprints &&
                                            timelineBlueprints.length > 0 && (
                                                <TimelineSourcesPanel
                                                    blueprint={blueprint}
                                                    project={project}
                                                    timelineBlueprints={
                                                        timelineBlueprints
                                                    }
                                                />
                                            )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Kanban Configuration */}
                        {activeMenu === "kanban" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.kanban.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.kanban.description",
                                    )}
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
                        {activeMenu === "graph" && blueprint && project && (
                            <>
                                <PanelHeader
                                    title={t(
                                        "blueprints.bp_settings.graph.title",
                                    )}
                                    description={t(
                                        "blueprints.bp_settings.graph.description",
                                    )}
                                />
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    <GraphPanel
                                        blueprint={blueprint}
                                        project={project}
                                        availableColumns={availableColumns}
                                        relationshipBlueprints={
                                            relationshipBlueprints ?? []
                                        }
                                        referencingRelationshipBlueprints={
                                            referencingRelationshipBlueprints ??
                                            []
                                        }
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
