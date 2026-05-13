import React, {
    type CSSProperties,
    type ReactNode,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import EntryLink from "@alexandria/components/entries/EntryLink";
import useT from "@alexandria/hooks/useT";
import Input from "@alexandria/components/form/Input";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Modal from "@alexandria/components/ui/Modal";
import Pagination from "@alexandria/components/ui/Pagination";
import { ColumnConfigModal } from "./modals/BlueprintSettingsModal";
import { ColumnFilterModal, type ColumnFilter } from "./modals/FilterModals";
import { ViewsModal, SaveViewModal } from "./modals/ViewModals";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import type {
    BlueprintDetail,
    SiblingBlueprint,
    AvailableColumn,
    SavedView,
    ViewConfig,
} from "@alexandria/types/blueprints";
import { createFilterHelpers, mergeSavedView } from "./useSavedViewHelpers";

/* ── Theme-token style recipes (parallels EntriesTab.tsx) ──────── */

const subtitle60: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
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

const badgeGhostStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background:
        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
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
    background: "var(--theme-base-300)",
};

const warningIconStyle: CSSProperties = {
    color: "var(--theme-status-warning-stroke)",
};
const warningFillStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-status-warning-stroke) 10%, transparent)",
};

interface ConnectionItem {
    id: number;
    parent: { name: string; label: string | null; url: string | null };
    child: { name: string; label: string | null; url: string | null };
    fields: Record<string, unknown>;
    created_at: string;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface ConnectionsViewProps {
    projectId: number;
    blueprint: BlueprintDetail;
    project: { id: number; name: string; slug: string };
    viewConfig: ViewConfig;
    savedViews: SavedView[];
    listableBlueprints: SiblingBlueprint[];
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
}

function buildAvailableColumns(blueprint: BlueprintDetail): AvailableColumn[] {
    const fixed: AvailableColumn[] = [
        { key: "entry_a", label: "Entry A", type: "native", sortable: true },
        { key: "entry_b", label: "Entry B", type: "native", sortable: true },
    ];

    const fieldCols: AvailableColumn[] = blueprint.fields.map((f) => ({
        key: `field:${f.name}`,
        label: f.label,
        type: "field" as const,
        field_type:
            f.type.charAt(0).toUpperCase() + f.type.slice(1).replace(/_/g, " "),
        sortable: true,
    }));

    const bottom: AvailableColumn[] = [
        { key: "created_at", label: "Added", type: "native", sortable: true },
    ];

    return [...fixed, ...fieldCols, ...bottom];
}

export default function ConnectionsView({
    projectId,
    blueprint,
    project,
    viewConfig,
    savedViews,
    listableBlueprints,
    relationshipBlueprints,
    referencingRelationshipBlueprints,
}: ConnectionsViewProps) {
    const t = useT();
    const availableColumns = buildAvailableColumns(blueprint);
    const defaultFieldColumns = blueprint.fields
        .filter((f) => !["priority", "details"].includes(f.name))
        .map((f) => `field:${f.name}`);
    const systemDefault = ["entry_a", "entry_b", ...defaultFieldColumns];

    const initialConfig = viewConfig.config;

    // Check if saved columns are valid for this view (they might be from a table view config)
    const savedColumnsValid = initialConfig.columns?.some((c: string) =>
        availableColumns.some((ac) => ac.key === c),
    );
    const resolvedColumns = savedColumnsValid
        ? initialConfig.columns
        : systemDefault;

    // Session persistence
    const sessionKey = `blueprint_conn_view_${blueprint.id}`;
    function getSessionConfig() {
        try {
            const s = sessionStorage.getItem(sessionKey);
            if (s) return JSON.parse(s);
        } catch {
            /* ignore */
        }
        return null;
    }
    const sessionConfig = getSessionConfig();
    const initColumns = sessionConfig?.columns ?? resolvedColumns;
    const initSortField =
        sessionConfig?.sort_field ?? initialConfig.sort_field ?? "created_at";
    const initSortDir =
        sessionConfig?.sort_direction ?? initialConfig.sort_direction ?? "desc";
    const initPerPage = sessionConfig?.per_page ?? initialConfig.per_page ?? 25;

    const [items, setItems] = useState<ConnectionItem[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(initPerPage);
    const [columns, setColumns] = useState<string[]>(initColumns);
    const [sortField, setSortField] = useState(initSortField);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
        initSortDir,
    );
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsInitialMenu, setSettingsInitialMenu] = useState<
        string | undefined
    >(undefined);
    const [columnFilters, setColumnFilters] = useState<
        Record<string, ColumnFilter>
    >({});
    const [filterModalCol, setFilterModalCol] = useState<string | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showViewsModal, setShowViewsModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<ConnectionItem | null>(
        null,
    );
    const [activeViewName, setActiveViewName] = useState(viewConfig.name);
    const [views, setViews] = useState<SavedView[]>(savedViews);
    const [saving, setSaving] = useState(false);
    const [viewDirty, setViewDirty] = useState(!!sessionConfig);

    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    // Session persistence + dirty tracking
    useEffect(() => {
        const working = {
            columns,
            sort_field: sortField,
            sort_direction: sortDirection,
            per_page: perPage,
        };
        const isDirty =
            JSON.stringify(columns) !== JSON.stringify(resolvedColumns) ||
            sortField !== (initialConfig.sort_field ?? "created_at") ||
            sortDirection !== (initialConfig.sort_direction ?? "desc") ||
            perPage !== (initialConfig.per_page ?? 25);
        if (isDirty) {
            sessionStorage.setItem(sessionKey, JSON.stringify(working));
        } else {
            sessionStorage.removeItem(sessionKey);
        }
        setViewDirty(isDirty);
    }, [columns, sortField, sortDirection, perPage]);

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
                setColumns(view.config.columns ?? systemDefault);
                setSortField(view.config.sort_field ?? "created_at");
                setSortDirection(view.config.sort_direction ?? "desc");
                setPerPage(view.config.per_page ?? 25);
                setActiveViewName(view.name);
                setPage(1);
                setViewDirty(false);
                sessionStorage.removeItem(sessionKey);
            });
    }

    function doSaveView(name: string, isDefault: boolean) {
        setSaving(true);
        fetch(`/api/v1/blueprints/${blueprint.id}/view`, {
            method: "PUT",
            headers: csrfHeaders(),
            credentials: "same-origin",
            body: JSON.stringify({
                name,
                is_default: isDefault,
                config: {
                    columns,
                    sortable_columns: [],
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
                setViews((prev) => mergeSavedView(prev, data, isDefault));
            })
            .catch(() => setSaving(false));
    }

    const activeColumns = columns
        .map((key) => availableColumns.find((c) => c.key === key))
        .filter(Boolean) as AvailableColumn[];

    const showEntryA = columns.includes("entry_a");
    const showEntryB = columns.includes("entry_b");

    const { setFilter, clearAllFilters } = createFilterHelpers(
        setColumnFilters,
        setPage,
        setFilterModalCol,
    );
    const hasAnyFilter = Object.keys(columnFilters).length > 0;

    /**
     * Reset the working view to the connection blueprint's baseline
     * (system default columns, created_at desc, 25/page, no filters).
     * Called from the Views modal's always-present "Default" entry.
     */
    function handleResetView(): void {
        fetch(`/api/v1/blueprints/${blueprint.id}/view`, {
            method: "DELETE",
            headers: csrfHeaders(),
            credentials: "same-origin",
        }).then(() => {
            setColumns(systemDefault);
            setSortField("created_at");
            setSortDirection("desc");
            setPerPage(25);
            setColumnFilters({});
            setActiveViewName(viewConfig.name);
            setPage(1);
            setViewDirty(false);
            sessionStorage.removeItem(sessionKey);
        });
    }

    function handleSort(field: string) {
        if (sortField === field) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
        setPage(1);
    }

    function renderSortIcon(field: string) {
        const isActive = sortField === field;
        if (!isActive)
            return (
                <i
                    className="fa-solid fa-sort text-[11px]"
                    style={{
                        color: "color-mix(in srgb, var(--theme-brand-primary-content) 50%, transparent)",
                    }}
                />
            );
        const icon = sortDirection === "asc" ? "fa-sort-up" : "fa-sort-down";
        return (
            <i
                className={`fa-duotone fa-solid ${icon} text-[11px]`}
                style={{ color: "var(--theme-brand-primary-content)" }}
            />
        );
    }

    function executeArchiveConnection(id: number) {
        fetch(`/api/v1/connections/${id}/archive`, {
            method: "PUT",
            headers: csrfHeaders(),
            credentials: "same-origin",
        }).then(() => {
            setConfirmDelete(null);
            fetchConnections();
        });
    }

    const fetchConnections = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("per_page", String(perPage));
        params.set("sort_field", sortField);
        params.set("sort_direction", sortDirection);
        if (search) params.set("search", search);
        if (Object.keys(columnFilters).length > 0)
            params.set("filters", JSON.stringify(columnFilters));

        fetch(
            `/api/v1/projects/${projectId}/blueprints/${blueprint.slug}/connections?${params}`,
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
        blueprint.slug,
        page,
        perPage,
        search,
        sortField,
        sortDirection,
        columnFilters,
    ]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    function handleSearchChange(value: string) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(value);
            setPage(1);
        }, 300);
    }

    function renderEntryCell(entry: {
        id?: number;
        name: string;
        label: string | null;
        url: string | null;
    }): ReactNode {
        return (
            <div>
                {entry.url && entry.id ? (
                    <EntryLink
                        entryId={entry.id}
                        href={entry.url}
                        className="font-medium hover:underline"
                    >
                        {entry.name}
                    </EntryLink>
                ) : entry.url ? (
                    <a href={entry.url} className="font-medium hover:underline">
                        {entry.name}
                    </a>
                ) : (
                    <span className="font-medium">{entry.name}</span>
                )}
                {entry.label && (
                    <p className="text-xs" style={subtitle40}>
                        {entry.label}
                    </p>
                )}
            </div>
        );
    }

    // Register open settings for the parent Show.tsx
    useEffect(() => {
        // Expose via custom event so Show.tsx can trigger it
        function handleOpenSettings(e: Event) {
            const detail = (e as CustomEvent).detail;
            setSettingsInitialMenu(detail?.menu ?? "main");
            setShowSettingsModal(true);
        }
        window.addEventListener(
            "alexandria:open-blueprint-settings",
            handleOpenSettings,
        );
        return () =>
            window.removeEventListener(
                "alexandria:open-blueprint-settings",
                handleOpenSettings,
            );
    }, []);

    const totalCols =
        activeColumns.length + (showEntryA && showEntryB ? 1 : 0) + 1; // +1 arrow, +1 actions

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
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
                                "blueprints.connections.search_placeholder",
                            )}
                        />
                    </div>
                    {meta && (
                        <span style={badgeGhostStyle}>
                            {t(
                                meta.total === 1
                                    ? "blueprints.connections.count.singular"
                                    : "blueprints.connections.count.plural",
                            ).replace(":count", String(meta.total))}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
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
                            setSettingsInitialMenu("columns");
                            setShowSettingsModal(true);
                        }}
                    />
                    {viewDirty && (
                        <ActionButton
                            icon="fa-solid fa-floppy-disk"
                            label={t("blueprints.entries.action.save_view")}
                            onClick={() => setShowSaveModal(true)}
                            disabled={saving}
                        />
                    )}
                </div>
            </div>

            {/* Table — paper-style shell, primary-tinted header.
                Reuses .alex-entries-table (defined in ui-polish.css)
                for hover / header-icon hover states. */}
            <div style={tableShellStyle}>
                <div className="overflow-x-auto" style={tableInnerStyle}>
                    <table className="alex-entries-table table w-full">
                        <thead>
                            <tr className="text-xs tracking-wider [&_th]:normal-case">
                                {activeColumns.map((col, i) => {
                                    const isEntryB = col.key === "entry_b";
                                    const prevIsEntryA =
                                        i > 0 &&
                                        activeColumns[i - 1]?.key === "entry_a";
                                    return (
                                        <React.Fragment
                                            key={`th-${col.key}-${i}`}
                                        >
                                            {isEntryB && prevIsEntryA && (
                                                <th
                                                    className="w-10"
                                                    style={tableHeaderCellStyle}
                                                />
                                            )}
                                            <th
                                                className={
                                                    i === 0
                                                        ? "first:rounded-tl-2xl"
                                                        : ""
                                                }
                                                style={tableHeaderCellStyle}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span>{col.label}</span>
                                                    {col.key !==
                                                        "created_at" && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setFilterModalCol(
                                                                    col.key,
                                                                )
                                                            }
                                                            className="alex-entries-header-icon rounded p-0.5"
                                                            data-active={
                                                                columnFilters[
                                                                    col.key
                                                                ]
                                                                    ? "true"
                                                                    : "false"
                                                            }
                                                        >
                                                            <i className="fa-solid fa-filter text-[11px]" />
                                                        </button>
                                                    )}
                                                    {col.sortable && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSort(
                                                                    col.key,
                                                                )
                                                            }
                                                            className="alex-entries-header-icon"
                                                            data-active="true"
                                                        >
                                                            {renderSortIcon(
                                                                col.key,
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                        </React.Fragment>
                                    );
                                })}
                                <th
                                    className="last:rounded-tr-2xl"
                                    style={tableHeaderCellStyle}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        {hasAnyFilter && (
                                            <button
                                                type="button"
                                                onClick={clearAllFilters}
                                                className="alex-entries-clear-filters"
                                                title={t(
                                                    "blueprints.entries.header.clear_filters",
                                                )}
                                            >
                                                <i className="fa-solid fa-filter-circle-xmark text-xs" />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={totalCols}
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
                                        colSpan={totalCols}
                                        className="border-b-0"
                                    >
                                        <div className="py-12 text-center">
                                            <div
                                                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                                                style={emptyIconWrapStyle}
                                            >
                                                <i
                                                    className="fa-solid fa-diagram-project text-xl"
                                                    style={subtitle30}
                                                />
                                            </div>
                                            <p
                                                className="font-medium"
                                                style={subtitle50}
                                            >
                                                {search
                                                    ? t(
                                                          "blueprints.connections.empty.no_match",
                                                      )
                                                    : t(
                                                          "blueprints.connections.empty.none",
                                                      )}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, i) => {
                                    const isLast = i === items.length - 1;
                                    const cellBorder: CSSProperties = isLast
                                        ? {}
                                        : {
                                              borderBottom:
                                                  "1px dashed color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
                                          };
                                    return (
                                        <tr key={item.id} className="group">
                                            {activeColumns.map((col, ci) => {
                                                const isEntryB =
                                                    col.key === "entry_b";
                                                const prevIsEntryA =
                                                    ci > 0 &&
                                                    activeColumns[ci - 1]
                                                        ?.key === "entry_a";

                                                return (
                                                    <React.Fragment
                                                        key={`${col.key}-${ci}`}
                                                    >
                                                        {isEntryB &&
                                                            prevIsEntryA && (
                                                                <td
                                                                    className="text-center"
                                                                    style={
                                                                        cellBorder
                                                                    }
                                                                >
                                                                    <i
                                                                        className="fa-solid fa-arrow-right-arrow-left text-xs"
                                                                        style={
                                                                            subtitle20
                                                                        }
                                                                    />
                                                                </td>
                                                            )}
                                                        <td
                                                            className="text-sm"
                                                            style={cellBorder}
                                                        >
                                                            {col.key ===
                                                            "entry_a" ? (
                                                                renderEntryCell(
                                                                    item.parent,
                                                                )
                                                            ) : col.key ===
                                                              "entry_b" ? (
                                                                renderEntryCell(
                                                                    item.child,
                                                                )
                                                            ) : col.key ===
                                                              "created_at" ? (
                                                                <span
                                                                    className="text-xs"
                                                                    style={
                                                                        subtitle40
                                                                    }
                                                                >
                                                                    {
                                                                        item.created_at
                                                                    }
                                                                </span>
                                                            ) : col.key.startsWith(
                                                                  "field:",
                                                              ) ? (
                                                                item.fields[
                                                                    col.label
                                                                ] != null ? (
                                                                    <span
                                                                        style={
                                                                            subtitle60
                                                                        }
                                                                    >
                                                                        {String(
                                                                            item
                                                                                .fields[
                                                                                col
                                                                                    .label
                                                                            ],
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        className="italic"
                                                                        style={
                                                                            subtitle20
                                                                        }
                                                                    >
                                                                        --
                                                                    </span>
                                                                )
                                                            ) : null}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                            <td
                                                className="text-right"
                                                style={cellBorder}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmDelete(item)
                                                    }
                                                    className="alex-btn alex-btn--ghost inline-flex h-6 w-6 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                                                    style={{
                                                        borderRadius:
                                                            "var(--theme-radius-button)",
                                                    }}
                                                    title={t(
                                                        "blueprints.connections.archive.row_button",
                                                    )}
                                                >
                                                    <i
                                                        className="fa-solid fa-box-archive text-xs"
                                                        style={warningIconStyle}
                                                    />
                                                </button>
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

            {/* Views Modal */}
            <ViewsModal
                open={showViewsModal}
                onClose={() => setShowViewsModal(false)}
                views={views}
                canUpdate={blueprint.can.update}
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
                currentName={activeViewName}
                isPersonal={viewConfig.is_personal}
            />

            {/* Archive Confirmation Modal */}
            {confirmDelete && (
                <Modal open onClose={() => setConfirmDelete(null)}>
                    <div className="p-6 text-center">
                        <div
                            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                            style={warningFillStyle}
                        >
                            <i
                                className="fa-solid fa-box-archive text-xl"
                                style={warningIconStyle}
                            />
                        </div>
                        <h3 className="text-lg font-bold">
                            {t("blueprints.connections.archive.title")}
                        </h3>
                        <p className="mt-2 text-sm" style={subtitle60}>
                            {(() => {
                                const parts = t(
                                    "blueprints.connections.archive.body",
                                ).split(/:parent|:child/);
                                return (
                                    <>
                                        {parts[0]}
                                        <strong>
                                            {confirmDelete.parent.name}
                                        </strong>
                                        {parts[1]}
                                        <strong>
                                            {confirmDelete.child.name}
                                        </strong>
                                        {parts[2]}
                                    </>
                                );
                            })()}
                        </p>
                        <p className="mt-1 text-xs" style={subtitle40}>
                            {t("blueprints.connections.archive.helper")}
                        </p>
                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton
                                icon="fa-solid fa-xmark"
                                label={t("common.cancel")}
                                variant="ghost"
                                onClick={() => setConfirmDelete(null)}
                            />
                            <ActionButton
                                icon="fa-solid fa-box-archive"
                                label={t(
                                    "blueprints.connections.archive.confirm",
                                )}
                                variant="warning"
                                onClick={() =>
                                    executeArchiveConnection(confirmDelete.id)
                                }
                            />
                        </div>
                    </div>
                </Modal>
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
                            blueprintId={blueprint.id}
                            valuesUrl={`/api/v1/projects/${projectId}/blueprints/${blueprint.slug}/connection-values`}
                        />
                    );
                })()}

            {/* Settings Modal */}
            <ColumnConfigModal
                open={showSettingsModal}
                onClose={() => {
                    setShowSettingsModal(false);
                    setSettingsInitialMenu(undefined);
                }}
                columns={columns}
                sortableColumns={[]}
                availableColumns={availableColumns}
                onChange={setColumns}
                onSortableChange={() => {}}
                blueprintName={blueprint.name}
                blueprint={blueprint}
                project={project}
                listableBlueprints={listableBlueprints}
                relationshipBlueprints={relationshipBlueprints}
                referencingRelationshipBlueprints={
                    referencingRelationshipBlueprints
                }
                initialMenu={settingsInitialMenu}
            />
        </div>
    );
}
