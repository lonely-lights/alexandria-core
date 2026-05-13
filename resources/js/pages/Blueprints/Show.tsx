import { usePage } from "@inertiajs/react";
import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type CSSProperties,
} from "react";

/* Tab pill style tokens — same recipe AiDashboard uses for its tab
 * row. Active = brand-primary fill + content text; idle = transparent
 * + base-content text. Replaces the DaisyUI `btn btn-sm btn-primary`/
 * `btn-ghost` utility classes inherited from the legacy app. */
const tabActiveStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
};

const tabIdleStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-button)",
};

const tabButtonClass =
    "alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium";

/* Subtitle text fades — replace the DaisyUI `text-base-content/40` and
 * `text-base-content/50` opacity utilities, which compile against a
 * different content token than what the theme system uses. */
const subtitle50: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const subtitle40: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
import { useCmdK } from "@alexandria/hooks/useCmdK";
import useT from "@alexandria/hooks/useT";
import AppLayout from "@alexandria/layouts/AppLayout";
import EntriesTab from "./Sections/EntriesTab";
import ConnectionsView from "./Sections/ConnectionsView";
import TreeView from "./Sections/TreeView";
import TimelineView from "./Sections/TimelineView";
import ActionButton from "@alexandria/components/ui/ActionButton";
import IconTile from "@alexandria/components/ui/IconTile";
import PageHeader from "@alexandria/components/layout/PageHeader";
import CommandPalette from "@alexandria/components/search/CommandPalette";
import { projectSearch } from "@alexandria/lib/projectSearch";
import BlueprintGridBg from "@alexandria/components/backgrounds/BlueprintGridBg";
import ViewToggle from "@alexandria/lib/views/ViewToggle";
import { useBlueprintViews } from "@alexandria/lib/views/useBlueprintViews";
import { TreeViewDef } from "@alexandria/lib/views/tree";
import type { BlueprintShowProps } from "@alexandria/types/blueprints";

type ViewMode = string;

export default function BlueprintShow() {
    const t = useT();
    const {
        project,
        blueprint,
        viewConfig,
        timelineViewConfig,
        savedViews,
        availableColumns,
        listableBlueprints,
        relationshipBlueprints,
        referencingRelationshipBlueprints,
        projectBlueprints,
        timelineBlueprints,
    } = usePage().props as unknown as BlueprintShowProps;

    const resolvedViews = useBlueprintViews({
        classification: blueprint.classification,
        views: blueprint.views ?? [],
    });

    // Render-gating booleans kept in sync with the legacy flags so the
    // existing <TreeView> / <TimelineView> conditional render blocks below
    // continue to work unchanged. The toggle itself is now driven by the
    // registry via <ViewToggle>.
    const hasTreeView =
        blueprint.classification === "structural" || blueprint.show_tree_view;
    const hasTimelineView = blueprint.enable_timeline;
    // Any registry-driven view (Kanban, future Graph/Gallery/etc.) that
    // is enabled + applicable for this blueprint. Drives the same toggle
    // group as the legacy tree/timeline flags.
    const hasAnyRegistryView = resolvedViews.some(
        (v) =>
            v.definition.type !== "tree" &&
            v.definition.type !== "timeline" &&
            v.enabledForBlueprint &&
            v.applicableForBlueprint,
    );

    const [viewMode, setViewMode] = useState<ViewMode>(
        blueprint.classification === "structural"
            ? "tree"
            : blueprint.show_tree_view
              ? "tree"
              : "table",
    );

    // Reset to table if the active registry view is no longer available.
    useEffect(() => {
        if (viewMode === "table") return;
        const activeResolved = resolvedViews.find(
            (v) => v.definition.type === viewMode,
        );
        const activeStillEnabled =
            activeResolved?.enabledForBlueprint &&
            activeResolved?.applicableForBlueprint;
        // Fall back to legacy flags when a resolved entry isn't present
        // (blueprints.views may not be backfilled for every blueprint yet).
        if (!activeResolved) {
            if (viewMode === "tree" && !hasTreeView) setViewMode("table");
            if (viewMode === "timeline" && !hasTimelineView)
                setViewMode("table");
            return;
        }
        if (!activeStillEnabled) {
            setViewMode("table");
        }
    }, [resolvedViews, viewMode, hasTreeView, hasTimelineView]);
    const [activeTab, setActiveTab] = useState<"entries">("entries");

    const [searchOpen, setSearchOpen] = useState(false);
    const openSettingsRef = useRef<((menu?: string) => void) | null>(null);

    // Keep-mounted view modes — lazy-mount each view on first visit
    // then keep it mounted (visibility toggled) so switching between
    // table/tree/timeline preserves fetched data + scroll position.
    // Applied only to standard/list blueprints where multiple views
    // are available; relationship + structural have a single view.
    const [visited, setVisited] = useState<Set<ViewMode>>(
        () => new Set([viewMode]),
    );
    useEffect(() => {
        if (visited.has(viewMode)) return;
        setVisited((prev) => {
            const next = new Set(prev);
            next.add(viewMode);
            return next;
        });
    }, [viewMode, visited]);

    function openSettings(menu?: string) {
        const isRegistryView =
            viewMode !== "table" &&
            resolvedViews.some((v) => v.definition.type === viewMode);
        if (
            blueprint.classification === "relationship" ||
            blueprint.classification === "structural" ||
            viewMode === "tree" ||
            viewMode === "timeline" ||
            isRegistryView
        ) {
            // Tree / connection / timeline / registry-driven views dispatch
            // the event so their own settings component handles it. Registry
            // views pass their type as the menu name by default so the modal
            // opens directly on the relevant panel (e.g. 'kanban').
            const defaultMenu = isRegistryView ? viewMode : (menu ?? "main");
            window.dispatchEvent(
                new CustomEvent("alexandria:open-blueprint-settings", {
                    detail: { menu: menu ?? defaultMenu },
                }),
            );
        } else {
            // Standard and list blueprints in table view use EntriesTab's settings modal
            openSettingsRef.current?.(menu ?? "main");
        }
    }

    useCmdK(useCallback(() => setSearchOpen(true), []));

    useEffect(() => {
        window.location.hash = activeTab === "entries" ? "" : `#${activeTab}`;
    }, [activeTab]);

    const iconClass = blueprint.icon.includes(" ")
        ? blueprint.icon
        : `fa-solid ${blueprint.icon}`;

    // Pick an animation that matches the classification's feel. Lists
    // are static/reference; standards get a subtle pulse to signal
    // "active content"; structural/relationship get nothing (busy
    // enough with tree diagrams).
    const animation =
        blueprint.classification === "standard" ? "beat-fade" : undefined;

    return (
        <AppLayout title={`${blueprint.name} - ${project.name}`} immersive>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: blueprint.name },
                ]}
                actions={
                    <ActionButton
                        icon="fa-solid fa-plus"
                        label={
                            blueprint.classification === "relationship"
                                ? t("blueprints.action.new_connection")
                                : t("blueprints.action.new_entry")
                        }
                        href={`/p/${project.slug}/${blueprint.slug}/create`}
                        size="md"
                    />
                }
                tabs={
                    <>
                        {blueprint.classification === "relationship" ? (
                            <button
                                onClick={() => setActiveTab("entries")}
                                className={tabButtonClass}
                                style={
                                    activeTab === "entries"
                                        ? tabActiveStyle
                                        : tabIdleStyle
                                }
                                aria-pressed={activeTab === "entries"}
                            >
                                <i className="fa-solid fa-diagram-project w-3.5 text-center text-xs" />
                                {t("blueprints.tab.connections")}
                            </button>
                        ) : blueprint.classification === "structural" ? (
                            <button
                                onClick={() => setActiveTab("entries")}
                                className={tabButtonClass}
                                style={
                                    activeTab === "entries"
                                        ? tabActiveStyle
                                        : tabIdleStyle
                                }
                                aria-pressed={activeTab === "entries"}
                            >
                                <i
                                    className={`${TreeViewDef.icon} w-3.5 text-center text-xs`}
                                />
                                {TreeViewDef.label}
                            </button>
                        ) : hasTreeView ||
                          hasTimelineView ||
                          hasAnyRegistryView ? (
                            <>
                                <button
                                    onClick={() => {
                                        setActiveTab("entries");
                                        setViewMode("table");
                                    }}
                                    className={tabButtonClass}
                                    style={
                                        activeTab === "entries" &&
                                        viewMode === "table"
                                            ? tabActiveStyle
                                            : tabIdleStyle
                                    }
                                    aria-pressed={
                                        activeTab === "entries" &&
                                        viewMode === "table"
                                    }
                                >
                                    <i className="fa-solid fa-table-list w-3.5 text-center text-xs" />
                                    {t("blueprints.tab.table")}
                                </button>
                                <ViewToggle
                                    views={resolvedViews}
                                    active={viewMode}
                                    onSelect={(type) => {
                                        setActiveTab("entries");
                                        setViewMode(type);
                                    }}
                                />
                            </>
                        ) : (
                            <button
                                onClick={() => setActiveTab("entries")}
                                className={tabButtonClass}
                                style={
                                    activeTab === "entries"
                                        ? tabActiveStyle
                                        : tabIdleStyle
                                }
                                aria-pressed={activeTab === "entries"}
                            >
                                <i className="fa-solid fa-table-list w-3.5 text-center text-xs" />
                                {t("blueprints.tab.table_view")}
                            </button>
                        )}
                        {blueprint.can.update && (
                            <button
                                onClick={() => openSettings("main")}
                                className={tabButtonClass}
                                style={tabIdleStyle}
                            >
                                <i className="fa-solid fa-gear w-3.5 text-center text-xs" />{" "}
                                {t("blueprints.tab.settings")}
                            </button>
                        )}
                    </>
                }
            >
                <div className="flex items-center gap-4">
                    <IconTile
                        icon={iconClass}
                        animation={animation}
                        animationStyle={
                            animation
                                ? ({
                                      "--fa-animation-duration": "2.5s",
                                      "--fa-beat-fade-opacity": "0.8",
                                      "--fa-beat-fade-scale": "1.075",
                                  } as CSSProperties)
                                : undefined
                        }
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                            {blueprint.name}
                        </h1>
                        {blueprint.description ? (
                            <p className="mt-1 text-sm" style={subtitle50}>
                                {blueprint.description}
                            </p>
                        ) : (
                            <p
                                className="mt-1 text-sm capitalize"
                                style={subtitle40}
                            >
                                {t("blueprints.description.fallback").replace(
                                    ":classification",
                                    blueprint.classification,
                                )}
                            </p>
                        )}
                    </div>
                </div>
            </PageHeader>

            {/* Tab Content — for blueprints with multiple view modes,
                each mode is mounted on first visit and hidden when
                inactive so tab-switching preserves fetched data + scroll.
                Relationship and structural classifications only have one
                view, so no visited gating needed.

                The relative wrapper lets the blueprint-grid backdrop
                sit behind the content; `.grid-overlay` scopes it to
                tf themes only. */}
            {/* min-h is clamped to the usable content area so the 2/3
                gradient can fully display on sparse pages without
                forcing the page to exceed the viewport and introduce
                unnecessary scroll. */}
            <div className="relative overflow-hidden min-h-[min(66vh,calc(100vh-var(--navbar-height,3.5rem)))]">
                {/* Top band — 2/3 viewport tall, fades to transparent. */}
                <div
                    className="grid-overlay bg-fade-out pointer-events-none absolute inset-x-0 top-0 h-[66vh] overflow-hidden"
                    aria-hidden="true"
                >
                    <BlueprintGridBg />
                </div>
                <div className="relative container mx-auto max-w-7xl px-4 py-8">
                    {blueprint.classification === "relationship" ? (
                        <div
                            className={activeTab === "entries" ? "" : "hidden"}
                        >
                            <ConnectionsView
                                projectId={project.id}
                                blueprint={blueprint}
                                project={project}
                                viewConfig={viewConfig}
                                savedViews={savedViews}
                                listableBlueprints={listableBlueprints}
                                relationshipBlueprints={relationshipBlueprints}
                                referencingRelationshipBlueprints={
                                    referencingRelationshipBlueprints
                                }
                            />
                        </div>
                    ) : blueprint.classification === "structural" ? (
                        <div
                            className={activeTab === "entries" ? "" : "hidden"}
                        >
                            <TreeView
                                projectId={project.id}
                                blueprint={blueprint}
                                project={project}
                                listableBlueprints={listableBlueprints}
                                relationshipBlueprints={relationshipBlueprints}
                                referencingRelationshipBlueprints={
                                    referencingRelationshipBlueprints
                                }
                                projectBlueprints={projectBlueprints}
                            />
                        </div>
                    ) : (
                        <>
                            {visited.has("table") && (
                                <div
                                    hidden={
                                        viewMode !== "table" ||
                                        activeTab !== "entries"
                                    }
                                >
                                    <EntriesTab
                                        projectId={project.id}
                                        blueprintId={blueprint.id}
                                        blueprintName={blueprint.name}
                                        viewConfig={viewConfig}
                                        savedViews={savedViews}
                                        availableColumns={availableColumns}
                                        canUpdate={blueprint.can.update}
                                        blueprint={blueprint}
                                        project={project}
                                        listableBlueprints={listableBlueprints}
                                        relationshipBlueprints={
                                            relationshipBlueprints
                                        }
                                        referencingRelationshipBlueprints={
                                            referencingRelationshipBlueprints
                                        }
                                        timelineBlueprints={timelineBlueprints}
                                        onRegisterOpenSettings={(fn) => {
                                            openSettingsRef.current = fn;
                                        }}
                                    />
                                </div>
                            )}
                            {hasTreeView && visited.has("tree") && (
                                <div
                                    hidden={
                                        viewMode !== "tree" ||
                                        activeTab !== "entries"
                                    }
                                >
                                    <TreeView
                                        projectId={project.id}
                                        blueprint={blueprint}
                                        project={project}
                                        listableBlueprints={listableBlueprints}
                                        relationshipBlueprints={
                                            relationshipBlueprints
                                        }
                                        referencingRelationshipBlueprints={
                                            referencingRelationshipBlueprints
                                        }
                                        projectBlueprints={projectBlueprints}
                                    />
                                </div>
                            )}
                            {hasTimelineView && visited.has("timeline") && (
                                <div
                                    hidden={
                                        viewMode !== "timeline" ||
                                        activeTab !== "entries"
                                    }
                                >
                                    <TimelineView
                                        projectId={project.id}
                                        blueprintId={blueprint.id}
                                        availableColumns={availableColumns}
                                        initialConfig={
                                            timelineViewConfig ?? undefined
                                        }
                                        blueprint={blueprint}
                                        project={project}
                                        listableBlueprints={listableBlueprints}
                                        relationshipBlueprints={
                                            relationshipBlueprints
                                        }
                                        referencingRelationshipBlueprints={
                                            referencingRelationshipBlueprints
                                        }
                                        timelineBlueprints={timelineBlueprints}
                                    />
                                </div>
                            )}
                            {/* Registry-driven views — Kanban and future greenfield views render
                            via def.render() rather than a hardcoded conditional. Tree + Timeline
                            stay on the legacy path above; when they migrate to the registry
                            render flow (alongside Flowchart/Graph), this branch absorbs them. */}
                            {resolvedViews
                                .filter(
                                    (v) =>
                                        v.definition.type !== "tree" &&
                                        v.definition.type !== "timeline",
                                )
                                .filter(
                                    (v) =>
                                        v.enabledForBlueprint &&
                                        v.applicableForBlueprint &&
                                        v.accessibleForUser,
                                )
                                .map((v) => {
                                    const isActive =
                                        viewMode === v.definition.type &&
                                        activeTab === "entries";
                                    const entryConfig =
                                        v.entry?.config ??
                                        v.definition.defaultConfig();

                                    return (
                                        <div
                                            key={v.definition.type}
                                            hidden={!isActive}
                                        >
                                            {visited.has(
                                                v.definition.type as ViewMode,
                                            ) && (
                                                <v.definition.render
                                                    blueprint={{
                                                        id: blueprint.id,
                                                        slug: blueprint.slug,
                                                        classification:
                                                            blueprint.classification,
                                                        // Widen the registry prop so view components that need
                                                        // project id / extra blueprint fields can cast.
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        ...({
                                                            projectId:
                                                                project.id,
                                                        } as any),
                                                    }}
                                                    projectSlug={project.slug}
                                                    config={entryConfig}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                        </>
                    )}
                </div>
            </div>

            <CommandPalette
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                onSearch={projectSearch(project.slug)}
            />
        </AppLayout>
    );
}
