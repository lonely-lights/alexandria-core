import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import useT from "@alexandria/hooks/useT";
import useWritingViewport from "./useWritingViewport";

/** Native dialog supplies focus containment, Escape and inert background content. */
export default function WritingToolDialog({
    title,
    children,
    onClose,
}: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const t = useT();
    const viewport = useWritingViewport();
    const keyboardHeight = viewport.keyboard
        ? Math.max(160, viewport.height - 24)
        : undefined;
    useEffect(() => {
        const dialog = ref.current;
        dialog?.showModal();

        return () => dialog?.close();
    }, []);

    return createPortal(
        <dialog
            ref={ref}
            className="writing-tool-dialog"
            style={
                viewport.keyboard
                    ? {
                          position: "fixed",
                          margin: 0,
                          left: "50%",
                          top: viewport.top + viewport.height / 2,
                          transform: "translate(-50%, -50%)",
                          maxHeight: keyboardHeight,
                      }
                    : undefined
            }
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="writing-tool-dialog__body"
                style={{ maxHeight: keyboardHeight }}
            >
                <header
                    className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2"
                    style={{ borderColor: "var(--theme-base-400)" }}
                >
                    <h2 id={titleId} className="min-w-0 truncate font-semibold">
                        {title}
                    </h2>
                    <button
                        type="button"
                        autoFocus
                        className="writing-touch-button"
                        aria-label={t("writing.tools.close")}
                        onClick={onClose}
                    >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>
                {children}
            </div>
        </dialog>,
        document.body,
    );
}
