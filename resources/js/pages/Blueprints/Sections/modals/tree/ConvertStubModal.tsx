import { type CSSProperties, useRef, useState } from "react";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Modal from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import type { TreeNode } from "../../TreeView";
import EntryLinkSearch from "./EntryLinkSearch";
import {
    closeBtnStyle,
    headerStyle,
    selectedChipStyle,
    subtitle50,
    subtitle60,
} from "./treeModalStyles";

/* Choice-card recipe is specific to the convert-stub Create/Link
   chooser screen, so it stays here rather than in the shared module. */
const choiceCardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const choiceIconBoxStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
    borderRadius: "var(--theme-radius-input)",
};

/**
 * Stub → real entry converter. Offered from the tree on stub rows;
 * user chooses between creating a fresh entry (picking a blueprint)
 * or linking an existing entry under the stub's slot.
 */
export default function ConvertStubModal({
    entry,
    projectId,
    parentChildBlueprintIds,
    onClose,
    onConverted,
}: {
    entry: TreeNode;
    projectId: number;
    parentChildBlueprintIds: number[];
    onClose: () => void;
    onConverted: () => void;
}) {
    const t = useT();
    const [mode, setMode] = useState<"choose" | "link">("choose");
    const [converting, setConverting] = useState(false);

    // Link mode
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
    const [selectedLink, setSelectedLink] = useState<{
        id: number;
        name: string;
        blueprint_name: string;
    } | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleCreateConvert() {
        setConverting(true);
        fetch(`/api/v1/entries/${entry.id}/convert`, {
            method: "PUT",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
        })
            .then(() => {
                setConverting(false);
                onConverted();
            })
            .catch(() => setConverting(false));
    }

    function handleLinkConvert() {
        if (!selectedLink) return;
        setConverting(true);
        // Reparent the existing entry under this stub, then mark stub as non-stub
        fetch(`/api/v1/entries/${selectedLink.id}/reparent`, {
            method: "PUT",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ parent_id: entry.id }),
        })
            .then(() =>
                fetch(`/api/v1/entries/${entry.id}/meta`, {
                    method: "PATCH",
                    headers: {
                        ...csrfHeaders(),
                        "Content-Type": "application/json",
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({ is_stub: false }),
                }),
            )
            .then(() => {
                setConverting(false);
                onConverted();
            })
            .catch(() => setConverting(false));
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
                    parentChildBlueprintIds.length > 0
                        ? results.filter((r: { blueprint_id?: number }) =>
                              parentChildBlueprintIds.includes(
                                  r.blueprint_id ?? 0,
                              ),
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

    return (
        <Modal open onClose={onClose} maxWidth="max-w-sm">
            <div
                className="flex items-center justify-between px-5 py-3"
                style={headerStyle}
            >
                <div>
                    <h3 className="text-sm font-semibold">
                        {t("blueprints.tree.convert_stub.title")}
                    </h3>
                    <p className="text-xs" style={subtitle50}>
                        {entry.name}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        mode === "choose" ? onClose() : setMode("choose")
                    }
                    className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                    style={closeBtnStyle}
                >
                    <i
                        className={`fa-solid ${mode === "choose" ? "fa-xmark" : "fa-arrow-left"} text-xs`}
                    />
                </button>
            </div>

            {mode === "choose" ? (
                <div className="p-4">
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            type="button"
                            onClick={handleCreateConvert}
                            disabled={converting}
                            className="alex-row flex items-center gap-4 p-4 text-left"
                            style={choiceCardStyle}
                        >
                            <div
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                                style={choiceIconBoxStyle}
                            >
                                <i
                                    className="fa-solid fa-plus"
                                    style={{
                                        color: "var(--theme-brand-primary-500)",
                                    }}
                                />
                            </div>
                            <div>
                                <p className="font-medium">
                                    {t(
                                        "blueprints.tree.convert_stub.choose.create.title",
                                    )}
                                </p>
                                <p className="text-xs" style={subtitle50}>
                                    {t(
                                        "blueprints.tree.convert_stub.choose.create.subtitle",
                                    )}
                                </p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("link")}
                            className="alex-row flex items-center gap-4 p-4 text-left"
                            style={choiceCardStyle}
                        >
                            <div
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                                style={choiceIconBoxStyle}
                            >
                                <i
                                    className="fa-solid fa-link"
                                    style={{
                                        color: "var(--theme-brand-primary-500)",
                                    }}
                                />
                            </div>
                            <div>
                                <p className="font-medium">
                                    {t(
                                        "blueprints.tree.convert_stub.choose.link.title",
                                    )}
                                </p>
                                <p className="text-xs" style={subtitle50}>
                                    {t(
                                        "blueprints.tree.convert_stub.choose.link.subtitle",
                                    )}
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 p-4">
                    {selectedLink ? (
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
                        <>
                            <div>
                                <label
                                    className="mb-1 block text-xs font-medium"
                                    style={subtitle60}
                                >
                                    {t(
                                        "blueprints.tree.convert_stub.link.label",
                                    )}
                                </label>
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
                    <div className="flex items-center gap-2 pt-2">
                        <ActionButton
                            icon="fa-solid fa-link"
                            label={t(
                                "blueprints.tree.convert_stub.link.action",
                            )}
                            onClick={handleLinkConvert}
                            loading={converting}
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
