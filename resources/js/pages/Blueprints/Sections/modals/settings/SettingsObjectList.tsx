import type { CSSProperties, ReactNode } from "react";

// Multi-input rows need MORE structure than SettingsStringList's
// bullet+line treatment — otherwise two inputs per row blur together.
// Solution: subtle background tint + 2px left accent stripe, no full
// border. Reads as a grouped item without the noisy "tile" feel.
const itemRowStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 4%, transparent)",
    borderLeft: "2px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
    borderRadius: "var(--theme-radius-input)",
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
 * Repeater list of typed objects. The caller supplies a renderItem
 * callback that knows how to render the item's fields (and an
 * update callback the caller wires into each input). Used for slot
 * fields where each row is a small record — copy_targets
 * (blueprint_slug + trigger), boundaries (target + kind + rule),
 * structural_rules.cascading_relationships (pairing + target_blueprint
 * + trigger), etc.
 *
 * Generic over T so each slot can keep its own typed shape; the
 * helper only handles list mechanics (add / remove / forward updates).
 * Empty rows are kept in state for editing; the parent's compose step
 * filters them before saving.
 */
export default function SettingsObjectList<T>({
    values,
    onChange,
    createEmpty,
    renderItem,
    addLabel,
    removeLabel,
    emptyHint,
}: {
    values: T[];
    onChange: (next: T[]) => void;
    createEmpty: () => T;
    renderItem: (item: T, update: (next: T) => void, index: number) => ReactNode;
    addLabel: string;
    removeLabel: string;
    emptyHint: string;
}) {
    function updateAt(index: number, next: T) {
        const updated = [...values];
        updated[index] = next;
        onChange(updated);
    }

    function removeAt(index: number) {
        onChange(values.filter((_, i) => i !== index));
    }

    function addItem() {
        onChange([...values, createEmpty()]);
    }

    return (
        <div className="space-y-2">
            {values.length === 0 && (
                <div className="text-xs" style={emptyHintStyle}>
                    {emptyHint}
                </div>
            )}
            {values.map((item, index) => (
                <div
                    key={index}
                    className="flex items-start gap-2 px-3 py-2.5"
                    style={itemRowStyle}
                >
                    <div className="flex-1 space-y-1.5">
                        {renderItem(item, (next) => updateAt(index, next), index)}
                    </div>
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
            <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium"
                style={addButtonStyle}
            >
                <i className="fa-solid fa-plus" />
                {addLabel}
            </button>
        </div>
    );
}
