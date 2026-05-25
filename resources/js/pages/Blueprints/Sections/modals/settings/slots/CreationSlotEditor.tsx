import { useState } from "react";

import Input from "@alexandria/components/form/Input";
import Textarea from "@alexandria/components/form/Textarea";
import useT from "@alexandria/hooks/useT";

import SettingsObjectList from "../SettingsObjectList";
import SlotCard from "./SlotCard";
import {
    disclosureButtonStyle,
    fieldHintStyle,
    fieldLabelStyle,
    subSectionHeaderStyle,
    subSectionTitleStyle,
} from "./styles";
import type { CopyTarget, CreationSlot, NoteAttachmentSlot } from "./types";

/**
 * Creation slot editor — the second required slot. Four field groups:
 *
 *  - `naming` (prose): how the AI titles a new entry
 *  - `summary` (prose): what fills the entry's summary
 *  - `note_attachment` (group): primary_role + copy_targets repeater
 *  - `relationships.guidance` (optional disclosure): prose for the AI
 *    when creating relationships alongside the entry
 *
 * Each sub-field is independently optional; the parent's composer drops
 * empty sub-objects. Relationship guidance defaults open if populated.
 */
export default function CreationSlotEditor({
    value,
    onChange,
}: {
    value: CreationSlot;
    onChange: (next: CreationSlot) => void;
}) {
    const t = useT();
    const [showRelationships, setShowRelationships] = useState(
        (value.relationships?.guidance ?? "").trim().length > 0,
    );

    function update(patch: Partial<CreationSlot>) {
        onChange({ ...value, ...patch });
    }

    const noteAttachment: NoteAttachmentSlot = value.note_attachment ?? {};

    function updateNoteAttachment(patch: Partial<NoteAttachmentSlot>) {
        update({ note_attachment: { ...noteAttachment, ...patch } });
    }

    return (
        <SlotCard
            slotKey="creation"
            title={t("blueprints.bp_settings.ai.slots.creation.title")}
            description={t(
                "blueprints.bp_settings.ai.slots.creation.description",
            )}
        >
            {/* Naming — prose guidance for the AI's entry-title choice. */}
            <div className="space-y-2">
                <div>
                    <label
                        className="text-[10px] font-semibold uppercase"
                        style={fieldLabelStyle}
                    >
                        {t(
                            "blueprints.bp_settings.ai.slots.creation.naming.label",
                        )}
                    </label>
                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                        {t(
                            "blueprints.bp_settings.ai.slots.creation.naming.hint",
                        )}
                    </div>
                </div>
                <Textarea
                    value={value.naming ?? ""}
                    onChange={(e) => update({ naming: e.target.value })}
                    placeholder={t(
                        "blueprints.bp_settings.ai.slots.creation.naming.placeholder",
                    )}
                    rows={2}
                />
            </div>

            {/* Summary — what fills the entry's summary field. */}
            <div className="space-y-2">
                <div>
                    <label
                        className="text-[10px] font-semibold uppercase"
                        style={fieldLabelStyle}
                    >
                        {t(
                            "blueprints.bp_settings.ai.slots.creation.summary.label",
                        )}
                    </label>
                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                        {t(
                            "blueprints.bp_settings.ai.slots.creation.summary.hint",
                        )}
                    </div>
                </div>
                <Textarea
                    value={value.summary ?? ""}
                    onChange={(e) => update({ summary: e.target.value })}
                    placeholder={t(
                        "blueprints.bp_settings.ai.slots.creation.summary.placeholder",
                    )}
                    rows={2}
                />
            </div>

            {/* Note attachment sub-section. */}
            <div className="space-y-4 pt-4" style={subSectionHeaderStyle}>
                <div>
                    <div
                        className="text-sm font-semibold"
                        style={subSectionTitleStyle}
                    >
                        {t(
                            "blueprints.bp_settings.ai.slots.creation.note_attachment.heading",
                        )}
                    </div>
                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                        {t(
                            "blueprints.bp_settings.ai.slots.creation.note_attachment.description",
                        )}
                    </div>
                </div>

                {/* Primary role. */}
                <div className="space-y-2">
                    <div>
                        <label
                            className="text-[10px] font-semibold uppercase"
                            style={fieldLabelStyle}
                        >
                            {t(
                                "blueprints.bp_settings.ai.slots.creation.note_attachment.primary_role.label",
                            )}
                        </label>
                        <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.creation.note_attachment.primary_role.hint",
                            )}
                        </div>
                    </div>
                    <Input
                        value={noteAttachment.primary_role ?? ""}
                        onChange={(e) =>
                            updateNoteAttachment({ primary_role: e.target.value })
                        }
                        placeholder={t(
                            "blueprints.bp_settings.ai.slots.creation.note_attachment.primary_role.placeholder",
                        )}
                    />
                </div>

                {/* Copy targets. */}
                <div className="space-y-2">
                    <div>
                        <label
                            className="text-[10px] font-semibold uppercase"
                            style={fieldLabelStyle}
                        >
                            {t(
                                "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.label",
                            )}
                        </label>
                        <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.hint",
                            )}
                        </div>
                    </div>
                    <SettingsObjectList<CopyTarget>
                        values={noteAttachment.copy_targets ?? []}
                        onChange={(copy_targets) =>
                            updateNoteAttachment({ copy_targets })
                        }
                        createEmpty={() => ({
                            blueprint_slug: "",
                            trigger: "",
                        })}
                        addLabel={t(
                            "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.add",
                        )}
                        removeLabel={t(
                            "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.remove",
                        )}
                        emptyHint={t(
                            "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.empty",
                        )}
                        renderItem={(item, updateItem) => (
                            <>
                                <Input
                                    value={item.blueprint_slug}
                                    onChange={(e) =>
                                        updateItem({
                                            ...item,
                                            blueprint_slug: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.blueprint_slug.placeholder",
                                    )}
                                    className="font-mono"
                                />
                                <Input
                                    value={item.trigger}
                                    onChange={(e) =>
                                        updateItem({
                                            ...item,
                                            trigger: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.trigger.placeholder",
                                    )}
                                />
                            </>
                        )}
                    />
                </div>
            </div>

            {/* Relationships guidance — optional disclosure. */}
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowRelationships((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-semibold transition-colors hover:bg-[color:color-mix(in_srgb,var(--theme-base-content)_5%,transparent)]"
                    style={disclosureButtonStyle}
                >
                    <i
                        className={`fa-solid fa-chevron-${showRelationships ? "down" : "right"}`}
                    />
                    {showRelationships
                        ? t(
                              "blueprints.bp_settings.ai.slots.creation.relationships.hide",
                          )
                        : t(
                              "blueprints.bp_settings.ai.slots.creation.relationships.show",
                          )}
                </button>
                {showRelationships && (
                    <div className="space-y-2 pt-1">
                        <div className="text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.creation.relationships.hint",
                            )}
                        </div>
                        <Textarea
                            value={value.relationships?.guidance ?? ""}
                            onChange={(e) =>
                                update({
                                    relationships: {
                                        guidance: e.target.value,
                                    },
                                })
                            }
                            placeholder={t(
                                "blueprints.bp_settings.ai.slots.creation.relationships.placeholder",
                            )}
                            rows={3}
                        />
                    </div>
                )}
            </div>
        </SlotCard>
    );
}
