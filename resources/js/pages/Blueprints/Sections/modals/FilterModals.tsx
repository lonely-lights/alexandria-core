import { type CSSProperties, useState, useEffect, useRef } from "react";
import Modal from "@alexandria/components/ui/Modal";
import { useJsonFetch } from "@alexandria/lib/fetchJson";
import useT from "@alexandria/hooks/useT";
import type { Translator } from "@alexandria/hooks/useT";
import type { AvailableColumn } from "@alexandria/types/blueprints";

const headerStyle: CSSProperties = { background: "var(--theme-base-300)" };
const warningIconStyle: CSSProperties = {
    color: "var(--theme-status-warning-stroke)",
};
const errorTextStyle: CSSProperties = {
    color: "var(--theme-status-error-stroke)",
};

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

const inputStyle: CSSProperties = {
    background: "var(--theme-base-100)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-input)",
};

const segmentBtnActiveStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
};

const segmentBtnIdleStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-button)",
};

const TOGGLE_ACCENT = "var(--theme-brand-primary-500)";

export interface ColumnFilter {
    type:
        | "in"
        | "contains"
        | "exact"
        | "blanks"
        | "not_blanks"
        | "date_preset"
        | "date_after"
        | "date_before"
        | "date_range";
    value?: string;
    values?: string[];
    include_blanks?: boolean;
    preset?: string;
    from?: string;
    to?: string;
}

/* ── Shared Filter Modal Parts ── */

function FilterModalHeader({
    label,
    onClose,
    t,
}: {
    label: string;
    onClose: () => void;
    t: Translator;
}) {
    return (
        <div
            className="flex items-center justify-between px-5 py-3"
            style={headerStyle}
        >
            <h3 className="text-sm font-semibold">
                <i
                    className="fa-solid fa-filter mr-2"
                    style={warningIconStyle}
                />
                {t("blueprints.filter.title_prefix")} {label}
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
    );
}

function FilterModalFooter({
    filter,
    onClear,
    onClose,
    onApply,
    disabled,
    t,
}: {
    filter: ColumnFilter | null;
    onClear: () => void;
    onClose: () => void;
    onApply: () => void;
    disabled: boolean;
    t: Translator;
}) {
    return (
        <div
            className="flex items-center justify-between px-5 py-3"
            style={footerDividerStyle}
        >
            {filter ? (
                <button
                    type="button"
                    onClick={onClear}
                    className="alex-btn alex-btn--ghost inline-flex items-center gap-1 px-3 py-1 text-sm"
                    style={{
                        ...errorTextStyle,
                        borderRadius: "var(--theme-radius-button)",
                    }}
                >
                    <i className="fa-solid fa-trash mr-1 text-xs" />{" "}
                    {t("blueprints.filter.clear")}
                </button>
            ) : (
                <span />
            )}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="alex-btn alex-btn--ghost inline-flex items-center px-3 py-1 text-sm"
                    style={{ borderRadius: "var(--theme-radius-button)" }}
                >
                    {t("common.cancel")}
                </button>
                <button
                    type="button"
                    onClick={onApply}
                    disabled={disabled}
                    className="alex-btn alex-btn--primary inline-flex items-center px-3 py-1 text-sm disabled:opacity-50"
                    style={{ borderRadius: "var(--theme-radius-button)" }}
                >
                    <i className="fa-solid fa-check mr-1" />{" "}
                    {t("blueprints.filter.apply")}
                </button>
            </div>
        </div>
    );
}

/* ── Column Filter Modal (delegates to Value or Date) ── */

export function ColumnFilterModal({
    open,
    column,
    filter,
    onApply,
    onClear,
    onClose,
    projectId,
    blueprintId,
    valuesUrl,
}: {
    open: boolean;
    column: AvailableColumn;
    filter: ColumnFilter | null;
    onApply: (filter: ColumnFilter) => void;
    onClear: () => void;
    onClose: () => void;
    projectId: number;
    blueprintId: number;
    valuesUrl?: string;
}) {
    const isDateField =
        column.field_type === "Date" ||
        column.field_type === "Datetime" ||
        column.key === "created_at" ||
        column.key === "updated_at";
    const isDatetime =
        column.field_type === "Datetime" ||
        column.key === "created_at" ||
        column.key === "updated_at";

    if (isDateField) {
        return (
            <DateFilterModal
                open={open}
                column={column}
                filter={filter}
                isDatetime={isDatetime}
                onApply={onApply}
                onClear={onClear}
                onClose={onClose}
            />
        );
    }

    return (
        <ValueFilterModal
            open={open}
            column={column}
            filter={filter}
            onApply={onApply}
            onClear={onClear}
            onClose={onClose}
            projectId={projectId}
            blueprintId={blueprintId}
            valuesUrl={valuesUrl}
        />
    );
}

/* ── Value Filter (Excel-style multi-select) ── */

function ValueFilterModal({
    open,
    column,
    filter,
    onApply,
    onClear,
    onClose,
    projectId,
    blueprintId,
    valuesUrl,
}: {
    open: boolean;
    column: AvailableColumn;
    filter: ColumnFilter | null;
    onApply: (filter: ColumnFilter) => void;
    onClear: () => void;
    onClose: () => void;
    projectId: number;
    blueprintId: number;
    valuesUrl?: string;
}) {
    const t = useT();
    const [searchTerm, setSearchTerm] = useState("");

    const [selected, setSelected] = useState<Set<string>>(
        new Set(filter?.values ?? []),
    );
    const [includeBlanks, setIncludeBlanks] = useState(
        filter?.include_blanks ?? false,
    );

    const url = open
        ? (valuesUrl
            ? `${valuesUrl}?column=${encodeURIComponent(column.key)}`
            : `/api/v1/projects/${projectId}/blueprints/${blueprintId}/column-values?column=${encodeURIComponent(column.key)}`)
        : null;

    const { data: valuesData, loading: loadingValues } = useJsonFetch<{
        values?: string[];
        has_blank?: boolean;
    }>(url);

    const availableValues = valuesData?.values ?? [];
    const hasBlank = valuesData?.has_blank ?? false;

    // Reset the search input each time the modal opens.
    useEffect(() => {
        if (open) setSearchTerm("");
    }, [open]);

    // New-filter default-initialization: when the values arrive on a fresh
    // open of the modal (no existing filter), default-select everything.
    // initializedRef guards against re-firing if the user later clears their
    // selection; reset on close so the next open re-initializes.
    const initializedRef = useRef(false);
    useEffect(() => {
        if (!open) {
            initializedRef.current = false;
            return;
        }
        if (valuesData && !filter && !initializedRef.current) {
            initializedRef.current = true;
            setSelected(new Set(valuesData.values ?? []));
            setIncludeBlanks(valuesData.has_blank ?? false);
        }
    }, [open, valuesData, filter]);

    const filteredValues = searchTerm
        ? availableValues.filter((v) =>
              v.toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : availableValues;

    const allSelected =
        filteredValues.every((v) => selected.has(v)) &&
        (!hasBlank || includeBlanks);

    function toggleAll() {
        if (allSelected) {
            setSelected(new Set());
            setIncludeBlanks(false);
        } else {
            setSelected(new Set(availableValues));
            setIncludeBlanks(hasBlank);
        }
    }

    function toggleValue(val: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(val) ? next.delete(val) : next.add(val);
            return next;
        });
    }

    function handleApply() {
        const selectedValues = Array.from(selected);
        if (
            selectedValues.length === availableValues.length &&
            includeBlanks === hasBlank
        ) {
            onClear();
            return;
        }
        onApply({
            type: "in",
            values: selectedValues,
            include_blanks: includeBlanks,
        });
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <FilterModalHeader label={column.label} onClose={onClose} t={t} />

            <div className="p-4">
                {availableValues.length > 8 && (
                    <div className="relative mb-3">
                        <i
                            className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                            style={helperSoftStyle}
                        />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t(
                                "blueprints.filter.value.search_placeholder",
                            )}
                            className="w-full py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2"
                            style={inputStyle}
                        />
                    </div>
                )}

                {loadingValues ? (
                    <div className="flex items-center justify-center py-8">
                        <i
                            className="fa-solid fa-circle-notch fa-spin text-sm"
                            style={helperSoftStyle}
                        />
                    </div>
                ) : (
                    <div>
                        <label
                            className="alex-row flex cursor-pointer items-center gap-3 px-2 py-1.5"
                            style={{
                                borderRadius: "var(--theme-radius-input)",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleAll}
                                style={{ accentColor: TOGGLE_ACCENT }}
                            />
                            <span className="text-sm font-semibold">
                                {t("blueprints.filter.value.select_all")}
                            </span>
                        </label>

                        <div className="max-h-[50vh] overflow-y-auto">
                            {filteredValues.map((val) => (
                                <label
                                    key={val}
                                    className="alex-row flex cursor-pointer items-center gap-3 px-2 py-1.5"
                                    style={{
                                        borderRadius:
                                            "var(--theme-radius-input)",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(val)}
                                        onChange={() => toggleValue(val)}
                                        style={{ accentColor: TOGGLE_ACCENT }}
                                    />
                                    <span className="text-sm">{val}</span>
                                </label>
                            ))}
                            {filteredValues.length === 0 && !hasBlank && (
                                <p
                                    className="py-4 text-center text-sm italic"
                                    style={helperSoftStyle}
                                >
                                    {t("blueprints.filter.value.empty")}
                                </p>
                            )}
                        </div>

                        {hasBlank && !searchTerm && (
                            <label
                                className="alex-row flex cursor-pointer items-center gap-3 px-2 py-1.5"
                                style={{
                                    borderRadius: "var(--theme-radius-input)",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={includeBlanks}
                                    onChange={() =>
                                        setIncludeBlanks(!includeBlanks)
                                    }
                                    style={{ accentColor: TOGGLE_ACCENT }}
                                />
                                <span
                                    className="text-sm italic"
                                    style={helperStyle}
                                >
                                    {t("blueprints.filter.value.blanks")}
                                </span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            <FilterModalFooter
                filter={filter}
                onClear={onClear}
                onClose={onClose}
                onApply={handleApply}
                disabled={selected.size === 0 && !includeBlanks}
                t={t}
            />
        </Modal>
    );
}

/* ── Date Filter ── */

const DATE_PRESETS = [
    { key: "today", i18nKey: "today" },
    { key: "last_7", i18nKey: "last_7" },
    { key: "last_30", i18nKey: "last_30" },
    { key: "last_year", i18nKey: "last_year" },
    { key: "all_time", i18nKey: "all_time" },
] as const;

function DateFilterModal({
    open,
    column,
    filter,
    isDatetime,
    onApply,
    onClear,
    onClose,
}: {
    open: boolean;
    column: AvailableColumn;
    filter: ColumnFilter | null;
    isDatetime: boolean;
    onApply: (filter: ColumnFilter) => void;
    onClear: () => void;
    onClose: () => void;
}) {
    const t = useT();
    type DateMode = "preset" | "after" | "before" | "range";

    const initialMode = (): DateMode => {
        if (!filter) return "preset";
        if (filter.type === "date_preset") return "preset";
        if (filter.type === "date_after") return "after";
        if (filter.type === "date_before") return "before";
        if (filter.type === "date_range") return "range";
        return "preset";
    };

    const [mode, setMode] = useState<DateMode>(initialMode);
    const [preset, setPreset] = useState(filter?.preset ?? "all_time");
    const [afterValue, setAfterValue] = useState(filter?.value ?? "");
    const [beforeValue, setBeforeValue] = useState(filter?.value ?? "");
    const [rangeFrom, setRangeFrom] = useState(filter?.from ?? "");
    const [rangeTo, setRangeTo] = useState(filter?.to ?? "");

    // For datetime fields, split into date + optional time
    const [afterTime, setAfterTime] = useState("");
    const [beforeTime, setBeforeTime] = useState("");
    const [rangeFromTime, setRangeFromTime] = useState("");
    const [rangeToTime, setRangeToTime] = useState("");

    function combineDatetime(date: string, time: string): string {
        if (!date) return "";
        return time ? `${date}T${time}` : date;
    }

    function handleApply() {
        switch (mode) {
            case "preset":
                if (preset === "all_time") {
                    onClear();
                    return;
                }
                onApply({ type: "date_preset", preset });
                return;
            case "after":
                if (!afterValue) return;
                onApply({
                    type: "date_after",
                    value: combineDatetime(afterValue, afterTime),
                });
                return;
            case "before":
                if (!beforeValue) return;
                onApply({
                    type: "date_before",
                    value: combineDatetime(beforeValue, beforeTime),
                });
                return;
            case "range":
                if (!rangeFrom && !rangeTo) return;
                onApply({
                    type: "date_range",
                    from: combineDatetime(rangeFrom, rangeFromTime),
                    to: combineDatetime(rangeTo, rangeToTime),
                });
                return;
        }
    }

    const canApply =
        mode === "preset" ||
        (mode === "after" && afterValue) ||
        (mode === "before" && beforeValue) ||
        (mode === "range" && (rangeFrom || rangeTo));

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <FilterModalHeader label={column.label} onClose={onClose} t={t} />

            <div className="p-4 space-y-4">
                {/* Mode selector */}
                <div className="flex flex-wrap gap-1.5">
                    {(["preset", "after", "before", "range"] as DateMode[]).map(
                        (m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                className="inline-flex items-center px-2 py-1 text-xs capitalize"
                                style={
                                    mode === m
                                        ? segmentBtnActiveStyle
                                        : segmentBtnIdleStyle
                                }
                            >
                                {t(`blueprints.filter.date.mode.${m}`)}
                            </button>
                        ),
                    )}
                </div>

                {/* Preset buttons */}
                {mode === "preset" && (
                    <div className="space-y-1">
                        {DATE_PRESETS.map((p) => (
                            <label
                                key={p.key}
                                className="alex-row flex cursor-pointer items-center gap-3 px-2 py-1.5"
                                style={{
                                    borderRadius: "var(--theme-radius-input)",
                                }}
                            >
                                <input
                                    type="radio"
                                    name="date_preset"
                                    checked={preset === p.key}
                                    onChange={() => setPreset(p.key)}
                                    style={{ accentColor: TOGGLE_ACCENT }}
                                />
                                <span className="text-sm">
                                    {t(
                                        `blueprints.filter.date.preset.${p.i18nKey}`,
                                    )}
                                </span>
                            </label>
                        ))}
                    </div>
                )}

                {/* After */}
                {mode === "after" && (
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text text-sm">
                                {t("blueprints.filter.date.after_label")}
                            </span>
                        </label>
                        <input
                            type="date"
                            value={afterValue}
                            onChange={(e) => setAfterValue(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                            style={inputStyle}
                        />
                        {isDatetime && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <span
                                    className="text-xs"
                                    style={helperFainterStyle}
                                >
                                    {t("blueprints.filter.date.time")}
                                </span>
                                <input
                                    type="time"
                                    value={afterTime}
                                    onChange={(e) =>
                                        setAfterTime(e.target.value)
                                    }
                                    className="px-2 py-1 text-xs focus:outline-none focus:ring-2"
                                    style={inputStyle}
                                />
                                <span
                                    className="text-xs italic"
                                    style={helperSoftStyle}
                                >
                                    {t("blueprints.filter.date.optional")}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Before */}
                {mode === "before" && (
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text text-sm">
                                {t("blueprints.filter.date.before_label")}
                            </span>
                        </label>
                        <input
                            type="date"
                            value={beforeValue}
                            onChange={(e) => setBeforeValue(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                            style={inputStyle}
                        />
                        {isDatetime && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <span
                                    className="text-xs"
                                    style={helperFainterStyle}
                                >
                                    {t("blueprints.filter.date.time")}
                                </span>
                                <input
                                    type="time"
                                    value={beforeTime}
                                    onChange={(e) =>
                                        setBeforeTime(e.target.value)
                                    }
                                    className="px-2 py-1 text-xs focus:outline-none focus:ring-2"
                                    style={inputStyle}
                                />
                                <span
                                    className="text-xs italic"
                                    style={helperSoftStyle}
                                >
                                    {t("blueprints.filter.date.optional")}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Custom Range */}
                {mode === "range" && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text text-sm">
                                    {t("blueprints.filter.date.from")}
                                </span>
                            </label>
                            <input
                                type="date"
                                value={rangeFrom}
                                onChange={(e) => setRangeFrom(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                style={inputStyle}
                            />
                            {isDatetime && (
                                <input
                                    type="time"
                                    value={rangeFromTime}
                                    onChange={(e) =>
                                        setRangeFromTime(e.target.value)
                                    }
                                    className="mt-1.5 w-full px-2 py-1 text-xs focus:outline-none focus:ring-2"
                                    style={inputStyle}
                                />
                            )}
                        </div>
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text text-sm">
                                    {t("blueprints.filter.date.to")}
                                </span>
                            </label>
                            <input
                                type="date"
                                value={rangeTo}
                                onChange={(e) => setRangeTo(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                style={inputStyle}
                            />
                            {isDatetime && (
                                <input
                                    type="time"
                                    value={rangeToTime}
                                    onChange={(e) =>
                                        setRangeToTime(e.target.value)
                                    }
                                    className="mt-1.5 w-full px-2 py-1 text-xs focus:outline-none focus:ring-2"
                                    style={inputStyle}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            <FilterModalFooter
                filter={filter}
                onClear={onClear}
                onClose={onClose}
                onApply={handleApply}
                disabled={!canApply}
                t={t}
            />
        </Modal>
    );
}
