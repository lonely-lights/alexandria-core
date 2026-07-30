import { router } from "@inertiajs/react";
import { useState } from "react";
import type { CSSProperties } from "react";

import useMediaQuery from "@alexandria/hooks/useMediaQuery";
import useT from "@alexandria/hooks/useT";
import type { Translator } from "@alexandria/hooks/useT";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";

import LinkWorkModal from "./LinkWorkModal";
import type { WorkRow } from "./WorkCard";

/**
 * StructureTree — compendium-structure-tab (Task 10).
 *
 * Read-only recursive tree of the project's linked structure blueprint
 * (a Compendium tree of entries), rendered as the writing index's wide
 * structure canvas. Each node shows whichever work is canonically
 * linked to it (`works.entry_id`) or, when the viewer can edit works,
 * a hover-revealed "+ Link work" affordance that opens `LinkWorkModal`.
 *
 * No entry management here (no reorder/add/archive) — the blueprint
 * page keeps that job; this is "see the structure and link works to
 * it," nothing more. Mutations PUT `.../entry-link` (Task 6) and
 * reload the `structure` + `works` deferred props so both surfaces
 * (this tree and the works rail) reflect the change.
 */

export interface StructureNode {
    id: number;
    name: string;
    slug: string;
    is_stub: boolean;
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
    canManage: boolean;
    onConfigure: () => void;
}

/* ── Theme styles ── */

const treeCardStyle: CSSProperties = {
    background:
        "linear-gradient(145deg, color-mix(in srgb, var(--theme-surface-card) 96%, var(--theme-brand-primary-500) 4%), var(--theme-surface-card))",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    boxShadow: "0 18px 48px color-mix(in srgb, #000 9%, transparent)",
    overflow: "hidden",
};

const treeHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    background:
        "radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent), transparent 42%)",
};

const headerIconStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 13%, transparent)",
    color: "var(--theme-brand-primary-500)",
    border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)",
};

const mutedTextStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const emptyStateStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const errorBannerStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-status-error-stroke, #dc2626) 12%, transparent)",
    color: "var(--theme-status-error-stroke, #dc2626)",
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-status-error-stroke, #dc2626) 25%, transparent)",
};

const chevronStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

const entryLinkStyle: CSSProperties = {
    color: "var(--theme-base-content)",
    textDecoration: "none",
};

const folderIconStyle: CSSProperties = {
    color: "var(--theme-brand-secondary-500)",
};

const liveEntryIconStyle: CSSProperties = {
    color: "var(--theme-status-success-stroke)",
};

const stubIconStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

const workChipStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)",
    color: "var(--theme-brand-primary-500)",
    border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 16%, transparent)",
    borderRadius: "var(--theme-radius-badge)",
    padding: "0.125rem 0.45rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
};

const linkWorkButtonStyle: CSSProperties = {
    ...workChipStyle,
    background:
        "color-mix(in srgb, var(--theme-brand-accent-500) 12%, transparent)",
    color: "var(--theme-brand-accent-500)",
    border: "1px solid color-mix(in srgb, var(--theme-brand-accent-500) 18%, transparent)",
};

const unlinkButtonStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const childGuideStyle: CSSProperties = {
    borderColor:
        "color-mix(in srgb, var(--theme-brand-primary-500) 18%, transparent)",
};

/** Every depth-0 and depth-1 node id that has children — the default-open set. */
function seedExpandedIds(
    nodes: StructureNode[],
    depth: number,
    into: Set<number>,
): void {
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

function countStructureNodes(nodes: StructureNode[]): {
    entries: number;
    linked: number;
} {
    let entries = 0;
    let linked = 0;

    for (const node of nodes) {
        entries += 1;
        linked += node.work === null ? 0 : 1;

        const childCounts = countStructureNodes(node.children);
        entries += childCounts.entries;
        linked += childCounts.linked;
    }

    return { entries, linked };
}

export default function StructureTree({
    project,
    structure,
    works,
    canLink,
    canManage,
    onConfigure,
}: StructureTreeProps) {
    const t = useT();
    const expandedStorageKey = `alexandria.writing.structure-expanded:${project.id}`;
    const isCoarsePointer = useMediaQuery("(pointer: coarse)");
    const counts = countStructureNodes(structure.tree);

    const [expanded, setExpanded] = useState<Set<number>>(() => {
        if (typeof window !== "undefined") {
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
    const [confirmingUnlink, setConfirmingUnlink] = useState<number | null>(
        null,
    );

    function toggle(id: number) {
        setExpanded((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            if (typeof window !== "undefined") {
                window.localStorage.setItem(
                    expandedStorageKey,
                    JSON.stringify([...next]),
                );
            }

            return next;
        });
    }

    async function setEntryLink(workSlug: string, entryId: number | null) {
        setError(null);

        try {
            const res = await fetch(
                `/works/${project.slug}/${workSlug}/entry-link`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        ...csrfHeaders(),
                    },
                    body: JSON.stringify({ entry_id: entryId }),
                },
            );

            if (res.ok) {
                router.reload({ only: ["structure", "works"] });
            } else {
                const data = await res.json().catch(() => null);
                setError(
                    data?.errors?.entry_id?.[0] ??
                        data?.message ??
                        t("writing.structure.link_failed"),
                );
            }
        } catch {
            setError(t("writing.structure.link_failed"));
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
            <div
                className="flex items-center gap-3 px-4 py-4 sm:px-5"
                style={treeHeaderStyle}
            >
                <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={headerIconStyle}
                >
                    <i
                        className={
                            structure.blueprint.icon ?? "fa-solid fa-sitemap"
                        }
                        aria-hidden="true"
                    />
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className="text-[0.625rem] font-semibold uppercase tracking-[0.17em]"
                        style={mutedTextStyle}
                    >
                        {t("writing.structure.canvas_eyebrow")}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="truncate font-serif text-xl font-bold tracking-tight sm:text-2xl">
                            {structure.blueprint.name}
                        </h2>
                        <span className="text-xs" style={mutedTextStyle}>
                            {t("writing.structure.canvas_summary")
                                .replace(
                                    ":entries",
                                    counts.entries.toLocaleString(),
                                )
                                .replace(
                                    ":entry_label",
                                    t(
                                        counts.entries === 1
                                            ? "writing.structure.entry"
                                            : "writing.structure.entries",
                                    ),
                                )
                                .replace(
                                    ":linked",
                                    counts.linked.toLocaleString(),
                                )
                                .replace(
                                    ":work_label",
                                    t(
                                        counts.linked === 1
                                            ? "writing.structure.linked_work"
                                            : "writing.structure.linked_works",
                                    ),
                                )}
                        </span>
                    </div>
                </div>
                {canManage && (
                    <button
                        type="button"
                        className="alex-btn alex-btn--ghost shrink-0 px-2.5 text-xs sm:px-3"
                        title={t("writing.structure.picker_title")}
                        aria-label={t("writing.structure.picker_title")}
                        onClick={onConfigure}
                    >
                        <i className="fa-solid fa-sliders" aria-hidden="true" />
                        <span className="hidden sm:inline">
                            {t("writing.structure.change")}
                        </span>
                    </button>
                )}
            </div>

            {error !== null && (
                <div className="px-4 py-2 text-sm" style={errorBannerStyle}>
                    {error}
                </div>
            )}

            {structure.tree.length === 0 ? (
                <div
                    className="px-6 py-16 text-center text-sm italic"
                    style={emptyStateStyle}
                >
                    {t("writing.structure.empty")}
                </div>
            ) : (
                <div className="flex flex-col gap-1 p-3 sm:p-4">
                    {structure.tree.map((node) => (
                        <StructureNodeRow
                            key={node.id}
                            node={node}
                            depth={0}
                            shared={shared}
                        />
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

type StructureNodeKind = "folder" | "entry" | "stub";

function structureNodeKind(
    node: StructureNode,
    hasChildren: boolean,
): StructureNodeKind {
    if (!node.is_stub) {
        return "entry";
    }

    return hasChildren ? "folder" : "stub";
}

function structureNodeIcon(kind: StructureNodeKind): {
    className: string;
    style: CSSProperties;
} {
    if (kind === "folder") {
        return {
            className: "fa-solid fa-folder",
            style: folderIconStyle,
        };
    }

    if (kind === "entry") {
        return {
            className: "fa-solid fa-file",
            style: liveEntryIconStyle,
        };
    }

    return {
        className: "fa-solid fa-file-circle-question",
        style: stubIconStyle,
    };
}

function StructureNodeRow({
    node,
    depth,
    shared,
}: {
    node: StructureNode;
    depth: number;
    shared: TreeShared;
}) {
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
    const nodeKind = structureNodeKind(node, hasChildren);
    const nodeIcon = structureNodeIcon(nodeKind);
    const nodeNameClass = `min-w-0 flex-1 truncate ${depth === 0 ? "font-semibold" : ""}`;

    return (
        <div className="flex flex-col gap-0.5">
            <div
                className="alex-row group flex min-h-9 items-center gap-1.5 px-2.5 py-1 text-sm"
                data-structure-node-row
                data-node-kind={nodeKind}
                data-linked={node.work === null ? "false" : "true"}
                style={{
                    borderRadius: "var(--theme-radius-button)",
                    background:
                        depth === 0
                            ? "color-mix(in srgb, var(--theme-base-content) 4%, transparent)"
                            : undefined,
                }}
            >
                {/* Expand/collapse chevron */}
                {hasChildren ? (
                    <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 items-center justify-center"
                        onClick={() => onToggle(node.id)}
                        aria-expanded={isExpanded}
                        aria-label={
                            isExpanded
                                ? t("writing.structure.collapse")
                                : t("writing.structure.expand")
                        }
                    >
                        <i
                            className={`fa-solid fa-chevron-right text-[9px] transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                            style={chevronStyle}
                        />
                    </button>
                ) : (
                    <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center"
                        aria-hidden="true"
                    />
                )}

                <i
                    className={`${nodeIcon.className} w-4 shrink-0 text-center text-xs`}
                    data-structure-node-icon
                    style={nodeIcon.style}
                    aria-hidden="true"
                />

                {node.is_stub ? (
                    <span
                        className={nodeNameClass}
                        data-structure-entry-name
                        style={entryLinkStyle}
                    >
                        {node.name}
                    </span>
                ) : (
                    <a
                        href={`/p/${project.slug}/${blueprintSlug}/${node.slug}`}
                        className={`${nodeNameClass} hover:underline`}
                        data-structure-entry-link
                        data-structure-entry-name
                        style={entryLinkStyle}
                    >
                        {node.name}
                    </a>
                )}

                {node.work !== null ? (
                    <span className="flex min-w-0 max-w-[48%] shrink-0 items-center gap-1">
                        <a
                            href={`/works/${project.slug}/${node.work.slug}`}
                            className="flex min-w-0 items-center"
                            data-linked-work-chip
                            style={workChipStyle}
                        >
                            <i
                                className="fa-solid fa-feather mr-1.5 shrink-0 text-[10px]"
                                aria-hidden="true"
                            />
                            <span className="truncate">{node.work.title}</span>
                        </a>
                        {canLink &&
                            (isConfirmingUnlink ? (
                                <button
                                    type="button"
                                    className="alex-btn alex-btn--ghost px-1.5 py-0.5 text-[11px]"
                                    onClick={() => onConfirmUnlink(node)}
                                    onBlur={onCancelUnlink}
                                >
                                    {t("writing.structure.unlink_confirm")}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="flex h-5 w-5 items-center justify-center"
                                    style={unlinkButtonStyle}
                                    title={t("writing.structure.unlink")}
                                    aria-label={t("writing.structure.unlink")}
                                    onClick={() => onRequestUnlink(node)}
                                >
                                    <i
                                        className="fa-solid fa-xmark text-[10px]"
                                        aria-hidden="true"
                                    />
                                </button>
                            ))}
                    </span>
                ) : (
                    canLink && (
                        <button
                            type="button"
                            className={`alex-btn shrink-0 transition-opacity focus:opacity-100 ${
                                isCoarsePointer
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100"
                            }`}
                            data-link-work-button
                            onClick={() => onRequestLink(node)}
                            style={linkWorkButtonStyle}
                        >
                            <i
                                className="fa-solid fa-plus mr-0.5 text-[8px]"
                                aria-hidden="true"
                            />
                            {t("writing.structure.link_work")}
                        </button>
                    )
                )}
            </div>

            {hasChildren && isExpanded && (
                <div
                    className="ml-[1.4rem] flex flex-col gap-0.5 border-l pl-1.5"
                    style={childGuideStyle}
                >
                    {node.children.map((child) => (
                        <StructureNodeRow
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            shared={shared}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
