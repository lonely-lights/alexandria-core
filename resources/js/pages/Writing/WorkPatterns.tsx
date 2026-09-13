import { Link, router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import Button from "@alexandria/components/ui/Button";
import ButtonLink from "@alexandria/components/ui/ButtonLink";
import useT from "@alexandria/hooks/useT";
import AppLayout from "@alexandria/layouts/AppLayout";
import { workUrl } from "@alexandria/lib/urls";
import Implementation from "./Threads/WorkOverview/Implementation";
import ImplementationNavigator, {
    filterImplementations,
} from "./Threads/WorkOverview/ImplementationNavigator";
import type { PatternFilters } from "./Threads/WorkOverview/ImplementationNavigator";
import OverviewDialogs from "./Threads/WorkOverview/OverviewDialogs";
import type { OverviewDialog } from "./Threads/WorkOverview/OverviewDialogs";
import type {
    WorkPatternSection,
    WorkPatternThread,
} from "./Threads/WorkOverview/types";
import "../../../css/components/work-patterns.css";

interface Props {
    project: { id: number; name: string; slug: string };
    work: { id: number; title: string; slug: string };
    threads: WorkPatternThread[];
    section_options: WorkPatternSection[];
    can: { managePatterns: boolean };
    [key: string]: unknown;
}

export default function WorkPatterns() {
    const props = usePage<Props>().props;

    return <PatternWorkspace key={props.work.id} {...props} />;
}

function PatternWorkspace({
    project,
    work,
    threads,
    section_options: sections,
    can,
}: Props) {
    const t = useT();
    const [filters, setFilters] = useState<PatternFilters>({
        query: "",
        status: "all",
        kind: "",
    });
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [mobileDetail, setMobileDetail] = useState(false);
    const [dialog, setDialog] = useState<OverviewDialog | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [notice, setNotice] = useState("");
    const visible = filterImplementations(threads, filters);
    const selected =
        visible.find((thread) => thread.id === selectedId) ??
        visible[0] ??
        null;
    const deviceCount = new Set(threads.map((thread) => thread.card.id)).size;
    const momentCount = threads.reduce(
        (total, thread) => total + thread.marks.length,
        0,
    );
    useEffect(() => {
        if (mobileDetail && window.matchMedia("(max-width: 767px)").matches) {
            document.getElementById("pattern-detail-title")?.focus();
        }
    }, [mobileDetail, selected?.id]);

    function saved(id?: number) {
        setDialog(null);
        setNotice(t("writing.work_patterns.saved"));
        setRefreshing(true);

        if (id !== undefined) {
            setSelectedId(id);
            setFilters({ query: "", status: "all", kind: "" });
            setMobileDetail(true);
        }

        router.reload({
            only: ["threads", "section_options", "can"],
            onFinish: () => setRefreshing(false),
        });
    }
    function choose(thread: WorkPatternThread) {
        setSelectedId(thread.id);
        setMobileDetail(true);
        setNotice("");
    }

    return (
        <AppLayout
            title={t("writing.work_patterns.title") + " - " + work.title}
            immersive
            fabActions={null}
        >
            <div
                className="pattern-workspace"
                data-work-patterns
                data-mobile-detail={mobileDetail && selected !== null}
            >
                <header className="pattern-page-heading">
                    <div className="pattern-page-title">
                        <Link
                            href={workUrl(project.slug, work.slug)}
                            className="pattern-work-link"
                        >
                            <i
                                className="fa-solid fa-arrow-left"
                                aria-hidden="true"
                            />
                            {work.title}
                        </Link>
                        <h1>{t("writing.work_patterns.title")}</h1>
                        <p>{t("writing.work_patterns.workspace_intro")}</p>
                    </div>
                    <div className="pattern-page-actions">
                        <ButtonLink
                            href={workUrl(project.slug, work.slug)}
                            variant="ghost"
                            size="sm"
                        >
                            {t("writing.work_patterns.open_manuscript")}
                        </ButtonLink>
                        {can.managePatterns && (
                            <Button
                                icon="fa-solid fa-plus"
                                disabled={refreshing}
                                onClick={() =>
                                    setDialog({
                                        type: "implementation",
                                        thread: null,
                                    })
                                }
                            >
                                {t("writing.work_patterns.new_implementation")}
                            </Button>
                        )}
                    </div>
                </header>
                <div className="pattern-work-summary">
                    <span>
                        <b>{deviceCount}</b>{" "}
                        {t("writing.work_patterns.devices_short")}
                    </span>
                    <span>
                        <b>{threads.length}</b>{" "}
                        {t("writing.work_patterns.implementations")}
                    </span>
                    <span>
                        <b>{momentCount}</b>{" "}
                        {t("writing.work_patterns.marked_moments")}
                    </span>
                    <p className="pattern-save-status" role="status">
                        {refreshing
                            ? t("writing.work_patterns.refreshing")
                            : notice}
                    </p>
                </div>
                <fieldset
                    className="pattern-workbench min-w-0"
                    aria-busy={refreshing}
                    disabled={refreshing}
                >
                    <ImplementationNavigator
                        threads={threads}
                        visible={visible}
                        selectedId={selected?.id ?? null}
                        filters={filters}
                        onFilters={setFilters}
                        onSelect={choose}
                        canManage={can.managePatterns}
                        onCreate={() =>
                            setDialog({ type: "implementation", thread: null })
                        }
                    />
                    <div className="pattern-detail-pane">
                        <button
                            type="button"
                            className="pattern-mobile-back"
                            onClick={() => setMobileDetail(false)}
                        >
                            <i
                                className="fa-solid fa-arrow-left"
                                aria-hidden="true"
                            />
                            {t("writing.work_patterns.back_implementations")}
                        </button>
                        {selected ? (
                            <Implementation
                                key={selected.id}
                                thread={selected}
                                projectSlug={project.slug}
                                workSlug={work.slug}
                                canManage={can.managePatterns}
                                hasSections={sections.length > 0}
                                onDialog={setDialog}
                            />
                        ) : (
                            <div className="pattern-work-empty">
                                <i
                                    className="fa-solid fa-lines-leaning"
                                    aria-hidden="true"
                                />
                                <h2>
                                    {t(
                                        "writing.work_patterns." +
                                            (threads.length
                                                ? "no_results"
                                                : "empty"),
                                    )}
                                </h2>
                                <p>
                                    {t(
                                        "writing.work_patterns." +
                                            (threads.length
                                                ? "adjust_filters"
                                                : "start_hint"),
                                    )}
                                </p>
                                {can.managePatterns && !threads.length && (
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setDialog({
                                                type: "implementation",
                                                thread: null,
                                            })
                                        }
                                    >
                                        {t(
                                            "writing.work_patterns.start_implementation",
                                        )}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </fieldset>
                <p className="sr-only" role="status">
                    {t("writing.work_patterns.results").replace(
                        ":count",
                        String(visible.length),
                    )}
                </p>
            </div>
            {dialog && can.managePatterns && (
                <OverviewDialogs
                    dialog={dialog}
                    projectSlug={project.slug}
                    workId={work.id}
                    sections={sections}
                    onClose={() => setDialog(null)}
                    onSaved={saved}
                />
            )}
        </AppLayout>
    );
}
