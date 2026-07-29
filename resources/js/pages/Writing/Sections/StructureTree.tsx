import { router } from '@inertiajs/react';
import { useState, type CSSProperties } from 'react';

import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT, { type Translator } from '@alexandria/hooks/useT';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';

import type { WorkRow } from './WorkCard';
import LinkWorkModal from './LinkWorkModal';

/**
 * StructureTree — compendium-structure-tab (Task 10).
 *
 * Read-only recursive tree of the project's linked structure blueprint
 * (a Compendium tree of entries), rendered on the writing index's
 * "Structure" tab. Each node shows whichever work is canonically
 * linked to it (`works.entry_id`) or, when the viewer can edit works,
 * a hover-revealed "+ Link work" affordance that opens `LinkWorkModal`.
 *
 * No entry management here (no reorder/add/archive) — the blueprint
 * page keeps that job; this is "see the structure and link works to
 * it," nothing more. Mutations PUT `.../entry-link` (Task 6) and
 * reload the `structure` + `works` deferred props so both surfaces
 * (this tree and the Works tab) reflect the change.
 */

export interface StructureNode {
    id: number;
    name: string;
    slug: string;
    work: { id: number; title: string; slug: string } | null;
    children: StructureNode[];
}

export interface StructurePayload {
    blueprint: { id: number; name: string; slug: string; icon: string | null };
    tree: StructureNode[];
}

interface StructureTreeProps {
    project: { id: number; slug: string };
    structure: StructurePayload;
    works: WorkRow[];
    /** Coarse work-edit proxy — see the per-work gate comment in Index.tsx. */
    canLink: boolean;
}

/* ── Theme styles ── */

const treeCardStyle: CSSProperties = {
    background: 'var(--theme-surface-card)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const emptyStateStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const errorBannerStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-status-error-stroke, #dc2626) 12%, transparent)',
    color: 'var(--theme-status-error-stroke, #dc2626)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-status-error-stroke, #dc2626) 25%, transparent)',
};

const chevronStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const leafDotStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
};

const entryLinkStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
    textDecoration: 'none',
};

const workChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
};

const unlinkButtonStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

/** Every depth-0 and depth-1 node id that has children — the default-open set. */
function seedExpandedIds(nodes: StructureNode[], depth: number, into: Set<number>): void {
    for (const node of nodes) {
        if (node.children.length === 0) {
            continue;
        }
        into.add(node.id);
        if (depth < 1) {
            seedExpandedIds(node.children, depth + 1, into);
        }
    }
}

export default function StructureTree({ project, structure, works, canLink }: StructureTreeProps) {
    const t = useT();
    const expandedStorageKey = `alexandria.writing.structure-expanded:${project.id}`;
    const isCoarsePointer = useMediaQuery('(pointer: coarse)');

    const [expanded, setExpanded] = useState<Set<number>>(() => {
        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem(expandedStorageKey);
            if (stored !== null) {
                try {
                    const ids = JSON.parse(stored) as number[];
                    return new Set(ids);
                } catch {
                    // fall through to the default seed
                }
            }
        }
        const seeded = new Set<number>();
        seedExpandedIds(structure.tree, 0, seeded);
        return seeded;
    });
    const [error, setError] = useState<string | null>(null);
    const [linkTarget, setLinkTarget] = useState<StructureNode | null>(null);
    const [confirmingUnlink, setConfirmingUnlink] = useState<number | null>(null);

    function toggle(id: number) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(expandedStorageKey, JSON.stringify([...next]));
            }
            return next;
        });
    }

    async function setEntryLink(workSlug: string, entryId: number | null) {
        setError(null);
        const res = await fetch(`/works/${project.slug}/${workSlug}/entry-link`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...csrfHeaders() },
            body: JSON.stringify({ entry_id: entryId }),
        });
        if (res.ok) {
            router.reload({ only: ['structure', 'works'] });
        } else {
            const data = await res.json().catch(() => null);
            setError(data?.errors?.entry_id?.[0] ?? data?.message ?? t('writing.structure.link_failed'));
        }
    }

    const shared: TreeShared = {
        project,
        blueprintSlug: structure.blueprint.slug,
        canLink,
        expanded,
        isCoarsePointer,
        confirmingUnlink,
        onToggle: toggle,
        onRequestLink: setLinkTarget,
        onRequestUnlink: (node) => setConfirmingUnlink(node.id),
        onConfirmUnlink: (node) => {
            setConfirmingUnlink(null);
            if (node.work !== null) {
                void setEntryLink(node.work.slug, null);
            }
        },
        onCancelUnlink: () => setConfirmingUnlink(null),
        t,
    };

    return (
        <div style={treeCardStyle}>
            {error !== null && (
                <div className="px-4 py-2 text-sm" style={errorBannerStyle}>
                    {error}
                </div>
            )}

            {structure.tree.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm italic" style={emptyStateStyle}>
                    {t('writing.structure.empty')}
                </div>
            ) : (
                <div className="flex flex-col gap-0.5 p-2">
                    {structure.tree.map((node) => (
                        <StructureNodeRow key={node.id} node={node} depth={0} shared={shared} />
                    ))}
                </div>
            )}

            {linkTarget !== null && (
                <LinkWorkModal
                    node={linkTarget}
                    works={works}
                    onPick={(workSlug) => {
                        void setEntryLink(workSlug, linkTarget.id);
                        setLinkTarget(null);
                    }}
                    onClose={() => setLinkTarget(null)}
                />
            )}
        </div>
    );
}

/** Props shared by every row in the tree, threaded through recursion. */
interface TreeShared {
    project: { id: number; slug: string };
    blueprintSlug: string;
    canLink: boolean;
    expanded: Set<number>;
    isCoarsePointer: boolean;
    /** Node id currently showing the inline unlink confirm, if any. */
    confirmingUnlink: number | null;
    onToggle: (id: number) => void;
    onRequestLink: (node: StructureNode) => void;
    onRequestUnlink: (node: StructureNode) => void;
    onConfirmUnlink: (node: StructureNode) => void;
    onCancelUnlink: () => void;
    t: Translator;
}

function StructureNodeRow({ node, depth, shared }: { node: StructureNode; depth: number; shared: TreeShared }) {
    const {
        project,
        blueprintSlug,
        canLink,
        expanded,
        isCoarsePointer,
        confirmingUnlink,
        onToggle,
        onRequestLink,
        onRequestUnlink,
        onConfirmUnlink,
        onCancelUnlink,
        t,
    } = shared;

    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isConfirmingUnlink = confirmingUnlink === node.id;

    return (
        <div className="flex flex-col gap-0.5">
            <div
                className="alex-row group flex items-center gap-1 py-1 pr-2 text-sm"
                style={{
                    paddingLeft: `${depth * 18 + 8}px`,
                    borderRadius: 'var(--theme-radius-button)',
                }}
            >
                {/* Expand/collapse chevron (leaf nodes render a dot) */}
                <button
                    type="button"
                    className="flex h-5 w-5 shrink-0 items-center justify-center"
                    onClick={() => hasChildren && onToggle(node.id)}
                    tabIndex={hasChildren ? 0 : -1}
                    aria-hidden={!hasChildren}
                >
                    {hasChildren ? (
                        <i
                            className={`fa-solid fa-chevron-right text-[9px] transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                            style={chevronStyle}
                        />
                    ) : (
                        <span className="h-1 w-1 rounded-full" style={leafDotStyle} />
                    )}
                </button>

                <a
                    href={`/p/${project.slug}/${blueprintSlug}/${node.slug}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                    style={entryLinkStyle}
                >
                    {node.name}
                </a>

                {node.work !== null ? (
                    <span className="flex shrink-0 items-center gap-1">
                        <a href={`/works/${project.slug}/${node.work.slug}`} style={workChipStyle}>
                            <i className="fa-solid fa-feather mr-1" aria-hidden="true" />
                            {node.work.title}
                        </a>
                        {canLink && (
                            isConfirmingUnlink ? (
                                <button
                                    type="button"
                                    className="alex-btn alex-btn--ghost px-1.5 py-0.5 text-[11px]"
                                    onClick={() => onConfirmUnlink(node)}
                                    onBlur={onCancelUnlink}
                                >
                                    {t('writing.structure.unlink_confirm')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="flex h-5 w-5 items-center justify-center"
                                    style={unlinkButtonStyle}
                                    title={t('writing.structure.unlink')}
                                    aria-label={t('writing.structure.unlink')}
                                    onClick={() => onRequestUnlink(node)}
                                >
                                    <i className="fa-solid fa-xmark text-[10px]" aria-hidden="true" />
                                </button>
                            )
                        )}
                    </span>
                ) : (
                    canLink && (
                        <button
                            type="button"
                            className={`alex-btn alex-btn--ghost shrink-0 px-2 py-0.5 text-[11px] transition-opacity focus:opacity-100 ${
                                isCoarsePointer ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={() => onRequestLink(node)}
                        >
                            <i className="fa-solid fa-plus mr-1" aria-hidden="true" />
                            {t('writing.structure.link_work')}
                        </button>
                    )
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="flex flex-col gap-0.5">
                    {node.children.map((child) => (
                        <StructureNodeRow key={child.id} node={child} depth={depth + 1} shared={shared} />
                    ))}
                </div>
            )}
        </div>
    );
}
