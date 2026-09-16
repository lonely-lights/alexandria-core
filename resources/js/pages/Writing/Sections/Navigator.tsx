import { router } from '@inertiajs/react';
import { useRef, useState, type CSSProperties } from 'react';

import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import useT, { type Translator } from '@alexandria/hooks/useT';
import { useSortableReorder } from '@alexandria/hooks/useSortableReorder';
import { worksBase, workUrl } from '@alexandria/lib/urls';
import Tooltip from '@alexandria/components/ui/Tooltip';
import type { ReactNode } from 'react';

import type { SectionNode } from '../Workspace';
import MoveSectionModal from './MoveSectionModal';
import TransferSectionModal from './TransferSectionModal';
import RenameSectionModal from './RenameSectionModal';
import type { SectionOutlineItem } from './sectionOutline';

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
    sections: SectionNode[];
    currentSlug: string | null;
    canUpdate: boolean;
    onSelect: (slug: string) => void;
    /** Open the Workspace-owned AddSectionModal (null = root section). */
    onRequestAdd: (parentId: number | null) => void;
    /** Open the Workspace-owned delete ConfirmModal for this node. */
    onRequestDelete: (node: SectionNode) => void;
    /** Open the shared account-level Section Settings modal. */
    onRequestSettings: () => void;
    /** Open the Workspace-owned MarkRevisionModal, scope locked to this node (Stage 9). */
    onRequestMarkRevision: (node: SectionNode) => void;
    /** Rendered at the far right of the header row, after the tree
     * actions. The workspace passes its binder collapse toggle here. */
    headerTrailing?: ReactNode;
    headerTitle?: string;
    /** Autosave-confirmed word counts (by section id) overlaying the prop tree. */
    liveCounts?: Record<number, number>;
    /** Headings extracted from the current prose section, rendered as an in-section outline. */
    currentOutline?: SectionOutlineItem[];
    /**
     * Hover-off auto-dismiss delay (ms) for the row's 3-dot menu, read
     * from the user's `menu_dismiss_delay_ms` preference by the
     * workspace. Null/0 leaves the feature off (Stage 11 rework — first
     * and, for now, only DropdownMenu instance wired to it).
     */
    /** Whether section-type chips such as ACT and SCENE are visible. */
    showSectionTypeLabels?: boolean;
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
    sections,
    currentSlug,
    canUpdate,
    onSelect,
    onRequestAdd,
    onRequestDelete,
    onRequestSettings,
    onRequestMarkRevision,
    headerTrailing,
    headerTitle,
    liveCounts,
    currentOutline = [],
    showSectionTypeLabels = true,
}: NavigatorProps) {
    const t = useT();
    const toast = useToastContext();
    const [expanded, setExpanded] = useState<Set<number>>(
        () => collectParentIds(sections, new Set()),
    );
    const [renameTarget, setRenameTarget] = useState<SectionNode | null>(null);
    const [moveTarget, setMoveTarget] = useState<SectionNode | null>(null);
    const [transferTarget, setTransferTarget] = useState<SectionNode | null>(null);

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
            `${worksBase(projectSlug, workSlug)}/sections/${sectionId}/move`,
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
                `${worksBase(projectSlug, workSlug)}/sections/${node.id}/duplicate`,
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['sections', 'currentSection'],
                },
            );
        },
        onRename: setRenameTarget,
        onToggleStructural: (node) => {
            const makeStructural = !node.is_structural;

            router.put(
                `${worksBase(projectSlug, workSlug)}/sections/${node.id}`,
                { title: node.title, is_structural: makeStructural },
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['sections', 'currentSection'],
                    onSuccess: () => {
                        toast.show(
                            t(makeStructural
                                ? 'writing.workspace.structural_on_toast'
                                : 'writing.workspace.structural_off_toast',
                            ).replace(':title', node.title),
                            { type: 'success' },
                        );
                    },
                    // The server names the reason (e.g. the section has words);
                    // fall back to a generic failure when it doesn't.
                    onError: (errors) => {
                        toast.show(
                            errors.is_structural ?? t('writing.workspace.structural_toggle_failed'),
                            { type: 'danger', duration: 7000 },
                        );
                    },
                },
            );
        },
        onMove: moveSection,
        onMoveTo: setMoveTarget,
        onTransfer: setTransferTarget,
        onMarkRevision: onRequestMarkRevision,
        onDelete: onRequestDelete,
        liveCounts,
        currentOutline,
        showSectionTypeLabels,
        t,
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Single header row for the whole binder (owner review,
                2026-08-31): SECTIONS label with the add-section button
                right beside it; the host's headerTrailing (the collapse
                toggle in the workspace) holds the right edge. Add-inside
                and delete moved into each row's dot menu, where the
                target is unambiguous. */}
            <div
                className="writing-workspace-binder-header flex shrink-0 items-center justify-between gap-2 px-2 py-1.5"
                style={panelHeaderStyle}
            >
                <div className="flex items-center gap-1">
                    <span className="pl-1 text-xs font-semibold uppercase tracking-[0.04em]" style={wordCountStyle}>
                        {headerTitle ?? t('writing.workspace.sections')}
                    </span>
                    {canUpdate && (
                        <Tooltip content={t('writing.workspace.add_section')}>
                            <button
                                type="button"
                                className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                data-writing-section-action="add-section"
                                style={panelActionStyle}
                                aria-label={t('writing.workspace.add_section')}
                                onClick={() => onRequestAdd(null)}
                            >
                                <i className="fa-solid fa-plus" aria-hidden="true" />
                            </button>
                        </Tooltip>
                    )}
                    <Tooltip content={t('writing.workspace.section_settings')}>
                        <button
                            type="button"
                            className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                            data-writing-section-settings
                            style={panelActionStyle}
                            aria-label={t('writing.workspace.section_settings')}
                            onClick={onRequestSettings}
                        >
                            <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />
                        </button>
                    </Tooltip>
                </div>
                <div className="flex items-center gap-0.5">
                    {headerTrailing}
                </div>
            </div>
            <div
                className="writing-workspace-section-scroll writing-workspace-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2"
                data-writing-section-scroll
            >
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
            {transferTarget !== null && <TransferSectionModal section={transferTarget} projectSlug={projectSlug} workSlug={workSlug} onClose={() => setTransferTarget(null)} />}
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
    /** Flip the section between structure only and writable. */
    onToggleStructural: (node: SectionNode) => void;
    onMove: (sectionId: number, toParentId: number | null, position: number) => void;
    onMoveTo: (node: SectionNode) => void;
    onTransfer: (node: SectionNode) => void;
    onMarkRevision: (node: SectionNode) => void;
    onDelete: (node: SectionNode) => void;
    liveCounts?: Record<number, number>;
    currentOutline: SectionOutlineItem[];
    showSectionTypeLabels: boolean;
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
                    `${worksBase(shared.projectSlug, shared.workSlug)}/sections/reorder`,
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
    const { projectSlug, workSlug, currentSlug, expanded, canUpdate, onSelect, onToggle, onAddChild, onDuplicate, onRename, onToggleStructural, onMoveTo, onTransfer, onMarkRevision, onDelete, liveCounts, showSectionTypeLabels, t } =
        shared;

    const isSelected = node.slug === currentSlug;
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const wordCount = liveCounts?.[node.id] ?? node.word_count;
    const sectionUrl = workUrl(projectSlug, workSlug, node.slug);
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

                {showSectionTypeLabels && node.label && (
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
                        <Tooltip content={t('writing.workspace.drag_to_reorder')} placement="top">
                            <span
                                className="drag-handle flex h-5 w-5 cursor-grab items-center justify-center active:cursor-grabbing"
                                style={hoverActionStyle}
                                aria-label={t('writing.workspace.drag_to_reorder')}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <i className="fa-solid fa-grip-vertical text-[10px]" aria-hidden="true" />
                            </span>
                        </Tooltip>
                        <span onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu
                                align="left"
                                density="compact"
                                labelAlign="right"
                                menuClassName="w-48"
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
                                    <Tooltip content={t('writing.workspace.section_options')} placement="right">
                                        <button
                                            type="button"
                                            className="flex h-5 w-5 items-center justify-center rounded-full"
                                            data-writing-section-menu={node.id}
                                            style={hoverActionStyle}
                                            aria-label={t('writing.workspace.section_options')}
                                        >
                                            <i className="fa-solid fa-ellipsis-vertical text-[10px]" aria-hidden="true" />
                                        </button>
                                    </Tooltip>
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
                                    // Only offered while there is no writing to lose;
                                    // the server refuses the flag on a section with words.
                                    ...(node.is_structural || !node.has_content
                                        ? [{
                                            label: t(node.is_structural ? 'writing.workspace.allow_writing' : 'writing.workspace.make_structural'),
                                            icon: node.is_structural ? 'fa-pen-nib' : 'fa-sitemap',
                                            onClick: () => onToggleStructural(node),
                                        }]
                                        : []),
                                    {
                                        label: t('writing.workspace.move_section'),
                                        icon: 'fa-arrows-up-down-left-right',
                                        onClick: () => onMoveTo(node),
                                    },
                                    {
                                        label: t('writing.transfer.title'),
                                        icon: 'fa-arrow-right-from-bracket',
                                        onClick: () => onTransfer(node),
                                    },
                                    { divider: true },
                                    {
                                        label: t('writing.revisions.mark_action'),
                                        icon: 'fa-clock-rotate-left',
                                        onClick: () => onMarkRevision(node),
                                    },
                                    {
                                        label: t('writing.workspace.copy_section_link'),
                                        icon: 'fa-link',
                                        onClick: copyLink,
                                    },
                                    { divider: true },
                                    {
                                        label: t('writing.workspace.delete_section'),
                                        icon: 'fa-trash-can',
                                        danger: true,
                                        onClick: () => onDelete(node),
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
                        title={t('writing.workspace.words').replace(':count', wordCount.toLocaleString())}
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
