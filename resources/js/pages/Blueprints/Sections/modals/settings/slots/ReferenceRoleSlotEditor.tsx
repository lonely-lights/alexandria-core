import Input from "@alexandria/components/form/Input";
import useT from "@alexandria/hooks/useT";

import SlotCard from "./SlotCard";
import { fieldHintStyle, fieldLabelStyle } from "./styles";
import type { ReferenceRoleSlot } from "./types";

/**
 * Reference Role slot editor — applies to list-type blueprints that
 * exist primarily to be referenced by other blueprints' fields
 * (Occupation, Title, Genre, etc.) rather than being primary subjects.
 *
 * Two fields, both required if the slot is present. The parent's
 * composer drops the slot if either field is blank — matches the
 * schema's "both required if present" semantics. Collapsed by default;
 * count badge shows 'configured' / 'not set'.
 */
export default function ReferenceRoleSlotEditor({
    value,
    onChange,
}: {
    value: ReferenceRoleSlot;
    onChange: (next: ReferenceRoleSlot) => void;
}) {
    const t = useT();

    const isConfigured =
        value.referenced_by_blueprint.trim().length > 0 &&
        value.referenced_by_field.trim().length > 0;

    function update(patch: Partial<ReferenceRoleSlot>) {
        onChange({ ...value, ...patch });
    }

    return (
        <SlotCard
            slotKey="reference_role"
            title={t("blueprints.bp_settings.ai.slots.reference_role.title")}
            description={t(
                "blueprints.bp_settings.ai.slots.reference_role.description",
            )}
            collapsible
            initiallyExpanded={isConfigured}
            countLabel={
                isConfigured
                    ? t(
                          "blueprints.bp_settings.ai.slots.reference_role.count.set",
                      )
                    : t(
                          "blueprints.bp_settings.ai.slots.reference_role.count.empty",
                      )
            }
            countIsEmpty={!isConfigured}
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <div>
                        <label
                            className="text-[10px] font-semibold uppercase"
                            style={fieldLabelStyle}
                        >
                            {t(
                                "blueprints.bp_settings.ai.slots.reference_role.referenced_by_blueprint.label",
                            )}
                        </label>
                        <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.reference_role.referenced_by_blueprint.hint",
                            )}
                        </div>
                    </div>
                    <Input
                        value={value.referenced_by_blueprint}
                        onChange={(e) =>
                            update({ referenced_by_blueprint: e.target.value })
                        }
                        placeholder={t(
                            "blueprints.bp_settings.ai.slots.reference_role.referenced_by_blueprint.placeholder",
                        )}
                        className="font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <div>
                        <label
                            className="text-[10px] font-semibold uppercase"
                            style={fieldLabelStyle}
                        >
                            {t(
                                "blueprints.bp_settings.ai.slots.reference_role.referenced_by_field.label",
                            )}
                        </label>
                        <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.reference_role.referenced_by_field.hint",
                            )}
                        </div>
                    </div>
                    <Input
                        value={value.referenced_by_field}
                        onChange={(e) =>
                            update({ referenced_by_field: e.target.value })
                        }
                        placeholder={t(
                            "blueprints.bp_settings.ai.slots.reference_role.referenced_by_field.placeholder",
                        )}
                        className="font-mono"
                    />
                </div>
            </div>
        </SlotCard>
    );
}
