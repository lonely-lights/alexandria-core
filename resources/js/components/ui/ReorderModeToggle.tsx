import type { CSSProperties } from "react";
import type { ReorderMode } from "../../hooks/useReorderMode";

interface ReorderModeToggleProps {
    mode: ReorderMode;
    onChange: (mode: ReorderMode) => void;
    className?: string;
}

const shellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-button)",
};

const segActiveStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
    color: "var(--theme-brand-primary-500)",
};

const segIdleStyle: CSSProperties = {
    background: "transparent",
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

/**
 * Segmented toggle between drag-and-drop reordering and up/down arrow buttons.
 * Applies to any list that supports both reorder UIs (Fields, Infobox blocks).
 */
export default function ReorderModeToggle({
    mode,
    onChange,
    className = "",
}: ReorderModeToggleProps) {
    return (
        <div
            className={`inline-flex items-center gap-0.5 p-0.5 ${className}`}
            style={shellStyle}
            role="group"
            aria-label="Reorder mode"
        >
            <button
                type="button"
                onClick={() => onChange("drag")}
                aria-pressed={mode === "drag"}
                aria-label="Drag to reorder"
                title="Drag to reorder"
                className="alex-row flex h-6 w-7 items-center justify-center text-xs"
                style={{
                    borderRadius: "var(--theme-radius-button)",
                    ...(mode === "drag" ? segActiveStyle : segIdleStyle),
                }}
            >
                <i className="fa-solid fa-arrows-up-down text-[10px]" />
            </button>
            <button
                type="button"
                onClick={() => onChange("arrows")}
                aria-pressed={mode === "arrows"}
                aria-label="Use arrow buttons to reorder"
                title="Use arrow buttons to reorder"
                className="alex-row flex h-6 w-7 items-center justify-center text-xs"
                style={{
                    borderRadius: "var(--theme-radius-button)",
                    ...(mode === "arrows" ? segActiveStyle : segIdleStyle),
                }}
            >
                <i className="fa-solid fa-sort text-[10px]" />
            </button>
        </div>
    );
}
