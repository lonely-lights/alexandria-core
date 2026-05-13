import { type CSSProperties, type ReactNode } from "react";
import Modal from "./Modal";
import ActionButton from "./ActionButton";

interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    /** Body content. String or rich JSX (e.g. with the item name styled). */
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Visual treatment for the confirm action. `danger` uses error styling
        + an alert icon — appropriate for deletes. */
    variant?: "default" | "danger";
    /** Disable the confirm button (e.g. while a save is in flight). */
    loading?: boolean;
}

const dangerHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-status-error-stroke) 30%, transparent)",
    background:
        "color-mix(in srgb, var(--theme-status-error-fill) 50%, transparent)",
};

const defaultHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-200) 50%, transparent)",
};

const dangerIconWrapStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-status-error-fill) 70%, transparent)",
    color: "var(--theme-status-error-stroke)",
};

const defaultIconWrapStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent)",
    color: "var(--theme-brand-primary-500)",
};

const bodyStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
};

const footerDividerStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

/**
 * Reusable confirmation modal — replaces `window.confirm()` calls so confirms
 * match the rest of the app's chrome instead of the browser's native dialog.
 */
export default function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    loading = false,
}: ConfirmModalProps) {
    const isDanger = variant === "danger";

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <div className="flex flex-col">
                <div
                    className="flex items-start gap-3 px-5 py-3"
                    style={isDanger ? dangerHeaderStyle : defaultHeaderStyle}
                >
                    <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                        style={
                            isDanger
                                ? dangerIconWrapStyle
                                : defaultIconWrapStyle
                        }
                    >
                        <i
                            className={`fa-solid ${isDanger ? "fa-triangle-exclamation" : "fa-circle-question"} text-sm`}
                        />
                    </div>
                    <h2 className="pt-1 text-sm font-semibold">{title}</h2>
                </div>

                <div className="px-5 py-4 text-sm" style={bodyStyle}>
                    {message}
                </div>

                <div
                    className="flex items-center justify-end gap-2 px-5 py-3"
                    style={footerDividerStyle}
                >
                    <ActionButton
                        icon="fa-solid fa-xmark"
                        label={cancelLabel}
                        variant="ghost"
                        onClick={onClose}
                    />
                    <ActionButton
                        icon={
                            isDanger ? "fa-solid fa-trash" : "fa-solid fa-check"
                        }
                        label={confirmLabel}
                        onClick={onConfirm}
                        loading={loading}
                        variant={isDanger ? "error" : "primary"}
                    />
                </div>
            </div>
        </Modal>
    );
}
