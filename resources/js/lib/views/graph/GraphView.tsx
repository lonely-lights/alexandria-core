import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { useBlueprintSettingsModal } from '@alexandria/lib/views/useBlueprintSettingsModal';
import type { GraphConfig, GraphResponse, GraphNodeData, SavedGraph } from './types';
import GraphCanvas from './GraphCanvas';
import GraphLegend from './GraphLegend';
import GraphSidebar from './GraphSidebar';
import { migrateGraphConfig } from './migrateGraphConfig';

interface GraphViewProps {
    projectId: number;
    blueprintId: number;
    config: GraphConfig;
    onOpenSettings: () => void;
}

function readHashSlug(): string | null {
    if (typeof window === 'undefined') return null;
    const match = window.location.hash.match(/graph=([a-z0-9-]+)/i);
    return match ? match[1] : null;
}

function writeHashSlug(slug: string) {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.hash = `graph=${slug}`;
    window.history.replaceState({}, '', url.toString());
}

export default function GraphView({ projectId, blueprintId, config, onOpenSettings }: GraphViewProps) {
    const { modal: settingsModal, availableColumns } = useBlueprintSettingsModal('graph');

    // Belt-and-suspenders guard: if the payload is still Phase 1 shape for
    // some reason (stale dev data, etc.), normalize it. Backend is now the
    // canonical source of Phase 2a shape.
    const safeConfig = useMemo(() => migrateGraphConfig(config), [config]);
    const graphs = safeConfig.graphs;

    const [activeId, setActiveId] = useState<string | null>(() => {
        const hashSlug = readHashSlug();
        const match = hashSlug ? graphs.find((g) => g.slug === hashSlug) : null;
        return match?.id ?? graphs[0]?.id ?? null;
    });

    const active: SavedGraph | null = useMemo(
        () => graphs.find((g) => g.id === activeId) ?? graphs[0] ?? null,
        [graphs, activeId],
    );

    // Keep URL hash in sync with active graph (replaceState — no history spam).
    useEffect(() => {
        if (active) writeHashSlug(active.slug);
    }, [active]);

    // If the saved graphs list changes (e.g. user deleted the active graph
    // in settings), align activeId state with whichever graph the `active`
    // memo fell back to — keeps the sidebar highlight consistent and
    // prevents stale ids from sticking around.
    useEffect(() => {
        if (active && active.id !== activeId) {
            setActiveId(active.id);
        }
    }, [active, activeId]);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<GraphResponse | null>(null);

    const fetchGraph = useCallback(async () => {
        if (!active) {
            setLoading(false);
            return;
        }
        if (active.edge_blueprint_slugs.length === 0) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams();
            active.edge_blueprint_slugs.forEach((s) => params.append('edge_blueprint_slugs[]', s));
            if (active.color_by_field) params.set('color_by_field', active.color_by_field);
            params.set('max_nodes', String(active.max_nodes));

            const res = await fetch(
                `/api/v1/projects/${projectId}/blueprints/${blueprintId}/graph?${params}`,
                {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                },
            );
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }, [projectId, blueprintId, active]);

    useEffect(() => {
        void fetchGraph();
    }, [fetchGraph]);

    function handleNodeClick(node: GraphNodeData) {
        router.visit(node.url);
    }

    // No graphs saved — empty-state CTA pointing users to settings.
    if (graphs.length === 0) {
        return (
            <>
                <div className="paper-board rounded-2xl border border-base-content/10">
                    <div className="flex flex-col items-center bg-base-200 py-16 text-center" style={{ borderRadius: 'inherit' }}>
                        <i className="fa-solid fa-diagram-project mb-3 text-3xl text-base-content/20" />
                        <p className="text-sm font-medium text-base-content/50">No graphs configured yet</p>
                        <p className="mt-1 max-w-sm text-xs text-base-content/40">
                            Create your first graph in Blueprint Settings → Graph.
                        </p>
                        <button type="button" onClick={onOpenSettings} className="btn btn-primary btn-sm mt-4 gap-1.5 rounded-xl">
                            <i className="fa-solid fa-sliders text-xs" /> Configure Graphs
                        </button>
                    </div>
                </div>
                {settingsModal}
            </>
        );
    }

    // Selected graph has no edge blueprints — scoped CTA.
    if (active && active.edge_blueprint_slugs.length === 0) {
        return (
            <>
                <div className="flex gap-4">
                    <GraphSidebar graphs={graphs} activeId={active.id} onSelect={setActiveId} />
                    <div className="paper-board flex-1 rounded-2xl border border-base-content/10">
                        <div className="flex flex-col items-center bg-base-200 py-16 text-center" style={{ borderRadius: 'inherit' }}>
                            <p className="text-sm font-medium text-base-content/50">"{active.name}" has no edges yet</p>
                            <p className="mt-1 max-w-sm text-xs text-base-content/40">
                                Pick at least one relationship blueprint for this graph.
                            </p>
                            <button type="button" onClick={onOpenSettings} className="btn btn-primary btn-sm mt-4 gap-1.5 rounded-xl">
                                <i className="fa-solid fa-sliders text-xs" /> Edit "{active.name}"
                            </button>
                        </div>
                    </div>
                </div>
                {settingsModal}
            </>
        );
    }

    if (loading && !data) {
        return (
            <>
                <div className="flex items-center justify-center py-16">
                    <span className="loading loading-spinner loading-lg text-base-content/20" />
                </div>
                {settingsModal}
            </>
        );
    }

    if (!active || !data || data.nodes.length === 0) {
        return (
            <>
                <div className="flex gap-4">
                    <GraphSidebar graphs={graphs} activeId={active?.id ?? null} onSelect={setActiveId} />
                    <div className="paper-board flex-1 rounded-2xl border border-base-content/10">
                        <div className="bg-base-200 py-12 text-center" style={{ borderRadius: 'inherit' }}>
                            <p className="text-sm text-base-content/40">No entries to render.</p>
                        </div>
                    </div>
                </div>
                {settingsModal}
            </>
        );
    }

    const colorByLabel =
        (active.color_by_field
            && availableColumns.find((c) => c.key === `field:${active.color_by_field}`)?.label)
        ?? active.color_by_field
        ?? '';

    // Edge color groups — keyed by `kind_key` (the bidirectional label like
    // "Wife", "Creator") rather than the relationship blueprint slug, so
    // distinct kinds within the same blueprint get distinct colors. Same
    // colorForGroup() seed used in GraphCanvas keeps swatch + edge in sync.
    const edgeColorGroups = (() => {
        const counts = new Map<string, number>();
        for (const e of data.edges) {
            if (!e.kind_key) continue;
            counts.set(e.kind_key, (counts.get(e.kind_key) ?? 0) + 1);
        }
        return Array.from(counts.entries()).map(([key, count]) => ({
            key,
            label: key,
            count,
        }));
    })();

    return (
        <>
            <div className="flex gap-4" style={{ height: 'calc(100vh - 14rem)' }}>
                <GraphSidebar graphs={graphs} activeId={active.id} onSelect={setActiveId} />
                <div className="flex flex-1 flex-col gap-3 overflow-hidden">
                    {data.capped && (
                        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning">
                            <i className="fa-solid fa-triangle-exclamation mr-1" />
                            Showing {data.nodes.length} of {data.total_nodes} entries (capped at {active.max_nodes}).
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                        {edgeColorGroups.length > 0 && (
                            <GraphLegend
                                groups={edgeColorGroups}
                                title="Relationships"
                                swatchShape="bar"
                            />
                        )}
                        {active.color_by_field && (
                            <GraphLegend
                                groups={data.color_groups ?? []}
                                fieldLabel={colorByLabel}
                                alwaysShow
                                emptyHint="No entries have a value for this field yet."
                            />
                        )}
                    </div>
                    <div className="paper-board flex-1 overflow-hidden rounded-2xl border border-base-content/10">
                        <div className="h-full overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                            <GraphCanvas
                                nodes={data.nodes}
                                edges={data.edges}
                                layout={active.layout}
                                onNodeClick={handleNodeClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {settingsModal}
        </>
    );
}
