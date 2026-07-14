import {
    type CSSProperties,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Sortable from "sortablejs";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Tooltip from "@alexandria/components/ui/Tooltip";
import Input from "@alexandria/components/form/Input";
import useT from "@alexandria/hooks/useT";
import ArchiveEntryModal from "@alexandria/components/entries/ArchiveEntryModal";
import MentionAwareContent from "@alexandria/components/ui/MentionAwareContent";
import { ColumnConfigModal } from "./modals/BlueprintSettingsModal";
import ConvertStubModal from "./modals/tree/ConvertStubModal";
import AddEntryModal from "./modals/tree/AddEntryModal";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import type { SiblingBlueprint } from "@alexandria/types/blueprints";

/* ── Theme-token style recipes ────────────────────────────────────
 * The left + right panels share the EntriesTab paper-board shape;
 * keeping the constants local until a 4th caller appears (then
 * promote to a shared primitive). */

const panelShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const panelInnerStyle: CSSProperties = {
    background: "var(--theme-base-200)",
    boxShadow:
        "0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    borderRadius: "inherit",
};

const panelHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-300) 40%, transparent)",
};

const panelFooterDividerStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

const sectionDividerStyle: CSSProperties = {
    borderTop:
        "1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    margin: "0.5rem 0",
};

const listCardStyle: CSSProperties = {
    background: "var(--theme-base-100)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const ghostIconBtnClass =
    "alex-btn alex-btn--ghost inline-flex h-6 w-6 items-center justify-center";
const ghostIconBtnStyle: CSSProperties = {
    borderRadius: "var(--theme-radius-button)",
};

const primaryIconBtnClass =
    "alex-btn alex-btn--primary inline-flex h-6 w-6 items-center justify-center";

const addRootBtnStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
    opacity: 0.5,
    transition:
        "opacity var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const subtitle70: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};
const subtitle60: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};
const subtitle50: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const subtitle40: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const subtitle30: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const subtitle20: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
};

const stubIconStyle: CSSProperties = {
    color: "var(--theme-brand-secondary-500)",
};
const orphanIconStyle: CSSProperties = subtitle40;
const crossBpIconStyle: CSSProperties = {
    color: "var(--theme-status-info-stroke)",
};
const liveEntryIconStyle: CSSProperties = {
    color: "var(--theme-status-success-stroke)",
};

const warningSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-warning-stroke) 70%, transparent)",
};
const errorSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 50%, transparent)",
};
const warningIconStyle: CSSProperties = {
    color: "var(--theme-status-warning-stroke)",
};

const stubBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.375rem",
    fontSize: "0.625rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background:
        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

const blueprintBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background: "var(--theme-status-info-fill)",
    color: "var(--theme-status-info-content)",
};

const countBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
};

const selectedRowStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
    color: "var(--theme-brand-primary-500)",
};

const dropdownMenuStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
    overflow: "hidden",
};

/* Children list — a contained rounded shell of full-width rows. Each
   row's icon tile derives its wash from the entry icon's own color via
   currentColor, so stub/live/cross-bp children keep their identity. */
const childListShellStyle: CSSProperties = {
    background: "var(--theme-base-100)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    overflow: "hidden",
};

const childRowDividerStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)",
};

const childCardIconTileStyle: CSSProperties = {
    width: "2rem",
    height: "2rem",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--theme-radius-input)",
    background: "color-mix(in srgb, currentColor 12%, transparent)",
};

const childCardCountStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 45%, transparent)",
    fontSize: "0.6875rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
};

const emptyIconWrapStyle: CSSProperties = {
    background: "var(--theme-base-200)",
};

/* Pick the icon-color style for a tree row based on entry state.
   Stub-with-children = folder (secondary), stub-without = question
   (faded), cross-blueprint reference = arrow (info), live entry =
   file (success). Used in three places (tree row, detail header,
   children table) — extracted to keep them in sync. */
function entryIconStyle(
    entry: { is_stub: boolean; blueprint_slug: string | null },
    hasChildren: boolean,
): CSSProperties {
    if (entry.is_stub) {
        return hasChildren ? stubIconStyle : orphanIconStyle;
    }
    if (entry.blueprint_slug) {
        return crossBpIconStyle;
    }
    return liveEntryIconStyle;
}

function entryIconClass(
    entry: { is_stub: boolean; blueprint_slug: string | null },
    hasChildren: boolean,
): string {
    if (entry.is_stub) {
        return hasChildren
            ? "fa-solid fa-folder"
            : "fa-solid fa-file-circle-question";
    }
    if (entry.blueprint_slug) {
        return "fa-solid fa-arrow-up-right-from-square";
    }
    return "fa-solid fa-file";
}

export interface TreeNode {
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    sort_order: number;
    is_stub: boolean;
    summary: string | null;
    summary_html: string | null;
    children_count: number;
    has_children: boolean;
    child_blueprint_ids: number[];
    blueprint_id: number;
    blueprint_slug: string | null; // set for cross-blueprint entries
    is_orphan?: boolean;
    unlinked_from?: {
        tree_blueprint_id: number;
        parent_id: number | null;
        at: string;
    } | null;
    /** Slug of the linked Writing work, when the entry carries metadata.writing. */
    writing_work_slug?: string | null;
}

interface TreeViewProps {
    projectId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blueprint: any;
    project: { id: number; name: string; slug: string };
    listableBlueprints?: SiblingBlueprint[];
    relationshipBlueprints?: SiblingBlueprint[];
    referencingRelationshipBlueprints?: SiblingBlueprint[];
    projectBlueprints?: SiblingBlueprint[];
    /** When set, shows the subtree rooted at this entry instead of the full blueprint tree */
    rootEntryId?: number;
    /** Entry-level display settings for the structure tab */
    structureSettings?: {
        children_label?: string;
        max_depth?: number;
        show_as?: "tree" | "list";
    };
}

export default function TreeView({
    projectId,
    blueprint,
    project,
    listableBlueprints = [],
    relationshipBlueprints = [],
    referencingRelationshipBlueprints = [],
    projectBlueprints = [],
    rootEntryId,
    structureSettings,
}: TreeViewProps) {
    const t = useT();
    const [allEntries, setAllEntries] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingEntryId, setSavingEntryId] = useState<number | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState("");
    const [archiveEntry, setArchiveEntry] = useState<TreeNode | null>(null);
    const [showNodeMenu, setShowNodeMenu] = useState(false);
    const [rearrangeMode, setRearrangeMode] = useState(false);
    const [draggingParentId, setDraggingParentId] = useState<
        number | null | undefined
    >(undefined);
    const [showConvertModal, setShowConvertModal] = useState(false); // tracks which sibling group is being dragged
    const [total, setTotal] = useState(0);
    const [rootCount, setRootCount] = useState(0);
    const [createParentId, setCreateParentId] = useState<
        number | null | undefined
    >(undefined);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsInitialMenu, setSettingsInitialMenu] = useState<
        string | undefined
    >(undefined);

    // Optional tree default — the node the tree opens to (expanded,
    // selected, scrolled into view) on first load. Stored in blueprint
    // metadata; set/cleared from the selected node's 3-dot menu.
    const [defaultEntryId, setDefaultEntryId] = useState<number | null>(
        (blueprint.metadata?.tree_default_entry_id as number | undefined) ??
            null,
    );
    const openedToDefaultRef = useRef(false);
    const treeScrollRef = useRef<HTMLDivElement | null>(null);

    function saveTreeDefault(entryId: number | null) {
        setDefaultEntryId(entryId);
        void fetch(`/p/${project.slug}/${blueprint.slug}/tree-default`, {
            method: "PATCH",
            headers: csrfHeaders(),
            credentials: "same-origin",
            body: JSON.stringify({ entry_id: entryId }),
        });
    }

    // Listen for settings open event from Show.tsx
    useEffect(() => {
        function handleOpenSettings(e: Event) {
            const detail = (e as CustomEvent).detail;
            setSettingsInitialMenu(detail?.menu ?? "main");
            setShowSettingsModal(true);
        }
        window.addEventListener(
            "alexandria:open-blueprint-settings",
            handleOpenSettings,
        );
        return () =>
            window.removeEventListener(
                "alexandria:open-blueprint-settings",
                handleOpenSettings,
            );
    }, []);

    const isSubtree = rootEntryId !== undefined;

    const fetchTree = useCallback(() => {
        setLoading(true);
        const url = isSubtree
            ? `/api/v1/entries/${rootEntryId}/subtree`
            : `/api/v1/projects/${projectId}/blueprints/${blueprint.id}/tree?sort_field=sort_order&sort_direction=asc`;

        fetch(url, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((r) => r.json())
            .then((data) => {
                setAllEntries(data.all_entries ?? []);
                setTotal(data.total ?? 0);
                setRootCount(data.root_count ?? data.data?.length ?? 0);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId, blueprint.id, rootEntryId]);

    useEffect(() => {
        fetchTree();
    }, [fetchTree]);

    // Open to the default node on first load: expand its ancestor chain,
    // select it, and scroll it into view. One-shot — later refetches and
    // user navigation are left alone.
    useEffect(() => {
        if (
            openedToDefaultRef.current ||
            isSubtree ||
            loading ||
            !defaultEntryId ||
            allEntries.length === 0
        ) {
            return;
        }
        const byId = new Map(allEntries.map((e) => [e.id, e]));
        openedToDefaultRef.current = true;
        if (!byId.has(defaultEntryId)) return; // default entry no longer in the tree

        const toExpand = new Set<number>([defaultEntryId]);
        let cursor = byId.get(defaultEntryId);
        while (cursor && cursor.parent_id !== null) {
            toExpand.add(cursor.parent_id);
            cursor = byId.get(cursor.parent_id);
        }
        setExpandedIds((prev) => new Set([...prev, ...toExpand]));
        setSelectedId(defaultEntryId);
        requestAnimationFrame(() => {
            treeScrollRef.current
                ?.querySelector(`[data-id="${defaultEntryId}"]`)
                ?.scrollIntoView({ block: "center" });
        });
    }, [loading, allEntries, defaultEntryId, isSubtree]);

    // Build parent→children map
    const childrenMap = useMemo(() => {
        const map = new Map<number | null, TreeNode[]>();
        for (const entry of allEntries) {
            const parentKey = entry.parent_id;
            if (!map.has(parentKey)) map.set(parentKey, []);
            map.get(parentKey)!.push(entry);
        }
        // Sort each group by sort_order so optimistic updates render correctly
        for (const [, children] of map) {
            children.sort((a, b) => a.sort_order - b.sort_order);
        }
        return map;
    }, [allEntries]);

    const rootEntries = useMemo(() => {
        if (isSubtree) {
            // In subtree mode, roots are direct children of the root entry
            return allEntries.filter((e) => e.parent_id === rootEntryId);
        }
        const roots = childrenMap.get(null) ?? [];
        const orphansFromMap = allEntries.filter(
            (e) =>
                e.parent_id !== null &&
                !allEntries.some((p) => p.id === e.parent_id),
        );
        return [
            ...roots,
            ...orphansFromMap.filter((o) => !roots.some((r) => r.id === o.id)),
        ];
    }, [childrenMap, allEntries, rootEntryId]);

    const unlinked = useMemo(
        () => allEntries.filter((e) => e.unlinked_from != null),
        [allEntries],
    );
    const trueRoots = useMemo(() => {
        if (isSubtree) {
            // In subtree mode, all root entries are "true roots" — they're children of the scoped entry
            return rootEntries.filter((e) => !e.unlinked_from);
        }
        return rootEntries.filter(
            (e) => e.parent_id === null && !e.is_orphan && !e.unlinked_from,
        );
    }, [rootEntries]);
    const orphans = useMemo(() => {
        if (isSubtree) return []; // No orphans in subtree mode
        return rootEntries.filter(
            (e) => (e.parent_id !== null || e.is_orphan) && !e.unlinked_from,
        );
    }, [rootEntries]);
    const [unsortedExpanded, setUnsortedExpanded] = useState(true);
    const [removedExpanded, setRemovedExpanded] = useState(true);

    // Search filter: find matching entries and their ancestors
    const matchingIds = useMemo(() => {
        if (!search) return null; // null = show all
        const term = search.toLowerCase();
        const matches = new Set<number>();
        const ancestors = new Set<number>();

        for (const entry of allEntries) {
            if (entry.name.toLowerCase().includes(term)) {
                matches.add(entry.id);
                // Walk up to include all ancestors
                let current = entry;
                while (current.parent_id !== null) {
                    ancestors.add(current.parent_id);
                    const parent = allEntries.find(
                        (e) => e.id === current.parent_id,
                    );
                    if (!parent) break;
                    current = parent;
                }
            }
        }

        return new Set([...matches, ...ancestors]);
    }, [search, allEntries]);

    // Auto-expand ancestors of search matches
    useEffect(() => {
        if (matchingIds && matchingIds.size > 0) {
            setExpandedIds((prev) => {
                const next = new Set(prev);
                for (const id of matchingIds) next.add(id);
                return next;
            });
        }
    }, [matchingIds]);

    function toggleExpand(id: number) {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function expandAll() {
        setExpandedIds(
            new Set(allEntries.filter((e) => e.has_children).map((e) => e.id)),
        );
    }

    function collapseAll() {
        setExpandedIds(new Set());
    }

    const selected = selectedId
        ? (allEntries.find((e) => e.id === selectedId) ?? null)
        : null;

    // Build breadcrumb path for selected entry
    const breadcrumb = useMemo(() => {
        if (!selectedId) return [];
        const path: TreeNode[] = [];
        let current: TreeNode | undefined = allEntries.find(
            (e) => e.id === selectedId,
        );
        while (current) {
            path.unshift(current);
            current = current.parent_id
                ? allEntries.find((e) => e.id === current!.parent_id)
                : undefined;
        }
        return path;
    }, [selectedId, allEntries]);

    const selectedChildren = useMemo(() => {
        if (!selectedId) return [];
        return childrenMap.get(selectedId) ?? [];
    }, [selectedId, childrenMap]);

    function startCreate(parentId: number | null) {
        setCreateParentId(parentId);
    }

    function handleRevertToStub(entry: TreeNode) {
        fetch(`/api/v1/entries/${entry.id}/revert-stub`, {
            method: "PUT",
            headers: csrfHeaders(),
            credentials: "same-origin",
        }).then(() => {
            setSelectedId(null);
            fetchTree();
        });
    }

    function handleUnlink(entry: TreeNode) {
        fetch(`/api/v1/entries/${entry.id}/meta`, {
            method: "PATCH",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                unlink_from_tree: {
                    tree_blueprint_id: blueprint.id,
                    parent_id: entry.parent_id,
                },
            }),
        }).then(() => {
            setSelectedId(null);
            fetchTree();
        });
    }

    function handleRelink(entry: TreeNode) {
        const unlinkInfo = (
            entry as TreeNode & { unlinked_from?: { parent_id: number } }
        ).unlinked_from;
        const restoreParentId = unlinkInfo?.parent_id ?? null;
        fetch(`/api/v1/entries/${entry.id}/meta`, {
            method: "PATCH",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ relink_to_tree: restoreParentId }),
        }).then(() => {
            setSelectedId(null);
            fetchTree();
        });
    }

    function handleReparent(
        entryId: number,
        newParentId: number | null,
        newIndex?: number,
    ) {
        // Optimistic update
        setSavingEntryId(entryId);
        setAllEntries((prev) => {
            const next = prev.map((e) => ({ ...e })); // shallow clone all
            const entry = next.find((e) => e.id === entryId);
            if (!entry) return prev;

            // Get new siblings (excluding moved entry)
            const newSiblings = next
                .filter((e) => e.parent_id === newParentId && e.id !== entryId)
                .sort((a, b) => a.sort_order - b.sort_order);

            const insertAt =
                newIndex !== undefined
                    ? Math.min(newIndex, newSiblings.length)
                    : newSiblings.length;
            newSiblings.splice(insertAt, 0, entry);
            newSiblings.forEach((e, i) => {
                e.sort_order = i + 1;
            });

            entry.parent_id = newParentId;

            return next;
        });

        // Expand the target so the moved entry is visible
        if (newParentId !== null) {
            setExpandedIds((prev) => new Set([...prev, newParentId]));
        }

        // Persist
        fetch(`/api/v1/entries/${entryId}/reparent`, {
            method: "PUT",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                parent_id: newParentId,
                insert_at: newIndex ?? null,
            }),
        })
            .then(() => setSavingEntryId(null))
            .catch(() => {
                setSavingEntryId(null);
                fetchTree();
            });
    }

    function handleReorder(_parentId: number | null, orderedIds: number[]) {
        // Optimistic update
        setAllEntries((prev) => {
            const updated = [...prev];
            orderedIds.forEach((id, i) => {
                const entry = updated.find((e) => e.id === id);
                if (entry) entry.sort_order = i + 1;
            });
            return updated;
        });

        // Persist
        const entries = orderedIds.map((id, i) => ({ id, sort_order: i + 1 }));
        fetch(`/api/v1/projects/${projectId}/entries/reorder`, {
            method: "PUT",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ entries }),
        }).catch(() => fetchTree()); // rollback on error
    }

    function handleCreated(entryId: number) {
        setCreateParentId(undefined);
        if (createParentId !== null && createParentId !== undefined) {
            setExpandedIds((prev) => new Set([...prev, createParentId]));
        }
        fetchTree();
        setSelectedId(entryId);
    }

    const localStructureSettings = structureSettings ?? {};

    // Apply max_depth filtering
    const displayEntries = useMemo(() => {
        const maxDepth = localStructureSettings.max_depth;
        if (!isSubtree || !maxDepth || maxDepth <= 0) return allEntries;

        // BFS to tag depth of each entry relative to rootEntryId
        const depthMap = new Map<number, number>();
        for (const e of allEntries) {
            if (e.parent_id === rootEntryId) depthMap.set(e.id, 1);
        }
        let changed = true;
        while (changed) {
            changed = false;
            for (const e of allEntries) {
                if (
                    !depthMap.has(e.id) &&
                    e.parent_id &&
                    depthMap.has(e.parent_id)
                ) {
                    depthMap.set(e.id, depthMap.get(e.parent_id)! + 1);
                    changed = true;
                }
            }
        }
        return allEntries.filter((e) => (depthMap.get(e.id) ?? 0) <= maxDepth);
    }, [allEntries, rootEntryId]);

    // Rebuild childrenMap from filtered entries
    const filteredChildrenMap = useMemo(() => {
        const map = new Map<number | null, TreeNode[]>();
        for (const entry of displayEntries) {
            const parentKey = entry.parent_id;
            if (!map.has(parentKey)) map.set(parentKey, []);
            map.get(parentKey)!.push(entry);
        }
        for (const [, children] of map) {
            children.sort((a, b) => a.sort_order - b.sort_order);
        }
        return map;
    }, [displayEntries]);

    // Use filtered map for subtree, original for full tree
    const activeChildrenMap = isSubtree ? filteredChildrenMap : childrenMap;
    const activeRootEntries = useMemo(() => {
        if (isSubtree)
            return displayEntries.filter((e) => e.parent_id === rootEntryId);
        return rootEntries;
    }, [displayEntries, rootEntryId, rootEntries]);

    const activeTrueRoots = useMemo(() => {
        if (isSubtree) return activeRootEntries.filter((e) => !e.unlinked_from);
        return trueRoots;
    }, [activeRootEntries, trueRoots]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <i
                    className="fa-solid fa-circle-notch fa-spin text-xl"
                    style={subtitle20}
                />
            </div>
        );
    }

    // ─── List View (simple card list for subtree mode) ───
    if (isSubtree && localStructureSettings.show_as === "list") {
        return (
            <div>
                {/* Cards */}
                <div className="grid gap-2">
                    {activeTrueRoots.map((item) => {
                        const bpSlug = item.blueprint_slug ?? blueprint.slug;
                        const url = `/p/${project.slug}/${bpSlug}/${item.slug}`;
                        const iconClass = item.blueprint_slug
                            ? "fa-solid fa-cube"
                            : blueprint.icon?.includes(" ")
                              ? blueprint.icon
                              : `fa-solid ${blueprint.icon}`;
                        return (
                            <a
                                key={item.id}
                                href={url}
                                className="alex-row flex items-center gap-3 px-4 py-3"
                                style={listCardStyle}
                            >
                                <i
                                    className={`${iconClass} w-5 text-center`}
                                    style={subtitle30}
                                />
                                <div className="flex-1">
                                    <span
                                        className={`text-sm ${item.is_stub ? "" : "font-medium"}`}
                                        style={
                                            item.is_stub
                                                ? subtitle50
                                                : undefined
                                        }
                                    >
                                        {item.name}
                                    </span>
                                    {item.summary && (
                                        <p
                                            className="mt-0.5 line-clamp-1 text-xs"
                                            style={subtitle40}
                                        >
                                            {item.summary}
                                        </p>
                                    )}
                                </div>
                                {item.is_stub && (
                                    <span style={stubBadgeStyle}>
                                        {t("blueprints.entries.status.stub")}
                                    </span>
                                )}
                            </a>
                        );
                    })}
                </div>
            </div>
        );
    }

    const treeCount = isSubtree ? displayEntries.length : total;

    return (
        <div className="flex min-h-[60vh] gap-6">
            {/* Left: Tree list (golden ratio ~38.2%) */}
            <div className="flex-[0_0_38.2%]" style={panelShellStyle}>
                <div
                    className="flex h-full flex-col overflow-hidden"
                    style={panelInnerStyle}
                >
                    {/* Sidebar header */}
                    <div className="px-4 py-3" style={panelHeaderStyle}>
                        <div className="mb-2">
                            <Input
                                icon="fa-solid fa-magnifying-glass"
                                size="xs"
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.currentTarget.value)
                                }
                                placeholder={t(
                                    "blueprints.tree.search_placeholder",
                                )}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs" style={subtitle40}>
                                {t(
                                    treeCount === 1
                                        ? "blueprints.tree.entry_count.singular"
                                        : "blueprints.tree.entry_count.plural",
                                ).replace(":count", String(treeCount))}
                            </span>
                            <div className="flex gap-1">
                                <Tooltip
                                    content={t("blueprints.tree.expand_all")}
                                >
                                    <button
                                        type="button"
                                        onClick={expandAll}
                                        className={ghostIconBtnClass}
                                        style={ghostIconBtnStyle}
                                    >
                                        <i className="fa-solid fa-angles-down text-[10px]" />
                                    </button>
                                </Tooltip>
                                <Tooltip
                                    content={t("blueprints.tree.collapse_all")}
                                >
                                    <button
                                        type="button"
                                        onClick={collapseAll}
                                        className={ghostIconBtnClass}
                                        style={ghostIconBtnStyle}
                                    >
                                        <i className="fa-solid fa-angles-up text-[10px]" />
                                    </button>
                                </Tooltip>
                                <Tooltip
                                    content={
                                        rearrangeMode
                                            ? t(
                                                  "blueprints.tree.exit_rearrange",
                                              )
                                            : t("blueprints.tree.rearrange")
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRearrangeMode(!rearrangeMode);
                                            setDraggingParentId(undefined);
                                        }}
                                        className={
                                            rearrangeMode
                                                ? primaryIconBtnClass
                                                : ghostIconBtnClass
                                        }
                                        style={ghostIconBtnStyle}
                                    >
                                        <i className="fa-solid fa-grip-vertical text-[10px]" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {/* Tree */}
                    <div
                        ref={treeScrollRef}
                        className="max-h-[calc(60vh-80px)] overflow-y-auto p-2"
                    >
                        {activeTrueRoots.length === 0 &&
                        orphans.length === 0 ? (
                            <div className="py-8 text-center">
                                <i
                                    className="fa-solid fa-folder-open mb-2 text-xl"
                                    style={subtitle20}
                                />
                                <p className="text-sm" style={subtitle40}>
                                    {t("blueprints.tree.empty")}
                                </p>
                            </div>
                        ) : (
                            <>
                                {activeTrueRoots.length > 0 && (
                                    <SortableTree
                                        entries={activeTrueRoots}
                                        depth={0}
                                        childrenMap={activeChildrenMap}
                                        expandedIds={expandedIds}
                                        selectedId={selectedId}
                                        matchingIds={matchingIds}
                                        onToggle={toggleExpand}
                                        onSelect={setSelectedId}
                                        rearrangeMode={rearrangeMode}
                                        draggingParentId={draggingParentId}
                                        savingEntryId={savingEntryId}
                                        projectSlug={project.slug}
                                        onDragStart={(parentId) =>
                                            setDraggingParentId(parentId)
                                        }
                                        onDragEnd={() =>
                                            setDraggingParentId(undefined)
                                        }
                                        onReorder={(parentId, orderedIds) =>
                                            handleReorder(parentId, orderedIds)
                                        }
                                        onReparent={handleReparent}
                                    />
                                )}

                                {orphans.length > 0 && (
                                    <>
                                        <div style={sectionDividerStyle} />
                                        <div
                                            className="alex-row flex cursor-pointer items-center gap-1 px-2 py-1 text-sm"
                                            style={{
                                                ...warningSoftStyle,
                                                borderRadius:
                                                    "var(--theme-radius-button)",
                                            }}
                                            onClick={() =>
                                                setUnsortedExpanded(
                                                    !unsortedExpanded,
                                                )
                                            }
                                        >
                                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                                                <i
                                                    className={`fa-solid fa-chevron-right text-[9px] transition-transform duration-150 ${unsortedExpanded ? "rotate-90" : ""}`}
                                                />
                                            </span>
                                            <i className="fa-solid fa-inbox text-xs" />
                                            <span className="flex-1">
                                                {t("blueprints.tree.unsorted")}
                                            </span>
                                            <span className="text-[10px]">
                                                {orphans.length}
                                            </span>
                                        </div>
                                        {unsortedExpanded && (
                                            <div>
                                                <SortableTree
                                                    entries={orphans}
                                                    depth={1}
                                                    childrenMap={
                                                        activeChildrenMap
                                                    }
                                                    expandedIds={expandedIds}
                                                    selectedId={selectedId}
                                                    matchingIds={matchingIds}
                                                    onToggle={toggleExpand}
                                                    onSelect={setSelectedId}
                                                    rearrangeMode={
                                                        rearrangeMode
                                                    }
                                                    draggingParentId={
                                                        draggingParentId
                                                    }
                                                    savingEntryId={
                                                        savingEntryId
                                                    }
                                                    projectSlug={project.slug}
                                                    onDragStart={(parentId) =>
                                                        setDraggingParentId(
                                                            parentId,
                                                        )
                                                    }
                                                    onDragEnd={() =>
                                                        setDraggingParentId(
                                                            undefined,
                                                        )
                                                    }
                                                    onReorder={(
                                                        parentId,
                                                        orderedIds,
                                                    ) =>
                                                        handleReorder(
                                                            parentId,
                                                            orderedIds,
                                                        )
                                                    }
                                                    onReparent={handleReparent}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {unlinked.length > 0 && (
                                    <>
                                        <div style={sectionDividerStyle} />
                                        <div
                                            className="alex-row flex cursor-pointer items-center gap-1 px-2 py-1 text-sm"
                                            style={{
                                                ...errorSoftStyle,
                                                borderRadius:
                                                    "var(--theme-radius-button)",
                                            }}
                                            onClick={() =>
                                                setRemovedExpanded(
                                                    !removedExpanded,
                                                )
                                            }
                                        >
                                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                                                <i
                                                    className={`fa-solid fa-chevron-right text-[9px] transition-transform duration-150 ${removedExpanded ? "rotate-90" : ""}`}
                                                />
                                            </span>
                                            <i className="fa-solid fa-trash-can-arrow-up text-xs" />
                                            <span className="flex-1">
                                                {t(
                                                    "blueprints.tree.recently_removed",
                                                )}
                                            </span>
                                            <span className="text-[10px]">
                                                {unlinked.length}
                                            </span>
                                        </div>
                                        {removedExpanded && (
                                            <div className="pl-3">
                                                {unlinked.map((entry) => {
                                                    const isSelected =
                                                        selectedId === entry.id;
                                                    return (
                                                        <div
                                                            key={entry.id}
                                                            className="alex-row flex cursor-pointer items-center gap-1.5 py-1 pl-[26px] pr-2 text-sm"
                                                            style={{
                                                                borderRadius:
                                                                    "var(--theme-radius-button)",
                                                                ...(isSelected
                                                                    ? selectedRowStyle
                                                                    : subtitle40),
                                                            }}
                                                            onClick={() =>
                                                                setSelectedId(
                                                                    entry.id,
                                                                )
                                                            }
                                                        >
                                                            <i
                                                                className="fa-solid fa-arrow-up-right-from-square text-[9px]"
                                                                style={{
                                                                    color: "color-mix(in srgb, var(--theme-status-error-stroke) 30%, transparent)",
                                                                }}
                                                            />
                                                            <span
                                                                className={`flex-1 truncate ${isSelected ? "font-medium" : ""}`}
                                                            >
                                                                {entry.name}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {/* Add root buttons */}
                    <div className="px-3 py-3" style={panelFooterDividerStyle}>
                        <button
                            type="button"
                            onClick={() => startCreate(null)}
                            className="alex-row inline-flex w-full items-center justify-center gap-1.5 py-1.5 text-sm font-medium"
                            style={addRootBtnStyle}
                        >
                            <i className="fa-solid fa-plus text-[10px]" />{" "}
                            {t("blueprints.tree.add")}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Detail Panel */}
            <div className="flex-1" style={panelShellStyle}>
                <div className="h-full overflow-hidden" style={panelInnerStyle}>
                    {selected ? (
                        <div>
                            {/* Title bar */}
                            <div className="px-5 py-3" style={panelHeaderStyle}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <i
                                            className={`text-sm ${entryIconClass(selected, selectedChildren.length > 0)}`}
                                            style={entryIconStyle(
                                                selected,
                                                selectedChildren.length > 0,
                                            )}
                                        />
                                        <h2 className="text-lg font-bold">
                                            {selected.name}
                                        </h2>
                                        {selected.blueprint_slug && (
                                            <span style={blueprintBadgeStyle}>
                                                {selected.blueprint_slug
                                                    .replace(/-/g, " ")
                                                    .replace(/\b\w/g, (c) =>
                                                        c.toUpperCase(),
                                                    )}
                                            </span>
                                        )}
                                        {!selected.is_stub && (
                                            <Tooltip
                                                content={t(
                                                    "blueprints.tree.detail.view_entry",
                                                )}
                                            >
                                                <a
                                                    href={`/p/${project.slug}/${selected.blueprint_slug ?? blueprint.slug}/${selected.slug}`}
                                                    className="transition-colors"
                                                    style={subtitle30}
                                                >
                                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                                                </a>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-1.5">
                                        {selected.unlinked_from ? (
                                            <ActionButton
                                                icon="fa-solid fa-rotate-left"
                                                label={t(
                                                    "blueprints.tree.detail.restore",
                                                )}
                                                variant="success"
                                                size="xs"
                                                onClick={() =>
                                                    handleRelink(selected)
                                                }
                                            />
                                        ) : (
                                            <ActionButton
                                                icon="fa-solid fa-plus"
                                                label={t("blueprints.tree.add")}
                                                variant="primary"
                                                size="xs"
                                                onClick={() =>
                                                    startCreate(selected.id)
                                                }
                                            />
                                        )}
                                        {/* 3-dot menu (not shown for unlinked entries) */}
                                        {!selected.unlinked_from && (
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowNodeMenu(
                                                            !showNodeMenu,
                                                        )
                                                    }
                                                    className={
                                                        ghostIconBtnClass
                                                    }
                                                    style={ghostIconBtnStyle}
                                                >
                                                    <i className="fa-solid fa-ellipsis-vertical text-xs" />
                                                </button>
                                                {showNodeMenu && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={() =>
                                                                setShowNodeMenu(
                                                                    false,
                                                                )
                                                            }
                                                        />
                                                        <div
                                                            className="absolute right-0 top-full z-50 mt-1 w-48"
                                                            style={
                                                                dropdownMenuStyle
                                                            }
                                                        >
                                                            {!isSubtree && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setShowNodeMenu(
                                                                            false,
                                                                        );
                                                                        saveTreeDefault(
                                                                            defaultEntryId ===
                                                                                selected.id
                                                                                ? null
                                                                                : selected.id,
                                                                        );
                                                                    }}
                                                                    className="alex-row flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                                                                    style={{
                                                                        borderBottom:
                                                                            "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
                                                                    }}
                                                                >
                                                                    <i
                                                                        className="fa-solid fa-map-pin w-4 text-center text-xs"
                                                                        style={
                                                                            defaultEntryId ===
                                                                            selected.id
                                                                                ? warningIconStyle
                                                                                : crossBpIconStyle
                                                                        }
                                                                    />
                                                                    <span>
                                                                        {defaultEntryId ===
                                                                        selected.id
                                                                            ? t(
                                                                                  "blueprints.tree.detail.clear_default",
                                                                              )
                                                                            : t(
                                                                                  "blueprints.tree.detail.set_default",
                                                                              )}
                                                                    </span>
                                                                </button>
                                                            )}
                                                            {selected.is_stub ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setShowNodeMenu(
                                                                            false,
                                                                        );
                                                                        setShowConvertModal(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    className="alex-row flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                                                                    style={{
                                                                        borderBottom:
                                                                            "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
                                                                    }}
                                                                >
                                                                    <i
                                                                        className="fa-solid fa-file-circle-plus w-4 text-center text-xs"
                                                                        style={
                                                                            liveEntryIconStyle
                                                                        }
                                                                    />
                                                                    <span>
                                                                        {t(
                                                                            "blueprints.tree.detail.convert_to_entry",
                                                                        )}
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setShowNodeMenu(
                                                                            false,
                                                                        );
                                                                        handleRevertToStub(
                                                                            selected,
                                                                        );
                                                                    }}
                                                                    className="alex-row flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                                                                    style={{
                                                                        borderBottom:
                                                                            "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
                                                                    }}
                                                                >
                                                                    <i
                                                                        className="fa-solid fa-file-circle-minus w-4 text-center text-xs"
                                                                        style={
                                                                            warningIconStyle
                                                                        }
                                                                    />
                                                                    <span>
                                                                        {selected.has_children
                                                                            ? t(
                                                                                  "blueprints.tree.detail.revert_to_folder",
                                                                              )
                                                                            : t(
                                                                                  "blueprints.tree.detail.revert_to_stub",
                                                                              )}
                                                                    </span>
                                                                </button>
                                                            )}
                                                            {selected.blueprint_slug ? (
                                                                /* Cross-blueprint entry: unlink from tree */
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setShowNodeMenu(
                                                                            false,
                                                                        );
                                                                        handleUnlink(
                                                                            selected,
                                                                        );
                                                                    }}
                                                                    className="alex-row flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                                                                >
                                                                    <i
                                                                        className="fa-solid fa-link-slash w-4 text-center text-xs"
                                                                        style={
                                                                            warningIconStyle
                                                                        }
                                                                    />
                                                                    <span>
                                                                        {t(
                                                                            "blueprints.tree.detail.unlink",
                                                                        )}
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                /* Native entry: archive */
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setShowNodeMenu(
                                                                            false,
                                                                        );
                                                                        setArchiveEntry(
                                                                            selected,
                                                                        );
                                                                    }}
                                                                    className="alex-row flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                                                                >
                                                                    <i
                                                                        className="fa-solid fa-box-archive w-4 text-center text-xs"
                                                                        style={
                                                                            warningIconStyle
                                                                        }
                                                                    />
                                                                    <span>
                                                                        {t(
                                                                            "blueprints.tree.detail.archive",
                                                                        )}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Breadcrumb — for deep paths, collapse the middle
                                so we show [top] … [most-recent-3-parents] [current],
                                keeping the most-actionable context visible while
                                preventing the bar from wrapping endlessly. */}
                                {breadcrumb.length > 1 &&
                                    (() => {
                                        // 1 (top) + 3 most-recent parents + current = 5 items.
                                        const MAX_VISIBLE = 5;
                                        const collapsed =
                                            breadcrumb.length > MAX_VISIBLE;
                                        const head = breadcrumb[0];
                                        const tail = collapsed
                                            ? breadcrumb.slice(-4)
                                            : breadcrumb.slice(1);
                                        const hiddenCount = collapsed
                                            ? breadcrumb.length - 5
                                            : 0;

                                        return (
                                            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                                                {/* Top-level (always shown) */}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedId(head.id)
                                                    }
                                                    className="transition-colors"
                                                    style={
                                                        head.id === selected.id
                                                            ? subtitle60
                                                            : subtitle40
                                                    }
                                                >
                                                    {head.name}
                                                </button>

                                                {/* Collapsed middle */}
                                                {collapsed && (
                                                    <>
                                                        <i
                                                            className="fa-solid fa-chevron-right text-[7px]"
                                                            style={subtitle20}
                                                        />
                                                        <Tooltip
                                                            content={t(
                                                                hiddenCount ===
                                                                    1
                                                                    ? "blueprints.tree.intermediate_hidden.singular"
                                                                    : "blueprints.tree.intermediate_hidden.plural",
                                                            ).replace(
                                                                ":count",
                                                                String(
                                                                    hiddenCount,
                                                                ),
                                                            )}
                                                        >
                                                            <span
                                                                className="cursor-default"
                                                                style={
                                                                    subtitle30
                                                                }
                                                            >
                                                                …
                                                            </span>
                                                        </Tooltip>
                                                    </>
                                                )}

                                                {/* Tail — when collapsed: last 3 parents + current.
                                            When not collapsed: everything between top and current. */}
                                                {tail.map((node) => (
                                                    <span
                                                        key={node.id}
                                                        className="flex items-center gap-1.5"
                                                    >
                                                        <i
                                                            className="fa-solid fa-chevron-right text-[7px]"
                                                            style={subtitle20}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedId(
                                                                    node.id,
                                                                )
                                                            }
                                                            className="transition-colors"
                                                            style={
                                                                node.id ===
                                                                selected.id
                                                                    ? subtitle60
                                                                    : subtitle40
                                                            }
                                                        >
                                                            {node.name}
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        );
                                    })()}
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                {selected.summary_html ? (
                                    <MentionAwareContent
                                        html={selected.summary_html}
                                        className="prose prose-sm mb-4 max-w-none"
                                        style={subtitle70}
                                    />
                                ) : selected.summary ? (
                                    <p
                                        className="mb-4 text-sm"
                                        style={subtitle60}
                                    >
                                        {selected.summary}
                                    </p>
                                ) : null}

                                {/* Direct children */}
                                {selectedChildren.length > 0 && (
                                    <div className="mt-6">
                                        <h3
                                            className="mb-2 flex items-center gap-2 text-sm font-semibold"
                                            style={subtitle60}
                                        >
                                            <i className="fa-solid fa-folder-tree text-xs" />
                                            <span>
                                                {t(
                                                    "blueprints.tree.detail.children",
                                                )}
                                            </span>
                                            <span style={countBadgeStyle}>
                                                {selectedChildren.length}
                                            </span>
                                        </h3>
                                        <div style={childListShellStyle}>
                                            {selectedChildren.map(
                                                (child, i) => (
                                                    <button
                                                        key={child.id}
                                                        type="button"
                                                        className="alex-row group/child flex w-full items-center gap-3 px-3 py-2 text-left"
                                                        style={
                                                            i ===
                                                            selectedChildren.length -
                                                                1
                                                                ? undefined
                                                                : childRowDividerStyle
                                                        }
                                                        onClick={() => {
                                                            setSelectedId(
                                                                child.id,
                                                            );
                                                            if (
                                                                child.has_children
                                                            )
                                                                toggleExpand(
                                                                    child.id,
                                                                );
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                ...childCardIconTileStyle,
                                                                ...entryIconStyle(
                                                                    child,
                                                                    child.has_children,
                                                                ),
                                                            }}
                                                        >
                                                            <i
                                                                className={`text-sm ${entryIconClass(child, child.has_children)}`}
                                                            />
                                                        </span>
                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                                            {child.name}
                                                        </span>
                                                        {child.has_children && (
                                                            <span
                                                                style={
                                                                    childCardCountStyle
                                                                }
                                                            >
                                                                {t(
                                                                    "blueprints.tree.detail.child_count",
                                                                ).replace(
                                                                    ":count",
                                                                    String(
                                                                        child.children_count,
                                                                    ),
                                                                )}
                                                            </span>
                                                        )}
                                                        <i
                                                            className="fa-solid fa-chevron-right text-[10px] opacity-0 transition-opacity duration-150 group-hover/child:opacity-60"
                                                            style={subtitle40}
                                                        />
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* No selection — show summary */
                        <div className="flex h-full items-center justify-center p-8">
                            <div className="text-center">
                                <div
                                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                                    style={emptyIconWrapStyle}
                                >
                                    <i
                                        className="fa-solid fa-sitemap text-2xl"
                                        style={subtitle20}
                                    />
                                </div>
                                <h3
                                    className="text-lg font-semibold"
                                    style={subtitle50}
                                >
                                    {t("blueprints.tree.detail.empty_title")}
                                </h3>
                                <p className="mt-1 text-sm" style={subtitle30}>
                                    {t(
                                        rootCount === 1
                                            ? "blueprints.tree.detail.empty_subtitle.singular"
                                            : "blueprints.tree.detail.empty_subtitle.plural",
                                    )
                                        .replace(":total", String(total))
                                        .replace(":roots", String(rootCount))}
                                </p>
                                <p className="mt-3 text-xs" style={subtitle30}>
                                    {t("blueprints.tree.detail.empty_hint")}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Archive modal */}
            {archiveEntry && (
                <ArchiveEntryModal
                    open
                    entryId={archiveEntry.id}
                    entryName={archiveEntry.name}
                    projectId={projectId}
                    onClose={() => setArchiveEntry(null)}
                    onArchived={() => {
                        setArchiveEntry(null);
                        setSelectedId(null);
                        fetchTree();
                    }}
                />
            )}

            {/* Add Entry Modal */}
            {createParentId !== undefined && (
                <AddEntryModal
                    parentId={createParentId}
                    parentEntry={
                        createParentId !== null
                            ? (allEntries.find(
                                  (e) => e.id === createParentId,
                              ) ?? null)
                            : null
                    }
                    projectId={projectId}
                    blueprint={blueprint}
                    projectBlueprints={projectBlueprints}
                    onCreated={handleCreated}
                    onClose={() => setCreateParentId(undefined)}
                />
            )}

            {/* Convert to Entry Modal */}
            {showConvertModal &&
                selected?.is_stub &&
                (() => {
                    const parent = selected.parent_id
                        ? allEntries.find((e) => e.id === selected.parent_id)
                        : null;
                    const parentBpIds = parent?.child_blueprint_ids ?? [];
                    return (
                        <ConvertStubModal
                            entry={selected}
                            projectId={projectId}
                            projectBlueprints={projectBlueprints}
                            parentChildBlueprintIds={parentBpIds}
                            onClose={() => setShowConvertModal(false)}
                            onConverted={() => {
                                setShowConvertModal(false);
                                fetchTree();
                            }}
                        />
                    );
                })()}

            {/* Blueprint Settings Modal */}
            <ColumnConfigModal
                open={showSettingsModal}
                onClose={() => {
                    setShowSettingsModal(false);
                    setSettingsInitialMenu(undefined);
                }}
                columns={[]}
                sortableColumns={[]}
                availableColumns={[]}
                onChange={() => {}}
                onSortableChange={() => {}}
                blueprintName={blueprint.name}
                blueprint={blueprint}
                project={project}
                listableBlueprints={listableBlueprints}
                relationshipBlueprints={relationshipBlueprints}
                referencingRelationshipBlueprints={
                    referencingRelationshipBlueprints
                }
                initialMenu={settingsInitialMenu}
            />
        </div>
    );
}

/* ── Entry Fields Editor ── */

/* ── Convert Stub Modal ── */

/* ── Recursive Tree Node ── */

/* ── Sortable Tree wrapper ── */

function SortableTree({
    entries,
    depth,
    childrenMap,
    expandedIds,
    selectedId,
    matchingIds,
    onToggle,
    onSelect,
    rearrangeMode,
    draggingParentId,
    savingEntryId,
    projectSlug,
    onDragStart,
    onDragEnd,
    onReorder,
    onReparent,
}: {
    entries: TreeNode[];
    depth: number;
    childrenMap: Map<number | null, TreeNode[]>;
    expandedIds: Set<number>;
    selectedId: number | null;
    matchingIds: Set<number> | null;
    onToggle: (id: number) => void;
    onSelect: (id: number) => void;
    rearrangeMode: boolean;
    draggingParentId: number | null | undefined;
    savingEntryId: number | null;
    projectSlug: string;
    onDragStart: (parentId: number | null) => void;
    onDragEnd: () => void;
    onReorder: (parentId: number | null, orderedIds: number[]) => void;
    onReparent: (
        entryId: number,
        newParentId: number | null,
        newIndex?: number,
    ) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sortableInstance = useRef<Sortable | null>(null);
    const parentId = entries[0]?.parent_id ?? null;
    const entriesRef = useRef(entries);
    entriesRef.current = entries;
    const onDragStartRef = useRef(onDragStart);
    const onDragEndRef = useRef(onDragEnd);
    const onReorderRef = useRef(onReorder);
    const onReparentRef = useRef(onReparent);
    onDragStartRef.current = onDragStart;
    onDragEndRef.current = onDragEnd;
    onReorderRef.current = onReorder;
    onReparentRef.current = onReparent;

    useEffect(() => {
        if (!rearrangeMode || !containerRef.current) return;

        sortableInstance.current = Sortable.create(containerRef.current, {
            group: "tree",
            handle: ".drag-handle",
            animation: 150,
            ghostClass: "opacity-30",
            onStart: () => onDragStartRef.current(parentId),
            onEnd: (evt) => {
                onDragEndRef.current();
                // Same group reorder
                if (evt.from === evt.to) {
                    const { oldIndex, newIndex } = evt;
                    if (
                        oldIndex === undefined ||
                        newIndex === undefined ||
                        oldIndex === newIndex
                    )
                        return;
                    const reordered = [...entriesRef.current];
                    const [moved] = reordered.splice(oldIndex, 1);
                    reordered.splice(newIndex, 0, moved);
                    onReorderRef.current(
                        parentId,
                        reordered.map((e) => e.id),
                    );
                }
            },
            onAdd: (evt) => {
                // Capture position BEFORE reverting DOM
                const newIndex = evt.newIndex ?? 0;
                const entryId = Number(evt.item.getAttribute("data-id"));

                // Revert SortableJS DOM move — React will re-render from state
                try {
                    evt.from.appendChild(evt.item);
                } catch (_) {
                    /* ignore */
                }

                onDragEndRef.current();
                if (entryId) {
                    onReparentRef.current(entryId, parentId, newIndex);
                }
            },
        });

        return () => {
            sortableInstance.current?.destroy();
            sortableInstance.current = null;
        };
    }, [rearrangeMode, parentId, entries.length]);

    return (
        <div ref={containerRef}>
            {entries.map((entry) => (
                <TreeNodeItem
                    key={entry.id}
                    entry={entry}
                    depth={depth}
                    childrenMap={childrenMap}
                    expandedIds={expandedIds}
                    selectedId={selectedId}
                    matchingIds={matchingIds}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    rearrangeMode={rearrangeMode}
                    draggingParentId={draggingParentId}
                    savingEntryId={savingEntryId}
                    projectSlug={projectSlug}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onReorder={onReorder}
                    onReparent={onReparent}
                />
            ))}
        </div>
    );
}

/* ── Tree Node Item (wraps row + sortable children) ── */

function TreeNodeItem({
    entry,
    depth,
    childrenMap,
    expandedIds,
    selectedId,
    matchingIds,
    onToggle,
    onSelect,
    rearrangeMode,
    draggingParentId,
    savingEntryId,
    projectSlug,
    onDragStart,
    onDragEnd,
    onReorder,
    onReparent,
}: {
    entry: TreeNode;
    depth: number;
    childrenMap: Map<number | null, TreeNode[]>;
    expandedIds: Set<number>;
    selectedId: number | null;
    matchingIds: Set<number> | null;
    onToggle: (id: number) => void;
    onSelect: (id: number) => void;
    rearrangeMode: boolean;
    draggingParentId: number | null | undefined;
    savingEntryId: number | null;
    projectSlug: string;
    onDragStart: (parentId: number | null) => void;
    onDragEnd: () => void;
    onReorder: (parentId: number | null, orderedIds: number[]) => void;
    onReparent: (
        entryId: number,
        newParentId: number | null,
        newIndex?: number,
    ) => void;
}) {
    if (matchingIds && !matchingIds.has(entry.id)) return null;

    const isExpanded = expandedIds.has(entry.id);
    const children = childrenMap.get(entry.id) ?? [];

    return (
        <div data-id={entry.id}>
            <TreeNodeRow
                entry={entry}
                depth={depth}
                childrenMap={childrenMap}
                expandedIds={expandedIds}
                selectedId={selectedId}
                matchingIds={matchingIds}
                onToggle={onToggle}
                onSelect={onSelect}
                rearrangeMode={rearrangeMode}
                draggingParentId={draggingParentId}
                savingEntryId={savingEntryId}
                projectSlug={projectSlug}
            />
            {isExpanded && children.length > 0 && (
                <SortableTree
                    entries={children}
                    depth={depth + 1}
                    childrenMap={childrenMap}
                    expandedIds={expandedIds}
                    selectedId={selectedId}
                    matchingIds={matchingIds}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    rearrangeMode={rearrangeMode}
                    draggingParentId={draggingParentId}
                    savingEntryId={savingEntryId}
                    projectSlug={projectSlug}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onReorder={onReorder}
                    onReparent={onReparent}
                />
            )}
        </div>
    );
}

/* ── Tree Node Row (visual only) ── */

function TreeNodeRow({
    entry,
    depth,
    childrenMap,
    expandedIds,
    selectedId,
    matchingIds,
    onToggle,
    onSelect,
    rearrangeMode,
    draggingParentId,
    savingEntryId,
    projectSlug,
}: {
    entry: TreeNode;
    depth: number;
    childrenMap: Map<number | null, TreeNode[]>;
    expandedIds: Set<number>;
    selectedId: number | null;
    matchingIds: Set<number> | null;
    onToggle: (id: number) => void;
    onSelect: (id: number) => void;
    rearrangeMode: boolean;
    draggingParentId: number | null | undefined;
    savingEntryId: number | null;
    projectSlug: string;
}) {
    const t = useT();

    if (matchingIds && !matchingIds.has(entry.id)) return null;

    const isExpanded = expandedIds.has(entry.id);
    const isSelected = selectedId === entry.id;
    const children = childrenMap.get(entry.id) ?? [];
    const hasVisibleChildren = children.length > 0;

    // When dragging, fade entries that aren't siblings of the dragged item
    const isDragging = draggingParentId !== undefined;
    const isSiblingOfDrag = isDragging && entry.parent_id === draggingParentId;
    const faded = isDragging && !isSiblingOfDrag;

    return (
        <>
            <div
                data-id={entry.id}
                className={`alex-row group flex items-center gap-1 px-2 py-1 text-sm
                    ${rearrangeMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
                    ${faded ? "opacity-30" : ""}`}
                style={{
                    paddingLeft: `${depth * 18 + (rearrangeMode ? 4 : 8)}px`,
                    borderRadius: "var(--theme-radius-button)",
                    ...(isSelected ? selectedRowStyle : {}),
                }}
                onClick={() => !rearrangeMode && onSelect(entry.id)}
            >
                {/* Drag handle in rearrange mode */}
                {rearrangeMode && (
                    <span
                        className="drag-handle flex h-5 w-5 flex-shrink-0 items-center justify-center"
                        style={subtitle30}
                    >
                        <i className="fa-solid fa-grip-vertical text-[9px]" />
                    </span>
                )}

                {/* Expand/collapse toggle (always visible) */}
                <button
                    type="button"
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasVisibleChildren) onToggle(entry.id);
                    }}
                >
                    {hasVisibleChildren ? (
                        <i
                            className={`fa-solid fa-chevron-right text-[9px] transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                            style={subtitle40}
                        />
                    ) : (
                        <span
                            className="h-1 w-1 rounded-full"
                            style={{
                                background:
                                    "color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
                            }}
                        />
                    )}
                </button>

                {/* Name */}
                <span
                    className={`flex-1 truncate ${isSelected ? "font-medium" : ""}`}
                >
                    <i
                        className={`mr-2 w-4 text-center text-xs ${entryIconClass(entry, hasVisibleChildren)}`}
                        style={entryIconStyle(entry, hasVisibleChildren)}
                    />
                    {entry.name}
                </span>

                {/* Open-in-Writing affordance — icon-only, stopPropagation keeps row select intact */}
                {entry.writing_work_slug && !rearrangeMode && (
                    <Tooltip content={t("entries.show.open_in_writing")}>
                        <a
                            href={`/works/${projectSlug}/${entry.writing_work_slug}`}
                            title={t("entries.show.open_in_writing")}
                            aria-label={t("entries.show.open_in_writing")}
                            onClick={(e) => e.stopPropagation()}
                            className={ghostIconBtnClass}
                            style={{
                                ...ghostIconBtnStyle,
                                color: "var(--theme-brand-primary-500)",
                            }}
                        >
                            <i className="fa-solid fa-feather text-[10px]" />
                        </a>
                    </Tooltip>
                )}

                {/* Saving indicator */}
                {savingEntryId === entry.id && (
                    <i
                        className="fa-solid fa-circle-notch fa-spin text-xs"
                        style={{ color: "var(--theme-brand-primary-500)" }}
                    />
                )}

                {/* Children count badge */}
                {hasVisibleChildren &&
                    !rearrangeMode &&
                    savingEntryId !== entry.id && (
                        <span className="text-[10px]" style={subtitle30}>
                            {children.length}
                        </span>
                    )}
            </div>
        </>
    );
}
