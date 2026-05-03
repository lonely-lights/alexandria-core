export type GraphLayout = 'cose' | 'concentric' | 'circle' | 'breadthfirst';

/**
 * One saved named graph within a blueprint's graph view config.
 * Phase 2a allows multiple; Phase 1 had exactly one (implicit).
 */
export interface SavedGraph {
    id: string;                       // ULID, stable identity for React keys
    slug: string;                     // URL-friendly, unique within this config
    name: string;
    edge_blueprint_slugs: string[];
    color_by_field: string | null;
    max_nodes: number;
    layout: GraphLayout;
}

/**
 * The root config stored in blueprints.views[type=graph].config.
 */
export interface GraphConfig {
    graphs: SavedGraph[];
}

export function defaultGraphConfig(): GraphConfig {
    return { graphs: [] };
}

export function defaultSavedGraph(overrides: Partial<SavedGraph> = {}): SavedGraph {
    return {
        id: crypto.randomUUID(),   // sufficient for Phase 2a; can swap to ULID later
        slug: 'default',
        name: 'Default',
        edge_blueprint_slugs: [],
        color_by_field: null,
        max_nodes: 500,
        layout: 'cose',
        ...overrides,
    };
}

/**
 * Response shape from GET /api/v1/projects/{project}/blueprints/{blueprint}/graph.
 * Identical to Phase 1 — per-graph query params generate this, not per-blueprint.
 */
export interface GraphNodeData {
    id: number;
    name: string;
    slug: string;
    url: string;
    icon: string | null;
    is_stub: boolean;
    color_group_key: string | null;
    color_group_label: string | null;
}

export interface GraphEdgeData {
    id: string;
    source: number;
    target: number;
    /** Slug of the relationship blueprint that defines this edge's "shape"
        (e.g. "character-relationship"). All edges of one relationship
        blueprint share this. */
    blueprint_slug: string;
    /** Bidirectional labels from entry_relationships. */
    parent_label: string | null;
    child_label: string | null;
    /** Whether to render the edge as a single arrow (parent → child) or as
        two arrows (mutually-meaningful relationship). Derived backend-side
        from label presence: both labels set → bidirectional. */
    directionality: 'directional' | 'bidirectional';
    /** Stable key used for color grouping + legend (derived on the backend
        from child_label || parent_label || blueprint_slug). Distinct kinds
        within the same relationship blueprint — e.g. "Wife" vs "Creator" —
        get distinct colors. */
    kind_key: string;
    label: string | null;
}

export interface GraphColorGroup {
    key: string;
    label: string;
    count: number;
}

export interface GraphResponse {
    nodes: GraphNodeData[];
    edges: GraphEdgeData[];
    color_groups: GraphColorGroup[];
    total_nodes: number;
    capped: boolean;
}
