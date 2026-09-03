import { Link, usePage } from "@inertiajs/react";
import {
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react";

import useT from "@alexandria/hooks/useT";
import { resolveGate, type GateVerdict } from "@alexandria/ribbon/ribbonGates";
import {
    getRibbonTabs,
    subscribeRibbon,
} from "@alexandria/ribbon/ribbonRegistry";
import { normalizeQuickActions } from "@alexandria/ribbon/quickActions";
import type {
    RibbonControl,
    RibbonGates,
    RibbonTab,
} from "@alexandria/ribbon/types";
import Modal from "@alexandria/components/ui/Modal";
import CompactUserMenu from "@alexandria/components/navigation/CompactUserMenu";

import type { WorkspaceViewMode } from "../Flow/viewMode";
import type { PanelMode } from "../panelMode";
import type { WritingRibbonContext } from "../ribbon/writingRibbonContext";
import { getSidebarModes, subscribeSidebarModes } from "../sidebarModeRegistry";
import MobileEditingStrip from "./MobileEditingStrip";

type MobileSurface =
    | "desk"
    | "structure"
    | "view"
    | "companions"
    | "review"
    | "workspace-settings"
    | "project"
    | "actions"
    | "format"
    | "context";

interface MobileDestination {
    id: string;
    label: string;
    icon: string;
    href: string;
}

interface MobileWritingChromeProps {
    workTitle: string;
    sectionTitle: string | null;
    viewMode: WorkspaceViewMode;
    context: WritingRibbonContext;
    gates: RibbonGates;
    destinations: MobileDestination[];
    renderStructure: (close: () => void) => ReactNode;
    renderCompanions: (close: () => void) => ReactNode;
    onCompanionModeChange: (mode: PanelMode) => void;
    onAddComment: (anchor: { from: number; to: number; text: string }) => void;
    onMarkThread: (anchor: { from: number; to: number; text: string }) => void;
    onKeyboardVisibilityChange: (visible: boolean) => void;
}

interface AvailableControl {
    tab: RibbonTab<WritingRibbonContext>;
    group: RibbonTab<WritingRibbonContext>["groups"][number];
    control: RibbonControl<WritingRibbonContext>;
    verdict: GateVerdict;
    label: string;
}

function controlLabel(
    control: RibbonControl<WritingRibbonContext>,
    context: WritingRibbonContext,
    t: ReturnType<typeof useT>,
): string {
    return control.labelFn?.(context) ?? t(control.labelKey);
}

export default function MobileWritingChrome({
    workTitle,
    sectionTitle,
    viewMode,
    context,
    gates,
    destinations,
    renderStructure,
    renderCompanions,
    onCompanionModeChange,
    onAddComment,
    onMarkThread,
    onKeyboardVisibilityChange,
}: MobileWritingChromeProps) {
    const t = useT();
    const page = usePage();
    const tabs = useSyncExternalStore(
        subscribeRibbon,
        () => getRibbonTabs("writing") as RibbonTab<WritingRibbonContext>[],
    );
    const registeredModes = useSyncExternalStore(
        subscribeSidebarModes,
        getSidebarModes,
    );
    const [surfaceStack, setSurfaceStack] = useState<MobileSurface[]>([]);
    const [query, setQuery] = useState("");
    const [selectedControlId, setSelectedControlId] = useState<string | null>(
        null,
    );
    const [comboValue, setComboValue] = useState("");

    const availableControls = useMemo<AvailableControl[]>(() => {
        return tabs.flatMap((tab) =>
            tab.groups.flatMap((group) =>
                group.controls
                    .filter((control) => control.visible?.(context) ?? true)
                    .map((control) => ({
                        tab,
                        group,
                        control,
                        verdict: resolveGate(control.requires, gates),
                        label: controlLabel(control, context, t),
                    }))
                    .filter(({ verdict }) => verdict !== "hidden"),
            ),
        );
    }, [context, gates, t, tabs]);
    const quickActions = normalizeQuickActions(
        (
            page.props as {
                auth?: { preferences?: { ribbon_quick_actions?: unknown } };
            }
        ).auth?.preferences?.ribbon_quick_actions,
    ).filter(
        (action) => action.type === "bookmark" || action.setKey === "writing",
    );

    const surface = surfaceStack.at(-1) ?? null;
    const selectedControl =
        availableControls.find(
            ({ control }) => control.id === selectedControlId,
        ) ?? null;

    useEffect(() => {
        if (selectedControl?.control.type !== "combo") {
            setComboValue("");
            return;
        }

        setComboValue(selectedControl.control.value?.(context) ?? "");
    }, [context, selectedControl]);

    function closeSurface(): void {
        setSurfaceStack([]);
        setSelectedControlId(null);
        setQuery("");
    }

    function openSurface(next: MobileSurface, nested = false): void {
        setSurfaceStack((current) => (nested ? [...current, next] : [next]));
        setSelectedControlId(null);
        setQuery("");
    }

    function goBack(): void {
        if (selectedControlId !== null) {
            setSelectedControlId(null);
            return;
        }

        setSurfaceStack((current) => current.slice(0, -1));
        setQuery("");
    }

    function openCompanions(mode?: "linked" | "comments"): void {
        if (mode !== undefined) {
            onCompanionModeChange(mode);
        }
        openSurface("companions", surface === "desk" || surface === "review");
    }

    function openCompanionMode(mode: PanelMode): void {
        onCompanionModeChange(mode);
        openSurface("companions", true);
    }

    function runControl(
        item: AvailableControl,
        value?: string,
        closeAfter = true,
    ): void {
        if (item.verdict !== "visible" || item.control.disabled?.(context)) {
            return;
        }

        if (item.control.id === "panel") {
            openCompanions();
            return;
        }

        if (
            item.control.id === "scene-links-panel" ||
            item.control.id === "scene-links-panel-edit"
        ) {
            openCompanions("linked");
            return;
        }

        item.control.onAction(context, value);
        if (closeAfter) {
            closeSurface();
        }
    }

    function activateControl(item: AvailableControl): void {
        const hasOptions = (item.control.options?.(context).length ?? 0) > 0;

        if (
            hasOptions &&
            (item.control.type === "select" ||
                item.control.type === "menu" ||
                item.control.type === "combo")
        ) {
            setSelectedControlId(item.control.id);
            return;
        }

        const keepViewOpen =
            surface === "view" &&
            (item.control.id === "print-layout" ||
                item.control.id === "show-plan");
        runControl(item, undefined, !keepViewOpen);
    }

    const viewControls = availableControls.filter(
        ({ tab }) => tab.id === "view",
    );
    const actionControls = availableControls.filter(
        ({ tab }) => tab.id !== "view",
    );
    const settingsControls = availableControls.filter(({ control }) =>
        ["work-settings", "section-settings", "font-size"].includes(control.id),
    );
    const formatControls = availableControls.filter(({ control }) =>
        [
            "block-style",
            "bold",
            "italic",
            "underline",
            "bullet-list",
            "ordered-list",
            "heading2",
            "heading3",
        ].includes(control.id),
    );
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const searchedControls = availableControls.filter((item) => {
        if (normalizedQuery === "") {
            return item.tab.id !== "view";
        }

        const searchText = [
            item.label,
            t(item.tab.labelKey),
            t(item.group.labelKey),
            item.control.id,
        ]
            .join(" ")
            .toLocaleLowerCase();

        return searchText.includes(normalizedQuery);
    });
    const reportDestination =
        destinations.find((destination) => destination.id === "reports") ??
        null;
    const projectDestinations = destinations.filter(
        (destination) => destination.id !== "reports",
    );
    const selectionSnapshot = context.editor?.getSelectionSnapshot?.() ?? null;
    const entryLinkControl =
        availableControls.find(({ control }) => control.id === "entry-link") ??
        null;

    const modalTitle =
        surface === "desk"
            ? t("writing.mobile.writing_desk")
            : surface === "structure"
              ? t("writing.mobile.structure")
              : surface === "view"
                ? t("writing.mobile.view")
                : surface === "companions"
                  ? t("writing.mobile.companions")
                  : surface === "review"
                    ? t("writing.mobile.review_insights")
                    : surface === "workspace-settings"
                      ? t("writing.mobile.workspace_settings")
                      : surface === "project"
                        ? t("writing.mobile.project")
                        : surface === "format"
                          ? t("writing.mobile.format")
                          : surface === "context"
                            ? t("writing.mobile.selection_actions")
                            : t("writing.mobile.actions");

    return (
        <>
            <header
                className="safe-top flex min-h-12 items-center gap-1 px-1.5 lg:hidden"
                data-mobile-writing-bar
                style={{
                    paddingLeft:
                        "max(0.375rem, var(--safe-left, env(safe-area-inset-left, 0px)))",
                    paddingRight:
                        "max(0.375rem, var(--safe-right, env(safe-area-inset-right, 0px)))",
                    background:
                        "color-mix(in srgb, var(--theme-base-content) 4%, var(--theme-base-page))",
                    borderBottom:
                        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                }}
            >
                <MobileBarButton
                    icon="fa-solid fa-layer-group"
                    label={t("writing.mobile.open_writing_desk")}
                    onClick={() => openSurface("desk")}
                />
                <button
                    type="button"
                    className="min-h-11 min-w-0 flex-1 px-2 py-1 text-left"
                    onClick={() => openSurface("structure")}
                    aria-haspopup="dialog"
                    aria-label={t(
                        "writing.mobile.open_structure_for_section",
                    ).replace(":section", sectionTitle ?? workTitle)}
                >
                    <span className="block truncate text-sm font-semibold">
                        {sectionTitle ?? workTitle}
                    </span>
                    {sectionTitle !== null && (
                        <span
                            className="block truncate text-[11px]"
                            style={{
                                color: "color-mix(in srgb, var(--theme-base-content) 52%, transparent)",
                            }}
                        >
                            {workTitle}
                        </span>
                    )}
                </button>
                <MobileBarButton
                    icon="fa-solid fa-magnifying-glass"
                    label={t("ribbon.search")}
                    opensDialog={false}
                    onClick={() =>
                        window.dispatchEvent(
                            new CustomEvent(
                                "alexandria-core:command-palette-toggle",
                            ),
                        )
                    }
                />
                <MobileBarButton
                    icon="fa-solid fa-ellipsis"
                    label={t("writing.mobile.actions")}
                    onClick={() => openSurface("actions")}
                />
                <div className="flex h-11 w-11 shrink-0 items-center justify-center [&>div>button]:h-11 [&>div>button]:w-11">
                    <CompactUserMenu
                        ariaLabel={t("ribbon.account")}
                        size={32}
                    />
                </div>
            </header>

            <MobileEditingStrip
                context={context}
                onOpenStyle={() => {
                    const styleControl = availableControls.find(
                        ({ control }) => control.id === "block-style",
                    );

                    openSurface("format");
                    if (styleControl !== undefined) {
                        setSelectedControlId(styleControl.control.id);
                    }
                }}
                onOpenFormat={() => openSurface("format")}
                onOpenContext={() => openSurface("context")}
                onVisibilityChange={onKeyboardVisibilityChange}
            />

            <Modal
                open={surface !== null}
                onClose={closeSurface}
                maxWidth="max-w-xl"
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mobile-writing-surface-title"
                    className="flex min-h-0 flex-col"
                    style={{ height: "calc(100svh - 2rem)" }}
                    data-mobile-writing-surface={surface ?? undefined}
                >
                    <MobileSurfaceHeader
                        title={selectedControl?.label ?? modalTitle}
                        onBack={
                            selectedControl !== null || surfaceStack.length > 1
                                ? goBack
                                : undefined
                        }
                        actions={
                            surface === "structure" &&
                            selectedControl === null ? (
                                <>
                                    {context.canUpdate && (
                                        <button
                                            type="button"
                                            className="alex-toolbar-btn inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                                            aria-label={t(
                                                "writing.workspace.add_section",
                                            )}
                                            onClick={() => {
                                                closeSurface();
                                                context.actions.addSection();
                                            }}
                                        >
                                            <i
                                                className="fa-solid fa-plus"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="alex-toolbar-btn inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                                        aria-label={t(
                                            "writing.workspace.section_settings",
                                        )}
                                        onClick={() => {
                                            closeSurface();
                                            context.actions.openSectionSettings();
                                        }}
                                    >
                                        <i
                                            className="fa-solid fa-ellipsis-vertical"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </>
                            ) : undefined
                        }
                        onClose={closeSurface}
                    />
                    <div className="min-h-0 flex-1 overflow-hidden">
                        {selectedControl !== null ? (
                            <ControlOptions
                                item={selectedControl}
                                context={context}
                                comboValue={comboValue}
                                onComboValueChange={setComboValue}
                                onSelect={(value) => {
                                    runControl(selectedControl, value, false);
                                    if (surface === "format") {
                                        closeSurface();
                                    } else {
                                        setSelectedControlId(null);
                                    }
                                }}
                                onApplyCombo={() => {
                                    runControl(
                                        selectedControl,
                                        comboValue,
                                        false,
                                    );
                                    if (surface === "format") {
                                        closeSurface();
                                    } else {
                                        setSelectedControlId(null);
                                    }
                                }}
                            />
                        ) : surface === "desk" ? (
                            <div className="writing-workspace-scroll h-full overflow-y-auto p-3">
                                <div className="grid gap-1">
                                    <MobileActionRow
                                        icon="fa-solid fa-list-ul"
                                        label={t("writing.mobile.structure")}
                                        description={t(
                                            "writing.mobile.structure_description",
                                        )}
                                        onClick={() =>
                                            openSurface("structure", true)
                                        }
                                    />
                                    <MobileActionRow
                                        icon="fa-solid fa-eye"
                                        label={t("writing.mobile.view")}
                                        description={t(
                                            "writing.mobile.view_description",
                                        ).replace(
                                            ":view",
                                            t(`writing.flow.${viewMode}`),
                                        )}
                                        onClick={() =>
                                            openSurface("view", true)
                                        }
                                    />
                                    <MobileActionRow
                                        icon="fa-solid fa-table-columns"
                                        label={t("writing.mobile.companions")}
                                        description={t(
                                            "writing.mobile.companions_description",
                                        )}
                                        onClick={() =>
                                            openSurface("companions", true)
                                        }
                                    />
                                    {registeredModes.length > 0 && (
                                        <MobileActionRow
                                            icon="fa-solid fa-puzzle-piece"
                                            label={t(
                                                "writing.mobile.installed_modules",
                                            )}
                                            description={t(
                                                "writing.mobile.installed_modules_description",
                                            ).replace(
                                                ":count",
                                                registeredModes.length.toLocaleString(),
                                            )}
                                            onClick={() =>
                                                openSurface("companions", true)
                                            }
                                        />
                                    )}
                                    <MobileActionRow
                                        icon="fa-solid fa-chart-line"
                                        label={t(
                                            "writing.mobile.review_insights",
                                        )}
                                        description={t(
                                            "writing.mobile.review_insights_description",
                                        )}
                                        onClick={() =>
                                            openSurface("review", true)
                                        }
                                    />
                                    <MobileActionRow
                                        icon="fa-solid fa-sliders"
                                        label={t(
                                            "writing.mobile.workspace_settings",
                                        )}
                                        description={t(
                                            "writing.mobile.workspace_settings_description",
                                        )}
                                        onClick={() =>
                                            openSurface(
                                                "workspace-settings",
                                                true,
                                            )
                                        }
                                    />
                                    <MobileActionRow
                                        icon="fa-solid fa-globe"
                                        label={t("writing.mobile.project")}
                                        description={t(
                                            "writing.mobile.project_description",
                                        )}
                                        onClick={() =>
                                            openSurface("project", true)
                                        }
                                    />
                                </div>
                            </div>
                        ) : surface === "structure" ? (
                            renderStructure(closeSurface)
                        ) : surface === "companions" ? (
                            renderCompanions(closeSurface)
                        ) : surface === "view" ? (
                            <ControlGroups
                                controls={viewControls}
                                context={context}
                                onActivate={activateControl}
                            />
                        ) : surface === "review" ? (
                            <div className="writing-workspace-scroll h-full overflow-y-auto p-3">
                                <div className="grid gap-1">
                                    {reportDestination !== null && (
                                        <MobileDestinationRow
                                            destination={reportDestination}
                                            onClick={closeSurface}
                                        />
                                    )}
                                    <MobileActionRow
                                        icon="fa-solid fa-clock-rotate-left"
                                        label={t("writing.panel.mode_history")}
                                        description={t(
                                            "writing.mobile.history_description",
                                        )}
                                        onClick={() =>
                                            openCompanionMode("history")
                                        }
                                    />
                                    <MobileActionRow
                                        icon="fa-solid fa-wand-magic-sparkles"
                                        label={t(
                                            "writing.threads.sidebar_label",
                                        )}
                                        description={t(
                                            "writing.mobile.devices_tropes_description",
                                        )}
                                        onClick={() =>
                                            openCompanionMode("threads")
                                        }
                                    />
                                </div>
                            </div>
                        ) : surface === "workspace-settings" ? (
                            <ControlGroups
                                controls={settingsControls}
                                context={context}
                                onActivate={activateControl}
                                emptyLabel={t(
                                    "writing.mobile.no_settings_available",
                                )}
                            />
                        ) : surface === "project" ? (
                            <div className="writing-workspace-scroll h-full overflow-y-auto p-3">
                                <div className="grid gap-1">
                                    {projectDestinations.map((destination) => (
                                        <MobileDestinationRow
                                            key={destination.id}
                                            destination={destination}
                                            onClick={closeSurface}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : surface === "format" ? (
                            <ControlGroups
                                controls={formatControls}
                                context={context}
                                onActivate={activateControl}
                                emptyLabel={t(
                                    "writing.mobile.no_formatting_available",
                                )}
                            />
                        ) : surface === "context" ? (
                            <div className="writing-workspace-scroll h-full overflow-y-auto p-3">
                                {selectionSnapshot === null && (
                                    <p
                                        className="px-3 pb-3 text-sm leading-relaxed"
                                        style={{
                                            color: "color-mix(in srgb, var(--theme-base-content) 58%, transparent)",
                                        }}
                                    >
                                        {t(
                                            "writing.mobile.select_text_for_context",
                                        )}
                                    </p>
                                )}
                                <div className="grid gap-1">
                                    <MobileActionRow
                                        icon="fa-solid fa-comment-dots"
                                        label={t(
                                            "writing.comments.add_comment",
                                        )}
                                        description={t(
                                            "writing.mobile.comment_selection_description",
                                        )}
                                        disabled={selectionSnapshot === null}
                                        onClick={() => {
                                            if (selectionSnapshot === null)
                                                return;
                                            onAddComment(selectionSnapshot);
                                            openCompanions("comments");
                                        }}
                                    />
                                    <MobileActionRow
                                        icon="fa-solid fa-wand-magic-sparkles"
                                        label={t("writing.threads.mark_action")}
                                        description={t(
                                            "writing.mobile.mark_selection_description",
                                        )}
                                        disabled={selectionSnapshot === null}
                                        onClick={() => {
                                            if (selectionSnapshot === null)
                                                return;
                                            closeSurface();
                                            onMarkThread(selectionSnapshot);
                                        }}
                                    />
                                    {entryLinkControl !== null && (
                                        <MobileControlRow
                                            item={entryLinkControl}
                                            context={context}
                                            onClick={() =>
                                                activateControl(
                                                    entryLinkControl,
                                                )
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        ) : surface === "actions" ? (
                            <div className="writing-workspace-scroll flex h-full min-h-0 flex-col overflow-y-auto p-3">
                                <label className="relative block shrink-0">
                                    <span className="sr-only">
                                        {t("writing.mobile.search_actions")}
                                    </span>
                                    <i
                                        className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                                        aria-hidden="true"
                                        style={{
                                            color: "color-mix(in srgb, var(--theme-base-content) 48%, transparent)",
                                        }}
                                    />
                                    <input
                                        type="search"
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                        placeholder={t(
                                            "writing.mobile.search_actions",
                                        )}
                                        className="min-h-11 w-full rounded-lg border py-2 pl-9 pr-3 text-base"
                                        style={{
                                            background:
                                                "var(--theme-base-page)",
                                            borderColor:
                                                "var(--theme-base-400)",
                                            color: "var(--theme-base-content)",
                                        }}
                                    />
                                </label>

                                {normalizedQuery === "" &&
                                    quickActions.length > 0 && (
                                        <section className="mt-3 grid gap-1">
                                            <MobileSectionHeading>
                                                {t("writing.mobile.pinned")}
                                            </MobileSectionHeading>
                                            {quickActions.map((action) => {
                                                if (
                                                    action.type === "bookmark"
                                                ) {
                                                    return (
                                                        <Link
                                                            key={action.id}
                                                            href={action.url}
                                                            className="mobile-writing-action-row flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 no-underline"
                                                            onClick={
                                                                closeSurface
                                                            }
                                                        >
                                                            <i
                                                                className={`${action.icon} w-5 shrink-0 text-center text-sm`}
                                                                aria-hidden="true"
                                                            />
                                                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                                                {action.label}
                                                            </span>
                                                        </Link>
                                                    );
                                                }

                                                const item =
                                                    availableControls.find(
                                                        ({ control }) =>
                                                            control.id ===
                                                            action.controlId,
                                                    );

                                                return item !== undefined ? (
                                                    <MobileControlRow
                                                        key={action.id}
                                                        item={item}
                                                        context={context}
                                                        onClick={() =>
                                                            activateControl(
                                                                item,
                                                            )
                                                        }
                                                    />
                                                ) : null;
                                            })}
                                        </section>
                                    )}

                                <ControlGroups
                                    controls={
                                        normalizedQuery === ""
                                            ? actionControls
                                            : searchedControls
                                    }
                                    context={context}
                                    onActivate={activateControl}
                                    embedded
                                    emptyLabel={
                                        normalizedQuery !== ""
                                            ? t(
                                                  "writing.mobile.no_actions_found",
                                              )
                                            : undefined
                                    }
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </Modal>
        </>
    );
}

function MobileBarButton({
    icon,
    label,
    active = false,
    opensDialog = true,
    onClick,
}: {
    icon: string;
    label: string;
    active?: boolean;
    opensDialog?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-haspopup={opensDialog ? "dialog" : undefined}
            className={`alex-toolbar-btn inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm ${active ? "alex-toolbar-btn--active" : ""}`}
        >
            <i className={icon} aria-hidden="true" />
        </button>
    );
}

function MobileSurfaceHeader({
    title,
    onBack,
    actions,
    onClose,
}: {
    title: string;
    onBack?: () => void;
    actions?: ReactNode;
    onClose: () => void;
}) {
    const t = useT();

    return (
        <div
            className="flex shrink-0 items-center gap-2 px-2 py-2"
            style={{ borderBottom: "1px solid var(--theme-base-400)" }}
        >
            {onBack !== undefined && (
                <button
                    type="button"
                    onClick={onBack}
                    aria-label={t("writing.mobile.back")}
                    className="alex-modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                >
                    <i
                        className="fa-solid fa-chevron-left"
                        aria-hidden="true"
                    />
                </button>
            )}
            <h2
                id="mobile-writing-surface-title"
                className="min-w-0 flex-1 truncate px-2 text-base font-semibold"
            >
                {title}
            </h2>
            {actions}
            <button
                type="button"
                onClick={onClose}
                aria-label={t("writing.mobile.close")}
                className="alex-modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
        </div>
    );
}

function ControlGroups({
    controls,
    context,
    onActivate,
    emptyLabel,
    embedded = false,
}: {
    controls: AvailableControl[];
    context: WritingRibbonContext;
    onActivate: (item: AvailableControl) => void;
    emptyLabel?: string;
    embedded?: boolean;
}) {
    const t = useT();
    const groups = controls.reduce<Map<string, AvailableControl[]>>(
        (result, item) => {
            const key = `${item.tab.id}:${item.group.id}`;
            result.set(key, [...(result.get(key) ?? []), item]);
            return result;
        },
        new Map(),
    );

    if (groups.size === 0 && emptyLabel !== undefined) {
        return (
            <p
                className="px-3 py-8 text-center text-sm"
                style={{
                    color: "color-mix(in srgb, var(--theme-base-content) 55%, transparent)",
                }}
            >
                {emptyLabel}
            </p>
        );
    }

    return (
        <div
            className={
                embedded
                    ? "mt-3"
                    : "writing-workspace-scroll h-full overflow-y-auto p-3"
            }
        >
            {[...groups.entries()].map(([key, items]) => (
                <section key={key} className="mb-3 grid gap-1 last:mb-0">
                    <MobileSectionHeading>
                        {t(items[0].group.labelKey)}
                    </MobileSectionHeading>
                    {items.map((item) => (
                        <MobileControlRow
                            key={item.control.id}
                            item={item}
                            context={context}
                            onClick={() => onActivate(item)}
                        />
                    ))}
                </section>
            ))}
        </div>
    );
}

function MobileSectionHeading({ children }: { children: ReactNode }) {
    return (
        <h3
            className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.04em]"
            style={{
                color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
            }}
        >
            {children}
        </h3>
    );
}

function MobileActionRow({
    icon,
    label,
    description,
    disabled = false,
    onClick,
}: {
    icon: string;
    label: string;
    description?: string;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="mobile-writing-action-row flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left disabled:cursor-default disabled:opacity-40"
        >
            <i
                className={`${icon} w-5 shrink-0 text-center text-sm`}
                aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                {description !== undefined && (
                    <span
                        className="mt-0.5 block text-xs"
                        style={{
                            color: "color-mix(in srgb, var(--theme-base-content) 52%, transparent)",
                        }}
                    >
                        {description}
                    </span>
                )}
            </span>
            <i
                className="fa-solid fa-chevron-right shrink-0 text-[10px]"
                aria-hidden="true"
                style={{
                    color: "color-mix(in srgb, var(--theme-base-content) 42%, transparent)",
                }}
            />
        </button>
    );
}

function MobileDestinationRow({
    destination,
    onClick,
}: {
    destination: MobileDestination;
    onClick: () => void;
}) {
    return (
        <Link
            href={destination.href}
            className="mobile-writing-action-row flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 no-underline"
            onClick={onClick}
        >
            <i
                className={`${destination.icon} w-5 shrink-0 text-center text-sm`}
                aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {destination.label}
            </span>
            <i
                className="fa-solid fa-chevron-right shrink-0 text-[10px]"
                aria-hidden="true"
                style={{
                    color: "color-mix(in srgb, var(--theme-base-content) 42%, transparent)",
                }}
            />
        </Link>
    );
}

function MobileControlRow({
    item,
    context,
    onClick,
}: {
    item: AvailableControl;
    context: WritingRibbonContext;
    onClick: () => void;
}) {
    const t = useT();
    const disabled =
        item.verdict !== "visible" ||
        (item.control.disabled?.(context) ?? false);
    const active = item.control.active?.(context) ?? false;
    const hasOptions = (item.control.options?.(context).length ?? 0) > 0;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={item.control.type === "toggle" ? active : undefined}
            className="mobile-writing-action-row flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left disabled:cursor-default disabled:opacity-45"
            style={{
                background: active
                    ? "var(--theme-brand-primary-highlight-bg)"
                    : "transparent",
                color: active
                    ? "var(--theme-brand-primary-highlight-fg)"
                    : "var(--theme-base-content)",
            }}
        >
            <i
                className={`${item.control.icon} w-5 shrink-0 text-center text-sm`}
                aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                    {item.label}
                </span>
                {disabled && (
                    <span className="block truncate text-xs">
                        {item.verdict === "locked"
                            ? t("writing.ribbon.locked_hint")
                            : t("writing.mobile.unavailable")}
                    </span>
                )}
            </span>
            {item.verdict === "locked" ? (
                <i
                    className="fa-solid fa-lock shrink-0 text-xs"
                    aria-hidden="true"
                />
            ) : hasOptions ? (
                <i
                    className="fa-solid fa-chevron-right shrink-0 text-[10px]"
                    aria-hidden="true"
                />
            ) : active ? (
                <i
                    className="fa-solid fa-check shrink-0 text-xs"
                    aria-hidden="true"
                />
            ) : null}
        </button>
    );
}

function ControlOptions({
    item,
    context,
    comboValue,
    onComboValueChange,
    onSelect,
    onApplyCombo,
}: {
    item: AvailableControl;
    context: WritingRibbonContext;
    comboValue: string;
    onComboValueChange: (value: string) => void;
    onSelect: (value: string) => void;
    onApplyCombo: () => void;
}) {
    const t = useT();
    const options = item.control.options?.(context) ?? [];
    const current = item.control.value?.(context);

    return (
        <div className="writing-workspace-scroll h-full overflow-y-auto p-3">
            {item.control.type === "combo" && (
                <div
                    className="mb-3 flex items-end gap-2 rounded-lg border p-3"
                    style={{ borderColor: "var(--theme-base-400)" }}
                >
                    <label className="min-w-0 flex-1">
                        <span className="mb-1 block text-xs font-semibold">
                            {item.label}
                        </span>
                        <input
                            type="text"
                            value={comboValue}
                            onChange={(event) =>
                                onComboValueChange(event.target.value)
                            }
                            className="min-h-11 w-full rounded-lg border px-3 py-2 text-base"
                            style={{
                                background: "var(--theme-base-page)",
                                borderColor: "var(--theme-base-400)",
                                color: "var(--theme-base-content)",
                            }}
                        />
                    </label>
                    <button
                        type="button"
                        onClick={onApplyCombo}
                        className="min-h-11 rounded-lg px-4 text-sm font-semibold"
                        style={{
                            background: "var(--theme-brand-primary-500)",
                            color: "var(--theme-brand-primary-content)",
                        }}
                    >
                        {t("writing.mobile.apply")}
                    </button>
                </div>
            )}
            <div className="grid gap-1">
                {options.map((option) => {
                    const selected = option.value === current;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onSelect(option.value)}
                            aria-pressed={selected}
                            className="mobile-writing-action-row flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm"
                            style={{
                                background: selected
                                    ? "var(--theme-brand-primary-highlight-bg)"
                                    : "transparent",
                                color: selected
                                    ? "var(--theme-brand-primary-highlight-fg)"
                                    : "var(--theme-base-content)",
                            }}
                        >
                            <span className="min-w-0 flex-1 truncate">
                                {t(option.labelKey)}
                            </span>
                            {selected && (
                                <i
                                    className="fa-solid fa-check text-xs"
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
