import { useState } from "react";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Modal from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import type { SiblingBlueprint } from "@alexandria/types/blueprints";
import type { TreeNode } from "../../TreeView";
import {
    closeBtnStyle,
    headerStyle,
    inputStyle,
    listShellStyle,
    rowBorderStyle,
    selectedRowStyle,
    subtitle30,
    subtitle40,
    subtitle50,
} from "./treeModalStyles";

/**
 * Per-entry child blueprint picker — controls which blueprint types
 * are allowed as children of this entry in the tree. Persisted on the
 * entry's `child_blueprint_ids` meta via PATCH.
 */
export default function ChildBlueprintModal({
    entry,
    projectBlueprints,
    onClose,
    onSaved,
}: {
    entry: TreeNode;
    projectBlueprints: SiblingBlueprint[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const t = useT();
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<number>>(
        new Set(entry.child_blueprint_ids),
    );
    const [saving, setSaving] = useState(false);

    const filtered = search.trim()
        ? projectBlueprints.filter((bp) =>
              bp.name.toLowerCase().includes(search.toLowerCase()),
          )
        : projectBlueprints;

    function toggle(bpId: number) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(bpId)) next.delete(bpId);
            else next.add(bpId);
            return next;
        });
    }

    function handleSave() {
        setSaving(true);
        fetch(`/api/v1/entries/${entry.id}/meta`, {
            method: "PATCH",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ child_blueprint_ids: [...selected] }),
        })
            .then(() => {
                setSaving(false);
                onSaved();
            })
            .catch(() => setSaving(false));
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-sm">
            <div
                className="flex items-center justify-between px-5 py-3"
                style={headerStyle}
            >
                <div>
                    <h3 className="text-sm font-semibold">
                        {t("blueprints.tree.child_blueprints.title")}
                    </h3>
                    <p className="text-xs" style={subtitle50}>
                        {entry.name}
                    </p>
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

            <div className="p-4">
                <div className="relative mb-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t(
                            "blueprints.tree.child_blueprints.search_placeholder",
                        )}
                        className="w-full px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2"
                        style={inputStyle}
                        autoFocus
                    />
                </div>

                <div
                    className="max-h-64 overflow-y-auto"
                    style={listShellStyle}
                >
                    {filtered.map((bp, i) => {
                        const isSelected = selected.has(bp.id);
                        const isLast = i === filtered.length - 1;
                        return (
                            <button
                                key={bp.id}
                                type="button"
                                onClick={() => toggle(bp.id)}
                                className="alex-row flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                                style={{
                                    ...(isSelected ? selectedRowStyle : {}),
                                    ...(isLast ? {} : rowBorderStyle),
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    style={{
                                        accentColor:
                                            "var(--theme-brand-primary-500)",
                                    }}
                                />
                                <i
                                    className={`${bp.icon ? (bp.icon.includes(" ") ? bp.icon : `fa-solid ${bp.icon}`) : "fa-solid fa-file"} w-4 text-center text-xs`}
                                    style={subtitle40}
                                />
                                <span
                                    className={isSelected ? "font-medium" : ""}
                                    style={
                                        isSelected
                                            ? {
                                                  color: "var(--theme-brand-primary-500)",
                                              }
                                            : undefined
                                    }
                                >
                                    {bp.name}
                                </span>
                                <span
                                    className="ml-auto text-xs"
                                    style={subtitle30}
                                >
                                    {bp.classification}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs" style={subtitle40}>
                        {selected.size > 0
                            ? t(
                                  "blueprints.tree.child_blueprints.selected_count",
                              ).replace(":count", String(selected.size))
                            : t(
                                  "blueprints.tree.child_blueprints.none_selected",
                              )}
                    </p>
                    <ActionButton
                        icon="fa-solid fa-check"
                        label={t("common.save")}
                        size="xs"
                        onClick={handleSave}
                        loading={saving}
                    />
                </div>
            </div>
        </Modal>
    );
}
