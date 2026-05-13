import { type CSSProperties, useEffect, useState } from "react";
import Modal from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import { compileTemplate } from "../../InfoboxTab";
import type { BlueprintField } from "@alexandria/types/blueprints";
import {
    helperFainterStyle,
    helperSoftStyle,
    helperStyle,
    inputStyle,
    labelStyle,
    selectStyle,
    softDividerStyle,
} from "./settingsPanelStyles";

const compactInputStyle: CSSProperties = {
    ...inputStyle,
    height: "1.75rem",
    fontSize: "0.75rem",
};

const compactSelectStyle: CSSProperties = {
    ...selectStyle,
    height: "1.75rem",
    fontSize: "0.75rem",
};

const headerDividerStyle: CSSProperties = {
    borderBottom: "1px solid var(--theme-base-300)",
};

const helperBannerStyle: CSSProperties = {
    ...headerDividerStyle,
    background: "color-mix(in srgb, var(--theme-base-200) 30%, transparent)",
};

const segmentCardStyle: CSSProperties = {
    border: "1px solid var(--theme-base-300)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
};

const segmentHeaderDividerStyle: CSSProperties = {
    borderBottom: "1px solid var(--theme-base-200)",
};

const dashedEmptyStyle: CSSProperties = {
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const errorSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 30%, transparent)",
};

const errorVerySoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 20%, transparent)",
};

const errorHalfStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 50%, transparent)",
};

const primaryTextStyle: CSSProperties = {
    color: "var(--theme-brand-primary-500)",
};

const veryHelperStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
};

const closeBtnStyle: CSSProperties = {
    borderRadius: "var(--theme-radius-button)",
    width: "2rem",
    height: "2rem",
};

function titleCase(str: string): string {
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Inline relationship-subtitle builder. Opened from the relationship
 * display panel; lets the user assemble a template from field values
 * with optional linkability, format, separator, and wrap characters.
 * Template is compiled via InfoboxTab's `compileTemplate` on apply.
 */
export default function SubtitleBuilderModal({
    open,
    onClose,
    data,
    onChange,
    blueprintFields,
}: {
    open: boolean;
    onClose: () => void;
    data: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
    blueprintFields: BlueprintField[];
}) {
    const t = useT();
    type Part = { property: string; format: string };
    type Segment = { field: string; parts: Part[]; linkable?: boolean };

    const [segments, setSegments] = useState<Segment[]>(
        (data.subtitle_segments as Segment[] | undefined) ?? [],
    );
    const [separator, setSeparator] = useState(
        (data.subtitle_separator as string) ?? "; ",
    );
    const [wrapPrefix, setWrapPrefix] = useState(
        (data.subtitle_wrap_prefix as string) ?? "",
    );
    const [wrapSuffix, setWrapSuffix] = useState(
        (data.subtitle_wrap_suffix as string) ?? "",
    );

    useEffect(() => {
        if (open) {
            setSegments(
                (data.subtitle_segments as Segment[] | undefined) ?? [],
            );
            setSeparator((data.subtitle_separator as string) ?? "; ");
            setWrapPrefix((data.subtitle_wrap_prefix as string) ?? "");
            setWrapSuffix((data.subtitle_wrap_suffix as string) ?? "");
        }
    }, [open]);

    function addSegment() {
        setSegments((prev) => [
            ...prev,
            {
                field: "",
                parts: [{ property: "", format: "" }],
                linkable: false,
            },
        ]);
    }

    function apply() {
        const template = compileTemplate(
            segments,
            separator,
            wrapPrefix,
            wrapSuffix,
        );

        onChange({
            ...data,
            subtitle_segments: segments,
            subtitle_separator: separator,
            subtitle_wrap_prefix: wrapPrefix,
            subtitle_wrap_suffix: wrapSuffix,
            subtitle_template: template,
        });
        onClose();
    }

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col">
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={headerDividerStyle}
                >
                    <div>
                        <h2 className="text-lg font-bold">
                            {t("blueprints.settings.subtitle.title")}
                        </h2>
                        <p
                            className="mt-0.5 text-xs"
                            style={helperFainterStyle}
                        >
                            {t("blueprints.settings.subtitle.subtitle")}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                        style={closeBtnStyle}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="px-6 py-3" style={helperBannerStyle}>
                    <p className="text-xs leading-relaxed" style={helperStyle}>
                        {t("blueprints.settings.subtitle.intro")}
                    </p>
                </div>

                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <label
                            className="text-sm font-semibold"
                            style={labelStyle}
                        >
                            {t("blueprints.settings.subtitle.display_fields")}
                        </label>
                        <button
                            type="button"
                            onClick={addSegment}
                            className="alex-btn alex-btn--ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
                            style={{
                                ...primaryTextStyle,
                                borderRadius: "var(--theme-radius-button)",
                            }}
                        >
                            <i className="fa-solid fa-plus text-[10px]" />{" "}
                            {t("blueprints.settings.subtitle.add_field")}
                        </button>
                    </div>

                    {segments.length === 0 ? (
                        <div
                            className="mt-3 py-6 text-center"
                            style={dashedEmptyStyle}
                        >
                            <p className="text-xs" style={helperSoftStyle}>
                                {t("blueprints.settings.subtitle.empty")}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {segments.map((seg, i) => (
                                <div key={i} style={segmentCardStyle}>
                                    <div
                                        className="flex items-center gap-2 px-3 py-2"
                                        style={segmentHeaderDividerStyle}
                                    >
                                        <select
                                            value={seg.field}
                                            onChange={(e) =>
                                                setSegments((prev) =>
                                                    prev.map((s, j) =>
                                                        j === i
                                                            ? {
                                                                  ...s,
                                                                  field: e
                                                                      .target
                                                                      .value,
                                                              }
                                                            : s,
                                                    ),
                                                )
                                            }
                                            className="flex-1 px-2 focus:outline-none focus:ring-2"
                                            style={compactSelectStyle}
                                        >
                                            <option value="">
                                                {t(
                                                    "blueprints.settings.subtitle.field_placeholder",
                                                )}
                                            </option>
                                            {blueprintFields.map((f) => (
                                                <option
                                                    key={f.name}
                                                    value={f.name}
                                                >
                                                    {f.label} (
                                                    {titleCase(f.type)})
                                                </option>
                                            ))}
                                        </select>
                                        <label
                                            className="alex-row flex flex-shrink-0 cursor-pointer items-center gap-1.5 px-2 py-1"
                                            style={{
                                                borderRadius:
                                                    "var(--theme-radius-button)",
                                            }}
                                            title={t(
                                                "blueprints.settings.subtitle.linkable_tooltip",
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!seg.linkable}
                                                onChange={(e) =>
                                                    setSegments((prev) =>
                                                        prev.map((s, j) =>
                                                            j === i
                                                                ? {
                                                                      ...s,
                                                                      linkable:
                                                                          e
                                                                              .target
                                                                              .checked,
                                                                  }
                                                                : s,
                                                        ),
                                                    )
                                                }
                                                style={{
                                                    accentColor:
                                                        "var(--theme-brand-primary-500)",
                                                }}
                                            />
                                            <i
                                                className="fa-solid fa-link text-[10px]"
                                                style={
                                                    seg.linkable
                                                        ? primaryTextStyle
                                                        : {
                                                              color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                                                          }
                                                }
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSegments((prev) =>
                                                    prev.filter(
                                                        (_, j) => j !== i,
                                                    ),
                                                )
                                            }
                                            className="alex-row flex h-6 w-6 items-center justify-center"
                                            style={{
                                                ...errorSoftStyle,
                                                borderRadius:
                                                    "var(--theme-radius-button)",
                                            }}
                                        >
                                            <i className="fa-solid fa-trash text-[10px]" />
                                        </button>
                                    </div>
                                    {seg.field && (
                                        <div className="px-3 py-2">
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span
                                                    className="text-[10px] font-medium uppercase tracking-wider"
                                                    style={helperSoftStyle}
                                                >
                                                    {t(
                                                        "blueprints.settings.subtitle.properties",
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSegments((prev) =>
                                                            prev.map((s, j) =>
                                                                j === i
                                                                    ? {
                                                                          ...s,
                                                                          parts: [
                                                                              ...s.parts,
                                                                              {
                                                                                  property:
                                                                                      "",
                                                                                  format: "",
                                                                              },
                                                                          ],
                                                                      }
                                                                    : s,
                                                            ),
                                                        )
                                                    }
                                                    className="text-[10px] hover:underline"
                                                    style={primaryTextStyle}
                                                >
                                                    + {t("common.add")}
                                                </button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {seg.parts.map((part, pi) => (
                                                    <div
                                                        key={pi}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <input
                                                            type="text"
                                                            value={
                                                                part.property
                                                            }
                                                            onChange={(e) =>
                                                                setSegments(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                s,
                                                                                j,
                                                                            ) =>
                                                                                j ===
                                                                                i
                                                                                    ? {
                                                                                          ...s,
                                                                                          parts: s.parts.map(
                                                                                              (
                                                                                                  p,
                                                                                                  k,
                                                                                              ) =>
                                                                                                  k ===
                                                                                                  pi
                                                                                                      ? {
                                                                                                            ...p,
                                                                                                            property:
                                                                                                                e
                                                                                                                    .target
                                                                                                                    .value,
                                                                                                        }
                                                                                                      : p,
                                                                                          ),
                                                                                      }
                                                                                    : s,
                                                                        ),
                                                                )
                                                            }
                                                            placeholder={t(
                                                                "blueprints.settings.subtitle.property_placeholder",
                                                            )}
                                                            className="flex-1 px-2 focus:outline-none focus:ring-2"
                                                            style={
                                                                compactInputStyle
                                                            }
                                                        />
                                                        <select
                                                            value={part.format}
                                                            onChange={(e) =>
                                                                setSegments(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                s,
                                                                                j,
                                                                            ) =>
                                                                                j ===
                                                                                i
                                                                                    ? {
                                                                                          ...s,
                                                                                          parts: s.parts.map(
                                                                                              (
                                                                                                  p,
                                                                                                  k,
                                                                                              ) =>
                                                                                                  k ===
                                                                                                  pi
                                                                                                      ? {
                                                                                                            ...p,
                                                                                                            format: e
                                                                                                                .target
                                                                                                                .value,
                                                                                                        }
                                                                                                      : p,
                                                                                          ),
                                                                                      }
                                                                                    : s,
                                                                        ),
                                                                )
                                                            }
                                                            className="w-24 px-2 focus:outline-none focus:ring-2"
                                                            style={
                                                                compactSelectStyle
                                                            }
                                                        >
                                                            <option value="">
                                                                {t(
                                                                    "blueprints.settings.subtitle.format.raw",
                                                                )}
                                                            </option>
                                                            <option value="year">
                                                                {t(
                                                                    "blueprints.settings.subtitle.format.year",
                                                                )}
                                                            </option>
                                                            <option value="date">
                                                                {t(
                                                                    "blueprints.settings.subtitle.format.date",
                                                                )}
                                                            </option>
                                                        </select>
                                                        {seg.parts.length >
                                                            1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setSegments(
                                                                        (
                                                                            prev,
                                                                        ) =>
                                                                            prev.map(
                                                                                (
                                                                                    s,
                                                                                    j,
                                                                                ) =>
                                                                                    j ===
                                                                                    i
                                                                                        ? {
                                                                                              ...s,
                                                                                              parts: s.parts.filter(
                                                                                                  (
                                                                                                      _,
                                                                                                      k,
                                                                                                  ) =>
                                                                                                      k !==
                                                                                                      pi,
                                                                                              ),
                                                                                          }
                                                                                        : s,
                                                                            ),
                                                                    )
                                                                }
                                                                className="alex-row flex h-5 w-5 items-center justify-center"
                                                                style={{
                                                                    ...errorVerySoftStyle,
                                                                    borderRadius:
                                                                        "var(--theme-radius-button)",
                                                                }}
                                                            >
                                                                <i className="fa-solid fa-xmark text-[8px]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {segments.length > 0 && (
                    <div className="px-6 py-4" style={softDividerStyle}>
                        <label
                            className="text-sm font-semibold"
                            style={labelStyle}
                        >
                            {t("blueprints.settings.subtitle.options")}
                        </label>
                        <div className="mt-3 flex gap-6">
                            <div className="flex-1">
                                <label
                                    className="text-xs"
                                    style={helperFainterStyle}
                                >
                                    {t(
                                        "blueprints.settings.subtitle.separator",
                                    )}
                                </label>
                                <input
                                    type="text"
                                    value={separator}
                                    onChange={(e) =>
                                        setSeparator(e.target.value)
                                    }
                                    className="mt-1 w-full px-2 focus:outline-none focus:ring-2"
                                    style={{
                                        ...compactInputStyle,
                                        height: "2rem",
                                    }}
                                    placeholder="; "
                                />
                                <p
                                    className="mt-1 text-[10px]"
                                    style={veryHelperStyle}
                                >
                                    {t(
                                        "blueprints.settings.subtitle.separator_hint",
                                    )}
                                </p>
                            </div>
                            <div>
                                <label
                                    className="text-xs"
                                    style={helperFainterStyle}
                                >
                                    {t("blueprints.settings.subtitle.wrap")}
                                </label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={wrapPrefix}
                                        onChange={(e) =>
                                            setWrapPrefix(e.target.value)
                                        }
                                        className="w-10 px-2 text-center focus:outline-none focus:ring-2"
                                        style={{
                                            ...compactInputStyle,
                                            height: "2rem",
                                        }}
                                        placeholder="("
                                    />
                                    <span
                                        className="text-xs"
                                        style={{
                                            color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                                        }}
                                    >
                                        ...
                                    </span>
                                    <input
                                        type="text"
                                        value={wrapSuffix}
                                        onChange={(e) =>
                                            setWrapSuffix(e.target.value)
                                        }
                                        className="w-10 px-2 text-center focus:outline-none focus:ring-2"
                                        style={{
                                            ...compactInputStyle,
                                            height: "2rem",
                                        }}
                                        placeholder=")"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className="flex items-center justify-between px-6 py-3"
                    style={softDividerStyle}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setSegments([]);
                            setSeparator("; ");
                            setWrapPrefix("");
                            setWrapSuffix("");
                        }}
                        className="alex-btn alex-btn--ghost inline-flex items-center px-2 py-1 text-xs"
                        style={{
                            ...errorHalfStyle,
                            borderRadius: "var(--theme-radius-button)",
                        }}
                    >
                        {t("blueprints.settings.subtitle.clear_all")}
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="alex-btn alex-btn--ghost inline-flex items-center px-3 py-1 text-xs"
                            style={{
                                borderRadius: "var(--theme-radius-button)",
                            }}
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={apply}
                            className="alex-btn alex-btn--primary inline-flex items-center px-3 py-1 text-xs"
                            style={{
                                borderRadius: "var(--theme-radius-button)",
                            }}
                        >
                            {t("blueprints.settings.subtitle.apply")}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
