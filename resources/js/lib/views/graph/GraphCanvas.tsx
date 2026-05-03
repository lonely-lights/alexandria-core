import { useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';

// @ts-expect-error — no type declarations
import fcose from 'cytoscape-fcose';
import type { Core, ElementDefinition, EventObject, LayoutOptions, StylesheetJsonBlock } from 'cytoscape';
import type { GraphLayout, GraphEdgeData, GraphNodeData } from './types';
import { colorForGroup, UNGROUPED_COLOR } from './palette';

// Register fcose once per module load. Cytoscape's built-in `cose` is poor
// with disconnected components — fcose from the Bilkent team packs them
// efficiently and uses the full viewport aspect ratio.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
cytoscape.use(fcose as any);

/**
 * Layout-specific tuning. Defaults for Cytoscape's built-in layouts produce
 * cramped results on dense graphs — these overrides give nodes more breathing
 * room and converge to readable arrangements in fewer iterations.
 *
 * See: https://js.cytoscape.org/#layouts
 */
function layoutOptionsFor(name: GraphLayout): Record<string, unknown> {
    const common = {
        animate: 'end' as const,   // render only final positions — avoids jitter during simulation
        animationDuration: 400,
        fit: true,
        padding: 40,
    };

    switch (name) {
        case 'cose':
            // Transparently upgrade 'cose' to 'fcose' — the Bilkent team's
            // newer force layout handles disconnected components much
            // better and uses the viewport aspect ratio instead of stacking
            // orphans into a narrow column.
            return {
                ...common,
                name: 'fcose',
                quality: 'default',
                randomize: true,
                nodeSeparation: 120,
                idealEdgeLength: 100,
                nodeRepulsion: 8000,
                edgeElasticity: 0.45,
                gravity: 0.25,
                gravityRange: 3.8,
                gravityCompound: 1.0,
                gravityRangeCompound: 1.5,
                packComponents: true,       // pack disconnected components with circle-packing
                tile: true,                 // tile orphaned nodes into a grid near the layout bbox
                tilingPaddingVertical: 40,  // space tiled-orphan rows apart so labels don't collide
                tilingPaddingHorizontal: 40,
            };
        case 'concentric':
            return { ...common, name, minNodeSpacing: 40, spacingFactor: 1.2, avoidOverlap: true };
        case 'breadthfirst':
            return { ...common, name, spacingFactor: 1.4, directed: true, avoidOverlap: true };
        case 'circle':
            return { ...common, name, spacingFactor: 1.4, avoidOverlap: true };
        default:
            return { ...common, name };
    }
}

interface GraphCanvasProps {
    nodes: GraphNodeData[];
    edges: GraphEdgeData[];
    layout: GraphLayout;
    /** Click a node → navigate to its entry page. */
    onNodeClick?: (node: GraphNodeData) => void;
}

/**
 * Cytoscape-backed rendering surface. Styling lives inline here since
 * the palette + opacity rules are graph-specific and small.
 */
export default function GraphCanvas({ nodes, edges, layout, onNodeClick }: GraphCanvasProps) {
    const elements = useMemo<ElementDefinition[]>(() => {
        const els: ElementDefinition[] = [];
        for (const n of nodes) {
            els.push({
                data: {
                    id: String(n.id),
                    label: n.name,
                    color: n.color_group_key ? colorForGroup(n.color_group_key) : UNGROUPED_COLOR,
                    isStub: n.is_stub,
                    node: n,
                },
            });
        }
        for (const e of edges) {
            els.push({
                data: {
                    id: e.id,
                    source: String(e.source),
                    target: String(e.target),
                    label: e.label ?? '',
                    // Edge color derived deterministically from the kind_key
                    // (typically the bidirectional label like "Wife", "Creator")
                    // so distinct relationship kinds within the same blueprint
                    // get distinct colors. Legend in GraphView mirrors this.
                    color: e.kind_key ? colorForGroup(e.kind_key) : '#475569',
                    // 'bidirectional' edges render with arrows on both ends.
                    // Selector below uses [bidirectional = 'true'] to match.
                    bidirectional: e.directionality === 'bidirectional' ? 'true' : 'false',
                },
            });
        }

        return els;
    }, [nodes, edges]);

    const stylesheet = useMemo(
        () => [
            {
                selector: 'node',
                style: {
                    'background-color': 'data(color)',
                    label: 'data(label)',
                    color: '#e2e8f0', // slate-200 — readable on dark + ok on light
                    'font-size': '9px',
                    'text-outline-width': 2,
                    'text-outline-color': '#0f172a',
                    'text-valign': 'bottom',
                    'text-margin-y': 4,
                    'text-max-width': 80,   // clamp long names so they don't collide
                    'text-wrap': 'ellipsis',
                    'text-overflow-wrap': 'anywhere',
                    width: 22,
                    height: 22,
                    'border-width': 2,
                    'border-color': '#0f172a',
                },
            },
            {
                selector: 'node[?isStub]',
                style: {
                    opacity: 0.45,
                    'border-style': 'dashed',
                },
            },
            {
                selector: 'edge',
                style: {
                    width: 2,
                    'line-color': 'data(color)',
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': 'data(color)',
                    'arrow-scale': 1,
                },
            },
            {
                // Mutually-meaningful relationships (Wife/Spouse, Friend/Friend,
                // etc.) get a source-arrow as well, so the visual makes the
                // bidirectionality obvious.
                selector: "edge[bidirectional = 'true']",
                style: {
                    'source-arrow-shape': 'triangle',
                    'source-arrow-color': 'data(color)',
                },
            },
            {
                selector: 'node:selected',
                style: {
                    'border-color': '#facc15', // yellow-400
                    'border-width': 3,
                },
            },
        ],
        [],
    );

    const layoutOptions = useMemo(() => layoutOptionsFor(layout), [layout]);

    return (
        <CytoscapeComponent
            elements={elements}
            // Fill the parent container — height is owned by GraphView's
            // sized wrapper so the canvas adapts to viewport height.
            style={{ width: '100%', height: '100%' }}
            layout={layoutOptions as unknown as LayoutOptions}
            stylesheet={stylesheet as StylesheetJsonBlock[]}
            // Keep Cytoscape's default wheel sensitivity — overriding it
            // produces inconsistent behavior across mice + OSes (Cytoscape
            // emits a console warning when you do, which is a tell).
            // Zoom bounds are still ours: prevents accidental zoom-to-nothing.
            minZoom={0.2}
            maxZoom={3}
            cy={(cy: Core) => {
                cy.removeListener('tap', 'node');
                cy.on('tap', 'node', (evt: EventObject) => {
                    const n = evt.target.data('node') as GraphNodeData | undefined;
                    if (n && onNodeClick) onNodeClick(n);
                });
            }}
        />
    );
}
