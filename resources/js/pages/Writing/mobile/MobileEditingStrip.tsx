import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import useT from "@alexandria/hooks/useT";
import {
    buildRibbonSearchIndex,
    executeRibbonSearchResult,
} from "@alexandria/ribbon/commandSearch";
import {
    getRibbonTabs,
    subscribeRibbon,
} from "@alexandria/ribbon/ribbonRegistry";
import type { RibbonGates, RibbonTab } from "@alexandria/ribbon/types";
import type { WritingRibbonContext } from "../ribbon/writingRibbonContext";

/** Only frequent, selection-sensitive actions earn keyboard-adjacent space. */
export default function MobileEditingStrip({
    context,
    gates,
    top,
    onTools,
}: {
    context: WritingRibbonContext;
    gates: RibbonGates;
    top: number;
    onTools: () => void;
}) {
    const t = useT();
    const tabs = useSyncExternalStore(subscribeRibbon, () =>
        getRibbonTabs("writing"),
    ) as RibbonTab<WritingRibbonContext>[];
    const ids =
        context.format === "screenplay"
            ? ["undo", "redo"]
            : ["undo", "redo", "bold", "italic", "underline"];
    const commands = buildRibbonSearchIndex(tabs, context, t, gates).filter(
        (item) =>
            ids.includes(item.controlId) && item.optionValue === undefined,
    );

    return createPortal(
        <div
            className="writing-editing-strip safe-x"
            role="toolbar"
            aria-label={t("writing.tools.editing_toolbar")}
            style={{ top }}
        >
            {commands.map((item) => (
                <button
                    type="button"
                    key={item.id}
                    className="writing-touch-button"
                    disabled={item.disabled}
                    aria-label={item.label}
                    aria-pressed={item.active}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() =>
                        executeRibbonSearchResult(item, tabs, context, gates)
                    }
                >
                    <i className={item.icon} aria-hidden="true" />
                </button>
            ))}
            {context.format === "screenplay" && (
                <button
                    type="button"
                    className="writing-touch-button min-w-0 flex-1 gap-2 px-2 text-sm"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={onTools}
                >
                    <span className="truncate">
                        {t(
                            `writing.elements.${context.editor?.currentElement() ?? "action"}`,
                        )}
                    </span>
                    <i
                        className="fa-solid fa-chevron-down text-xs"
                        aria-hidden="true"
                    />
                </button>
            )}
            <button
                type="button"
                className="writing-touch-button"
                onPointerDown={(event) => event.preventDefault()}
                onClick={onTools}
                aria-label={t("writing.tools.more_formatting")}
            >
                <i className="fa-solid fa-font" aria-hidden="true" />
            </button>
            <button
                type="button"
                className="writing-touch-button"
                aria-label={t("writing.tools.dismiss_keyboard")}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                }}
            >
                <i className="fa-solid fa-keyboard" aria-hidden="true" />
            </button>
        </div>,
        document.body,
    );
}
