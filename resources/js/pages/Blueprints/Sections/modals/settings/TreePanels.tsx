import { type CSSProperties, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import useT from "@alexandria/hooks/useT";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import { pageUrl } from "@alexandria/lib/urls";
import type {
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";
import type { FormDataConvertible } from "@inertiajs/core";
import SettingsActivationToggle from "./SettingsActivationToggle";

/* ── Tree Activation Panel ──
   Shown at the top of the Tree settings menu. Owns the enable/disable
   toggle and self-saves via router.put. Mirrors the Timeline/Kanban
   settings pattern so all views are configured the same way.

   Structural blueprints have Tree view implicitly enabled via
   classification — this panel isn't rendered for them.
*/
export function TreeActivationPanel({
    blueprint,
    project,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
}) {
    const t = useT();
    const [enabled, setEnabled] = useState<boolean>(blueprint.show_tree_view);
    const [saving, setSaving] = useState(false);

    function handleToggle(next: boolean) {
        setEnabled(next);
        setSaving(true);
        router.put(
            pageUrl(project.slug, blueprint.slug),
            {
                name: blueprint.name,
                description: blueprint.description ?? "",
                icon: blueprint.icon,
                show_on_dashboard: blueprint.show_on_dashboard,
                is_linkable: blueprint.is_linkable,
                is_hub: blueprint.is_hub,
                show_tree_view: next,
                enable_timeline: blueprint.enable_timeline,
                classification: blueprint.classification,
                list_selection_mode: blueprint.list_selection_mode,
            } as Record<string, FormDataConvertible>,
            {
                preserveState: true,
                preserveScroll: true,
                showProgress: false,
                onSuccess: () => setSaving(false),
                onError: () => {
                    setSaving(false);
                    setEnabled(!next); // rollback optimistic state
                },
            },
        );
    }

    return (
        <SettingsActivationToggle
            title={t("blueprints.settings.tree.title")}
            description={t("blueprints.settings.tree.description")}
            enabled={enabled}
            onChange={handleToggle}
            disabled={saving}
            statusLine={saving ? t("common.saving") : undefined}
        />
    );
}

/* ── Children Blueprints Panel ──
   Blueprint-level setting: which OTHER blueprints may nest under this
   blueprint's entries in the tree (e.g. Civilizations under a planet).
   The blueprint's own entries are always allowed — this list only adds
   cross-blueprint children. Self-saves via PATCH like the tree-default
   pin; stored in blueprint metadata. */

const childRowStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)",
};

const childListShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

export function TreeChildrenBlueprintsPanel({
    blueprint,
    project,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
}) {
    const t = useT();
    const projectBlueprints =
        (usePage().props.projectBlueprints as SiblingBlueprint[] | undefined) ??
        [];
    const [selected, setSelected] = useState<number[]>(
        (blueprint.metadata?.child_blueprint_ids as number[] | undefined) ?? [],
    );
    const [saving, setSaving] = useState(false);

    const candidates = projectBlueprints.filter(
        (bp) => bp.id !== blueprint.id && bp.classification !== "list",
    );

    function save(next: number[]) {
        setSelected(next);
        setSaving(true);
        fetch(`${pageUrl(project.slug, blueprint.slug)}/child-blueprints`, {
            method: "PATCH",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ blueprint_ids: next }),
        })
            .then(() => setSaving(false))
            .catch(() => setSaving(false));
    }

    return (
        <div className="mt-5">
            <p className="text-sm font-medium">
                {t("blueprints.bp_settings.hierarchy.children.title")}
            </p>
            <p
                className="mb-2 mt-0.5 text-xs"
                style={{
                    color: "color-mix(in srgb, var(--theme-base-content) 55%, transparent)",
                }}
            >
                {t("blueprints.bp_settings.hierarchy.children.description")}
            </p>
            <div
                className="max-h-[260px] overflow-y-auto"
                style={childListShellStyle}
            >
                {candidates.map((bp, i) => {
                    const checked = selected.includes(bp.id);
                    return (
                        <label
                            key={bp.id}
                            className="alex-row flex cursor-pointer items-center gap-2 px-3 py-2 text-sm"
                            style={
                                i === candidates.length - 1 ? {} : childRowStyle
                            }
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={saving}
                                onChange={() =>
                                    save(
                                        checked
                                            ? selected.filter(
                                                  (id) => id !== bp.id,
                                              )
                                            : [...selected, bp.id],
                                    )
                                }
                                style={{
                                    accentColor:
                                        "var(--theme-brand-primary-500)",
                                }}
                            />
                            <i
                                className={`${bp.icon ? (bp.icon.includes(" ") ? bp.icon : `fa-solid ${bp.icon}`) : "fa-solid fa-cube"} w-4 text-center text-xs`}
                                style={{
                                    color: "color-mix(in srgb, var(--theme-base-content) 45%, transparent)",
                                }}
                            />
                            <span className={checked ? "font-medium" : ""}>
                                {bp.name}
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
