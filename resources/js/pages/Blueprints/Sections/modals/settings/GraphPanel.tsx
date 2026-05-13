import { type CSSProperties, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import ActionButton from "@alexandria/components/ui/ActionButton";
import ConfirmModal from "@alexandria/components/ui/ConfirmModal";
import useT from "@alexandria/hooks/useT";
import type {
    AvailableColumn,
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";
import type { BlueprintViewEntry } from "@alexandria/lib/views/types";
import { saveBlueprintView } from "@alexandria/lib/views/saveBlueprintView";
import type {
    GraphConfig,
    SavedGraph,
} from "@alexandria/lib/views/graph/types";
import {
    defaultGraphConfig,
    defaultSavedGraph,
} from "@alexandria/lib/views/graph/types";
import { migrateGraphConfig } from "@alexandria/lib/views/graph/migrateGraphConfig";
import SettingsActivationToggle from "./SettingsActivationToggle";
import {
    footerDividerStyle,
    helperFainterStyle,
    inputStyle,
    labelStyle,
    requiredAsteriskStyle,
    selectStyle,
    toggleCardStyle,
    warningTextStyle,
} from "./settingsPanelStyles";

/* Graph-list selected/idle rows + the New-graph button border + graph-
   form card surface. All stay local since they don't appear in the
   sibling panels. */
const graphListShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
};

const graphListItemActiveStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
    color: "var(--theme-brand-primary-500)",
};

const graphListItemIdleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

const newGraphBtnStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "var(--theme-brand-primary-500)",
};

const slugErrorBorderStyle: CSSProperties = {
    ...inputStyle,
    borderColor: "var(--theme-status-error-stroke)",
};

const errorTextStyle: CSSProperties = {
    color: "var(--theme-status-error-stroke)",
};

interface GraphPanelProps {
    blueprint: BlueprintDetail;
    project: { slug: string };
    availableColumns: AvailableColumn[];
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
}

function slugify(name: string): string {
    return (
        name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "graph"
    );
}

export default function GraphPanel({
    blueprint,
    project,
    availableColumns,
    relationshipBlueprints,
    referencingRelationshipBlueprints,
}: GraphPanelProps) {
    const t = useT();
    const existingEntry =
        (blueprint.views ?? []).find((v) => v.type === "graph") ?? null;
    const initialConfig = existingEntry
        ? migrateGraphConfig(existingEntry.config)
        : defaultGraphConfig();

    const [entry, setEntry] = useState<BlueprintViewEntry>(() =>
        existingEntry
            ? {
                  ...existingEntry,
                  config: initialConfig as unknown as Record<string, unknown>,
              }
            : {
                  type: "graph",
                  enabled: false,
                  config: initialConfig as unknown as Record<string, unknown>,
                  sort_order: (blueprint.views ?? []).length,
              },
    );

    const config = entry.config as unknown as GraphConfig;
    const [selectedId, setSelectedId] = useState<string | null>(
        config.graphs[0]?.id ?? null,
    );
    const [saving, setSaving] = useState(false);
    // Per-graph flag: once the user manually edits a slug, name changes no
    // longer auto-regenerate it for that graph.
    const [slugManuallyEdited, setSlugManuallyEdited] = useState<
        Record<string, boolean>
    >({});
    // Graph the user is asking to delete; null when no confirmation pending.
    const [deletingGraph, setDeletingGraph] = useState<SavedGraph | null>(null);

    const selected = useMemo(
        () => config.graphs.find((g) => g.id === selectedId) ?? null,
        [selectedId],
    );

    const allRelationshipBlueprints = useMemo(
        () => [
            ...new Map(
                [
                    ...relationshipBlueprints,
                    ...referencingRelationshipBlueprints,
                ].map((bp) => [bp.slug, bp]),
            ).values(),
        ],
        [relationshipBlueprints, referencingRelationshipBlueprints],
    );

    const colorByFields = useMemo(
        () =>
            availableColumns
                .filter(
                    (c) =>
                        c.type === "field" &&
                        [
                            "text",
                            "integer",
                            "boolean",
                            "entry reference",
                        ].includes(c.field_type?.toLowerCase() ?? ""),
                )
                .map((c) => ({
                    name: c.key.replace(/^field:/, ""),
                    label: c.label,
                })),
        [availableColumns],
    );

    // Slug uniqueness check for live form validation — excludes the selected
    // graph itself so you're not flagged for matching your own slug.
    const slugCollision = useMemo(() => {
        if (!selected) return false;
        return config.graphs.some(
            (g) => g.id !== selected.id && g.slug === selected.slug,
        );
    }, [selected]);

    function updateGraphs(nextGraphs: SavedGraph[]) {
        setEntry((prev) => ({
            ...prev,
            config: { graphs: nextGraphs } as unknown as Record<
                string,
                unknown
            >,
        }));
    }

    function updateSelected(patch: Partial<SavedGraph>) {
        if (!selected) return;
        updateGraphs(
            config.graphs.map((g) =>
                g.id === selected.id ? { ...g, ...patch } : g,
            ),
        );
    }

    function handleNameChange(newName: string) {
        if (!selected) return;
        const manuallyEdited = slugManuallyEdited[selected.id] ?? false;
        updateSelected({
            name: newName,
            slug: manuallyEdited ? selected.slug : slugify(newName),
        });
    }

    function handleSlugChange(newSlug: string) {
        if (!selected) return;
        setSlugManuallyEdited((prev) => ({ ...prev, [selected.id]: true }));
        updateSelected({ slug: newSlug });
    }

    function handleAddGraph() {
        const fresh = defaultSavedGraph({
            name: "Untitled Graph",
            slug: `graph-${config.graphs.length + 1}`,
        });
        updateGraphs([...config.graphs, fresh]);
        setSelectedId(fresh.id);
    }

    function requestDeleteGraph() {
        if (!selected) return;
        setDeletingGraph(selected);
    }

    function confirmDeleteGraph() {
        if (!deletingGraph) return;
        const remaining = config.graphs.filter(
            (g) => g.id !== deletingGraph.id,
        );
        const nextEntry: BlueprintViewEntry = {
            ...entry,
            config: { graphs: remaining } as unknown as Record<string, unknown>,
        };
        updateGraphs(remaining);
        setSelectedId(remaining[0]?.id ?? null);
        setDeletingGraph(null);
        // Persist the deletion immediately so the page-level GraphView
        // updates without requiring a separate Save click.
        persistEntry(nextEntry);
    }

    function toggleEdgeBlueprint(slug: string) {
        if (!selected) return;
        const current = selected.edge_blueprint_slugs;
        updateSelected({
            edge_blueprint_slugs: current.includes(slug)
                ? current.filter((s) => s !== slug)
                : [...current, slug],
        });
    }

    function handleEnableToggle(checked: boolean) {
        setEntry((prev) => {
            const cfg = prev.config as unknown as GraphConfig;
            // Auto-seed a "Default" graph the first time the user enables a
            // blueprint that has never had one. Keeps the one-click enable
            // flow intact so the view is immediately interactable.
            if (checked && cfg.graphs.length === 0) {
                const seeded: GraphConfig = { graphs: [defaultSavedGraph()] };
                setSelectedId(seeded.graphs[0].id);
                return {
                    ...prev,
                    enabled: true,
                    config: seeded as unknown as Record<string, unknown>,
                };
            }
            return { ...prev, enabled: checked };
        });
    }

    function persistEntry(entryToSave: BlueprintViewEntry) {
        setSaving(true);
        saveBlueprintView(blueprint, project, "graph", entryToSave, {
            onSuccess: () => {
                setSaving(false);
                // Partial reload of the blueprint payload so the page-level
                // GraphView re-renders with the freshly-persisted graphs.
                // router.reload always preserves state + scroll (the
                // ReloadOptions type Omits both for that reason) — the
                // settings modal stays open at its current panel + scroll
                // offset, only blueprint props are refetched.
                router.reload({ only: ["blueprint"] });
            },
            onError: () => setSaving(false),
        });
    }

    function handleSave() {
        if (slugCollision) return;
        persistEntry(entry);
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden p-5">
                <div className="mb-4">
                    <SettingsActivationToggle
                        title={t("blueprints.settings.graph.title")}
                        description={t("blueprints.settings.graph.description")}
                        enabled={entry.enabled}
                        onChange={handleEnableToggle}
                    />
                </div>

                {entry.enabled && (
                    <div
                        className="flex gap-4"
                        style={{ height: "calc(100% - 6rem)" }}
                    >
                        {/* Left: graph list */}
                        <div
                            className="flex w-48 shrink-0 flex-col"
                            style={graphListShellStyle}
                        >
                            <div className="flex-1 overflow-y-auto py-2">
                                {config.graphs.map((g) => {
                                    const isActive = g.id === selectedId;
                                    return (
                                        <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => setSelectedId(g.id)}
                                            className="alex-row flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs"
                                            style={
                                                isActive
                                                    ? graphListItemActiveStyle
                                                    : graphListItemIdleStyle
                                            }
                                        >
                                            <i className="fa-solid fa-diagram-project w-4 text-center text-[10px]" />
                                            <span className="truncate">
                                                {g.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddGraph}
                                className="alex-row px-3 py-2 text-left text-xs"
                                style={newGraphBtnStyle}
                            >
                                <i className="fa-solid fa-plus mr-1.5 text-[10px]" />
                                {t("blueprints.settings.graph.new_graph")}
                            </button>
                        </div>

                        {/* Right: form for selected graph */}
                        <div
                            className="flex-1 overflow-y-auto p-4"
                            style={graphListShellStyle}
                        >
                            {!selected ? (
                                <p
                                    className="text-center text-xs"
                                    style={helperFainterStyle}
                                >
                                    {t(
                                        "blueprints.settings.graph.no_selection",
                                    )}
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label
                                            className="mb-1 block text-[11px] font-medium"
                                            style={labelStyle}
                                        >
                                            {t(
                                                "blueprints.settings.graph.name",
                                            )}
                                        </label>
                                        <input
                                            type="text"
                                            value={selected.name}
                                            onChange={(e) =>
                                                handleNameChange(e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className="mb-1 block text-[11px] font-medium"
                                            style={labelStyle}
                                        >
                                            {t(
                                                "blueprints.settings.graph.slug",
                                            )}
                                        </label>
                                        <input
                                            type="text"
                                            value={selected.slug}
                                            onChange={(e) =>
                                                handleSlugChange(e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2"
                                            style={
                                                slugCollision
                                                    ? slugErrorBorderStyle
                                                    : inputStyle
                                            }
                                        />
                                        {slugCollision && (
                                            <p
                                                className="mt-1 text-xs"
                                                style={errorTextStyle}
                                            >
                                                {t(
                                                    "blueprints.settings.graph.slug_collision",
                                                )}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            className="mb-1 block text-[11px] font-medium"
                                            style={labelStyle}
                                        >
                                            {t(
                                                "blueprints.settings.graph.edge_sources",
                                            )}{" "}
                                            <span style={requiredAsteriskStyle}>
                                                *
                                            </span>
                                        </label>
                                        {allRelationshipBlueprints.length ===
                                        0 ? (
                                            <p
                                                className="text-xs"
                                                style={warningTextStyle}
                                            >
                                                {t(
                                                    "blueprints.settings.graph.no_edge_sources",
                                                )}
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {allRelationshipBlueprints.map(
                                                    (bp) => (
                                                        <label
                                                            key={bp.slug}
                                                            className="alex-row flex cursor-pointer items-center gap-2.5 px-3 py-1.5"
                                                            style={
                                                                toggleCardStyle
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selected.edge_blueprint_slugs.includes(
                                                                    bp.slug,
                                                                )}
                                                                onChange={() =>
                                                                    toggleEdgeBlueprint(
                                                                        bp.slug,
                                                                    )
                                                                }
                                                                style={{
                                                                    accentColor:
                                                                        "var(--theme-brand-primary-500)",
                                                                }}
                                                            />
                                                            <span className="text-xs">
                                                                {bp.name}
                                                            </span>
                                                        </label>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            className="mb-1 block text-[11px] font-medium"
                                            style={labelStyle}
                                        >
                                            {t(
                                                "blueprints.settings.graph.color_by",
                                            )}
                                        </label>
                                        <select
                                            value={
                                                selected.color_by_field ?? ""
                                            }
                                            onChange={(e) =>
                                                updateSelected({
                                                    color_by_field:
                                                        e.target.value || null,
                                                })
                                            }
                                            className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                            style={selectStyle}
                                        >
                                            <option value="">
                                                {t(
                                                    "blueprints.settings.graph.color_by_none",
                                                )}
                                            </option>
                                            {colorByFields.map((f) => (
                                                <option
                                                    key={f.name}
                                                    value={f.name}
                                                >
                                                    {f.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={requestDeleteGraph}
                                            className="alex-btn alex-btn--ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
                                            style={{
                                                ...errorTextStyle,
                                                borderRadius:
                                                    "var(--theme-radius-button)",
                                            }}
                                        >
                                            <i className="fa-solid fa-trash text-[10px]" />
                                            {t(
                                                "blueprints.settings.graph.delete",
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div
                className="flex items-center justify-end gap-2 px-5 py-3"
                style={footerDividerStyle}
            >
                <ActionButton
                    icon="fa-solid fa-check"
                    label={t("common.save")}
                    onClick={handleSave}
                    loading={saving}
                    disabled={slugCollision}
                />
            </div>

            <ConfirmModal
                open={deletingGraph !== null}
                onClose={() => setDeletingGraph(null)}
                onConfirm={confirmDeleteGraph}
                title={t("blueprints.settings.graph.delete_modal.title")}
                message={
                    <>
                        {t(
                            "blueprints.settings.graph.delete_modal.body_prefix",
                        )}
                        <span className="font-semibold">
                            "{deletingGraph?.name}"
                        </span>
                        {t(
                            "blueprints.settings.graph.delete_modal.body_suffix",
                        )}
                    </>
                }
                confirmLabel={t("common.delete")}
                variant="danger"
                loading={saving}
            />
        </div>
    );
}
