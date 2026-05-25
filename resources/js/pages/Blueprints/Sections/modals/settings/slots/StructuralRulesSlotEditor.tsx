import Input from "@alexandria/components/form/Input";
import Textarea from "@alexandria/components/form/Textarea";
import Select from "@alexandria/components/ui/Select";
import useT from "@alexandria/hooks/useT";

import SettingsActivationToggle from "../SettingsActivationToggle";
import SettingsObjectList from "../SettingsObjectList";
import SettingsStringList from "../SettingsStringList";
import SlotCard from "./SlotCard";
import {
    fieldHintStyle,
    fieldLabelStyle,
    subSectionHeaderStyle,
    subSectionTitleStyle,
} from "./styles";
import {
    CREATION_POLICIES,
    type CascadingRelationship,
    type CreationPolicy,
    type Dependency,
    type ParentSubSlot,
    type StructuralRulesSlot,
} from "./types";

/**
 * Structural Rules slot editor — three independently-optional sub-slots
 * inside one collapsible card. Single-level collapse: outer card opens
 * to reveal all three sub-sections; sub-sections aren't independently
 * collapsible to keep the cognitive model simple.
 *
 *  - parent: hierarchy/composition rules (target_blueprints + selection_hint
 *    + chain_anchor_hint + required toggle + search_existing_first toggle)
 *  - cascading_relationships: array of {pairing, target_blueprint, trigger}
 *    for entry_relationships edges the AI should create alongside this entry
 *  - dependencies: array of {target_blueprint, via_field, creation_policy}
 *    for entries this one logically depends on
 *
 * Count badge sums populated items across all three sub-slots so authors
 * can read state without expanding.
 */
export default function StructuralRulesSlotEditor({
    value,
    onChange,
}: {
    value: StructuralRulesSlot;
    onChange: (next: StructuralRulesSlot) => void;
}) {
    const t = useT();

    const parent: ParentSubSlot = value.parent ?? {};
    const cascading: CascadingRelationship[] = value.cascading_relationships ?? [];
    const deps: Dependency[] = value.dependencies ?? [];

    function updateParent(patch: Partial<ParentSubSlot>) {
        onChange({ ...value, parent: { ...parent, ...patch } });
    }

    function setCascading(next: CascadingRelationship[]) {
        onChange({ ...value, cascading_relationships: next });
    }

    function setDeps(next: Dependency[]) {
        onChange({ ...value, dependencies: next });
    }

    // Count badge — sums populated rows across all three sub-slots.
    const parentCount =
        (parent.target_blueprints ?? []).filter((s) => s.trim().length > 0)
            .length > 0 ||
        (parent.selection_hint ?? "").trim().length > 0 ||
        (parent.chain_anchor_hint ?? "").trim().length > 0 ||
        parent.required ||
        parent.search_existing_first
            ? 1
            : 0;
    const cascadingCount = cascading.filter(
        (c) =>
            c.pairing.trim().length > 0 ||
            c.target_blueprint.trim().length > 0 ||
            c.trigger.trim().length > 0,
    ).length;
    const dependencyCount = deps.filter(
        (d) => d.target_blueprint.trim().length > 0 || d.via_field.trim().length > 0,
    ).length;
    const totalCount = parentCount + cascadingCount + dependencyCount;

    return (
        <SlotCard
            slotKey="structural_rules"
            title={t("blueprints.bp_settings.ai.slots.structural_rules.title")}
            description={t(
                "blueprints.bp_settings.ai.slots.structural_rules.description",
            )}
            collapsible
            initiallyExpanded={totalCount > 0}
            countLabel={
                totalCount > 0
                    ? t(
                          "blueprints.bp_settings.ai.slots.structural_rules.count.summary",
                      ).replace(":count", String(totalCount))
                    : t(
                          "blueprints.bp_settings.ai.slots.structural_rules.count.empty",
                      )
            }
            countIsEmpty={totalCount === 0}
        >
            <div className="space-y-5">
                {/* Parent sub-section */}
                <div className="space-y-4 pt-4" style={subSectionHeaderStyle}>
                    <div>
                        <div
                            className="text-sm font-semibold"
                            style={subSectionTitleStyle}
                        >
                            {t(
                                "blueprints.bp_settings.ai.slots.structural_rules.parent.heading",
                            )}
                        </div>
                        <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.structural_rules.parent.description",
                            )}
                        </div>
                    </div>

                    <SettingsActivationToggle
                        title={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.parent.required.title",
                        )}
                        description={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.parent.required.description",
                        )}
                        enabled={parent.required ?? false}
                        onChange={(required) => updateParent({ required })}
                    />

                    <div className="space-y-2">
                        <div>
                            <label
                                className="text-[10px] font-semibold uppercase"
                                style={fieldLabelStyle}
                            >
                                {t(
                                    "blueprints.bp_settings.ai.slots.structural_rules.parent.target_blueprints.label",
                                )}
                            </label>
                            <div
                                className="mt-0.5 text-xs"
                                style={fieldHintStyle}
                            >
                                {t(
                                    "blueprints.bp_settings.ai.slots.structural_rules.parent.target_blueprints.hint",
                                )}
                            </div>
                        </div>
                        <SettingsStringList
                            values={parent.target_blueprints ?? []}
                            onChange={(target_blueprints) =>
                                updateParent({ target_blueprints })
                            }
                            placeholder={t(
                                "blueprints.bp_settings.ai.slots.structural_rules.parent.target_blueprints.placeholder",
                            )}
                            addLabel={t(
                                "blueprints.bp_settings.ai.slots.structural_rules.parent.target_blueprints.add",
                            )}
                            removeLabel={t(
                                "blueprints.bp_settings.ai.slots.structural_rules.parent.target_blueprints.remove",
                            )}
                            emptyHint={t(
                                "blueprints.bp_settings.ai.slots.structural_rules.parent.target_blueprints.empty",
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <div>
                            <label
                                className="text-[10px] font-semibold uppercase"
                                style={fieldLabelStyle}
                            >
                                {t(
                                    "blueprints.bp_settings.ai.slots.structural_rules.parent.selection_hint.label",
                                )}
                            </label>
                            <div
                                className="mt-0.5 text-xs"
                                style={fieldHintStyle}
                            >
                                {t(
                                    "blueprints.bp_settings.ai.slots.structural_rules.parent.selection_hint.hint",
                                )}
                            </div>
                        </div>
                        <Textarea
                            value={parent.selection_hint ?? ""}
                            onChange={(e) =>
                                updateParent({ selection_hint: e.target.value })
                            }
                            placeholder={t(
                                "blueprints.bp_settings.ai.slots.structural_rules.parent.selection_hint.placeholder",
                            )}
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <div>
                            <label
                                className="text-[10px] font-semibold uppercase"
                                style={fieldLabelStyle}
                            >
                                {t(
                                    "blueprints.bp_settings.ai.slots.structural_rules.parent.chain_anchor_hint.label",
                                )}
                            </label>
                            <div
                                className="mt-0.5 text-xs"
                                style={fieldHintStyle}
                            >
                                {t(
                                    "blueprints.bp_settings.ai.slots.structural_rules.parent.chain_anchor_hint.hint",
                                )}
                            </div>
                        </div>
                        <Textarea
                            value={parent.chain_anchor_hint ?? ""}
                            onChange={(e) =>
                                updateParent({
                                    chain_anchor_hint: e.target.value,
                                })
                            }
                            placeholder={t(
                                "blueprints.bp_settings.ai.slots.structural_rules.parent.chain_anchor_hint.placeholder",
                            )}
                            rows={2}
                        />
                    </div>

                    <SettingsActivationToggle
                        title={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.parent.search_existing_first.title",
                        )}
                        description={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.parent.search_existing_first.description",
                        )}
                        enabled={parent.search_existing_first ?? false}
                        onChange={(search_existing_first) =>
                            updateParent({ search_existing_first })
                        }
                    />
                </div>

                {/* Cascading Relationships sub-section */}
                <div className="space-y-3 pt-4" style={subSectionHeaderStyle}>
                    <div>
                        <div
                            className="text-sm font-semibold"
                            style={subSectionTitleStyle}
                        >
                            {t(
                                "blueprints.bp_settings.ai.slots.structural_rules.cascading_relationships.heading",
                            )}
                        </div>
                        <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.structural_rules.cascading_relationships.description",
                            )}
                        </div>
                    </div>
                    <SettingsObjectList<CascadingRelationship>
                        values={cascading}
                        onChange={setCascading}
                        createEmpty={() => ({
                            via: "entry_relationships",
                            pairing: "",
                            target_blueprint: "",
                            trigger: "",
                        })}
                        addLabel={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.cascading_relationships.add",
                        )}
                        removeLabel={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.cascading_relationships.remove",
                        )}
                        emptyHint={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.cascading_relationships.empty",
                        )}
                        renderItem={(item, update) => (
                            <>
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <Input
                                            value={item.pairing}
                                            onChange={(e) =>
                                                update({
                                                    ...item,
                                                    pairing: e.target.value,
                                                })
                                            }
                                            placeholder={t(
                                                "blueprints.bp_settings.ai.slots.structural_rules.cascading_relationships.pairing.placeholder",
                                            )}
                                            className="font-mono"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            value={item.target_blueprint}
                                            onChange={(e) =>
                                                update({
                                                    ...item,
                                                    target_blueprint:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder={t(
                                                "blueprints.bp_settings.ai.slots.structural_rules.cascading_relationships.target_blueprint.placeholder",
                                            )}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>
                                <Textarea
                                    value={item.trigger}
                                    onChange={(e) =>
                                        update({
                                            ...item,
                                            trigger: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        "blueprints.bp_settings.ai.slots.structural_rules.cascading_relationships.trigger.placeholder",
                                    )}
                                    rows={2}
                                />
                            </>
                        )}
                    />
                </div>

                {/* Dependencies sub-section */}
                <div className="space-y-3 pt-4" style={subSectionHeaderStyle}>
                    <div>
                        <div
                            className="text-sm font-semibold"
                            style={subSectionTitleStyle}
                        >
                            {t(
                                "blueprints.bp_settings.ai.slots.structural_rules.dependencies.heading",
                            )}
                        </div>
                        <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.structural_rules.dependencies.description",
                            )}
                        </div>
                    </div>
                    <SettingsObjectList<Dependency>
                        values={deps}
                        onChange={setDeps}
                        createEmpty={() => ({
                            target_blueprint: "",
                            via_field: "",
                            creation_policy: "create_if_missing",
                        })}
                        addLabel={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.dependencies.add",
                        )}
                        removeLabel={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.dependencies.remove",
                        )}
                        emptyHint={t(
                            "blueprints.bp_settings.ai.slots.structural_rules.dependencies.empty",
                        )}
                        renderItem={(item, update) => (
                            <>
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <Input
                                            value={item.target_blueprint}
                                            onChange={(e) =>
                                                update({
                                                    ...item,
                                                    target_blueprint:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder={t(
                                                "blueprints.bp_settings.ai.slots.structural_rules.dependencies.target_blueprint.placeholder",
                                            )}
                                            className="font-mono"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            value={item.via_field}
                                            onChange={(e) =>
                                                update({
                                                    ...item,
                                                    via_field: e.target.value,
                                                })
                                            }
                                            placeholder={t(
                                                "blueprints.bp_settings.ai.slots.structural_rules.dependencies.via_field.placeholder",
                                            )}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>
                                <Select<CreationPolicy>
                                    value={item.creation_policy}
                                    options={CREATION_POLICIES.map((p) => ({
                                        value: p,
                                        label: t(
                                            `blueprints.bp_settings.ai.slots.structural_rules.dependencies.creation_policy.${p}`,
                                        ),
                                    }))}
                                    onChange={(creation_policy) =>
                                        update({ ...item, creation_policy })
                                    }
                                    ariaLabel={t(
                                        "blueprints.bp_settings.ai.slots.structural_rules.dependencies.creation_policy.aria_label",
                                    )}
                                    fullWidth
                                />
                            </>
                        )}
                    />
                </div>
            </div>
        </SlotCard>
    );
}
