import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import ActionButton from '@alexandria/components/ui/ActionButton';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';
import type { AvailableColumn, BlueprintDetail, SiblingBlueprint } from '@alexandria/types/blueprints';
import type { BlueprintViewEntry } from '@alexandria/lib/views/types';
import { saveBlueprintView } from '@alexandria/lib/views/saveBlueprintView';
import type { GraphConfig, SavedGraph } from '@alexandria/lib/views/graph/types';
import { defaultGraphConfig, defaultSavedGraph } from '@alexandria/lib/views/graph/types';
import { migrateGraphConfig } from '@alexandria/lib/views/graph/migrateGraphConfig';

interface GraphPanelProps {
    blueprint: BlueprintDetail;
    project: { slug: string };
    availableColumns: AvailableColumn[];
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'graph';
}

export default function GraphPanel({
    blueprint,
    project,
    availableColumns,
    relationshipBlueprints,
    referencingRelationshipBlueprints,
}: GraphPanelProps) {
    const existingEntry = (blueprint.views ?? []).find((v) => v.type === 'graph') ?? null;
    const initialConfig = existingEntry
        ? migrateGraphConfig(existingEntry.config)
        : defaultGraphConfig();

    const [entry, setEntry] = useState<BlueprintViewEntry>(() => (
        existingEntry
            ? { ...existingEntry, config: initialConfig as unknown as Record<string, unknown> }
            : {
                type: 'graph',
                enabled: false,
                config: initialConfig as unknown as Record<string, unknown>,
                sort_order: (blueprint.views ?? []).length,
            }
    ));

    const config = entry.config as unknown as GraphConfig;
    const [selectedId, setSelectedId] = useState<string | null>(config.graphs[0]?.id ?? null);
    const [saving, setSaving] = useState(false);
    // Per-graph flag: once the user manually edits a slug, name changes no
    // longer auto-regenerate it for that graph.
    const [slugManuallyEdited, setSlugManuallyEdited] = useState<Record<string, boolean>>({});
    // Graph the user is asking to delete; null when no confirmation pending.
    const [deletingGraph, setDeletingGraph] = useState<SavedGraph | null>(null);

    const selected = useMemo(
        () => config.graphs.find((g) => g.id === selectedId) ?? null,
        [selectedId],
    );

    const allRelationshipBlueprints = useMemo(
        () => [
            ...new Map(
                [...relationshipBlueprints, ...referencingRelationshipBlueprints].map((bp) => [bp.slug, bp]),
            ).values(),
        ],
        [relationshipBlueprints, referencingRelationshipBlueprints],
    );

    const colorByFields = useMemo(
        () => availableColumns
            .filter(
                (c) =>
                    c.type === 'field'
                    && ['text', 'integer', 'boolean', 'entry reference'].includes(
                        c.field_type?.toLowerCase() ?? '',
                    ),
            )
            .map((c) => ({ name: c.key.replace(/^field:/, ''), label: c.label })),
        [availableColumns],
    );

    // Slug uniqueness check for live form validation — excludes the selected
    // graph itself so you're not flagged for matching your own slug.
    const slugCollision = useMemo(() => {
        if (!selected) return false;
        return config.graphs.some((g) => g.id !== selected.id && g.slug === selected.slug);
    }, [selected]);

    function updateGraphs(nextGraphs: SavedGraph[]) {
        setEntry((prev) => ({
            ...prev,
            config: { graphs: nextGraphs } as unknown as Record<string, unknown>,
        }));
    }

    function updateSelected(patch: Partial<SavedGraph>) {
        if (!selected) return;
        updateGraphs(config.graphs.map((g) => (g.id === selected.id ? { ...g, ...patch } : g)));
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
            name: 'Untitled Graph',
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
        const remaining = config.graphs.filter((g) => g.id !== deletingGraph.id);
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
                return { ...prev, enabled: true, config: seeded as unknown as Record<string, unknown> };
            }
            return { ...prev, enabled: checked };
        });
    }

    function persistEntry(entryToSave: BlueprintViewEntry) {
        setSaving(true);
        saveBlueprintView(blueprint, project, 'graph', entryToSave, {
            onSuccess: () => {
                setSaving(false);
                // Partial reload of the blueprint payload so the page-level
                // GraphView re-renders with the freshly-persisted graphs.
                // router.reload always preserves state + scroll (the
                // ReloadOptions type Omits both for that reason) — the
                // settings modal stays open at its current panel + scroll
                // offset, only blueprint props are refetched.
                router.reload({ only: ['blueprint'] });
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
                <label className="mb-4 flex cursor-pointer items-center justify-between rounded-xl border border-base-content/10 bg-base-100 p-4 transition-colors hover:bg-base-200/50">
                    <div>
                        <p className="text-sm font-medium">Graph View</p>
                        <p className="mt-0.5 text-xs text-base-content/50">
                            Save multiple named graphs (e.g. "Family Tree", "Alliances").
                            Viewers switch between them on the blueprint's page.
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={entry.enabled}
                        onChange={(e) => handleEnableToggle(e.target.checked)}
                    />
                </label>

                {entry.enabled && (
                    <div className="flex gap-4" style={{ height: 'calc(100% - 6rem)' }}>
                        {/* Left: graph list */}
                        <div className="flex w-48 shrink-0 flex-col rounded-xl border border-base-content/10 bg-base-100">
                            <div className="flex-1 overflow-y-auto py-2">
                                {config.graphs.map((g) => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setSelectedId(g.id)}
                                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                                            g.id === selectedId
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-base-content/70 hover:bg-base-content/5'
                                        }`}
                                    >
                                        <i className="fa-solid fa-diagram-project w-4 text-center text-[10px]" />
                                        <span className="truncate">{g.name}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddGraph}
                                className="border-t border-base-content/10 px-3 py-2 text-left text-xs text-primary hover:bg-base-content/5"
                            >
                                <i className="fa-solid fa-plus mr-1.5 text-[10px]" />
                                New graph
                            </button>
                        </div>

                        {/* Right: form for selected graph */}
                        <div className="flex-1 overflow-y-auto rounded-xl border border-base-content/10 bg-base-100 p-4">
                            {!selected ? (
                                <p className="text-center text-xs text-base-content/40">
                                    Select a graph to edit, or create a new one.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-[11px] font-medium text-base-content/70">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={selected.name}
                                            onChange={(e) => handleNameChange(e.target.value)}
                                            className="input input-bordered input-sm w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-[11px] font-medium text-base-content/70">
                                            Slug
                                        </label>
                                        <input
                                            type="text"
                                            value={selected.slug}
                                            onChange={(e) => handleSlugChange(e.target.value)}
                                            className={`input input-bordered input-sm w-full font-mono ${slugCollision ? 'input-error' : ''}`}
                                        />
                                        {slugCollision && (
                                            <p className="mt-1 text-xs text-error">
                                                Slug already used by another graph.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-[11px] font-medium text-base-content/70">
                                            Edge sources <span className="text-error">*</span>
                                        </label>
                                        {allRelationshipBlueprints.length === 0 ? (
                                            <p className="text-xs text-warning">
                                                No relationship blueprints reference this one.
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {allRelationshipBlueprints.map((bp) => (
                                                    <label
                                                        key={bp.slug}
                                                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-base-content/10 bg-base-100 px-3 py-1.5 transition-colors hover:bg-base-200/50"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-xs checkbox-primary"
                                                            checked={selected.edge_blueprint_slugs.includes(bp.slug)}
                                                            onChange={() => toggleEdgeBlueprint(bp.slug)}
                                                        />
                                                        <span className="text-xs">{bp.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-[11px] font-medium text-base-content/70">
                                            Color nodes by
                                        </label>
                                        <select
                                            value={selected.color_by_field ?? ''}
                                            onChange={(e) => updateSelected({ color_by_field: e.target.value || null })}
                                            className="select select-bordered select-sm w-full"
                                        >
                                            <option value="">None (single color)</option>
                                            {colorByFields.map((f) => (
                                                <option key={f.name} value={f.name}>
                                                    {f.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={requestDeleteGraph}
                                            className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                        >
                                            <i className="fa-solid fa-trash text-[10px]" />
                                            Delete this graph
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-base-content/10 px-5 py-3">
                <ActionButton
                    icon="fa-solid fa-check"
                    label="Save"
                    onClick={handleSave}
                    loading={saving}
                    disabled={slugCollision}
                />
            </div>

            <ConfirmModal
                open={deletingGraph !== null}
                onClose={() => setDeletingGraph(null)}
                onConfirm={confirmDeleteGraph}
                title="Delete graph?"
                message={
                    <>
                        Delete <span className="font-semibold">"{deletingGraph?.name}"</span>?
                        This removes the graph from the blueprint and cannot be undone.
                    </>
                }
                confirmLabel="Delete"
                variant="danger"
                loading={saving}
            />
        </div>
    );
}
