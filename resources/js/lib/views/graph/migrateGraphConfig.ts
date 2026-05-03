import type { GraphConfig, SavedGraph } from './types';

/**
 * Frontend guard that accepts either the Phase 1 flat GraphConfig shape
 * (edge_blueprint_slugs as a top-level key) or the Phase 2a multi shape
 * (graphs as an array), and always returns a Phase 2a config.
 *
 * The canonical source of truth is the Laravel migration that runs in
 * production — this helper is belt-and-suspenders for any edge case
 * (blueprints created in-flight during deploy, manually-edited JSON,
 * etc.) and must never throw.
 */
export function migrateGraphConfig(raw: unknown): GraphConfig {
    if (!raw || typeof raw !== 'object') {
        return { graphs: [] };
    }

    const obj = raw as Record<string, unknown>;

    // Already Phase 2a: has graphs array.
    if (Array.isArray(obj.graphs)) {
        return { graphs: obj.graphs as SavedGraph[] };
    }

    // Phase 1: has edge_blueprint_slugs as top-level key.
    if (Array.isArray(obj.edge_blueprint_slugs)) {
        return {
            graphs: [
                {
                    id: crypto.randomUUID(),
                    slug: 'default',
                    name: 'Default',
                    edge_blueprint_slugs: obj.edge_blueprint_slugs as string[],
                    color_by_field: (obj.color_by_field as string | null) ?? null,
                    max_nodes: typeof obj.max_nodes === 'number' ? obj.max_nodes : 500,
                    layout: (obj.layout as SavedGraph['layout']) ?? 'cose',
                },
            ],
        };
    }

    // Anything else — return safe empty shape.
    return { graphs: [] };
}
