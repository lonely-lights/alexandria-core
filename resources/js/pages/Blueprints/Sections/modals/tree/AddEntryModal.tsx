import { type CSSProperties, useRef, useState } from "react";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Modal from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import type {
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";
import type { TreeNode } from "../../TreeView";
import EntryLinkSearch from "./EntryLinkSearch";
import {
    closeBtnStyle,
    headerStyle,
    inputStyle,
    listShellStyle,
    rowBorderStyle,
    selectedChipStyle,
    selectedRowStyle,
    subtitle40,
    subtitle50,
    subtitle60,
} from "./treeModalStyles";

/* Recipes specific to this modal — the tab bar and the children-
   blueprint selector wrapper don't appear in the sibling modals, so
   they stay local. */
const tabBarStyle: CSSProperties = {
    borderBottom: "1px solid var(--theme-base-300)",
};

const childSelectorWrapStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-200) 40%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

/* Tab pill = active vs idle. Active gets a 2px bottom border in the
   semantic color (folder=secondary, entry=success, link=primary) and
   matching text color. */
function tabActiveStyle(color: string): CSSProperties {
    return {
        borderBottom: `2px solid ${color}`,
        color,
    };
}

const tabIdleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

/**
 * Add an entry to the tree — three modes:
 *  - Folder: stub-only container for grouping
 *  - Entry:  full entry page with its own URL
 *  - Link:   attach an existing entry under a parent
 *
 * The parent's `child_blueprint_ids` list narrows which blueprints are
 * valid under it; if set, search results filter accordingly (togglable
 * via "Search all"). Newly-created folders/entries can carry their
 * own child_blueprint_ids via the shared selector at the bottom.
 */
export default function AddEntryModal({
    parentId,
    parentEntry,
    projectId,
    blueprint,
    projectBlueprints,
    onCreated,
    onClose,
}: {
    parentId: number | null;
    parentEntry: TreeNode | null;
    projectId: number;
    blueprint: BlueprintDetail;
    projectBlueprints: SiblingBlueprint[];
    onCreated: (entryId: number) => void;
    onClose: () => void;
}) {
    const t = useT();
    const parentChildBpIds = parentEntry?.child_blueprint_ids ?? [];
    const canLink = parentChildBpIds.length > 0;
    const effectiveBlueprintId =
        parentChildBpIds.length === 1 ? parentChildBpIds[0] : blueprint.id;
    const effectiveBpName =
        parentChildBpIds.length > 0
            ? parentChildBpIds
                  .map((id) => projectBlueprints.find((b) => b.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")
            : blueprint.name;

    const [mode, setMode] = useState<"folder" | "create" | "link">("folder");
    const [childBlueprintIds, setChildBlueprintIds] = useState<number[]>([]);
    const [showAllSearch, setShowAllSearch] = useState(false);

    // Create state
    const [name, setName] = useState("");
    const [summary, setSummary] = useState("");
    const [saving, setSaving] = useState(false);

    // Link state
    const [linkSearch, setLinkSearch] = useState("");
    const [linkResults, setLinkResults] = useState<
        Array<{
            id: number;
            name: string;
            blueprint_name: string;
            blueprint_id?: number;
        }>
    >([]);
    const [searching, setSearching] = useState(false);
    const [linking, setLinking] = useState(false);
    const [selectedLink, setSelectedLink] = useState<{
        id: number;
        name: string;
        blueprint_name: string;
    } | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleCreate() {
        if (!name.trim()) return;
        setSaving(true);
        fetch(`/api/v1/projects/${projectId}/tree/entries`, {
            method: "POST",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                name: name.trim(),
                blueprint_id: effectiveBlueprintId,
                parent_id: parentId,
                is_stub: true,
                summary: summary.trim() || undefined,
            }),
        })
            .then((r) => r.json())
            .then(async (data) => {
                const entryId = data.entry?.id;
                if (!entryId) {
                    setSaving(false);
                    return;
                }

                const metaPayload: Record<string, unknown> = {};
                if (childBlueprintIds.length > 0)
                    metaPayload.child_blueprint_ids = childBlueprintIds;

                if (Object.keys(metaPayload).length > 0) {
                    await fetch(`/api/v1/entries/${entryId}/meta`, {
                        method: "PATCH",
                        headers: {
                            ...csrfHeaders(),
                            "Content-Type": "application/json",
                        },
                        credentials: "same-origin",
                        body: JSON.stringify(metaPayload),
                    });
                }

                setSaving(false);
                onCreated(entryId);
            })
            .catch(() => setSaving(false));
    }

    function doSearch(query: string) {
        if (!query.trim()) {
            setLinkResults([]);
            return;
        }
        setSearching(true);
        fetch(
            `/api/v1/entries/search?q=${encodeURIComponent(query)}&project_id=${projectId}&limit=10`,
            {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            },
        )
            .then((r) => r.json())
            .then((data) => {
                const results = data.data ?? [];
                const filtered =
                    !showAllSearch && parentChildBpIds.length > 0
                        ? results.filter((r: { blueprint_id?: number }) =>
                              parentChildBpIds.includes(r.blueprint_id ?? 0),
                          )
                        : results;
                setLinkResults(filtered);
                setSearching(false);
            })
            .catch(() => setSearching(false));
    }

    function handleLinkSearchChange(value: string) {
        setLinkSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => doSearch(value), 250);
    }

    function handleLink() {
        if (!selectedLink) return;
        setLinking(true);
        const entryId = selectedLink.id;
        fetch(`/api/v1/entries/${entryId}/reparent`, {
            method: "PUT",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ parent_id: parentId }),
        })
            .then(async () => {
                if (childBlueprintIds.length > 0) {
                    await fetch(`/api/v1/entries/${entryId}/meta`, {
                        method: "PATCH",
                        headers: {
                            ...csrfHeaders(),
                            "Content-Type": "application/json",
                        },
                        credentials: "same-origin",
                        body: JSON.stringify({
                            child_blueprint_ids: childBlueprintIds,
                        }),
                    });
                }
                setLinking(false);
                onCreated(entryId);
            })
            .catch(() => setLinking(false));
    }

    // Shared children blueprint selector
    const [bpSearch, setBpSearch] = useState("");
    const filteredBlueprints = bpSearch.trim()
        ? projectBlueprints.filter((bp) =>
              bp.name.toLowerCase().includes(bpSearch.toLowerCase()),
          )
        : projectBlueprints;

    const childBlueprintSelect = (
        <div className="p-3" style={childSelectorWrapStyle}>
            <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium" style={subtitle60}>
                    {t("blueprints.tree.add_entry.children_blueprints.label")}
                </label>
                {childBlueprintIds.length > 0 && (
                    <span className="text-xs" style={subtitle40}>
                        {t(
                            "blueprints.tree.add_entry.children_blueprints.count",
                        ).replace(":count", String(childBlueprintIds.length))}
                    </span>
                )}
            </div>
            <p className="mb-2 text-xs" style={subtitle40}>
                {t("blueprints.tree.add_entry.children_blueprints.help")}
            </p>
            <input
                type="text"
                value={bpSearch}
                onChange={(e) => setBpSearch(e.target.value)}
                placeholder={t(
                    "blueprints.tree.add_entry.children_blueprints.filter",
                )}
                className="mb-1 h-8 w-full px-3 text-xs focus:outline-none focus:ring-2"
                style={inputStyle}
            />
            <div
                className="max-h-[150px] overflow-y-auto"
                style={listShellStyle}
            >
                {filteredBlueprints.map((bp, i) => {
                    const checked = childBlueprintIds.includes(bp.id);
                    const isLast = i === filteredBlueprints.length - 1;
                    return (
                        <label
                            key={bp.id}
                            className="alex-row flex cursor-pointer items-center gap-2 px-3 py-2 text-sm"
                            style={{
                                ...(checked ? selectedRowStyle : {}),
                                ...(isLast ? {} : rowBorderStyle),
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                    setChildBlueprintIds((prev) =>
                                        checked
                                            ? prev.filter((id) => id !== bp.id)
                                            : [...prev, bp.id],
                                    )
                                }
                                style={{
                                    accentColor:
                                        "var(--theme-brand-primary-500)",
                                }}
                            />
                            <span
                                className={checked ? "font-medium" : ""}
                                style={
                                    checked
                                        ? {
                                              color: "var(--theme-brand-primary-500)",
                                          }
                                        : undefined
                                }
                            >
                                {bp.name}
                            </span>
                        </label>
                    );
                })}
                {filteredBlueprints.length === 0 && (
                    <p className="px-3 py-2 text-xs" style={subtitle40}>
                        {t(
                            "blueprints.tree.add_entry.children_blueprints.no_matches",
                        )}
                    </p>
                )}
            </div>
        </div>
    );

    const parentLabel = parentEntry
        ? parentEntry.name
        : t("blueprints.tree.add_entry.root_label");

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-3"
                style={headerStyle}
            >
                <div>
                    <h3 className="text-sm font-semibold">
                        {t("blueprints.tree.add_entry.title").replace(
                            ":parent",
                            parentLabel,
                        )}
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                    style={closeBtnStyle}
                >
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex" style={tabBarStyle}>
                <button
                    type="button"
                    onClick={() => setMode("folder")}
                    className="alex-row flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
                    style={
                        mode === "folder"
                            ? tabActiveStyle("var(--theme-brand-secondary-500)")
                            : tabIdleStyle
                    }
                >
                    <i className="fa-solid fa-folder-plus text-xs" />{" "}
                    {t("blueprints.tree.add_entry.tab.folder")}
                </button>
                <button
                    type="button"
                    onClick={() => setMode("create")}
                    className="alex-row flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
                    style={
                        mode === "create"
                            ? tabActiveStyle(
                                  "var(--theme-status-success-stroke)",
                              )
                            : tabIdleStyle
                    }
                >
                    <i className="fa-solid fa-file-circle-plus text-xs" />{" "}
                    {t("blueprints.tree.add_entry.tab.entry")}
                </button>
                <button
                    type="button"
                    onClick={() => setMode("link")}
                    className="alex-row flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
                    style={
                        mode === "link"
                            ? tabActiveStyle("var(--theme-brand-primary-500)")
                            : tabIdleStyle
                    }
                >
                    <i className="fa-solid fa-link text-xs" />{" "}
                    {t("blueprints.tree.add_entry.tab.link")}
                </button>
            </div>

            {mode === "create" || mode === "folder" ? (
                <div className="space-y-4 p-6">
                    <p className="text-xs" style={subtitle50}>
                        {mode === "folder"
                            ? t("blueprints.tree.add_entry.folder.intro")
                            : t("blueprints.tree.add_entry.create.intro")}
                    </p>
                    <div>
                        <label
                            className="mb-1 block text-xs font-medium"
                            style={subtitle60}
                        >
                            {t("blueprints.tree.add_entry.field.name")}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && name.trim())
                                    handleCreate();
                            }}
                            placeholder={t(
                                "blueprints.tree.add_entry.field.name_placeholder",
                            )}
                            className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2"
                            style={inputStyle}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label
                            className="mb-1 block text-xs font-medium"
                            style={subtitle60}
                        >
                            {t("blueprints.tree.add_entry.field.summary")}
                        </label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder={t(
                                "blueprints.tree.add_entry.field.summary_placeholder",
                            )}
                            className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2"
                            style={inputStyle}
                            rows={2}
                        />
                    </div>

                    {childBlueprintSelect}

                    <div className="flex items-center gap-2 pt-2">
                        <ActionButton
                            icon={
                                mode === "folder"
                                    ? "fa-solid fa-folder-plus"
                                    : "fa-solid fa-plus"
                            }
                            label={
                                mode === "folder"
                                    ? t(
                                          "blueprints.tree.add_entry.folder.action",
                                      )
                                    : t(
                                          "blueprints.tree.add_entry.create.action",
                                      )
                            }
                            variant={
                                mode === "folder" ? "secondary" : "primary"
                            }
                            onClick={handleCreate}
                            loading={saving}
                            disabled={!name.trim()}
                        />
                        <ActionButton
                            icon="fa-solid fa-xmark"
                            label={t("common.cancel")}
                            variant="ghost"
                            onClick={onClose}
                        />
                    </div>
                </div>
            ) : (
                /* ── Link form ── */
                <div className="space-y-4 p-6">
                    <p className="text-xs" style={subtitle50}>
                        {t("blueprints.tree.add_entry.link.intro")}
                    </p>
                    {selectedLink ? (
                        /* Selected entry */
                        <div
                            className="flex items-center gap-3 px-4 py-3"
                            style={selectedChipStyle}
                        >
                            <div className="flex-1">
                                <p className="font-medium">
                                    {selectedLink.name}
                                </p>
                                <p className="text-xs" style={subtitle50}>
                                    {selectedLink.blueprint_name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLink(null)}
                                className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                                style={closeBtnStyle}
                            >
                                <i className="fa-solid fa-xmark text-xs" />
                            </button>
                        </div>
                    ) : (
                        /* Search */
                        <>
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label
                                        className="text-xs font-medium"
                                        style={subtitle60}
                                    >
                                        {!showAllSearch && canLink
                                            ? t(
                                                  "blueprints.tree.add_entry.link.search_scoped",
                                              ).replace(
                                                  ":name",
                                                  effectiveBpName,
                                              )
                                            : t(
                                                  "blueprints.tree.add_entry.link.search_all",
                                              )}
                                    </label>
                                    {canLink && (
                                        <label className="flex cursor-pointer items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={showAllSearch}
                                                onChange={(e) => {
                                                    setShowAllSearch(
                                                        e.target.checked,
                                                    );
                                                    setLinkResults([]);
                                                    setLinkSearch("");
                                                }}
                                                style={{
                                                    accentColor:
                                                        "var(--theme-brand-primary-500)",
                                                }}
                                            />
                                            <span
                                                className="text-xs"
                                                style={subtitle40}
                                            >
                                                {t(
                                                    "blueprints.tree.add_entry.link.toggle_all",
                                                )}
                                            </span>
                                        </label>
                                    )}
                                </div>
                                <EntryLinkSearch
                                    query={linkSearch}
                                    onQueryChange={handleLinkSearchChange}
                                    results={linkResults}
                                    searching={searching}
                                    placeholder={t(
                                        "blueprints.tree.convert_stub.link.placeholder",
                                    )}
                                    noResultsLabel={t(
                                        "blueprints.tree.convert_stub.link.no_results",
                                    )}
                                    onSelect={(r) => {
                                        setSelectedLink(r);
                                        setLinkSearch("");
                                        setLinkResults([]);
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {childBlueprintSelect}

                    <div className="flex items-center gap-2 pt-2">
                        <ActionButton
                            icon="fa-solid fa-link"
                            label={t(
                                "blueprints.tree.convert_stub.link.action",
                            )}
                            onClick={handleLink}
                            loading={linking}
                            disabled={!selectedLink}
                        />
                        <ActionButton
                            icon="fa-solid fa-xmark"
                            label={t("common.cancel")}
                            variant="ghost"
                            onClick={onClose}
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
}
