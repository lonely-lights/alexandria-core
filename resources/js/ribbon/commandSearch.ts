import { resolveGate } from "./ribbonGates";
import type { RibbonControl, RibbonGates, RibbonTab } from "./types";

type Translate = (key: string) => string;

export interface RibbonSearchResult {
    id: string;
    tabId: string;
    groupId: string;
    controlId: string;
    label: string;
    path: string;
    icon: string;
    shortcut?: string;
    optionValue?: string;
    currentValue?: string;
    active: boolean;
    disabled: boolean;
    disabledReason?: string;
    needsValue: boolean;
    keywords: string;
}

function normalize(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLocaleLowerCase()
        .trim();
}

function takesValue<Ctx>(control: RibbonControl<Ctx>): boolean {
    return (
        control.type === "select" ||
        control.type === "combo" ||
        control.type === "menu"
    );
}

/** A shared discovery model for desktop, mobile, and future command surfaces. */
export function buildRibbonSearchIndex<Ctx>(
    tabs: RibbonTab<Ctx>[],
    context: Ctx,
    t: Translate,
    gates?: RibbonGates,
): RibbonSearchResult[] {
    return tabs.flatMap((tab) =>
        tab.groups.flatMap((group) =>
            group.controls.flatMap((control) => {
                const verdict = resolveGate(control.requires, gates);
                if (
                    verdict === "hidden" ||
                    control.visible?.(context) === false
                )
                    return [];

                const label = control.labelFn?.(context) ?? t(control.labelKey);
                const path = `${t(tab.labelKey)} › ${t(group.labelKey)}`;
                const disabled =
                    verdict === "locked" ||
                    (control.disabled?.(context) ?? false);
                const reasonKey =
                    verdict === "locked"
                        ? "writing.ribbon.locked_hint"
                        : control.disabledReasonKey;
                const result: RibbonSearchResult = {
                    id: `${tab.id}/${group.id}/${control.id}`,
                    tabId: tab.id,
                    groupId: group.id,
                    controlId: control.id,
                    label,
                    path,
                    icon: control.icon,
                    shortcut: control.shortcut ?? control.menuShortcut,
                    currentValue: control.value?.(context),
                    active: control.active?.(context) ?? false,
                    disabled,
                    disabledReason:
                        disabled && reasonKey ? t(reasonKey) : undefined,
                    needsValue: takesValue(control),
                    keywords: normalize(
                        [
                            label,
                            path,
                            ...(control.searchKeywordKeys ?? []).map(t),
                        ].join(" "),
                    ),
                };

                if (!takesValue(control)) return [result];

                return [
                    result,
                    ...(control.options?.(context) ?? []).map((option) => {
                        const optionLabel = t(option.labelKey);
                        return {
                            ...result,
                            id: `${result.id}/${encodeURIComponent(option.value)}`,
                            label: optionLabel,
                            path: `${path} › ${label}`,
                            optionValue: option.value,
                            active: result.currentValue === option.value,
                            needsValue: false,
                            keywords: `${result.keywords} ${normalize(optionLabel)}`,
                        };
                    }),
                ];
            }),
        ),
    );
}

/** Empty search shows command families; typing can reveal individual options. */
export function searchRibbonCommands(
    index: RibbonSearchResult[],
    query: string,
): RibbonSearchResult[] {
    const normalized = normalize(query);
    if (!normalized)
        return index.filter((item) => item.optionValue === undefined);

    const words = normalized.split(/\s+/);
    return index
        .filter((item) => words.every((word) => item.keywords.includes(word)))
        .map((item, order) => {
            const label = normalize(item.label);
            const rank =
                label === normalized ? 0 : label.startsWith(normalized) ? 1 : 2;
            return { item, order, rank };
        })
        .sort((a, b) => a.rank - b.rank || a.order - b.order)
        .map(({ item }) => item);
}

/** Recheck live permissions/state: search results may outlive their context. */
export function executeRibbonSearchResult<Ctx>(
    result: RibbonSearchResult,
    tabs: RibbonTab<Ctx>[],
    context: Ctx,
    gates?: RibbonGates,
): "executed" | "choose-value" | "unavailable" {
    const control = tabs
        .find((tab) => tab.id === result.tabId)
        ?.groups.find((group) => group.id === result.groupId)
        ?.controls.find((item) => item.id === result.controlId);

    if (
        !control ||
        resolveGate(control.requires, gates) !== "visible" ||
        control.visible?.(context) === false ||
        control.disabled?.(context)
    )
        return "unavailable";

    if (takesValue(control)) {
        if (result.optionValue === undefined) return "choose-value";
        if (
            !control
                .options?.(context)
                .some((option) => option.value === result.optionValue)
        )
            return "unavailable";
    }

    control.onAction(context, result.optionValue);
    return "executed";
}
