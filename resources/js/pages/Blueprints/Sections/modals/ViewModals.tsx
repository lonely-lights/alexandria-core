import { type CSSProperties, useState, useEffect } from "react";
import Modal from "@alexandria/components/ui/Modal";
import Tooltip from "@alexandria/components/ui/Tooltip";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Input from "@alexandria/components/form/Input";
import useT from "@alexandria/hooks/useT";
import type { SavedView } from "@alexandria/types/blueprints";

const headerStyle: CSSProperties = { background: "var(--theme-base-300)" };

const helperStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const helperFainterStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const helperSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

const closeBtnStyle: CSSProperties = {
    borderRadius: "9999px",
    width: "1.5rem",
    height: "1.5rem",
};

const footerDividerStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

const viewRowStyle: CSSProperties = {
    border: "1px solid var(--theme-base-300)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const defaultBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.0625rem 0.5rem",
    fontSize: "0.625rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
};

const deleteBtnStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
    borderRadius: "var(--theme-radius-button)",
};

const infoIconStyle: CSSProperties = {
    color: "var(--theme-status-info-stroke)",
};
const primaryIconStyle: CSSProperties = {
    color: "var(--theme-brand-primary-500)",
};

/* ── Views Modal ── */

export function ViewsModal({
    open,
    onClose,
    views,
    canUpdate,
    onSelect,
    onDelete,
    onResetToDefault,
}: {
    open: boolean;
    onClose: () => void;
    views: SavedView[];
    canUpdate: boolean;
    onSelect: (viewId: number) => void;
    onDelete: (viewId: number) => void;
    /** Resets the working view to the blueprint's baseline columns /
     * sort / filters. Always available so users have a guaranteed
     * escape hatch regardless of which views are saved. */
    onResetToDefault: () => void;
}) {
    const t = useT();
    const projectViews = views.filter((v) => !v.is_personal);
    const personalViews = views.filter((v) => v.is_personal);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div
                className="flex items-center justify-between px-5 py-3"
                style={headerStyle}
            >
                <h3 className="text-sm font-semibold">
                    <i className="fa-solid fa-eye mr-2" style={infoIconStyle} />
                    {t("blueprints.views.title")}
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                    style={closeBtnStyle}
                >
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            <div className="p-4">
                <div className="space-y-4">
                    {/* Always-present "Default" entry — guaranteed escape
                        back to the blueprint's baseline columns / sort
                        / filters even when the user has unsaved changes.
                        Not deletable (no trash affordance) because it's
                        synthetic, not a stored view. */}
                    <div>
                        <div className="space-y-1">
                            <button
                                type="button"
                                onClick={() => {
                                    onResetToDefault();
                                    onClose();
                                }}
                                className="alex-row group flex w-full items-center gap-2 px-3 py-2 text-left"
                                style={viewRowStyle}
                            >
                                <i
                                    className="fa-solid fa-rotate-left text-xs"
                                    style={helperFainterStyle}
                                />
                                <span className="text-sm font-medium">
                                    {t("blueprints.views.default")}
                                </span>
                                <span
                                    className="ml-auto text-[10px]"
                                    style={helperSoftStyle}
                                >
                                    {t("blueprints.views.reset_hint")}
                                </span>
                            </button>
                        </div>
                    </div>

                    {views.length === 0 ? null : (
                        <>
                            {/* Project views */}
                            {projectViews.length > 0 && (
                                <div>
                                    <h4
                                        className="mb-2 text-xs font-semibold uppercase tracking-wider"
                                        style={helperFainterStyle}
                                    >
                                        {t("blueprints.views.project_heading")}
                                    </h4>
                                    <div className="space-y-1">
                                        {projectViews.map((v) => (
                                            <div
                                                key={v.id}
                                                className="alex-row group flex items-center gap-2 px-3 py-2"
                                                style={viewRowStyle}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onSelect(v.id)
                                                    }
                                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                >
                                                    <i
                                                        className="fa-solid fa-table-list text-xs"
                                                        style={
                                                            helperFainterStyle
                                                        }
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {v.name}
                                                    </span>
                                                    {v.is_default && (
                                                        <span
                                                            style={
                                                                defaultBadgeStyle
                                                            }
                                                        >
                                                            {t(
                                                                "blueprints.views.default_badge",
                                                            )}
                                                        </span>
                                                    )}
                                                </button>
                                                {canUpdate && (
                                                    <Tooltip
                                                        content={t(
                                                            "blueprints.views.delete",
                                                        )}
                                                        variant="error"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onDelete(v.id)
                                                            }
                                                            className="alex-btn alex-btn--ghost inline-flex items-center justify-center px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                                                            style={
                                                                deleteBtnStyle
                                                            }
                                                        >
                                                            <i className="fa-solid fa-trash text-xs" />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Personal views */}
                            {personalViews.length > 0 && (
                                <div>
                                    <h4
                                        className="mb-2 text-xs font-semibold uppercase tracking-wider"
                                        style={helperFainterStyle}
                                    >
                                        {t("blueprints.views.personal_heading")}
                                    </h4>
                                    <div className="space-y-1">
                                        {personalViews.map((v) => (
                                            <div
                                                key={v.id}
                                                className="alex-row group flex items-center gap-2 px-3 py-2"
                                                style={viewRowStyle}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onSelect(v.id)
                                                    }
                                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                >
                                                    <i
                                                        className="fa-solid fa-user text-xs"
                                                        style={
                                                            helperFainterStyle
                                                        }
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {v.name}
                                                    </span>
                                                </button>
                                                <Tooltip
                                                    content={t(
                                                        "blueprints.views.delete",
                                                    )}
                                                    variant="error"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onDelete(v.id)
                                                        }
                                                        className="alex-btn alex-btn--ghost inline-flex items-center justify-center px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                                                        style={deleteBtnStyle}
                                                    >
                                                        <i className="fa-solid fa-trash text-xs" />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div
                className="flex items-center justify-end px-5 py-3"
                style={footerDividerStyle}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="alex-btn alex-btn--ghost inline-flex items-center px-3 py-1 text-sm"
                    style={{ borderRadius: "var(--theme-radius-button)" }}
                >
                    {t("common.close")}
                </button>
            </div>
        </Modal>
    );
}

/* ── Save View Modal ── */

export function SaveViewModal({
    open,
    onClose,
    onSave,
    saving,
    currentName,
    isPersonal,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (name: string, isDefault: boolean) => void;
    saving: boolean;
    currentName: string;
    isPersonal: boolean;
}) {
    const t = useT();
    const [name, setName] = useState(
        currentName || t("blueprints.views.save.default_name"),
    );
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        if (open) {
            setName(currentName || t("blueprints.views.save.default_name"));
            setIsDefault(false);
        }
    }, [open, currentName, t]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <div
                className="flex items-center justify-between px-5 py-3"
                style={headerStyle}
            >
                <h3 className="text-sm font-semibold">
                    <i
                        className="fa-solid fa-floppy-disk mr-2"
                        style={primaryIconStyle}
                    />
                    {t("blueprints.views.save.title")}
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                    style={closeBtnStyle}
                >
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            <div className="space-y-4 p-5">
                <Input
                    label={t("blueprints.views.save.name_label")}
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    onKeyDown={(e) =>
                        e.key === "Enter" &&
                        name.trim() &&
                        onSave(name.trim(), isDefault)
                    }
                    placeholder={t("blueprints.views.save.name_placeholder")}
                    maxLength={100}
                    autoFocus
                />

                <label
                    className="alex-row flex cursor-pointer items-center gap-3 px-4 py-3"
                    style={viewRowStyle}
                >
                    <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        style={{
                            accentColor: "var(--theme-brand-primary-500)",
                        }}
                    />
                    <div>
                        <span className="text-sm font-medium">
                            {t("blueprints.views.save.set_default")}
                        </span>
                        <p className="text-xs" style={helperStyle}>
                            {t("blueprints.views.save.set_default_hint")}
                        </p>
                    </div>
                </label>

                {isPersonal && !isDefault && (
                    <p className="text-xs" style={helperFainterStyle}>
                        <i className="fa-solid fa-user mr-1" />
                        {t("blueprints.views.save.personal_note")}
                    </p>
                )}
            </div>

            <div
                className="flex items-center justify-end gap-2 px-5 py-3"
                style={footerDividerStyle}
            >
                <ActionButton
                    icon="fa-solid fa-xmark"
                    label={t("common.cancel")}
                    variant="ghost"
                    onClick={onClose}
                />
                <ActionButton
                    icon="fa-solid fa-check"
                    label={t("common.save")}
                    onClick={() => onSave(name.trim(), isDefault)}
                    disabled={!name.trim()}
                    loading={saving}
                />
            </div>
        </Modal>
    );
}
