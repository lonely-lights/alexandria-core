import { useEffect, type PointerEvent } from "react";

import useT from "@alexandria/hooks/useT";

import type { WritingRibbonContext } from "../ribbon/writingRibbonContext";
import useMobileWritingKeyboard from "./useMobileWritingKeyboard";

interface MobileEditingStripProps {
    context: WritingRibbonContext;
    onOpenStyle: () => void;
    onOpenFormat: () => void;
    onOpenContext: () => void;
    onVisibilityChange: (visible: boolean) => void;
}

function preserveEditorFocus(event: PointerEvent<HTMLButtonElement>): void {
    event.preventDefault();
}

function hasNativeKeyboardDismissControl(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }

    return (
        /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
    );
}

export default function MobileEditingStrip({
    context,
    onOpenStyle,
    onOpenFormat,
    onOpenContext,
    onVisibilityChange,
}: MobileEditingStripProps) {
    const t = useT();
    const keyboard = useMobileWritingKeyboard();
    const editor = context.editor;
    const styleValue =
        editor?.currentBlockStyle() ??
        (context.format === "screenplay" ? "action" : "normal");
    const styleLabel =
        context.format === "screenplay"
            ? t(`writing.elements.${styleValue}`, styleValue)
            : t(
                  `writing.ribbon.style_${styleValue.replace("-", "_")}`,
                  styleValue,
              );
    const hasSelection = editor?.hasNonEmptySelection() ?? false;
    const nativeKeyboardDismissControl = hasNativeKeyboardDismissControl();

    useEffect(() => {
        onVisibilityChange(keyboard.visible);

        return () => onVisibilityChange(false);
    }, [keyboard.visible, onVisibilityChange]);

    if (!keyboard.visible || editor === null) {
        return null;
    }

    return (
        <div
            role="toolbar"
            aria-label={t("writing.mobile.editing_tools")}
            data-mobile-writing-editing-strip
            className="fixed inset-x-0 z-[70] flex min-h-12 items-center justify-center gap-1 border-y px-1.5 shadow-[0_-5px_16px_rgba(0,0,0,0.22)] lg:hidden"
            style={{
                bottom: `${Math.max(0, keyboard.bottomOffset - 1)}px`,
                paddingLeft: "max(0.375rem, env(safe-area-inset-left, 0px))",
                paddingRight: "max(0.375rem, env(safe-area-inset-right, 0px))",
                background: "var(--theme-base-chrome)",
                borderColor: "var(--theme-base-400)",
                color: "var(--theme-base-content)",
            }}
        >
            <StripButton
                icon="fa-solid fa-rotate-left"
                label={t("writing.ribbon.undo")}
                disabled={!editor.canUndo()}
                onPointerDown={preserveEditorFocus}
                onClick={() => editor.undo()}
            />
            <StripButton
                icon="fa-solid fa-rotate-right"
                label={t("writing.ribbon.redo")}
                disabled={!editor.canRedo()}
                onPointerDown={preserveEditorFocus}
                onClick={() => editor.redo()}
            />
            <button
                type="button"
                onClick={onOpenStyle}
                aria-label={t("writing.mobile.change_style").replace(
                    ":style",
                    styleLabel,
                )}
                className="alex-toolbar-btn flex h-11 min-w-20 max-w-28 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold"
            >
                <i
                    className="fa-solid fa-paragraph shrink-0"
                    aria-hidden="true"
                />
                <span className="truncate">{styleLabel}</span>
            </button>
            <StripButton
                icon="fa-solid fa-font"
                label={t("writing.mobile.format")}
                onClick={onOpenFormat}
            />
            <StripButton
                icon="fa-solid fa-i-cursor"
                label={t("writing.mobile.selection_actions")}
                active={hasSelection}
                onClick={onOpenContext}
            />
            {!nativeKeyboardDismissControl && (
                <StripButton
                    icon="fa-solid fa-chevron-down"
                    label={t("writing.mobile.dismiss_keyboard")}
                    onPointerDown={preserveEditorFocus}
                    onClick={() => {
                        if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                        }
                    }}
                />
            )}
        </div>
    );
}

function StripButton({
    icon,
    label,
    active = false,
    disabled = false,
    onPointerDown,
    onClick,
}: {
    icon: string;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={active || undefined}
            disabled={disabled}
            onPointerDown={onPointerDown}
            onClick={onClick}
            className={`alex-toolbar-btn inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm disabled:opacity-35 ${active ? "alex-toolbar-btn--active" : ""}`}
        >
            <i className={icon} aria-hidden="true" />
        </button>
    );
}
