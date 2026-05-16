import { useState, useEffect, useRef } from "react";
import Sortable from "sortablejs";
import Modal from "@alexandria/components/ui/Modal";
import Tooltip from "@alexandria/components/ui/Tooltip";
import ActionButton from "@alexandria/components/ui/ActionButton";
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
import { TreeActivationPanel } from "./settings/TreePanels";
import KanbanPanel from "./settings/KanbanPanel";
import GraphPanel from "./settings/GraphPanel";
import RevealCollapse from "@alexandria/components/ui/RevealCollapse";
import BlueprintBehaviorPanel from "./settings/BlueprintBehaviorPanel";
import BlueprintFieldsPanel from "./settings/BlueprintFieldsPanel";
import BlueprintMainPanel from "./settings/BlueprintMainPanel";
import BlueprintRelationshipsPanel from "./settings/BlueprintRelationshipsPanel";
import { NavGroup, NavItem } from "./settings/Nav";
import PanelHeader from "./settings/PanelHeader";
import RelationshipDisplayPanel from "./settings/RelationshipDisplayPanel";
import FieldTypesHelp from "@alexandria/components/blueprints/FieldTypesHelp";
import HelpModal from "@alexandria/components/ui/HelpModal";
import {
    activeColumnRowStyle,
    availableColumnRowStyle,
    badgeInfoStyle,
    badgePrimaryStyle,
    badgeWarningStyle,
    closeBtnStyle,
    columnsDividerStyle,
    dragHandleStyle,
    footerDividerStyle,
    helperFainterStyle,
    helperSoftStyle,
    helperStyle,
    infoHalfStyle,
    navSidebarStyle,
    primaryHalfStyle,
    primaryTextStyle,
    rightPaneStyle,
    sortableBadgeActiveStyle,
    sortableBadgeIdleStyle,
    titleBarStyle,
    veryFadedStyle,
    warningHalfStyle,
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
    // Local state so changes apply on close, not live
    const [localColumns, setLocalColumns] = useState<string[]>(columns);
    const [localSortable, setLocalSortable] =
        useState<string[]>(sortableColumns);

    // In-panel help modal state (Fields panel — field type reference)
    const [showFieldsHelp, setShowFieldsHelp] = useState(false);

    // Menu state
    type MenuPanel =
        | "columns"
        | "main"
        | "settings"
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

    const inactiveList = availableColumns.filter(
        (c) => !localColumns.includes(c.key),
    );

    // SortableJS for drag-and-drop reordering
    const sortableRef = useRef<HTMLDivElement>(null);
    const sortableInstance = useRef<Sortable | null>(null);

    useEffect(() => {
        // Only attach Sortable when the columns panel is mounted.
        // The modal swaps panels in-place via activeMenu; navigating
        // away from 'columns' unmounts the ref'd div, and coming back
        // mounts a fresh DOM node. Including activeMenu in the dep
        // array ensures we rebind to the new node instead of leaving
        // the old (now-detached) instance dangling.
        if (!open || activeMenu !== "columns" || !sortableRef.current) return;

        sortableInstance.current = Sortable.create(sortableRef.current, {
            handle: ".drag-handle",
            animation: 150,
            ghostClass: "opacity-30",
            onEnd: (evt: Sortable.SortableEvent) => {
                const { oldIndex, newIndex } = evt;
                if (
                    oldIndex === undefined ||
                    newIndex === undefined ||
                    oldIndex === newIndex
                )
                    return;
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
    }, [open, activeMenu, localColumns.length]);

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
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
        );
    }

    function columnBadges(col: AvailableColumn) {
        const isSortableActive = localSortable.includes(col.key);

        return (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {col.type === "field" && (
                    <span style={badgeInfoStyle}>
                        {t("blueprints.bp_settings.columns.badge.custom")}
                    </span>
                )}
                {col.type === "native" && (
                    <span style={badgePrimaryStyle}>
                        {t("blueprints.bp_settings.columns.badge.native")}
                    </span>
                )}
                {col.type === "calculated" && (
                    <span style={badgeWarningStyle}>
                        {t("blueprints.bp_settings.columns.badge.calculated")}
                    </span>
                )}
                <Tooltip
                    content={
                        isSortableActive
                            ? t(
                                  "blueprints.bp_settings.columns.sortable.disable",
                              )
                            : t(
                                  "blueprints.bp_settings.columns.sortable.enable",
                              )
                    }
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSortable(col.key);
                        }}
                        style={
                            isSortableActive
                                ? sortableBadgeActiveStyle
                                : sortableBadgeIdleStyle
                        }
                    >
                        <i className="fa-solid fa-sort text-[8px]" />{" "}
                        {t("blueprints.bp_settings.columns.sortable.label")}
                    </button>
                </Tooltip>
            </div>
        );
    }

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
                                !["structural", "relationship"].includes(
                                    blueprint.classification,
                                ) && (
                                    <>
                                        <NavItem
                                            {...navProps("tree")}
                                            icon="fa-solid fa-sitemap"
                                            label={t(
                                                "blueprints.bp_settings.nav.hierarchy",
                                            )}
                                        />
                                        <NavItem
                                            {...navProps("timeline")}
                                            icon="fa-solid fa-timeline"
                                            label={t(
                                                "blueprints.bp_settings.nav.timeline",
                                            )}
                                        />
                                    </>
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
                        {activeMenu === "columns" &&
                            (() => {
                                const inactiveNative = inactiveList.filter(
                                    (c) => c.type === "native",
                                );
                                const inactiveField = inactiveList.filter(
                                    (c) => c.type === "field",
                                );
                                const inactiveCalc = inactiveList.filter(
                                    (c) => c.type === "calculated",
                                );

                                function AvailableItem({
                                    col,
                                }: {
                                    col: AvailableColumn;
                                }) {
                                    return (
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => addColumn(col.key)}
                                            onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                addColumn(col.key)
                                            }
                                            className="alex-row flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left"
                                            style={availableColumnRowStyle}
                                        >
                                            <i
                                                className="fa-solid fa-plus text-[10px]"
                                                style={veryFadedStyle}
                                            />
                                            <span
                                                className="ml-0.5 text-sm"
                                                style={helperStyle}
                                            >
                                                {col.label}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <>
                                        <PanelHeader
                                            title={t(
                                                "blueprints.bp_settings.columns.title",
                                            )}
                                            description={t(
                                                "blueprints.bp_settings.columns.description",
                                            )}
                                        />
                                        <div className="flex flex-1 flex-col overflow-hidden">
                                            <div className="grid flex-1 grid-cols-2 gap-0 overflow-hidden">
                                                {/* Left: Active columns (sortable) */}
                                                <div
                                                    className="flex flex-col overflow-hidden p-5"
                                                    style={columnsDividerStyle}
                                                >
                                                    <h4
                                                        className="mb-3 flex-shrink-0 text-xs font-semibold uppercase tracking-wider"
                                                        style={
                                                            helperFainterStyle
                                                        }
                                                    >
                                                        {t(
                                                            "blueprints.bp_settings.columns.active_heading",
                                                        )}
                                                    </h4>
                                                    <div
                                                        ref={sortableRef}
                                                        className="flex-1 space-y-1.5 overflow-y-auto pr-2"
                                                    >
                                                        {activeList.map(
                                                            (col) => (
                                                                <div
                                                                    key={
                                                                        col.key
                                                                    }
                                                                    data-key={
                                                                        col.key
                                                                    }
                                                                    className="flex items-center gap-3 px-3 py-2.5"
                                                                    style={
                                                                        activeColumnRowStyle
                                                                    }
                                                                >
                                                                    <i
                                                                        className="drag-handle fa-solid fa-grip-vertical cursor-grab text-sm active:cursor-grabbing"
                                                                        style={
                                                                            dragHandleStyle
                                                                        }
                                                                    />
                                                                    <div className="min-w-0 flex-1">
                                                                        <span className="text-sm font-medium">
                                                                            {
                                                                                col.label
                                                                            }
                                                                        </span>
                                                                        {columnBadges(
                                                                            col,
                                                                        )}
                                                                    </div>
                                                                    <Tooltip
                                                                        content={t(
                                                                            "blueprints.bp_settings.columns.remove",
                                                                        )}
                                                                        variant="error"
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                removeColumn(
                                                                                    col.key,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                localColumns.length <=
                                                                                1
                                                                            }
                                                                            className="alex-btn alex-btn--ghost inline-flex h-6 w-6 items-center justify-center disabled:opacity-20"
                                                                            style={{
                                                                                borderRadius:
                                                                                    "var(--theme-radius-button)",
                                                                            }}
                                                                        >
                                                                            <i className="fa-solid fa-arrow-right text-xs" />
                                                                        </button>
                                                                    </Tooltip>
                                                                </div>
                                                            ),
                                                        )}
                                                        {activeList.length ===
                                                            0 && (
                                                            <p
                                                                className="py-8 text-center text-sm italic"
                                                                style={
                                                                    helperSoftStyle
                                                                }
                                                            >
                                                                {t(
                                                                    "blueprints.bp_settings.columns.empty_active",
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Available columns grouped by type */}
                                                <div className="flex flex-col overflow-hidden p-5">
                                                    <h4
                                                        className="mb-3 flex-shrink-0 text-xs font-semibold uppercase tracking-wider"
                                                        style={
                                                            helperFainterStyle
                                                        }
                                                    >
                                                        {t(
                                                            "blueprints.bp_settings.columns.available_heading",
                                                        )}
                                                    </h4>
                                                    {inactiveList.length > 0 ? (
                                                        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                                                            {inactiveNative.length >
                                                                0 && (
                                                                <div>
                                                                    <p
                                                                        className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                                                        style={
                                                                            primaryHalfStyle
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "blueprints.bp_settings.columns.group.native",
                                                                        )}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        {inactiveNative.map(
                                                                            (
                                                                                col,
                                                                            ) => (
                                                                                <AvailableItem
                                                                                    key={
                                                                                        col.key
                                                                                    }
                                                                                    col={
                                                                                        col
                                                                                    }
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {inactiveField.length >
                                                                0 && (
                                                                <div>
                                                                    <p
                                                                        className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                                                        style={
                                                                            infoHalfStyle
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "blueprints.bp_settings.columns.group.custom",
                                                                        )}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        {inactiveField.map(
                                                                            (
                                                                                col,
                                                                            ) => (
                                                                                <AvailableItem
                                                                                    key={
                                                                                        col.key
                                                                                    }
                                                                                    col={
                                                                                        col
                                                                                    }
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {inactiveCalc.length >
                                                                0 && (
                                                                <div>
                                                                    <p
                                                                        className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                                                        style={
                                                                            warningHalfStyle
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "blueprints.bp_settings.columns.group.calculated",
                                                                        )}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        {inactiveCalc.map(
                                                                            (
                                                                                col,
                                                                            ) => (
                                                                                <AvailableItem
                                                                                    key={
                                                                                        col.key
                                                                                    }
                                                                                    col={
                                                                                        col
                                                                                    }
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p
                                                            className="py-8 text-center text-sm italic"
                                                            style={
                                                                helperSoftStyle
                                                            }
                                                        >
                                                            {t(
                                                                "blueprints.bp_settings.columns.empty_available",
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div
                                                className="flex items-center justify-between px-5 py-3"
                                                style={footerDividerStyle}
                                            >
                                                <p
                                                    className="text-xs"
                                                    style={helperFainterStyle}
                                                >
                                                    {t(
                                                        localColumns.length ===
                                                            1
                                                            ? "blueprints.bp_settings.columns.count.singular"
                                                            : "blueprints.bp_settings.columns.count.plural",
                                                    ).replace(
                                                        ":count",
                                                        String(
                                                            localColumns.length,
                                                        ),
                                                    )}
                                                </p>
                                                <div className="flex gap-2">
                                                    <ActionButton
                                                        icon="fa-solid fa-xmark"
                                                        label={t(
                                                            "common.cancel",
                                                        )}
                                                        variant="ghost"
                                                        onClick={onClose}
                                                    />
                                                    <ActionButton
                                                        icon="fa-solid fa-check"
                                                        label={t(
                                                            "blueprints.bp_settings.apply",
                                                        )}
                                                        onClick={handleApply}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}

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

