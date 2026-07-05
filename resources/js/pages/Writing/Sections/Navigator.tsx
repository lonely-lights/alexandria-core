import { router } from '@inertiajs/react';
import { useRef, useState, type CSSProperties } from 'react';

import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import useT, { type Translator } from '@alexandria/hooks/useT';
import { useSortableReorder } from '@alexandria/hooks/useSortableReorder';

import type { CurrentSection, SectionNode } from '../Workspace';
import MoveSectionModal from './MoveSectionModal';
import RenameSectionModal from './RenameSectionModal';
import type { SectionOutlineItem } from './sectionOutline';
import { getStructureGuidance, type StructureGuidanceState } from './structureGuidance';

/**
 * Workspace section Navigator — Stage 8g.1 (Plan 2 Task 6; drag-reorder
 * added in Plan 4 Task 5; modal state lifted in Ribbon Plan 2 Task 3).
 *
 * Recursive section tree with expand/collapse, selection, and (when
 * the viewer can update the work) add-child / delete hover actions
 * plus a root-level add button. The add/delete modals live in the
 * Workspace (shared with the ribbon's Structure tab) — the hover
 * affordances request them via `onRequestAdd`/`onRequestDelete`.
 * Mutations POST/DELETE through Inertia; the server sends fresh
 * `sections` props back, so no manual tree state sync is needed — the
 * expanded set keys off ids and tolerates stale entries.
 *
 * Reordering: every sibling group (the root list + each expanded
 * `children` container) is its own SortableJS container via
 * `SiblingGroup`, so drags are confined within a group — no
 * cross-parent moves (the hook sets no SortableJS `group`). Drops
 * reorder local state optimistically (render-time sync off props
 * identity) and PUT the new id order to `works.sections.reorder`.
 */

interface NavigatorProps {
    projectSlug: string;
    workSlug: string;
    work: {
        type: string;
        format: string;
        target_pages: number | null;
        length_plan: {
            target_lines?: number | null;
            target_pages?: number | null;
            preset?: string | null;
        } | null;
    };
    sections: SectionNode[];
    currentSection: CurrentSection | null;
    currentSlug: string | null;
    canUpdate: boolean;
    onSelect: (slug: string) => void;
    /** Open the Workspace-owned AddSectionModal (null = root section). */
    onRequestAdd: (parentId: number | null) => void;
    /** Open the Workspace-owned delete ConfirmModal for this node. */
    onRequestDelete: (node: SectionNode) => void;
    /** Autosave-confirmed word counts (by section id) overlaying the prop tree. */
    liveCounts?: Record<number, number>;
    /** Headings extracted from the current prose section, rendered as an in-section outline. */
    currentOutline?: SectionOutlineItem[];
}

/* ── Theme styles ── */

const selectedRowStyle: CSSProperties = {
    background:
        'var(--alex-writing-section-row-selected-bg, color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent))',
    color: 'var(--alex-writing-section-row-selected-fg, var(--theme-brand-primary-500))',
};

const chevronStyle: CSSProperties = {
    color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 40%, transparent))',
};

const leafDotStyle: CSSProperties = {
    background:
        'var(--alex-writing-section-dot-bg, color-mix(in srgb, var(--theme-base-content) 15%, transparent))',
};

const labelChipStyle: CSSProperties = {
    background:
        'var(--alex-writing-section-chip-bg, color-mix(in srgb, var(--theme-base-content) 8%, transparent))',
    color: 'var(--alex-writing-section-chip-fg, color-mix(in srgb, var(--theme-base-content) 60%, transparent))',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
};

const wordCountStyle: CSSProperties = {
    color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 45%, transparent))',
};

const hoverActionStyle: CSSProperties = {
    color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 50%, transparent))',
};

const panelHeaderStyle: CSSProperties = {
    borderBottom: '1px solid var(--alex-manuscript-ruler-border, color-mix(in srgb, var(--theme-base-content) 10%, transparent))',
};

const panelActionStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 58%, transparent))',
};

const guidanceCardStyle: CSSProperties = {
    background: 'var(--alex-writing-section-pane-bg, var(--theme-base-surface))',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 10px 28px rgb(0 0 0 / 0.16)',
};

const guidanceItemStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

const guidanceStateStyle: Record<StructureGuidanceState, CSSProperties> = {
    complete: {
        color: 'var(--theme-success, var(--theme-brand-primary-500))',
    },
    current: {
        color: 'var(--theme-brand-primary-500)',
    },
    open: {
        color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 50%, transparent))',
    },
};

/** Collect the ids of every node that has children (default-expanded set). */
function collectParentIds(nodes: SectionNode[], into: Set<number>): Set<number> {
    for (const node of nodes) {
        if (node.children.length > 0) {
            into.add(node.id);
            collectParentIds(node.children, into);
        }
    }
    return into;
}

function findNodeBySlug(nodes: SectionNode[], slug: string | null): SectionNode | null {
    if (slug === null) {
        return null;
    }

    for (const node of nodes) {
        if (node.slug === slug) {
            return node;
        }

        const found = findNodeBySlug(node.children, slug);

        if (found !== null) {
            return found;
        }
    }

    return null;
}

function findNodeById(nodes: SectionNode[], id: number): SectionNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNodeById(node.children, id);
        if (found !== null) return found;
    }
    return null;
}

/** True when `candidateId` is `nodeId` itself or inside its subtree. */
function isSelfOrDescendant(nodes: SectionNode[], nodeId: number, candidateId: number | null): boolean {
    if (candidateId === null) return false;
    const node = findNodeById(nodes, nodeId);
    if (node === null) return false;
    const walk = (n: SectionNode): boolean =>
        n.id === candidateId || n.children.some(walk);
    return walk(node);
}

export default function Navigator({
    projectSlug,
    workSlug,
    work,
    sections,
    currentSection,
    currentSlug,
    canUpdate,
    onSelect,
    onRequestAdd,
    onRequestDelete,
    liveCounts,
    currentOutline = [],
}: NavigatorProps) {
    const t = useT();
    const [expanded, setExpanded] = useState<Set<number>>(
        () => collectParentIds(sections, new Set()),
    );
    const [renameTarget, setRenameTarget] = useState<SectionNode | null>(null);
    const [moveTarget, setMoveTarget] = useState<SectionNode | null>(null);
    const currentNode = findNodeBySlug(sections, currentSlug);
    const guidance = getStructureGuidance({ work, sections, currentSection });

    function toggle(id: number) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function openAddChild(node: SectionNode) {
        // Pre-expand the parent so the new child is visible when the
        // fresh tree comes back.
        setExpanded((prev) => new Set(prev).add(node.id));
        onRequestAdd(node.id);
    }

    function moveSection(sectionId: number, toParentId: number | null, position: number) {
        if (isSelfOrDescendant(sections, sectionId, toParentId)) {
            return; // dropping a parent into its own subtree — ignore
        }
        if (toParentId !== null) {
            setExpanded((prev) => new Set(prev).add(toParentId));
        }
        router.put(
            `/works/${projectSlug}/${workSlug}/sections/${sectionId}/move`,
            { parent_id: toParentId, position },
            { preserveScroll: true, preserveState: true, only: ['sections'] },
        );
    }

    const shared: TreeShared = {
        projectSlug,
        workSlug,
        currentSlug,
        expanded,
        canUpdate,
        onSelect,
        onToggle: toggle,
        onAddChild: openAddChild,
        onDuplicate: (node) => {
            router.post(
                `/works/${projectSlug}/${workSlug}/sections/${node.id}/duplicate`,
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['sections', 'currentSection'],
                },
            );
        },
        onRename: setRenameTarget,
        onMove: moveSection,
        onMoveTo: setMoveTarget,
        liveCounts,
        currentOutline,
        t,
    };

    return (
        <div className="flex min-h-full flex-col">
            {canUpdate && (
                <div
                    className="flex shrink-0 items-center justify-between gap-2 px-2 py-1.5"
                    style={panelHeaderStyle}
                >
                    <span className="text-xs font-semibold uppercase tracking-[0.04em]" style={wordCountStyle}>
                        {t('writing.workspace.sections')}
                    </span>
                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                            data-writing-section-action="add-section"
                            style={panelActionStyle}
                            title={t('writing.workspace.add_section')}
                            aria-label={t('writing.workspace.add_section')}
                            onClick={() => onRequestAdd(null)}
                        >
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                            data-writing-section-action="add-inside"
                            style={{ ...panelActionStyle, opacity: currentNode === null ? 0.4 : 1 }}
                            title={t('writing.workspace.add_child')}
                            aria-label={t('writing.workspace.add_child')}
                            disabled={currentNode === null}
                            onClick={() => {
                                if (currentNode !== null) {
                                    openAddChild(currentNode);
                                }
                            }}
                        >
                            <i className="fa-solid fa-indent" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                            data-writing-section-action="delete-section"
                            style={{ ...panelActionStyle, opacity: currentNode === null ? 0.4 : 1 }}
                            title={t('writing.workspace.delete_section')}
                            aria-label={t('writing.workspace.delete_section')}
                            disabled={currentNode === null}
                            onClick={() => {
                                if (currentNode !== null) {
                                    onRequestDelete(currentNode);
                                }
                            }}
                        >
                            <i className="fa-solid fa-trash-can" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-2">
                {guidance !== null && (
                    <section
                        className="mb-2 grid gap-2 px-2 py-2.5"
                        data-writing-structure-guidance={guidance.id}
                        style={guidanceCardStyle}
                    >
                        <div className="grid gap-1">
                            <h3 className="text-xs font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                {t(guidance.titleKey)}
                            </h3>
                            <p className="text-[11px] leading-relaxed" style={wordCountStyle}>
                                {t(guidance.bodyKey)}
                            </p>
                        </div>
                        <div className="grid gap-1">
                            {guidance.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-2 px-2 py-1.5 text-[11px]"
                                    data-writing-structure-guidance-item={item.id}
                                    data-state={item.state}
                                    style={guidanceItemStyle}
                                >
                                    <i
                                        className={`fa-solid ${item.icon} w-3 text-center text-[10px]`}
                                        aria-hidden="true"
                                        style={guidanceStateStyle[item.state]}
                                    />
                                    <span className="min-w-0 flex-1 truncate" style={wordCountStyle}>
                                        {t(item.labelKey)}
                                    </span>
                                    <span
                                        className="shrink-0 font-mono text-[10px] font-semibold tabular-nums"
                                        style={guidanceStateStyle[item.state]}
                                    >
                                        {item.valueKey !== undefined ? t(item.valueKey) : item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                <SiblingGroup nodes={sections} parentId={null} depth={0} shared={shared} />
            </div>
            {renameTarget !== null && (
                <RenameSectionModal
                    projectSlug={projectSlug}
                    workSlug={workSlug}
                    section={renameTarget}
                    onClose={() => setRenameTarget(null)}
                />
            )}
            {moveTarget !== null && (
                <MoveSectionModal
                    section={moveTarget}
                    sections={sections}
                    onMove={moveSection}
                    onClose={() => setMoveTarget(null)}
                />
            )}
        </div>
    );
}

/** Props shared by every row/group in the tree, threaded through recursion. */
interface TreeShared {
    projectSlug: string;
    workSlug: string;
    currentSlug: string | null;
    expanded: Set<number>;
    canUpdate: boolean;
    onSelect: (slug: string) => void;
    onToggle: (id: number) => void;
    onAddChild: (node: SectionNode) => void;
    onDuplicate: (node: SectionNode) => void;
    onRename: (node: SectionNode) => void;
    onMove: (sectionId: number, toParentId: number | null, position: number) => void;
    onMoveTo: (node: SectionNode) => void;
    liveCounts?: Record<number, number>;
    currentOutline: SectionOutlineItem[];
    t: Translator;
}

/**
 * One sibling group = one SortableJS container. Owns the optimistic
 * order state (render-time sync keyed off the props array identity —
 * the store-products pattern, NOT setState-in-effect) and persists
 * drops via the sibling-group reorder endpoint.
 */
function SiblingGroup({
    nodes,
    parentId,
    depth,
    shared,
}: {
    nodes: SectionNode[];
    parentId: number | null;
    depth: number;
    shared: TreeShared;
}) {
    const groupRef = useRef<HTMLDivElement>(null);

    const [prevNodes, setPrevNodes] = useState(nodes);
    const [ordered, setOrdered] = useState(nodes);

    if (nodes !== prevNodes) {
        setPrevNodes(nodes);
        setOrdered(nodes);
    }

    useSortableReorder(
        groupRef,
        (oldIndex, newIndex) => {
            setOrdered((prev) => {
                const next = [...prev];
                const [moved] = next.splice(oldIndex, 1);
                next.splice(newIndex, 0, moved);

                router.put(
                    `/works/${shared.projectSlug}/${shared.workSlug}/sections/reorder`,
                    { parent_id: parentId, ids: next.map((sibling) => sibling.id) },
                    { preserveScroll: true, preserveState: true, only: ['sections'] },
                );

                return next;
            });
        },
        shared.canUpdate,
        {
            group: 'writing-sections',
            onMoveAcross: (sectionId, toParentId, newIndex) =>
                shared.onMove(sectionId, toParentId, newIndex),
        },
    );

    return (
        <div ref={groupRef} data-sortable-parent={parentId ?? 'root'} className="flex flex-col gap-0.5">
            {ordered.map((node) => (
                <NavigatorRow key={node.id} node={node} depth={depth} shared={shared} />
            ))}
        </div>
    );
}

function NavigatorRow({
    node,
    depth,
    shared,
}: {
    node: SectionNode;
    depth: number;
    shared: TreeShared;
}) {
    const { projectSlug, workSlug, currentSlug, expanded, canUpdate, onSelect, onToggle, onAddChild, onDuplicate, onRename, onMoveTo, liveCounts, t } =
        shared;

    const isSelected = node.slug === currentSlug;
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const wordCount = liveCounts?.[node.id] ?? node.word_count;
    const sectionUrl = `/works/${projectSlug}/${workSlug}/${node.slug}`;
    const outline = isSelected ? shared.currentOutline : [];

    function copyLink() {
        const url = new URL(sectionUrl, window.location.origin).toString();

        if (navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(url).catch(() => {});
        }
    }

    // The wrapper div is the SortableJS draggable item — the row plus
    // its (expanded) subtree move together, and collapsed children ride
    // along since they live inside it.
    return (
        <div data-section-id={node.id} className="flex flex-col gap-0.5">
            <div
                className="alex-row group flex cursor-pointer items-center gap-1 py-1 pr-2 text-sm"
                data-selected={isSelected ? 'true' : undefined}
                style={{
                    paddingLeft: `${depth * 18 + 8}px`,
                    borderRadius: 'var(--theme-radius-button)',
                    ...(isSelected ? selectedRowStyle : {}),
                }}
                onClick={() => onSelect(node.slug)}
            >
                {/* Expand/collapse chevron (leaf nodes render a dot) */}
                <button
                    type="button"
                    className="flex h-5 w-5 shrink-0 items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) {
                            onToggle(node.id);
                        }
                    }}
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

                {node.label && (
                    <span className="shrink-0" style={labelChipStyle}>
                        {node.label}
                    </span>
                )}

                <span className={`min-w-0 flex-1 truncate ${isSelected ? 'font-medium' : ''}`}>
                    {node.title}
                </span>

                {/* Hover actions */}
                {canUpdate && (
                    <span className={`flex shrink-0 items-center gap-0.5 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                        <span
                            className="drag-handle flex h-5 w-5 cursor-grab items-center justify-center active:cursor-grabbing"
                            style={hoverActionStyle}
                            title={t('writing.workspace.drag_to_reorder')}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <i className="fa-solid fa-grip-vertical text-[10px]" aria-hidden="true" />
                        </span>
                        <span onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu
                                align="left"
                                density="compact"
                                labelAlign="right"
                                menuClassName="w-48 py-1"
                                inheritCssVariables={[
                                    '--alex-writing-section-pane-bg',
                                    '--alex-writing-section-row-hover-bg',
                                    '--alex-writing-section-muted',
                                    '--theme-base-content',
                                    '--theme-base-surface',
                                    '--theme-motion-duration-fast',
                                    '--theme-motion-easing-standard',
                                    '--theme-radius-button',
                                    '--theme-radius-card',
                                ]}
                                menuStyle={{
                                    background: 'var(--alex-writing-section-pane-bg, var(--theme-base-surface))',
                                    borderColor: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
                                    color: 'var(--theme-base-content)',
                                }}
                                trigger={
                                    <button
                                        type="button"
                                        className="flex h-5 w-5 items-center justify-center rounded-full"
                                        data-writing-section-menu={node.id}
                                        style={hoverActionStyle}
                                        title={t('writing.workspace.section_options')}
                                        aria-label={t('writing.workspace.section_options')}
                                    >
                                        <i className="fa-solid fa-ellipsis-vertical text-[10px]" aria-hidden="true" />
                                    </button>
                                }
                                items={[
                                    {
                                        label: t('writing.workspace.add_subsection'),
                                        icon: 'fa-plus',
                                        onClick: () => onAddChild(node),
                                    },
                                    {
                                        label: t('writing.workspace.duplicate_section'),
                                        icon: 'fa-copy',
                                        onClick: () => onDuplicate(node),
                                    },
                                    {
                                        label: t('writing.workspace.rename_section'),
                                        icon: 'fa-pen',
                                        onClick: () => onRename(node),
                                    },
                                    {
                                        label: t('writing.workspace.move_section'),
                                        icon: 'fa-arrows-up-down-left-right',
                                        onClick: () => onMoveTo(node),
                                    },
                                    { divider: true },
                                    {
                                        label: t('writing.workspace.copy_section_link'),
                                        icon: 'fa-link',
                                        onClick: copyLink,
                                    },
                                ]}
                            />
                        </span>
                    </span>
                )}

                {wordCount > 0 && (
                    <span
                        className="shrink-0 text-[11px] tabular-nums"
                        style={wordCountStyle}
                    >
                        {wordCount.toLocaleString()}
                    </span>
                )}
            </div>

            {outline.length > 0 && (
                <div className="flex flex-col gap-0.5" data-writing-section-outline={node.id}>
                    {outline.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-1 py-0.5 pr-2 text-xs"
                            data-writing-section-outline-item={item.id}
                            style={{
                                paddingLeft: `${depth * 18 + 34 + (item.level - 1) * 12}px`,
                                color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 48%, transparent))',
                            }}
                        >
                            <i
                                className="fa-solid fa-heading shrink-0 text-[8px]"
                                aria-hidden="true"
                                style={chevronStyle}
                            />
                            <span className="min-w-0 truncate">{item.title}</span>
                        </div>
                    ))}
                </div>
            )}

            {hasChildren && isExpanded && (
                <SiblingGroup
                    nodes={node.children}
                    parentId={node.id}
                    depth={depth + 1}
                    shared={shared}
                />
            )}
        </div>
    );
}
