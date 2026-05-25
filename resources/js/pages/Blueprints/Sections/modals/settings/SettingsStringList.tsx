import { useState, type CSSProperties, type KeyboardEvent } from "react";

// Light-touch row chrome — reads as a list of items rather than a stack
// of bordered tiles. The bullet marker on the left provides visual
// structure; the input itself is borderless and lets the underline
// from focus/hover suggest editability.
const itemRowStyle: CSSProperties = {
    borderBottom: "1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    color: "var(--theme-base-content)",
};

const bulletStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

const inputStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
};

const addButtonStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 4%, transparent)",
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 22%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    color: "color-mix(in srgb, var(--theme-base-content) 75%, transparent)",
};

const emptyHintStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    fontStyle: "italic",
};

const removeButtonStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 45%, transparent)",
};

/**
 * Repeater list of plain strings — one input per item with a × remove
 * button, plus an "Add" affordance below. Used for slot fields where the
 * author needs a discrete ordered list (recognition.examples,
 * recognition.negative_examples, boundaries[].target rules,
 * structural_rules.dependencies, etc.).
 *
 * Pattern: render an editable input for each existing value; clicking
 * Add appends an empty input which auto-focuses. Empty values are
 * filtered out by the parent at save time.
 */
export default function SettingsStringList({
    values,
    onChange,
    placeholder,
    addLabel,
    removeLabel,
    emptyHint,
}: {
    values: string[];
    onChange: (next: string[]) => void;
    placeholder: string;
    addLabel: string;
    removeLabel: string;
    emptyHint: string;
}) {
    const [focusIndex, setFocusIndex] = useState<number | null>(null);

    function updateAt(index: number, next: string) {
        const updated = [...values];
        updated[index] = next;
        onChange(updated);
    }

    function removeAt(index: number) {
        onChange(values.filter((_, i) => i !== index));
        setFocusIndex(null);
    }

    function addRow() {
        onChange([...values, ""]);
        setFocusIndex(values.length);
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
        if (e.key === "Enter") {
            e.preventDefault();
            addRow();
        } else if (
            e.key === "Backspace" &&
            values[index] === "" &&
            values.length > 1
        ) {
            e.preventDefault();
            removeAt(index);
            setFocusIndex(Math.max(0, index - 1));
        }
    }

    return (
        <div className="space-y-2">
            {values.length === 0 && (
                <div className="text-xs" style={emptyHintStyle}>
                    {emptyHint}
                </div>
            )}
            {values.length > 0 && (
                <div>
                    {values.map((value, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 py-1.5"
                            style={itemRowStyle}
                        >
                            <span
                                className="select-none text-sm leading-none"
                                style={bulletStyle}
                                aria-hidden
                            >
                                •
                            </span>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => updateAt(index, e.target.value)}
                                onKeyDown={(e) => onKeyDown(e, index)}
                                autoFocus={focusIndex === index}
                                placeholder={placeholder}
                                className="flex-1 px-0 py-0.5 text-sm focus:outline-none"
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                aria-label={removeLabel}
                                onClick={() => removeAt(index)}
                                className="px-1 py-0.5 opacity-60 transition-opacity hover:opacity-100"
                                style={removeButtonStyle}
                            >
                                <i className="fa-solid fa-xmark text-xs" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium"
                style={addButtonStyle}
            >
                <i className="fa-solid fa-plus" />
                {addLabel}
            </button>
        </div>
    );
}
