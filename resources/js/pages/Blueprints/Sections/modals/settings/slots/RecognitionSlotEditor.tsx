import { useState } from "react";

import Textarea from "@alexandria/components/form/Textarea";
import useT from "@alexandria/hooks/useT";

import SettingsStringList from "../SettingsStringList";
import SlotCard from "./SlotCard";
import {
    disclosureButtonStyle,
    fieldHintStyle,
    fieldLabelStyle,
} from "./styles";
import type { RecognitionSlot } from "./types";

/**
 * Recognition slot editor — the required slot. Three fields:
 *
 *  - `lead` (required prose): the framing sentence the AI reads first
 *  - `examples` (optional list): positive cases that fit this blueprint
 *  - `negative_examples` (optional list): cases that look similar but
 *    belong elsewhere — collapsed by default, expand-on-click
 *
 * Counter-examples default open if any are already populated, so
 * authors aren't surprised by hidden content. Empty input rows are
 * preserved while editing; the parent's composer filters them at save.
 */
export default function RecognitionSlotEditor({
    value,
    onChange,
}: {
    value: RecognitionSlot;
    onChange: (next: RecognitionSlot) => void;
}) {
    const t = useT();
    const [showNegative, setShowNegative] = useState(
        (value.negative_examples?.length ?? 0) > 0,
    );

    function update(patch: Partial<RecognitionSlot>) {
        onChange({ ...value, ...patch });
    }

    return (
        <SlotCard
            slotKey="recognition"
            title={t("blueprints.bp_settings.ai.slots.recognition.title")}
            description={t(
                "blueprints.bp_settings.ai.slots.recognition.description",
            )}
        >
            {/* Lead — required prose. */}
            <div className="space-y-2">
                <div>
                    <label
                        className="text-[10px] font-semibold uppercase"
                        style={fieldLabelStyle}
                    >
                        {t(
                            "blueprints.bp_settings.ai.slots.recognition.lead.label",
                        )}
                    </label>
                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                        {t(
                            "blueprints.bp_settings.ai.slots.recognition.lead.hint",
                        )}
                    </div>
                </div>
                <Textarea
                    value={value.lead ?? ""}
                    onChange={(e) => update({ lead: e.target.value })}
                    placeholder={t(
                        "blueprints.bp_settings.ai.slots.recognition.lead.placeholder",
                    )}
                    rows={3}
                />
            </div>

            {/* Examples — positive routing hints. */}
            <div className="space-y-2">
                <div>
                    <label
                        className="text-[10px] font-semibold uppercase"
                        style={fieldLabelStyle}
                    >
                        {t(
                            "blueprints.bp_settings.ai.slots.recognition.examples.label",
                        )}
                    </label>
                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                        {t(
                            "blueprints.bp_settings.ai.slots.recognition.examples.hint",
                        )}
                    </div>
                </div>
                <SettingsStringList
                    values={value.examples ?? []}
                    onChange={(examples) => update({ examples })}
                    placeholder={t(
                        "blueprints.bp_settings.ai.slots.recognition.examples.placeholder",
                    )}
                    addLabel={t(
                        "blueprints.bp_settings.ai.slots.recognition.examples.add",
                    )}
                    removeLabel={t(
                        "blueprints.bp_settings.ai.slots.recognition.examples.remove",
                    )}
                    emptyHint={t(
                        "blueprints.bp_settings.ai.slots.recognition.examples.empty",
                    )}
                />
            </div>

            {/* Counter-examples — optional disclosure. */}
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowNegative((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-semibold transition-colors hover:bg-[color:color-mix(in_srgb,var(--theme-base-content)_5%,transparent)]"
                    style={disclosureButtonStyle}
                >
                    <i
                        className={`fa-solid fa-chevron-${showNegative ? "down" : "right"}`}
                    />
                    {showNegative
                        ? t(
                              "blueprints.bp_settings.ai.slots.recognition.negative_examples.hide",
                          )
                        : t(
                              "blueprints.bp_settings.ai.slots.recognition.negative_examples.show",
                          )}
                </button>
                {showNegative && (
                    <div className="space-y-2 pt-1">
                        <div className="text-xs" style={fieldHintStyle}>
                            {t(
                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.hint",
                            )}
                        </div>
                        <SettingsStringList
                            values={value.negative_examples ?? []}
                            onChange={(negative_examples) =>
                                update({ negative_examples })
                            }
                            placeholder={t(
                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.placeholder",
                            )}
                            addLabel={t(
                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.add",
                            )}
                            removeLabel={t(
                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.remove",
                            )}
                            emptyHint={t(
                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.empty",
                            )}
                        />
                    </div>
                )}
            </div>
        </SlotCard>
    );
}
