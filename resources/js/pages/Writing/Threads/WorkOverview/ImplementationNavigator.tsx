import Input from "@alexandria/components/form/Input";
import Select from "@alexandria/components/form/Select";
import Button from "@alexandria/components/ui/Button";
import useT from "@alexandria/hooks/useT";
import { MOMENT_ROLES, roleCount } from "./types";
import type { WorkPatternThread } from "./types";

export interface PatternFilters {
    query: string;
    status: string;
    kind: string;
}

export function filterImplementations(
    threads: WorkPatternThread[],
    filters: PatternFilters,
) {
    const needle = filters.query.trim().toLocaleLowerCase();

    return threads.filter(
        (thread) =>
            (filters.status === "all" ||
                (filters.status === "unplanted"
                    ? thread.unplanted
                    : thread.status === filters.status)) &&
            (!filters.kind || thread.card.kind === filters.kind) &&
            (!needle ||
                [
                    thread.title,
                    thread.notes,
                    thread.card.name,
                    thread.card.definition,
                    ...thread.marks.flatMap((mark) => [
                        mark.anchor_text,
                        mark.note,
                        ...mark.section_path,
                    ]),
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLocaleLowerCase()
                    .includes(needle)),
    );
}

export default function ImplementationNavigator({
    threads,
    visible,
    selectedId,
    filters,
    onFilters,
    onSelect,
    canManage,
    onCreate,
}: {
    threads: WorkPatternThread[];
    visible: WorkPatternThread[];
    selectedId: number | null;
    filters: PatternFilters;
    onFilters: (filters: PatternFilters) => void;
    onSelect: (thread: WorkPatternThread) => void;
    canManage: boolean;
    onCreate: () => void;
}) {
    const t = useT();
    const groups = new Map<number, WorkPatternThread[]>();

    for (const thread of visible) {
        groups.set(thread.card.id, [
            ...(groups.get(thread.card.id) ?? []),
            thread,
        ]);
    }

    const kinds = [
        ...new Set(
            threads.flatMap((thread) =>
                thread.card.kind ? [thread.card.kind] : [],
            ),
        ),
    ].sort();

    return (
        <aside
            className="pattern-navigator"
            aria-label={t("writing.work_patterns.implementations")}
        >
            <div className="pattern-nav-heading">
                <h2>{t("writing.work_patterns.implementations")}</h2>
                <span>{threads.length}</span>
            </div>
            <div className="space-y-3 px-4 pb-4">
                <Input
                    size="md"
                    icon="fa-solid fa-magnifying-glass"
                    aria-label={t("writing.work_patterns.search")}
                    placeholder={t("writing.work_patterns.search_short")}
                    value={filters.query}
                    onChange={(event) =>
                        onFilters({ ...filters, query: event.target.value })
                    }
                />
                <Select
                    size="md"
                    aria-label={t("writing.work_patterns.status")}
                    value={filters.status}
                    onChange={(event) =>
                        onFilters({ ...filters, status: event.target.value })
                    }
                    options={["all", "open", "kept", "unplanted"].map(
                        (value) => ({
                            value,
                            label: t(`writing.work_patterns.status_${value}`),
                        }),
                    )}
                />
                {kinds.length > 1 && (
                    <Select
                        size="md"
                        aria-label={t("writing.work_patterns.kind")}
                        value={filters.kind}
                        onChange={(event) =>
                            onFilters({ ...filters, kind: event.target.value })
                        }
                        options={[
                            {
                                value: "",
                                label: t("writing.work_patterns.all_kinds"),
                            },
                            ...kinds.map((value) => ({ value, label: value })),
                        ]}
                    />
                )}
            </div>
            <div className="pattern-nav-list">
                {[...groups.values()].map((group) => (
                    <div key={group[0].card.id} className="pattern-nav-group">
                        <h3>
                            {group[0].card.name ??
                                t("writing.work_patterns.removed_card")}
                            <span>{group.length}</span>
                        </h3>
                        {group.map((thread) => (
                            <button
                                key={thread.id}
                                type="button"
                                className="pattern-choice"
                                data-pattern-choice={thread.id}
                                aria-pressed={selectedId === thread.id}
                                aria-controls="pattern-detail"
                                onClick={() => onSelect(thread)}
                            >
                                <span className="pattern-choice-title">
                                    {thread.title}
                                </span>
                                <span className="pattern-choice-meta">
                                    {t(
                                        `writing.work_patterns.status_${thread.status}`,
                                    )}
                                </span>
                                <span
                                    className="pattern-mini-roles"
                                    aria-hidden="true"
                                >
                                    {MOMENT_ROLES.map((role) => (
                                        <span
                                            key={role}
                                            data-role={role}
                                            data-present={
                                                roleCount(thread, role) > 0
                                            }
                                        >
                                            {t(
                                                `writing.work_patterns.role_${role}`,
                                            )}{" "}
                                            <b>{roleCount(thread, role)}</b>
                                        </span>
                                    ))}
                                </span>
                            </button>
                        ))}
                    </div>
                ))}
                {visible.length === 0 && threads.length > 0 && (
                    <div className="space-y-3 p-5">
                        <p className="text-sm">
                            {t("writing.work_patterns.no_results")}
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                onFilters({
                                    query: "",
                                    status: "all",
                                    kind: "",
                                })
                            }
                        >
                            {t("writing.work_patterns.clear")}
                        </Button>
                    </div>
                )}
                {threads.length === 0 && (
                    <p className="p-5 text-sm opacity-65">
                        {t("writing.work_patterns.navigator_empty")}
                    </p>
                )}
            </div>
            {canManage && (
                <div className="pattern-nav-footer">
                    <Button
                        fullWidth
                        variant="ghost"
                        icon="fa-solid fa-plus"
                        onClick={onCreate}
                    >
                        {t("writing.work_patterns.add_another")}
                    </Button>
                </div>
            )}
        </aside>
    );
}
