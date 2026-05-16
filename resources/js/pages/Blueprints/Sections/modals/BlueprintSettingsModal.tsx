import { useState, useEffect, useRef } from "react";
import Sortable from "sortablejs";
import Modal from "@alexandria/components/ui/Modal";
import Tooltip from "@alexandria/components/ui/Tooltip";
import ActionButton from "@alexandria/components/ui/ActionButton";
import MediaSection from "@alexandria/components/media/MediaSection";
import useT from "@alexandria/hooks/useT";
import { router } from "@inertiajs/react";
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
import { NavGroup, NavItem } from "./settings/Nav";
import PanelHeader from "./settings/PanelHeader";
import SubtitleBuilderModal from "./settings/SubtitleBuilderModal";
import FieldTypesHelp from "@alexandria/components/blueprints/FieldTypesHelp";
import HelpModal from "@alexandria/components/ui/HelpModal";
import {
    FIELD_TYPE_BADGE_STYLES,
    TOGGLE_ACCENT_COLOR,
    activeColumnRowStyle,
    addFieldBtnStyle,
    availableColumnRowStyle,
    badgeGhostStyle,
    badgeInfoStyle,
    badgePrimaryStyle,
    badgeSuccessStyle,
    badgeWarningStyle,
    closeBtnStyle,
    columnsDividerStyle,
    dragHandleStyle,
    fadedIconStyle,
    footerDividerStyle,
    helperFainterStyle,
    helperSoftStyle,
    helperStyle,
    infoHalfStyle,
    labelStyle,
    navSidebarStyle,
    primaryHalfStyle,
    primaryTextStyle,
    relCardActiveStyle,
    relCardIconWrapIdleStyle,
    relCardIconWrapStyle,
    relCardIdleStyle,
    rightPaneStyle,
    sortableBadgeActiveStyle,
    sortableBadgeIdleStyle,
    subtitlePickerBtnStyle,
    titleBarStyle,
    veryFadedStyle,
    warningHalfStyle,
    warningTextStyle,
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

/* ── Blueprint Relationships Panel ── */

function BlueprintRelationshipsPanel({
    blueprint,
    relationshipBlueprints,
    referencingRelationshipBlueprints,
}: {
    blueprint: BlueprintDetail;
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
}) {
    const t = useT();
    const [showUnused, setShowUnused] = useState(false);

    const connected = referencingRelationshipBlueprints;
    const connectedIds = new Set(connected.map((r) => r.id));
    const unused = relationshipBlueprints.filter(
        (r) => !connectedIds.has(r.id),
    );

    // Derive project slug from the current URL.
    // typeof check guards SSR — `window` doesn't exist in Node.js
    // when Inertia renders the page server-side. The slug is only
    // used to build link hrefs (rendered as plain anchors); empty
    // is harmless during SSR since no one clicks links in the
    // server-rendered HTML.
    const projectSlug =
        typeof window !== "undefined"
            ? (window.location.pathname.split("/")[2] ?? "")
            : "";

    function RelCard({
        rb,
        isActive,
    }: {
        rb: SiblingBlueprint;
        isActive: boolean;
    }) {
        const icon = rb.icon
            ? rb.icon.includes(" ")
                ? rb.icon
                : `fa-solid ${rb.icon}`
            : "fa-solid fa-diagram-project";
        return (
            <div
                className="flex items-center gap-3 px-4 py-3"
                style={isActive ? relCardActiveStyle : relCardIdleStyle}
            >
                <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center"
                    style={
                        isActive
                            ? relCardIconWrapStyle
                            : relCardIconWrapIdleStyle
                    }
                >
                    <i
                        className={`${icon} text-sm`}
                        style={
                            isActive ? { color: "#f43f5e" } : helperSoftStyle
                        }
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <a
                        href={`/p/${projectSlug}/${rb.slug}`}
                        className="text-sm font-medium hover:underline"
                        style={isActive ? undefined : helperStyle}
                    >
                        {rb.name}
                    </a>
                </div>
                {isActive ? (
                    <span style={badgeSuccessStyle}>
                        {t("blueprints.bp_settings.relationships.active")}
                    </span>
                ) : (
                    <span style={badgeGhostStyle}>
                        {t("blueprints.bp_settings.relationships.unused")}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="p-5">
            <p className="mb-4 text-xs" style={helperStyle}>
                {t("blueprints.bp_settings.relationships.intro").replace(
                    ":blueprint",
                    blueprint.name,
                )}
            </p>

            {connected.length === 0 && unused.length === 0 ? (
                <div className="py-8 text-center">
                    <i
                        className="fa-solid fa-diagram-project mb-3 text-3xl"
                        style={fadedIconStyle}
                    />
                    <p className="font-medium" style={helperStyle}>
                        {t("blueprints.bp_settings.relationships.empty.title")}
                    </p>
                    <p className="mt-1 text-sm" style={helperSoftStyle}>
                        {t("blueprints.bp_settings.relationships.empty.hint")}
                    </p>
                </div>
            ) : (
                <>
                    {/* Active relationships */}
                    {connected.length > 0 ? (
                        <div className="space-y-2">
                            {connected.map((rb) => (
                                <RelCard key={rb.id} rb={rb} isActive />
                            ))}
                        </div>
                    ) : (
                        <p
                            className="py-3 text-center text-sm italic"
                            style={helperSoftStyle}
                        >
                            {t(
                                "blueprints.bp_settings.relationships.empty.active",
                            ).replace(":blueprint", blueprint.name)}
                        </p>
                    )}

                    {/* Unused relationships (collapsed) */}
                    {unused.length > 0 && (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => setShowUnused(!showUnused)}
                                className="flex items-center gap-2 text-xs transition-colors"
                                style={helperFainterStyle}
                            >
                                <i
                                    className={`fa-solid fa-chevron-right text-[10px] transition-transform ${showUnused ? "rotate-90" : ""}`}
                                />
                                {t(
                                    unused.length === 1
                                        ? "blueprints.bp_settings.relationships.unused_count.singular"
                                        : "blueprints.bp_settings.relationships.unused_count.plural",
                                ).replace(":count", String(unused.length))}
                            </button>
                            {showUnused && (
                                <div className="mt-2 space-y-2">
                                    {unused.map((rb) => (
                                        <RelCard
                                            key={rb.id}
                                            rb={rb}
                                            isActive={false}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Create new */}
            <button
                type="button"
                className="alex-row mt-4 flex w-full items-center justify-center gap-2 py-2.5 text-xs"
                style={addFieldBtnStyle}
                onClick={() => {
                    /* TODO: create relationship blueprint */
                }}
            >
                <i className="fa-solid fa-plus" />{" "}
                {t("blueprints.bp_settings.relationships.create")}
            </button>
        </div>
    );
}

/* ── Relationship Display Configuration Panel ── */

function RelationshipDisplayPanel({
    blueprint,
    project,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
}) {
    const t = useT();
    const metadata =
        (blueprint as unknown as { metadata?: Record<string, unknown> })
            .metadata ?? {};
    const displayConfig = (metadata.display_config ?? {}) as Record<
        string,
        unknown
    >;
    const [hiddenFields, setHiddenFields] = useState<string[]>(
        (displayConfig.hidden_fields as string[] | undefined) ?? [],
    );
    const [subtitleModalOpen, setSubtitleModalOpen] = useState(false);
    const [subtitleData, setSubtitleData] =
        useState<Record<string, unknown>>(displayConfig);
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
        router.put(
            `/p/${project.slug}/${blueprint.slug}`,
            {
                name: blueprint.name,
                description: blueprint.description ?? "",
                icon: blueprint.icon,
                classification: blueprint.classification,
                show_on_dashboard: blueprint.show_on_dashboard,
                is_linkable: blueprint.is_linkable,
                is_hub: blueprint.is_hub,
                metadata: newMetadata,
            } as any,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDirty(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            },
        );
    }

    return (
        <div className="p-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold" style={labelStyle}>
                        {t("blueprints.bp_settings.display.config_title")}
                    </h3>
                    <p className="mt-0.5 text-xs" style={helperFainterStyle}>
                        {t("blueprints.bp_settings.display.config_description")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {dirty && (
                        <span className="text-xs" style={warningTextStyle}>
                            {t("blueprints.bp_settings.display.unsaved")}
                        </span>
                    )}
                    <ActionButton
                        icon="fa-solid fa-save"
                        label={t("common.save")}
                        size="xs"
                        onClick={save}
                        loading={saving}
                        disabled={!dirty}
                    />
                </div>
            </div>

            {/* Hidden Fields */}
            <div className="mt-4">
                <label className="text-xs font-semibold" style={labelStyle}>
                    {t("blueprints.bp_settings.display.visible_fields")}
                </label>
                <p className="mb-2 mt-0.5 text-[11px]" style={helperSoftStyle}>
                    {t("blueprints.bp_settings.display.visible_fields_hint")}
                </p>
                <div className="space-y-1.5">
                    {blueprint.fields.map((field) => {
                        const badge = FIELD_TYPE_BADGE_STYLES[field.type] ?? {
                            bg: "rgba(128,128,128,0.15)",
                            text: "#888",
                        };
                        return (
                            <label
                                key={field.name}
                                className="alex-row flex cursor-pointer items-center gap-3 px-3 py-2"
                                style={{
                                    borderRadius: "var(--theme-radius-input)",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={!hiddenFields.includes(field.name)}
                                    onChange={() =>
                                        toggleHiddenField(field.name)
                                    }
                                    style={{ accentColor: TOGGLE_ACCENT_COLOR }}
                                />
                                <span
                                    className="flex-1 text-xs font-medium"
                                    style={labelStyle}
                                >
                                    {field.label}
                                </span>
                                <span
                                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                                    style={{
                                        backgroundColor: badge.bg,
                                        color: badge.text,
                                    }}
                                >
                                    {titleCase(field.type)}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Subtitle Template */}
            <div className="mt-5">
                <label className="text-xs font-semibold" style={labelStyle}>
                    {t("blueprints.bp_settings.display.subtitle_template")}
                </label>
                <p className="mb-2 mt-0.5 text-[11px]" style={helperSoftStyle}>
                    {t("blueprints.bp_settings.display.subtitle_hint")}
                </p>
                <button
                    type="button"
                    onClick={() => setSubtitleModalOpen(true)}
                    className="alex-row flex w-full items-center justify-between px-3 py-2 text-left text-xs"
                    style={subtitlePickerBtnStyle}
                >
                    <span style={hasSubtitle ? labelStyle : helperSoftStyle}>
                        {hasSubtitle
                            ? t(
                                  "blueprints.bp_settings.display.subtitle_configured",
                              )
                            : t("blueprints.bp_settings.display.subtitle_none")}
                    </span>
                    <i
                        className={`fa-solid ${hasSubtitle ? "fa-pen" : "fa-plus"} text-[10px]`}
                        style={helperSoftStyle}
                    />
                </button>
            </div>

            {/* Reuse SubtitleBuilderModal from settings/SubtitleBuilderModal */}
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
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
