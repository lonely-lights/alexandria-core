import { Deferred, useForm, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import Input from "@alexandria/components/form/Input";
import Select from "@alexandria/components/form/Select";
import Textarea from "@alexandria/components/form/Textarea";
import PageHeader from "@alexandria/components/layout/PageHeader";
import Button from "@alexandria/components/ui/Button";
import IconTile from "@alexandria/components/ui/IconTile";
import Modal, {
    ModalHeader,
    ModalFooter,
} from "@alexandria/components/ui/Modal";
import Tooltip from "@alexandria/components/ui/Tooltip";
import useMediaQuery from "@alexandria/hooks/useMediaQuery";
import useT from "@alexandria/hooks/useT";
import AppLayout from "@alexandria/layouts/AppLayout";
import { projectUrl, worksBase } from "@alexandria/lib/urls";

import StructurePickerModal from "./Sections/StructurePickerModal";
import type { StructureChoice } from "./Sections/StructurePickerModal";
import StructureTree from "./Sections/StructureTree";
import type { StructurePayload } from "./Sections/StructureTree";
import WorkCard from "./Sections/WorkCard";
import type { WorkRow } from "./Sections/WorkCard";
import WorkSettingsModal from "./Sections/WorkSettingsModal";
import type { LengthPlanOption } from "./Sections/WorkSettingsModal";
import OpenPromisesList from "./Threads/OpenPromisesList";
import PatternLibrary from "./Threads/PatternLibrary";
import PromisesRailCard from "./Threads/PromisesRailCard";

/**
 * Writing dashboard → index — Stage 8g.1 (Plan 2 Task 5).
 *
 * Pairs a project's Compendium structure with its works in a
 * golden-ratio dashboard, and hosts the create-work modal. Each work
 * links into the workspace at /works/{project}/{work}; create POSTs
 * to /works/{project} and the server redirects into the new workspace.
 */

interface WritingIndexProps {
    project: { id: number; name: string; slug: string };
    works: WorkRow[];
    types: string[];
    lengthPlans: LengthPlanOption[];
    structureMeta: {
        id: number;
        name: string;
        slug: string;
        icon: string | null;
    } | null;
    structure?: StructurePayload | null;
    structureChoices?: StructureChoice[];
    can: { create: boolean; manageStructure: boolean; delete: boolean };
    [key: string]: unknown;
}

/* ── Theme styles ── */

const subtitleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const emptyStateStyle: CSSProperties = {
    background: "var(--theme-surface-card)",
    border: "1px dashed var(--theme-neutral-300)",
    borderRadius: "var(--theme-radius-card)",
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const mutedTextStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const panelStyle: CSSProperties = {
    background:
        "linear-gradient(145deg, color-mix(in srgb, var(--theme-surface-card) 96%, var(--theme-brand-primary-500) 4%), var(--theme-surface-card))",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    boxShadow: "0 18px 48px color-mix(in srgb, #000 9%, transparent)",
};

const panelHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
};

const panelIconStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)",
    color: "var(--theme-brand-primary-500)",
    border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 18%, transparent)",
};

const countBadgeStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 7%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 62%, transparent)",
};

const structureEmptyStyle: CSSProperties = {
    ...panelStyle,
    background:
        "radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--theme-brand-primary-500) 13%, transparent), transparent 34%), var(--theme-surface-card)",
};

const structureEmptyIconStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)",
    color: "var(--theme-brand-primary-500)",
    border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)",
};

export default function WritingIndex() {
    const t = useT();
    const {
        project,
        works,
        types,
        lengthPlans,
        structureMeta,
        structure,
        structureChoices,
        can,
    } = usePage<WritingIndexProps>().props;
    const [createOpen, setCreateOpen] = useState(false);
    const [settingsWork, setSettingsWork] = useState<WorkRow | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Smaller hero tile on mobile so it doesn't claim a quarter of the
    // hero row alongside the heading — same breakpoint AI Hub uses.
    const isMobileWriting = useMediaQuery("(max-width: 1023px)");

    return (
        <AppLayout
            title={`${t("writing.index.title")} - ${project.name}`}
            immersive
            fabActions={null}
        >
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: projectUrl(project.slug) },
                    { label: t("writing.index.title") },
                ]}
                actions={
                    can.create ? (
                        <Button
                            icon="fa-solid fa-plus"
                            iconPosition="before"
                            onClick={() => setCreateOpen(true)}
                        >
                            {t("writing.index.create")}
                        </Button>
                    ) : undefined
                }
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <IconTile
                        icon="fa-solid fa-feather-pointed"
                        color="accent"
                        variant="solid"
                        animation="beat-fade"
                        size={isMobileWriting ? "sm" : "lg"}
                        animationStyle={
                            {
                                // Slow ambient pulse, matching the Notes/AI
                                // dashboard heroes — presence, not alarm.
                                "--fa-animation-duration": "2.5s",
                                "--fa-beat-fade-opacity": "0.8",
                                "--fa-beat-fade-scale": "1.075",
                            } as CSSProperties
                        }
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                            {t("writing.index.title")}
                        </h1>
                        <p
                            className="mt-1 text-xs sm:text-sm"
                            style={subtitleStyle}
                        >
                            {t("writing.index.intro").replace(
                                ":project",
                                project.name,
                            )}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="container mx-auto max-w-[94rem] px-4 py-6 sm:py-8">
                <div
                    className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.618fr)_minmax(19rem,1fr)] xl:gap-6"
                    data-writing-dashboard-grid
                >
                    <div className="flex min-w-0 flex-col gap-8" data-writing-main-column>
                        <section className="min-w-0" data-writing-structure-panel>
                            {structureMeta !== null ? (
                                <Deferred
                                    data="structure"
                                    fallback={
                                        <div
                                            className="animate-pulse overflow-hidden"
                                            style={panelStyle}
                                        >
                                            <div
                                                className="flex items-center gap-3 px-5 py-4"
                                                style={panelHeaderStyle}
                                            >
                                                <span
                                                    className="h-10 w-10 rounded-xl"
                                                    style={panelIconStyle}
                                                />
                                                <div className="flex flex-col gap-2">
                                                    <span
                                                        className="h-3 w-24 rounded-full"
                                                        style={countBadgeStyle}
                                                    />
                                                    <span
                                                        className="h-4 w-44 rounded-full"
                                                        style={countBadgeStyle}
                                                    />
                                                </div>
                                            </div>
                                            <div
                                                className="px-6 py-20 text-center text-sm"
                                                style={mutedTextStyle}
                                            >
                                                {t("writing.structure.loading")}
                                            </div>
                                        </div>
                                    }
                                >
                                    {structure ? (
                                        <StructureTree
                                            project={project}
                                            structure={structure}
                                            works={works}
                                            canLink={can.create}
                                            canManage={can.manageStructure}
                                            onConfigure={() => setPickerOpen(true)}
                                        />
                                    ) : null}
                                </Deferred>
                            ) : (
                                <StructureEmptyState
                                    canManage={can.manageStructure}
                                    onConfigure={() => setPickerOpen(true)}
                                />
                            )}
                        </section>

                        {/* Devices & Tropes library — 2026-08-29-devices-tropes
                            rework-1 (owner ruling: "The library becomes its own
                            titled panel directly below the structure tree in
                            the main column"). `data-writing-patterns-section`
                            is the scroll target the sidebar's Open Promises
                            rail card's "view all" link jumps to. The full
                            grouped-by-scope `OpenPromisesList` archive lives
                            here too (below the card library, same main
                            column) — the rail card is the ambient pulse, this
                            panel is the browsable detail view.
                            `can.manageStructure` is the same
                            Gate::allows('update', $project) tier the
                            cards/threads routes authorize mutations under. */}
                        <section className="min-w-0" data-writing-patterns-section>
                            <PatternLibrary projectSlug={project.slug} canManage={can.manageStructure} />
                            <div className="mt-6">
                                <OpenPromisesList projectSlug={project.slug} />
                            </div>
                        </section>
                    </div>

                    <WritingSidebar
                        project={project}
                        works={works}
                        structureMeta={structureMeta}
                        canManageWorks={can.create}
                        onSettings={setSettingsWork}
                    />
                </div>
            </div>

            {createOpen && (
                <CreateWorkModal
                    projectSlug={project.slug}
                    types={types}
                    onClose={() => setCreateOpen(false)}
                />
            )}

            {settingsWork !== null && (
                <WorkSettingsModal
                    project={project}
                    work={{
                        ...settingsWork,
                        length_plan: settingsWork.length_plan ?? null,
                    }}
                    types={types}
                    lengthPlans={lengthPlans}
                    structureBlueprint={structureMeta}
                    canDelete={can.delete}
                    onClose={() => setSettingsWork(null)}
                />
            )}

            {pickerOpen && (
                <StructurePickerModal
                    project={project}
                    current={structureMeta?.id ?? null}
                    choices={structureChoices}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </AppLayout>
    );
}

function StructureEmptyState({
    canManage,
    onConfigure,
}: {
    canManage: boolean;
    onConfigure: () => void;
}) {
    const t = useT();

    return (
        <div
            className="flex min-h-80 flex-col items-center justify-center overflow-hidden px-6 py-14 text-center xl:min-h-[34rem]"
            style={structureEmptyStyle}
        >
            <span
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-xl"
                style={structureEmptyIconStyle}
            >
                <i className="fa-solid fa-sitemap" aria-hidden="true" />
            </span>
            <p
                className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em]"
                style={mutedTextStyle}
            >
                {t("writing.structure.canvas_eyebrow")}
            </p>
            <h2 className="mt-2 max-w-md font-serif text-2xl font-bold tracking-tight">
                {t("writing.structure.canvas_empty_title")}
            </h2>
            <p
                className="mt-2 max-w-md text-sm leading-6"
                style={mutedTextStyle}
            >
                {t("writing.structure.canvas_empty_help")}
            </p>
            {canManage && (
                <Button
                    className="mt-6"
                    icon="fa-solid fa-link"
                    iconPosition="before"
                    onClick={onConfigure}
                >
                    {t("writing.index.link_structure")}
                </Button>
            )}
        </div>
    );
}

function WritingSidebar({
    project,
    works,
    structureMeta,
    canManageWorks,
    onSettings,
}: {
    project: { name: string; slug: string };
    works: WorkRow[];
    structureMeta: WritingIndexProps["structureMeta"];
    canManageWorks: boolean;
    onSettings: (work: WorkRow) => void;
}) {
    const t = useT();
    const sidebarRef = useRef<HTMLElement>(null);
    const activeStructureId = structureMeta?.id ?? null;
    const worksOnRight =
        activeStructureId === null
            ? works
            : works.filter(
                  (work) =>
                      work.linked_entry?.blueprint_id !== activeStructureId ||
                      // An archived entry has no tree node, so its work
                      // must fall back to the rail or it vanishes from
                      // both panels.
                      work.linked_entry?.archived === true,
              );
    const worksInActiveStructure =
        activeStructureId === null ? null : works.length - worksOnRight.length;

    useEffect(() => {
        let animationFrame: number | null = null;

        const updateAvailableHeight = () => {
            if (animationFrame !== null) {
                return;
            }

            animationFrame = window.requestAnimationFrame(() => {
                animationFrame = null;

                const sidebar = sidebarRef.current;

                if (!sidebar) {
                    return;
                }

                if (!window.matchMedia("(min-width: 1280px)").matches) {
                    sidebar.style.removeProperty("max-height");

                    return;
                }

                const viewportHeight =
                    window.visualViewport?.height ?? window.innerHeight;
                const viewportGap = 20;
                const visibleTop = Math.max(
                    viewportGap,
                    sidebar.getBoundingClientRect().top,
                );

                sidebar.style.maxHeight = `${Math.max(
                    0,
                    viewportHeight - visibleTop - viewportGap,
                )}px`;
            });
        };

        updateAvailableHeight();
        window.addEventListener("resize", updateAvailableHeight);
        window.visualViewport?.addEventListener(
            "resize",
            updateAvailableHeight,
        );
        document.addEventListener("scroll", updateAvailableHeight, {
            capture: true,
            passive: true,
        });

        return () => {
            if (animationFrame !== null) {
                window.cancelAnimationFrame(animationFrame);
            }

            window.removeEventListener("resize", updateAvailableHeight);
            window.visualViewport?.removeEventListener(
                "resize",
                updateAvailableHeight,
            );
            document.removeEventListener("scroll", updateAvailableHeight, true);
        };
    }, []);

    return (
        <aside
            ref={sidebarRef}
            className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-5"
            data-writing-sidebar
        >
            <section
                className="shrink-0 overflow-hidden"
                style={panelStyle}
                data-writing-stats-panel
            >
                <div
                    className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                    style={panelHeaderStyle}
                >
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={panelIconStyle}
                    >
                        <i
                            className="fa-solid fa-chart-simple text-sm"
                            aria-hidden="true"
                        />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p
                            className="truncate text-[0.625rem] font-semibold uppercase tracking-[0.17em]"
                            style={mutedTextStyle}
                        >
                            {project.name}
                        </p>
                        <h2 className="font-serif text-lg font-bold tracking-tight">
                            {t("writing.index.stats_title")}
                        </h2>
                    </div>
                </div>
                <dl className="grid grid-cols-3">
                    {[
                        {
                            label: t("writing.index.stats_total"),
                            value: works.length,
                        },
                        {
                            label: t("writing.index.stats_in_structure"),
                            value: worksInActiveStructure,
                        },
                        {
                            label: t("writing.index.stats_available"),
                            value: worksOnRight.length,
                        },
                    ].map((stat, index) => (
                        <div
                            key={stat.label}
                            className="px-3 py-3 text-center"
                            style={
                                index === 0
                                    ? undefined
                                    : {
                                          borderLeft:
                                              "1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
                                      }
                            }
                        >
                            <dd
                                className="font-serif text-xl font-bold leading-none"
                                style={{
                                    color:
                                        index === 2 && worksOnRight.length > 0
                                            ? "var(--theme-brand-accent-500)"
                                            : "var(--theme-base-content)",
                                }}
                            >
                                {stat.value === null
                                    ? "—"
                                    : stat.value.toLocaleString()}
                            </dd>
                            <dt
                                className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em]"
                                style={mutedTextStyle}
                            >
                                {stat.label}
                            </dt>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Open promises — ambient pulse, 2026-08-29-devices-tropes
                rework-1 (owner ruling: "An Open Promises card joins the
                sticky works/stats rail: count, oldest few threads, status
                dots, always visible while you scroll."). */}
            <PromisesRailCard projectSlug={project.slug} />

            <section
                className="min-h-0 overflow-hidden xl:flex xl:flex-1 xl:flex-col"
                style={panelStyle}
                data-writing-works-panel
            >
                <div
                    className="flex shrink-0 items-center gap-3 px-4 py-4 sm:px-5"
                    style={panelHeaderStyle}
                >
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={panelIconStyle}
                    >
                        <i
                            className="fa-solid fa-inbox text-sm"
                            aria-hidden="true"
                        />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p
                            className="text-[0.625rem] font-semibold uppercase tracking-[0.17em]"
                            style={mutedTextStyle}
                        >
                            {structureMeta === null
                                ? t("writing.index.all_works_eyebrow")
                                : t("writing.index.scoped_works_eyebrow")}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                            <h2
                                className="min-w-0 truncate font-serif text-lg font-bold tracking-tight"
                                title={
                                    structureMeta === null
                                        ? undefined
                                        : t(
                                              "writing.index.scoped_works_title",
                                          ).replace(
                                              ":structure",
                                              structureMeta.name,
                                          )
                                }
                            >
                                {structureMeta === null
                                    ? t("writing.index.all_works_title")
                                    : t(
                                          "writing.index.scoped_works_title",
                                      ).replace(
                                          ":structure",
                                          structureMeta.name,
                                      )}
                            </h2>
                            <span
                                className="rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold"
                                style={countBadgeStyle}
                            >
                                {worksOnRight.length.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {worksOnRight.length === 0 ? (
                    <div
                        className="px-6 py-12 text-center text-sm italic"
                        style={emptyStateStyle}
                    >
                        {structureMeta === null
                            ? t("writing.index.empty")
                            : t("writing.index.scoped_works_empty")}
                    </div>
                ) : (
                    <div
                        className="flex flex-col gap-2 p-3 sm:p-4 xl:min-h-0 xl:flex-1 xl:overscroll-contain xl:overflow-y-auto"
                        data-writing-works-scroll
                    >
                        {worksOnRight.map((work) => (
                            <WorkCard
                                key={work.id}
                                work={work}
                                projectSlug={project.slug}
                                t={t}
                                compact
                                onSettings={
                                    canManageWorks
                                        ? () => onSettings(work)
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                )}
            </section>
        </aside>
    );
}

function CreateWorkModal({
    projectSlug,
    types,
    onClose,
}: {
    projectSlug: string;
    types: string[];
    onClose: () => void;
}) {
    const t = useT();
    const form = useForm({
        title: "",
        type: types[0] ?? "novel",
        logline: "",
    });

    function submit() {
        // No onSuccess close — the server redirects straight into the
        // new workspace, so the modal unmounts with the page.
        form.post(worksBase(projectSlug));
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader
                title={t("writing.form.create_title")}
                onClose={onClose}
            />
            {/* noValidate: the server validates `required`; without it
                Chrome's native constraint bubble fires before submit and
                the error poppers never get a chance. */}
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <div className="flex flex-col gap-4 px-6 py-5">
                    {/* Validation errors surface as poppers anchored to
                        the field (error border stays on the control, the
                        inline message is suppressed); editing the field
                        clears its error, which dismisses the popper. */}
                    <Tooltip
                        content={form.errors.title}
                        open={!!form.errors.title}
                        tone="error"
                        placement="top-end"
                    >
                        <Input
                            label={t("writing.form.title")}
                            name="title"
                            value={form.data.title}
                            onChange={(e) => {
                                form.setData("title", e.target.value);

                                if (form.errors.title) {
                                    form.clearErrors("title");
                                }
                            }}
                            error={form.errors.title}
                            hideErrorText
                            autoFocus
                            required
                            size="md"
                        />
                    </Tooltip>
                    <Tooltip
                        content={form.errors.type}
                        open={!!form.errors.type}
                        tone="error"
                        placement="right"
                    >
                        <Select
                            label={t("writing.form.type")}
                            name="type"
                            value={form.data.type}
                            onChange={(e) => {
                                form.setData("type", e.target.value);

                                if (form.errors.type) {
                                    form.clearErrors("type");
                                }
                            }}
                            error={form.errors.type}
                            hideErrorText
                            options={types.map((type) => ({
                                value: type,
                                label: t(`writing.types.${type}`, type),
                            }))}
                            size="md"
                        />
                    </Tooltip>
                    <Textarea
                        label={t("writing.form.logline")}
                        name="logline"
                        value={form.data.logline}
                        onChange={(e) =>
                            form.setData("logline", e.target.value)
                        }
                        error={form.errors.logline}
                        hint={t("writing.form.logline_help")}
                        rows={2}
                        size="md"
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t("writing.form.cancel")}
                    </Button>
                    <Button type="submit" loading={form.processing}>
                        {t("writing.form.create")}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
