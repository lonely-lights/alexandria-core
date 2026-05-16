import { useEffect, useRef, useState } from "react";
import Sortable from "sortablejs";

import ActionButton from "@alexandria/components/ui/ActionButton";
import Tooltip from "@alexandria/components/ui/Tooltip";
import useT from "@alexandria/hooks/useT";
import type { AvailableColumn } from "@alexandria/types/blueprints";

import PanelHeader from "./PanelHeader";
import {
    activeColumnRowStyle,
    availableColumnRowStyle,
    badgeInfoStyle,
    badgePrimaryStyle,
    badgeWarningStyle,
    columnsDividerStyle,
    dragHandleStyle,
    footerDividerStyle,
    helperFainterStyle,
    helperSoftStyle,
    helperStyle,
    infoHalfStyle,
    primaryHalfStyle,
    sortableBadgeActiveStyle,
    sortableBadgeIdleStyle,
    veryFadedStyle,
    warningHalfStyle,
} from "./settingsPanelStyles";

/**
 * Columns panel — table-column configuration for the parent blueprint
 * view. Two-pane layout: active columns (drag-sortable via SortableJS)
 * on the left, available columns grouped by type (native / custom /
 * calculated) on the right. Local state mirrors the shell's columns
 * + sortable-keys props until Apply, so unsaved changes can be cancelled.
 */
export default function ColumnsPanel({
    open,
    availableColumns,
    initialColumns,
    initialSortableColumns,
    onChange,
    onSortableChange,
    onCancel,
}: {
    open: boolean;
    availableColumns: AvailableColumn[];
    initialColumns: string[];
    initialSortableColumns: string[];
    onChange: (columns: string[]) => void;
    onSortableChange: (sortable: string[]) => void;
    onCancel: () => void;
}) {
    const t = useT();
    const [localColumns, setLocalColumns] = useState<string[]>(initialColumns);
    const [localSortable, setLocalSortable] =
        useState<string[]>(initialSortableColumns);

    // Sync from props each time the modal opens so cancelled-then-
    // reopened edits start clean.
    useEffect(() => {
        if (open) {
            setLocalColumns(initialColumns);
            setLocalSortable(initialSortableColumns);
        }
    }, [open, initialColumns, initialSortableColumns]);

    const activeList = localColumns
        .map((key) => availableColumns.find((c) => c.key === key))
        .filter(Boolean) as AvailableColumn[];

    const inactiveList = availableColumns.filter(
        (c) => !localColumns.includes(c.key),
    );

    // SortableJS drag-reorder — bound once per mount; the dep on
    // localColumns.length rebinds when the active list grows/shrinks.
    const sortableRef = useRef<HTMLDivElement>(null);
    const sortableInstance = useRef<Sortable | null>(null);

    useEffect(() => {
        if (!sortableRef.current) return;

        sortableInstance.current = Sortable.create(sortableRef.current, {
            handle: ".drag-handle",
            animation: 150,
            ghostClass: "opacity-30",
            onEnd: (evt: Sortable.SortableEvent) => {
                const { oldIndex, newIndex } = evt;
                if (
                    oldIndex === undefined ||
                    newIndex === undefined ||
                    oldIndex === newIndex
                )
                    return;
                setLocalColumns((prev) => {
                    const next = [...prev];
                    const [moved] = next.splice(oldIndex, 1);
                    next.splice(newIndex, 0, moved);
                    return next;
                });
            },
        });

        return () => {
            sortableInstance.current?.destroy();
            sortableInstance.current = null;
        };
    }, [localColumns.length]);

    function removeColumn(key: string) {
        if (localColumns.length <= 1) return;
        setLocalColumns((prev) => prev.filter((c) => c !== key));
    }

    function addColumn(key: string) {
        setLocalColumns((prev) => [...prev, key]);
    }

    function handleApply() {
        onChange(localColumns);
        onSortableChange(localSortable);
        onCancel();
    }

    function toggleSortable(key: string) {
        setLocalSortable((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
        );
    }

    function columnBadges(col: AvailableColumn) {
        const isSortableActive = localSortable.includes(col.key);

        return (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {col.type === "field" && (
                    <span style={badgeInfoStyle}>
                        {t("blueprints.bp_settings.columns.badge.custom")}
                    </span>
                )}
                {col.type === "native" && (
                    <span style={badgePrimaryStyle}>
                        {t("blueprints.bp_settings.columns.badge.native")}
                    </span>
                )}
                {col.type === "calculated" && (
                    <span style={badgeWarningStyle}>
                        {t("blueprints.bp_settings.columns.badge.calculated")}
                    </span>
                )}
                <Tooltip
                    content={
                        isSortableActive
                            ? t(
                                  "blueprints.bp_settings.columns.sortable.disable",
                              )
                            : t(
                                  "blueprints.bp_settings.columns.sortable.enable",
                              )
                    }
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSortable(col.key);
                        }}
                        style={
                            isSortableActive
                                ? sortableBadgeActiveStyle
                                : sortableBadgeIdleStyle
                        }
                    >
                        <i className="fa-solid fa-sort text-[8px]" />{" "}
                        {t("blueprints.bp_settings.columns.sortable.label")}
                    </button>
                </Tooltip>
            </div>
        );
    }

    const inactiveNative = inactiveList.filter((c) => c.type === "native");
    const inactiveField = inactiveList.filter((c) => c.type === "field");
    const inactiveCalc = inactiveList.filter((c) => c.type === "calculated");

    function AvailableItem({ col }: { col: AvailableColumn }) {
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={() => addColumn(col.key)}
                onKeyDown={(e) => e.key === "Enter" && addColumn(col.key)}
                className="alex-row flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left"
                style={availableColumnRowStyle}
            >
                <i
                    className="fa-solid fa-plus text-[10px]"
                    style={veryFadedStyle}
                />
                <span className="ml-0.5 text-sm" style={helperStyle}>
                    {col.label}
                </span>
            </div>
        );
    }

    return (
        <>
            <PanelHeader
                title={t("blueprints.bp_settings.columns.title")}
                description={t("blueprints.bp_settings.columns.description")}
            />
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="grid flex-1 grid-cols-2 gap-0 overflow-hidden">
                    {/* Left: Active columns (sortable) */}
                    <div
                        className="flex flex-col overflow-hidden p-5"
                        style={columnsDividerStyle}
                    >
                        <h4
                            className="mb-3 flex-shrink-0 text-xs font-semibold uppercase tracking-wider"
                            style={helperFainterStyle}
                        >
                            {t("blueprints.bp_settings.columns.active_heading")}
                        </h4>
                        <div
                            ref={sortableRef}
                            className="flex-1 space-y-1.5 overflow-y-auto pr-2"
                        >
                            {activeList.map((col) => (
                                <div
                                    key={col.key}
                                    data-key={col.key}
                                    className="flex items-center gap-3 px-3 py-2.5"
                                    style={activeColumnRowStyle}
                                >
                                    <i
                                        className="drag-handle fa-solid fa-grip-vertical cursor-grab text-sm active:cursor-grabbing"
                                        style={dragHandleStyle}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <span className="text-sm font-medium">
                                            {col.label}
                                        </span>
                                        {columnBadges(col)}
                                    </div>
                                    <Tooltip
                                        content={t(
                                            "blueprints.bp_settings.columns.remove",
                                        )}
                                        variant="error"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeColumn(col.key)
                                            }
                                            disabled={
                                                localColumns.length <= 1
                                            }
                                            className="alex-btn alex-btn--ghost inline-flex h-6 w-6 items-center justify-center disabled:opacity-20"
                                            style={{
                                                borderRadius:
                                                    "var(--theme-radius-button)",
                                            }}
                                        >
                                            <i className="fa-solid fa-arrow-right text-xs" />
                                        </button>
                                    </Tooltip>
                                </div>
                            ))}
                            {activeList.length === 0 && (
                                <p
                                    className="py-8 text-center text-sm italic"
                                    style={helperSoftStyle}
                                >
                                    {t(
                                        "blueprints.bp_settings.columns.empty_active",
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right: Available columns grouped by type */}
                    <div className="flex flex-col overflow-hidden p-5">
                        <h4
                            className="mb-3 flex-shrink-0 text-xs font-semibold uppercase tracking-wider"
                            style={helperFainterStyle}
                        >
                            {t(
                                "blueprints.bp_settings.columns.available_heading",
                            )}
                        </h4>
                        {inactiveList.length > 0 ? (
                            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                                {inactiveNative.length > 0 && (
                                    <div>
                                        <p
                                            className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                            style={primaryHalfStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.columns.group.native",
                                            )}
                                        </p>
                                        <div className="space-y-1">
                                            {inactiveNative.map((col) => (
                                                <AvailableItem
                                                    key={col.key}
                                                    col={col}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {inactiveField.length > 0 && (
                                    <div>
                                        <p
                                            className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                            style={infoHalfStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.columns.group.custom",
                                            )}
                                        </p>
                                        <div className="space-y-1">
                                            {inactiveField.map((col) => (
                                                <AvailableItem
                                                    key={col.key}
                                                    col={col}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {inactiveCalc.length > 0 && (
                                    <div>
                                        <p
                                            className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                            style={warningHalfStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.columns.group.calculated",
                                            )}
                                        </p>
                                        <div className="space-y-1">
                                            {inactiveCalc.map((col) => (
                                                <AvailableItem
                                                    key={col.key}
                                                    col={col}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p
                                className="py-8 text-center text-sm italic"
                                style={helperSoftStyle}
                            >
                                {t(
                                    "blueprints.bp_settings.columns.empty_available",
                                )}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="flex items-center justify-between px-5 py-3"
                    style={footerDividerStyle}
                >
                    <p className="text-xs" style={helperFainterStyle}>
                        {t(
                            localColumns.length === 1
                                ? "blueprints.bp_settings.columns.count.singular"
                                : "blueprints.bp_settings.columns.count.plural",
                        ).replace(":count", String(localColumns.length))}
                    </p>
                    <div className="flex gap-2">
                        <ActionButton
                            icon="fa-solid fa-xmark"
                            label={t("common.cancel")}
                            variant="ghost"
                            onClick={onCancel}
                        />
                        <ActionButton
                            icon="fa-solid fa-check"
                            label={t("blueprints.bp_settings.apply")}
                            onClick={handleApply}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
