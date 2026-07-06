import {
    type CSSProperties,
    type ReactNode,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { stripWikiMarkup } from "@alexandria/lib/stripWikiMarkup";
import { useDateFormatters } from "@alexandria/lib/formatDate";
import useT from "@alexandria/hooks/useT";
import Tooltip from "@alexandria/components/ui/Tooltip";
import EntryLink from "@alexandria/components/entries/EntryLink";
import Pagination from "@alexandria/components/ui/Pagination";
import ActionButton from "@alexandria/components/ui/ActionButton";
import DropdownMenu from "@alexandria/components/ui/DropdownMenu";
import Input from "@alexandria/components/form/Input";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import type {
    EntryListItem,
    AvailableColumn,
    ViewConfig,
    SavedView,
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";
import { ColumnConfigModal } from "./modals/BlueprintSettingsModal";
import { ViewsModal, SaveViewModal } from "./modals/ViewModals";
import { ColumnFilterModal, type ColumnFilter } from "./modals/FilterModals";
import { CalcDetailModal } from "./modals/CalcDetailModal";
import ArchiveEntryModal from "@alexandria/components/entries/ArchiveEntryModal";
import StubPreviewModal from "@alexandria/components/entries/StubPreviewModal";
import { createFilterHelpers, mergeSavedView } from "./useSavedViewHelpers";

/* ── Theme-token style recipes ────────────────────────────────────
 * Replaces inherited DaisyUI utility classes (`badge`, `bg-base-*`,
 * `text-base-content/*`, `bg-primary`, `text-primary-content`, etc.)
 * with theme-token equivalents so the page tracks active themes. */

const subtitle70: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};
const subtitle50: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const subtitle40: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const subtitle30: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const subtitle20: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
};

const badgeBase: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
};

const badgeGhostStyle: CSSProperties = {
    ...badgeBase,
    background:
        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

const badgeSuccessStyle: CSSProperties = {
    ...badgeBase,
    background: "var(--theme-status-success-fill)",
    color: "var(--theme-status-success-content)",
};

const badgePrimaryStyle: CSSProperties = {
    ...badgeBase,
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
};

const badgeGhostDimmedStyle: CSSProperties = {
    ...badgeBase,
    background: "color-mix(in srgb, var(--theme-base-content) 6%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

const tableShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const tableInnerStyle: CSSProperties = {
    background: "var(--theme-base-200)",
    boxShadow:
        "0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    borderRadius: "inherit",
};

const tableHeaderCellStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    fontWeight: 600,
};

const emptyIconWrapStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-300) 50%, transparent)",
};

interface EntriesTabProps {
    projectId: number;
    blueprintId: number;
    blueprintName: string;
    viewConfig: ViewConfig;
    savedViews: SavedView[];
    availableColumns: AvailableColumn[];
    canUpdate: boolean;
    blueprint: BlueprintDetail;
    project: { id: number; name: string; slug: string };
    listableBlueprints: SiblingBlueprint[];
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
    timelineBlueprints?: Array<{
        id: number;
        name: string;
        slug: string;
        icon: string;
        fields: Array<{
            name: string;
            label: string;
            type: string;
            target_blueprint_slug: string | null;
        }>;
    }>;
    onRegisterOpenSettings?: (fn: (menu?: string) => void) => void;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export default function EntriesTab({
    projectId,
    blueprintId,
    blueprintName,
    viewConfig,
    savedViews,
    availableColumns,
    canUpdate,
    blueprint,
    project,
    listableBlueprints,
    relationshipBlueprints,
    referencingRelationshipBlueprints,
    timelineBlueprints,
    onRegisterOpenSettings,
}: EntriesTabProps) {
    const t = useT();
    const { fmtDate, fmtSmart } = useDateFormatters();
    const [items, setItems] = useState<EntryListItem[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [showColumnModal, setShowColumnModal] = useState(false);
    const [modalInitialMenu, setModalInitialMenu] = useState<
        string | undefined
    >(undefined);
    const [archiveConfirm, setArchiveConfirm] = useState<{
        entry: EntryListItem;
        connectionCount: number;
    } | null>(null);
    const [stubPreviewId, setStubPreviewId] = useState<number | null>(null);

    // Register the open-settings callback so the parent can trigger it
    useEffect(() => {
        onRegisterOpenSettings?.((menu) => {
            setModalInitialMenu(menu ?? "main");
            setShowColumnModal(true);
        });
    }, [onRegisterOpenSettings]);

    // Session storage key for this blueprint's working view state
    const sessionKey = `blueprint_view_${blueprintId}`;

    // Initialize from session (if exists) or from server viewConfig
    function getInitialConfig() {
        try {
            const stored = sessionStorage.getItem(sessionKey);
            if (stored) return JSON.parse(stored);
        } catch {
            /* ignore */
        }
        return null;
    }

    const sessionConfig = getInitialConfig();
    const initialConfig = sessionConfig ?? viewConfig.config;

    // View state
    const [columns, setColumns] = useState<string[]>(initialConfig.columns);
    const [sortableColumns, setSortableColumns] = useState<string[]>(
        initialConfig.sortable_columns ?? [
            "name",
            "updated_at",
            "created_at",
            "sort_order",
        ],
    );
    const [sortField, setSortField] = useState(initialConfig.sort_field);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
        initialConfig.sort_direction,
    );
    const [perPage, setPerPage] = useState(initialConfig.per_page);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState<
        Record<string, ColumnFilter>
    >({});
    const [filterModalCol, setFilterModalCol] = useState<string | null>(null);
    const [detailModal, setDetailModal] = useState<{
        entryName: string;
        colLabel: string;
        calcKey: string;
        entryId: number;
    } | null>(null);
    const [viewDirty, setViewDirty] = useState(!!sessionConfig);
    const [saving, setSaving] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    // Persist working state to sessionStorage on every change
    useEffect(() => {
        const working = {
            columns,
            sortable_columns: sortableColumns,
            sort_field: sortField,
            sort_direction: sortDirection,
            per_page: perPage,
        };
        const original = viewConfig.config;
        const isDirty =
            JSON.stringify(columns) !== JSON.stringify(original.columns) ||
            JSON.stringify(sortableColumns) !==
                JSON.stringify(original.sortable_columns ?? []) ||
            sortField !== original.sort_field ||
            sortDirection !== original.sort_direction ||
            perPage !== original.per_page;

        if (isDirty) {
            sessionStorage.setItem(sessionKey, JSON.stringify(working));
        } else {
            sessionStorage.removeItem(sessionKey);
        }
        setViewDirty(isDirty);
    }, [
        columns,
        sortableColumns,
        sortField,
        sortDirection,
        perPage,
        viewConfig.config,
    ]);

    // Resolve active columns to their definitions
    const activeColumns = columns
        .map((key) => availableColumns.find((c) => c.key === key))
        .filter(Boolean) as AvailableColumn[];

    const fetchEntries = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("per_page", String(perPage));
        params.set("sort_field", sortField);
        params.set("sort_direction", sortDirection);
        params.set("columns", columns.join(","));
        if (search) params.set("search", search);
        if (Object.keys(columnFilters).length > 0)
            params.set("filters", JSON.stringify(columnFilters));

        fetch(
            `/api/v1/projects/${projectId}/blueprints/${blueprintId}/entries?${params}`,
            {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            },
        )
            .then((r) => r.json())
            .then((data) => {
                setItems(data.data ?? []);
                setMeta({
                    current_page: data.current_page,
                    last_page: data.last_page,
                    per_page: data.per_page,
                    total: data.total,
                    from: data.from,
                    to: data.to,
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [
        projectId,
        blueprintId,
        page,
        perPage,
        sortField,
        sortDirection,
        columns,
        search,
        columnFilters,
    ]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    function handleSearchChange(value: string) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(value);
            setPage(1);
        }, 300);
    }

    function handleSort(field: string) {
        if (!sortableColumns.includes(field)) return;

        if (sortField === field) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
        setPage(1);
    }

    const { setFilter, clearAllFilters } = createFilterHelpers(
        setColumnFilters,
        setPage,
        setFilterModalCol,
    );
    const hasAnyFilter = Object.keys(columnFilters).length > 0;

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showViewsModal, setShowViewsModal] = useState(false);
    const [activeViewName, setActiveViewName] = useState(viewConfig.name);
    const [views, setViews] = useState<SavedView[]>(savedViews);

    function loadView(viewId: number) {
        fetch(`/api/v1/blueprints/views/${viewId}`, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((r) => r.json())
            .then((view) => {
                const cfg = view.config;
                setColumns(
                    cfg.columns ?? ["name", "summary", "status", "updated_at"],
                );
                setSortableColumns(
                    cfg.sortable_columns ?? [
                        "name",
                        "updated_at",
                        "created_at",
                        "sort_order",
                    ],
                );
                setSortField(cfg.sort_field ?? "name");
                setSortDirection(cfg.sort_direction ?? "asc");
                setPerPage(cfg.per_page ?? 25);
                setActiveViewName(view.name);
                setPage(1);
                sessionStorage.removeItem(sessionKey);
                setViewDirty(false);
            });
    }

    function doSaveView(name: string, isDefault: boolean) {
        setSaving(true);
        fetch(`/api/v1/blueprints/${blueprintId}/view`, {
            method: "PUT",
            headers: csrfHeaders(),
            credentials: "same-origin",
            body: JSON.stringify({
                name,
                is_default: isDefault,
                config: {
                    columns,
                    sortable_columns: sortableColumns,
                    sort_field: sortField,
                    sort_direction: sortDirection,
                    per_page: perPage,
                },
            }),
        })
            .then((r) => r.json())
            .then((data) => {
                setSaving(false);
                setViewDirty(false);
                setShowSaveModal(false);
                setActiveViewName(data.name ?? name);
                sessionStorage.removeItem(sessionKey);
                setViews((prev) => mergeSavedView(prev, data, isDefault));
            })
            .catch(() => setSaving(false));
    }

    function handleResetView() {
        fetch(`/api/v1/blueprints/${blueprintId}/view`, {
            method: "DELETE",
            headers: csrfHeaders(),
            credentials: "same-origin",
        }).then(() => {
            const defaults = viewConfig.config;
            setColumns(defaults.columns);
            setSortableColumns(
                defaults.sortable_columns ?? [
                    "name",
                    "updated_at",
                    "created_at",
                    "sort_order",
                ],
            );
            setSortField(defaults.sort_field);
            setSortDirection(defaults.sort_direction);
            setPerPage(defaults.per_page);
            setPage(1);
            setViewDirty(false);
            sessionStorage.removeItem(sessionKey);
        });
    }

    function isSortable(field: string) {
        return sortableColumns.includes(field);
    }

    function renderSortIcon(field: string) {
        const isActive = sortField === field;

        if (!isActive) {
            return (
                <i
                    className="fa-solid fa-sort text-[11px]"
                    style={{
                        color: "color-mix(in srgb, var(--theme-brand-primary-content) 50%, transparent)",
                    }}
                />
            );
        }

        const icon = sortDirection === "asc" ? "fa-sort-up" : "fa-sort-down";
        return (
            <i
                className={`fa-duotone fa-solid ${icon} text-[11px]`}
                style={{ color: "var(--theme-brand-primary-content)" }}
            />
        );
    }

    /* Per-column width hints. Name gets a firm min-width so entry names
       never wrap in a 2-line stack; short meta columns (status, dates,
       sort order) are capped so the flexible content columns (summary,
       content, custom fields) absorb the remaining horizontal space. */
    function columnWidthClass(key: string): string {
        switch (key) {
            case "name":
                return "min-w-[14rem] w-[22%]";
            case "status":
                return "w-24";
            case "sort_order":
                return "w-16 text-center";
            case "created_at":
            case "updated_at":
                return "w-32 whitespace-nowrap";
            default:
                return "";
        }
    }

    function getCellValue(
        entry: EntryListItem,
        col: AvailableColumn,
    ): ReactNode {
        switch (col.key) {
            case "name":
                return entry.is_stub ? (
                    <button
                        type="button"
                        onClick={() => setStubPreviewId(entry.id)}
                        className="text-left hover:underline cursor-pointer"
                        style={subtitle50}
                    >
                        {entry.name}
                    </button>
                ) : (
                    <EntryLink
                        entryId={entry.id}
                        href={entry.url}
                        className="font-medium hover:underline"
                    >
                        {entry.name}
                    </EntryLink>
                );
            case "summary":
                return entry.summary ? (
                    <span className="line-clamp-1">
                        {stripWikiMarkup(entry.summary)}
                    </span>
                ) : (
                    <span className="italic" style={subtitle20}>
                        --
                    </span>
                );
            case "content":
                return entry.content ? (
                    <span className="line-clamp-1">
                        {stripWikiMarkup(entry.content)}
                    </span>
                ) : (
                    <span className="italic" style={subtitle20}>
                        --
                    </span>
                );
            case "status":
                return entry.is_stub ? (
                    <span style={badgeGhostStyle}>
                        {t("blueprints.entries.status.stub")}
                    </span>
                ) : (
                    <span style={badgeSuccessStyle}>
                        {t("blueprints.entries.status.page")}
                    </span>
                );
            case "sort_order":
                return <span>{entry.sort_order}</span>;
            case "created_at":
                return (
                    <span className="text-xs" style={subtitle40}>
                        {entry.created_at}
                    </span>
                );
            case "updated_at":
                return (
                    <span className="text-xs" style={subtitle40}>
                        {entry.updated_at}
                    </span>
                );
            default:
                if (col.key.startsWith("field:")) {
                    const fieldName = col.key.slice(6);
                    const value = entry.fields?.[fieldName];
                    if (value === null || value === undefined || value === "") {
                        return (
                            <span className="italic" style={subtitle20}>
                                --
                            </span>
                        );
                    }
                    // Temporal fields render as clickable count badges
                    if (
                        typeof value === "object" &&
                        value !== null &&
                        "_temporal" in value
                    ) {
                        const tv = value as unknown as {
                            count: number;
                            calc_key: string;
                        };
                        return (
                            <Tooltip
                                content={t(
                                    "blueprints.entries.tooltip.view_col",
                                ).replace(":label", col.label)}
                                disabled={tv.count <= 0}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        tv.count > 0 &&
                                        setDetailModal({
                                            entryName: entry.name,
                                            colLabel: col.label,
                                            calcKey: tv.calc_key,
                                            entryId: entry.id,
                                        })
                                    }
                                    className={`font-mono ${tv.count > 0 ? "cursor-pointer" : ""}`}
                                    style={
                                        tv.count > 0
                                            ? badgePrimaryStyle
                                            : badgeGhostDimmedStyle
                                    }
                                >
                                    {tv.count}
                                </button>
                            </Tooltip>
                        );
                    }
                    // Entry reference fields render as clickable links with hover preview
                    if (
                        col.field_type === "Entry Reference" &&
                        typeof value === "object" &&
                        value !== null
                    ) {
                        const ref = value as {
                            id?: number;
                            name?: string;
                            url?: string | null;
                            _multi?: boolean;
                            items?: {
                                id: number;
                                name: string;
                                url: string | null;
                            }[];
                        };
                        if (ref._multi && ref.items) {
                            return (
                                <span className="line-clamp-1">
                                    {ref.items.map((item, i) => (
                                        <span key={item.id}>
                                            {i > 0 && ", "}
                                            {item.url ? (
                                                <EntryLink
                                                    entryId={item.id}
                                                    href={item.url}
                                                    className="hover:underline"
                                                >
                                                    {item.name}
                                                </EntryLink>
                                            ) : (
                                                <span>{item.name}</span>
                                            )}
                                        </span>
                                    ))}
                                </span>
                            );
                        }
                        if (ref.id && ref.name) {
                            return ref.url ? (
                                <EntryLink
                                    entryId={ref.id}
                                    href={ref.url}
                                    className="hover:underline"
                                >
                                    {ref.name}
                                </EntryLink>
                            ) : (
                                <span>{ref.name}</span>
                            );
                        }
                    }
                    if (col.field_type === "Boolean") {
                        return value ? (
                            <i
                                className="fa-solid fa-check"
                                style={{
                                    color: "var(--theme-status-success-stroke)",
                                }}
                            />
                        ) : (
                            <i
                                className="fa-solid fa-xmark"
                                style={subtitle20}
                            />
                        );
                    }
                    if (col.field_type === "Date") {
                        return (
                            <span className="whitespace-nowrap">
                                {fmtDate(String(value))}
                            </span>
                        );
                    }
                    if (col.field_type === "Datetime") {
                        return (
                            <span className="whitespace-nowrap">
                                {fmtSmart(String(value))}
                            </span>
                        );
                    }
                    return (
                        <span className="line-clamp-1">{String(value)}</span>
                    );
                }
                // Calculated columns
                if (col.key.startsWith("calc:")) {
                    const calcKey = col.key.slice(5);
                    const calcValue = entry.calculated?.[calcKey] ?? 0;
                    return (
                        <Tooltip
                            content={t(
                                "blueprints.entries.tooltip.view_col",
                            ).replace(":label", col.label)}
                            disabled={calcValue <= 0}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    calcValue > 0 &&
                                    setDetailModal({
                                        entryName: entry.name,
                                        colLabel: col.label,
                                        calcKey,
                                        entryId: entry.id,
                                    })
                                }
                                className={`font-mono ${calcValue > 0 ? "cursor-pointer" : ""}`}
                                style={
                                    calcValue > 0
                                        ? badgePrimaryStyle
                                        : badgeGhostDimmedStyle
                                }
                            >
                                {calcValue}
                            </button>
                        </Tooltip>
                    );
                }
                return null;
        }
    }

    return (
        <div className="space-y-4">
            {/* Controls bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-60">
                        <Input
                            icon="fa-solid fa-magnifying-glass"
                            size="xs"
                            defaultValue={search}
                            onChange={(e) =>
                                handleSearchChange(e.currentTarget.value)
                            }
                            placeholder={t(
                                "blueprints.entries.search_placeholder",
                            )}
                        />
                    </div>
                    <span style={badgeGhostStyle}>
                        {t(
                            meta?.total === 1
                                ? "blueprints.entries.count.singular"
                                : "blueprints.entries.count.plural",
                        ).replace(":count", String(meta?.total ?? 0))}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* View selector */}
                    <ActionButton
                        icon="fa-solid fa-eye"
                        label={`${activeViewName}${viewDirty ? " *" : ""}`}
                        variant="ghost"
                        onClick={() => setShowViewsModal(true)}
                    />

                    <ActionButton
                        icon="fa-solid fa-table-columns"
                        label={t("blueprints.entries.action.columns")}
                        variant="ghost"
                        onClick={() => {
                            setModalInitialMenu("columns");
                            setShowColumnModal(true);
                        }}
                    />

                    {viewDirty && (
                        <>
                            <ActionButton
                                icon="fa-solid fa-floppy-disk"
                                label={t("blueprints.entries.action.save_view")}
                                onClick={() => setShowSaveModal(true)}
                                disabled={saving}
                            />
                            {viewConfig.is_personal && (
                                <ActionButton
                                    icon="fa-solid fa-rotate-left"
                                    label={t("common.reset")}
                                    variant="error"
                                    onClick={handleResetView}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Table — paper-style shell with primary-tinted header.
                Hover + header-icon hover states live in ui-polish.css
                under .alex-entries-table; everything structural is
                expressed via inline theme tokens here. */}
            <div style={tableShellStyle}>
                <div className="overflow-x-auto" style={tableInnerStyle}>
                    <table className="alex-entries-table table w-full">
                        <thead>
                            <tr className="text-xs tracking-wider [&_th]:normal-case">
                                {activeColumns.map((col, i) => (
                                    <th
                                        key={col.key}
                                        className={`relative ${columnWidthClass(col.key)}`}
                                        style={
                                            i === 0
                                                ? {
                                                      ...tableHeaderCellStyle,
                                                      borderTopLeftRadius:
                                                          "var(--theme-radius-card)",
                                                  }
                                                : tableHeaderCellStyle
                                        }
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>{col.label}</span>
                                            <Tooltip
                                                content={t(
                                                    "blueprints.entries.tooltip.filter_col",
                                                ).replace(":label", col.label)}
                                                variant="primary"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFilterModalCol(
                                                            col.key,
                                                        )
                                                    }
                                                    className="alex-entries-header-icon rounded p-0.5"
                                                    data-active={
                                                        columnFilters[col.key]
                                                            ? "true"
                                                            : "false"
                                                    }
                                                >
                                                    <i className="fa-solid fa-filter text-[11px]" />
                                                </button>
                                            </Tooltip>
                                            {isSortable(col.key) && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleSort(col.key)
                                                    }
                                                    className="alex-entries-header-icon"
                                                    data-active="true"
                                                >
                                                    {renderSortIcon(col.key)}
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                                <th
                                    style={{
                                        ...tableHeaderCellStyle,
                                        borderTopRightRadius:
                                            "var(--theme-radius-card)",
                                    }}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        {hasAnyFilter && (
                                            <Tooltip
                                                content={t(
                                                    "blueprints.entries.header.clear_filters",
                                                )}
                                                variant="primary"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={clearAllFilters}
                                                    className="alex-entries-clear-filters"
                                                >
                                                    <i className="fa-solid fa-filter-circle-xmark text-xs" />
                                                </button>
                                            </Tooltip>
                                        )}
                                        <span>
                                            {t(
                                                "blueprints.entries.header.actions",
                                            )}
                                        </span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={activeColumns.length + 1}
                                        className="border-b-0"
                                    >
                                        <div className="flex items-center justify-center py-12">
                                            <i
                                                className="fa-solid fa-circle-notch fa-spin text-sm"
                                                style={{
                                                    color: "var(--theme-brand-primary-500)",
                                                }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={activeColumns.length + 1}
                                        className="border-b-0"
                                    >
                                        <div className="py-12 text-center">
                                            <div
                                                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                                                style={emptyIconWrapStyle}
                                            >
                                                <i
                                                    className="fa-solid fa-file text-xl"
                                                    style={subtitle30}
                                                />
                                            </div>
                                            <p
                                                className="font-medium"
                                                style={subtitle50}
                                            >
                                                {search || hasAnyFilter
                                                    ? t(
                                                          "blueprints.entries.empty.no_match",
                                                      )
                                                    : t(
                                                          "blueprints.entries.empty.none",
                                                      )}
                                            </p>
                                            {!search && !hasAnyFilter && (
                                                <p
                                                    className="mt-1 text-sm"
                                                    style={subtitle30}
                                                >
                                                    {t(
                                                        "blueprints.entries.empty.hint",
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((entry, i) => {
                                    const isLast = i === items.length - 1;
                                    const cellBorder: CSSProperties = isLast
                                        ? {}
                                        : {
                                              borderBottom:
                                                  "1px dashed color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
                                          };
                                    return (
                                        <tr key={entry.id} className="group">
                                            {activeColumns.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className={`text-sm ${columnWidthClass(col.key)}`}
                                                    style={{
                                                        ...subtitle70,
                                                        ...cellBorder,
                                                    }}
                                                >
                                                    {getCellValue(entry, col)}
                                                </td>
                                            ))}
                                            <td
                                                className="text-right"
                                                style={cellBorder}
                                            >
                                                {/* Single three-dots menu houses all row actions.
                                                Tighter than the old icon row and gives room to
                                                grow (more actions don't widen the column). */}
                                                <div className="flex items-center justify-end gap-1">
                                                    {entry.writing_work_slug && (
                                                        <Tooltip content={t("entries.show.open_in_writing")}>
                                                            <a
                                                                href={`/works/${project.slug}/${entry.writing_work_slug}`}
                                                                title={t("entries.show.open_in_writing")}
                                                                aria-label={t("entries.show.open_in_writing")}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="inline-flex h-6 w-6 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                                                                style={{
                                                                    borderRadius: "var(--theme-radius-button)",
                                                                    color: "var(--theme-brand-primary-500)",
                                                                }}
                                                            >
                                                                <i className="fa-solid fa-feather text-[11px]" />
                                                            </a>
                                                        </Tooltip>
                                                    )}
                                                    <DropdownMenu
                                                        align="right"
                                                        items={[
                                                            ...(!entry.is_stub
                                                                ? [
                                                                      {
                                                                          label: t(
                                                                              "blueprints.entries.row.view",
                                                                          ),
                                                                          icon: "fa-solid fa-eye",
                                                                          href: entry.url,
                                                                      },
                                                                  ]
                                                                : []),
                                                            {
                                                                label: t(
                                                                    "blueprints.entries.row.edit",
                                                                ),
                                                                icon: "fa-solid fa-pen",
                                                                href: `${entry.url}/edit`,
                                                            },
                                                            {
                                                                divider:
                                                                    true as const,
                                                            },
                                                            {
                                                                label: t(
                                                                    "blueprints.entries.row.archive",
                                                                ),
                                                                icon: "fa-solid fa-box-archive",
                                                                onClick: () =>
                                                                    setArchiveConfirm(
                                                                        {
                                                                            entry,
                                                                            connectionCount: 0,
                                                                        },
                                                                    ),
                                                            },
                                                        ]}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {meta && (
                <Pagination
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    from={meta.from}
                    to={meta.to}
                    total={meta.total}
                    onPageChange={setPage}
                />
            )}

            {/* Calculated Detail Modal */}
            {detailModal && (
                <CalcDetailModal
                    entryName={detailModal.entryName}
                    colLabel={detailModal.colLabel}
                    calcKey={detailModal.calcKey}
                    entryId={detailModal.entryId}
                    onClose={() => setDetailModal(null)}
                />
            )}

            {/* Filter Modal */}
            {filterModalCol &&
                (() => {
                    const col = availableColumns.find(
                        (c) => c.key === filterModalCol,
                    );
                    if (!col) return null;
                    return (
                        <ColumnFilterModal
                            open
                            column={col}
                            filter={columnFilters[filterModalCol] ?? null}
                            onApply={(f) => setFilter(filterModalCol, f)}
                            onClear={() => setFilter(filterModalCol, null)}
                            onClose={() => setFilterModalCol(null)}
                            projectId={projectId}
                            blueprintId={blueprintId}
                        />
                    );
                })()}

            {/* Views Modal */}
            <ViewsModal
                open={showViewsModal}
                onClose={() => setShowViewsModal(false)}
                views={views}
                canUpdate={canUpdate}
                onSelect={(viewId) => {
                    loadView(viewId);
                    setShowViewsModal(false);
                }}
                onDelete={(viewId) => {
                    fetch(`/api/v1/blueprints/views/${viewId}`, {
                        method: "DELETE",
                        headers: csrfHeaders(),
                        credentials: "same-origin",
                    }).then(() =>
                        setViews((prev) => prev.filter((v) => v.id !== viewId)),
                    );
                }}
                onResetToDefault={handleResetView}
            />

            {/* Save View Modal */}
            <SaveViewModal
                open={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={doSaveView}
                saving={saving}
                currentName={viewConfig.name}
                isPersonal={viewConfig.is_personal}
            />

            {/* Stub Preview Modal */}
            <StubPreviewModal
                entryId={stubPreviewId}
                open={stubPreviewId !== null}
                onClose={() => setStubPreviewId(null)}
            />

            {/* Archive Entry Modal */}
            {archiveConfirm && (
                <ArchiveEntryModal
                    open
                    entryId={archiveConfirm.entry.id}
                    entryName={archiveConfirm.entry.name}
                    projectId={projectId}
                    onClose={() => setArchiveConfirm(null)}
                    onArchived={() => {
                        setArchiveConfirm(null);
                        fetchEntries();
                    }}
                />
            )}

            {/* Column Configuration Modal */}
            <ColumnConfigModal
                open={showColumnModal}
                onClose={() => {
                    setShowColumnModal(false);
                    setModalInitialMenu(undefined);
                }}
                columns={columns}
                sortableColumns={sortableColumns}
                availableColumns={availableColumns}
                onChange={setColumns}
                onSortableChange={setSortableColumns}
                blueprintName={blueprintName}
                blueprint={blueprint}
                project={project}
                listableBlueprints={listableBlueprints}
                relationshipBlueprints={relationshipBlueprints}
                referencingRelationshipBlueprints={
                    referencingRelationshipBlueprints
                }
                timelineBlueprints={timelineBlueprints}
                initialMenu={modalInitialMenu}
            />
        </div>
    );
}
