import { useState, type KeyboardEvent } from "react";

import Input from "@alexandria/components/form/Input";
import useT from "@alexandria/hooks/useT";

import SlotCard from "./SlotCard";
import { aliasChipStyle, aliasEmptyStyle } from "./styles";

/**
 * Tag-aliases editor — note tags that route incoming notes straight to
 * this blueprint without an AI call. Not a metadata slot per se (lives
 * on the blueprint table's `tag_aliases` column), but presented as a
 * sibling card so the AI Sorting panel reads as a uniform list of
 * configurable controls.
 *
 * Authors type a tag, press Enter (or comma) to commit as a chip;
 * Backspace on the empty draft input removes the trailing chip.
 */
export default function TagAliasesEditor({
    value,
    onChange,
}: {
    value: string[];
    onChange: (next: string[]) => void;
}) {
    const t = useT();
    const [draft, setDraft] = useState("");

    function commit() {
        const trimmed = draft.trim();
        if (!trimmed) return;
        const exists = value.some(
            (a) => a.toLowerCase() === trimmed.toLowerCase(),
        );
        if (!exists) onChange([...value, trimmed]);
        setDraft("");
    }

    function removeAt(index: number) {
        onChange(value.filter((_, i) => i !== index));
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
        } else if (
            e.key === "Backspace" &&
            draft === "" &&
            value.length > 0
        ) {
            removeAt(value.length - 1);
        }
    }

    return (
        <SlotCard
            slotKey="tag_aliases"
            title={t("blueprints.bp_settings.ai.tag_aliases.title")}
            description={t("blueprints.bp_settings.ai.tag_aliases.description")}
        >
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    {value.map((alias, i) => (
                        <span
                            key={`${alias}-${i}`}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs"
                            style={aliasChipStyle}
                        >
                            {alias}
                            <button
                                type="button"
                                aria-label={t(
                                    "blueprints.bp_settings.ai.tag_aliases.remove",
                                )}
                                onClick={() => removeAt(i)}
                                className="opacity-60 hover:opacity-100"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </span>
                    ))}
                    {value.length === 0 && (
                        <span className="text-xs" style={aliasEmptyStyle}>
                            {t("blueprints.bp_settings.ai.tag_aliases.empty")}
                        </span>
                    )}
                </div>
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={commit}
                    placeholder={t(
                        "blueprints.bp_settings.ai.tag_aliases.placeholder",
                    )}
                />
            </div>
        </SlotCard>
    );
}
