import Input from "@alexandria/components/form/Input";
import Textarea from "@alexandria/components/form/Textarea";
import Select from "@alexandria/components/ui/Select";
import useT from "@alexandria/hooks/useT";

import SettingsObjectList from "../SettingsObjectList";
import SlotCard from "./SlotCard";
import { BOUNDARY_KINDS, type BoundaryKind, type BoundaryRule } from "./types";

/**
 * Boundaries slot editor — array of disambiguation rules against sibling
 * blueprints. Collapsed by default; reframed as a troubleshooting tool
 * (author opens when AI keeps misrouting between specific blueprint
 * pairs), not a setup field.
 *
 * Each row: monospace target slug + portaled themed kind select
 * (overlap / exclusion / precedence) on the top line, prose rule
 * textarea on the bottom. New rows default kind to 'exclusion' — the
 * dominant pattern across the seeders.
 */
export default function BoundariesSlotEditor({
    value,
    onChange,
}: {
    value: BoundaryRule[];
    onChange: (next: BoundaryRule[]) => void;
}) {
    const t = useT();

    const countLabel =
        value.length === 0
            ? t("blueprints.bp_settings.ai.slots.boundaries.count.empty")
            : value.length === 1
              ? t("blueprints.bp_settings.ai.slots.boundaries.count.singular")
              : t("blueprints.bp_settings.ai.slots.boundaries.count.plural").replace(
                    ":count",
                    String(value.length),
                );

    return (
        <SlotCard
            slotKey="boundaries"
            title={t("blueprints.bp_settings.ai.slots.boundaries.title")}
            description={t(
                "blueprints.bp_settings.ai.slots.boundaries.description",
            )}
            collapsible
            initiallyExpanded={value.length > 0}
            countLabel={countLabel}
            countIsEmpty={value.length === 0}
        >
            <SettingsObjectList<BoundaryRule>
                values={value}
                onChange={onChange}
                createEmpty={() => ({
                    target: "",
                    kind: "exclusion",
                    rule: "",
                })}
                addLabel={t("blueprints.bp_settings.ai.slots.boundaries.add")}
                removeLabel={t(
                    "blueprints.bp_settings.ai.slots.boundaries.remove",
                )}
                emptyHint={t("blueprints.bp_settings.ai.slots.boundaries.empty")}
                renderItem={(item, update) => (
                    <>
                        <div className="flex items-start gap-2">
                            <div className="flex-1">
                                <Input
                                    value={item.target}
                                    onChange={(e) =>
                                        update({
                                            ...item,
                                            target: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        "blueprints.bp_settings.ai.slots.boundaries.target.placeholder",
                                    )}
                                    className="font-mono"
                                />
                            </div>
                            <Select<BoundaryKind>
                                value={item.kind}
                                options={BOUNDARY_KINDS.map((kind) => ({
                                    value: kind,
                                    label: t(
                                        `blueprints.bp_settings.ai.slots.boundaries.kind.${kind}`,
                                    ),
                                }))}
                                onChange={(kind) => update({ ...item, kind })}
                                ariaLabel={t(
                                    "blueprints.bp_settings.ai.slots.boundaries.kind.aria_label",
                                )}
                            />
                        </div>
                        <Textarea
                            value={item.rule}
                            onChange={(e) =>
                                update({ ...item, rule: e.target.value })
                            }
                            placeholder={t(
                                "blueprints.bp_settings.ai.slots.boundaries.rule.placeholder",
                            )}
                            rows={2}
                        />
                    </>
                )}
            />
        </SlotCard>
    );
}
