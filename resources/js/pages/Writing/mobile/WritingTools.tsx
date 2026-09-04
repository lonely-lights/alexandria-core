import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import useT from "@alexandria/hooks/useT";
import {
    buildRibbonSearchIndex,
    executeRibbonSearchResult,
    searchRibbonCommands,
} from "@alexandria/ribbon/commandSearch";
import type { RibbonSearchResult } from "@alexandria/ribbon/commandSearch";
import {
    getRibbonTabs,
    subscribeRibbon,
} from "@alexandria/ribbon/ribbonRegistry";
import type { RibbonGates, RibbonTab } from "@alexandria/ribbon/types";
import type { WritingRibbonContext } from "../ribbon/writingRibbonContext";
import WritingToolDialog from "./WritingToolDialog";

export interface WritingDestination {
    id: string;
    label: string;
    icon: string;
    disabled?: boolean;
    category?: "companions" | "workspace";
    onSelect: () => void;
}

export default function WritingTools({
    context,
    gates,
    destinations,
    initialPage = "",
    onClose,
}: {
    context: WritingRibbonContext;
    gates: RibbonGates;
    destinations: WritingDestination[];
    initialPage?: string;
    onClose: () => void;
}) {
    const t = useT();
    const tabs = useSyncExternalStore(subscribeRibbon, () =>
        getRibbonTabs("writing"),
    ) as RibbonTab<WritingRibbonContext>[];
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (window.matchMedia("(min-width: 1024px)").matches) {
            inputRef.current?.focus();
        }
    }, []);
    const [page, setPage] = useState(initialPage);
    const [choice, setChoice] = useState<RibbonSearchResult | null>(null);
    const index = buildRibbonSearchIndex(tabs, context, t, gates);
    const results = choice
        ? index.filter(
              (item) =>
                  item.controlId === choice.controlId &&
                  item.tabId === choice.tabId &&
                  item.groupId === choice.groupId &&
                  item.optionValue !== undefined,
          )
        : searchRibbonCommands(index, query).filter(
              (item) => query || item.tabId === page,
          );
    const matches = destinations.filter((item) =>
        query
            ? item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
            : (item.category ? `@${item.category}` : "") === page,
    );
    const title =
        choice?.label ??
        (page.startsWith("@")
            ? t(`writing.tools.${page.slice(1)}`)
            : t(
                  tabs.find((tab) => tab.id === page)?.labelKey ??
                      "writing.tools.desk",
              ));
    function run(item: RibbonSearchResult) {
        if (item.needsValue) {
            setChoice(item);
            setQuery("");

            return;
        }

        // Close before commands open another modal; selection stays in the editor model.
        flushSync(onClose);
        executeRibbonSearchResult(item, tabs, context, gates);
    }

    return (
        <WritingToolDialog title={title} onClose={onClose}>
            <div className="shrink-0 px-3 py-2">
                <label className="sr-only" htmlFor="writing-command-search">
                    {t("writing.tools.search")}
                </label>
                <input
                    id="writing-command-search"
                    ref={inputRef}
                    type="search"
                    value={query}
                    placeholder={t("writing.tools.search")}
                    className="writing-tool-search"
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setChoice(null);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && query) {
                            const item = results.find(
                                (result) => !result.disabled,
                            );

                            if (item) {
                                event.preventDefault();
                                run(item);
                            }
                        }

                        if (event.key === "ArrowDown") {
                            event.preventDefault();
                            document
                                .querySelector<HTMLButtonElement>(
                                    ".writing-tool-dialog [data-writing-command]:not(:disabled)",
                                )
                                ?.focus();
                        }
                    }}
                />
            </div>
            <div className="min-h-0 overflow-y-auto px-2 pb-3">
                {(page || choice) && !query && (
                    <button
                        type="button"
                        className="writing-tool-row"
                        onClick={() => {
                            if (choice) {
                                setChoice(null);
                            } else {
                                setPage("");
                            }
                        }}
                    >
                        <i
                            className="fa-solid fa-arrow-left"
                            aria-hidden="true"
                        />
                        {t("writing.tools.back")}
                    </button>
                )}
                {!choice && (!page || page.startsWith("@") || query) && (
                    <>
                        {matches.map((item) => (
                            <button
                                type="button"
                                key={item.id}
                                disabled={item.disabled}
                                className="writing-tool-row"
                                data-writing-destination={item.id}
                                onClick={() => {
                                    flushSync(onClose);
                                    item.onSelect();
                                }}
                            >
                                <i className={item.icon} aria-hidden="true" />
                                <span className="flex-1 text-left">
                                    {item.label}
                                </span>
                                <i
                                    className="fa-solid fa-chevron-right text-xs"
                                    aria-hidden="true"
                                />
                            </button>
                        ))}
                        {!query &&
                            !page &&
                            ["companions", "workspace"]
                                .filter((category) =>
                                    destinations.some(
                                        (item) => item.category === category,
                                    ),
                                )
                                .map((category) => (
                                    <button
                                        type="button"
                                        key={category}
                                        className="writing-tool-row"
                                        onClick={() => setPage(`@${category}`)}
                                    >
                                        <i
                                            className={`fa-solid ${category === "companions" ? "fa-layer-group" : "fa-gear"}`}
                                            aria-hidden="true"
                                        />
                                        <span className="flex-1 text-left">
                                            {t(`writing.tools.${category}`)}
                                        </span>
                                        <i
                                            className="fa-solid fa-chevron-right text-xs"
                                            aria-hidden="true"
                                        />
                                    </button>
                                ))}
                        {!query &&
                            !page &&
                            tabs
                                .filter((tab) =>
                                    index.some((item) => item.tabId === tab.id),
                                )
                                .map((tab) => (
                                    <button
                                        type="button"
                                        className="writing-tool-row"
                                        key={tab.id}
                                        onClick={() => setPage(tab.id)}
                                    >
                                        <i
                                            className="fa-solid fa-sliders"
                                            aria-hidden="true"
                                        />
                                        <span className="flex-1 text-left">
                                            {t(tab.labelKey)}
                                        </span>
                                        <i
                                            className="fa-solid fa-chevron-right text-xs"
                                            aria-hidden="true"
                                        />
                                    </button>
                                ))}
                    </>
                )}
                {results.map((item, i) => (
                    <div key={item.id}>
                        {!query &&
                            !choice &&
                            results[i - 1]?.groupId !== item.groupId && (
                                <h3 className="px-3 pb-1 pt-4 text-xs font-semibold opacity-70">
                                    {t(
                                        tabs
                                            .find(
                                                (tab) => tab.id === item.tabId,
                                            )
                                            ?.groups.find(
                                                (group) =>
                                                    group.id === item.groupId,
                                            )?.labelKey ?? "",
                                    )}
                                </h3>
                            )}
                        <button
                            type="button"
                            className="writing-tool-row"
                            disabled={item.disabled}
                            title={item.disabledReason}
                            data-writing-command={item.controlId}
                            aria-pressed={item.active}
                            onClick={() => run(item)}
                        >
                            <i className={item.icon} aria-hidden="true" />
                            <span className="min-w-0 flex-1 text-left">
                                <span>{item.label}</span>
                                {query && (
                                    <small className="block text-xs opacity-60">
                                        {item.path}
                                    </small>
                                )}
                            </span>
                            {item.active && (
                                <i
                                    className="fa-solid fa-check"
                                    aria-hidden="true"
                                />
                            )}
                            {item.needsValue && (
                                <i
                                    className="fa-solid fa-chevron-right text-xs"
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    </div>
                ))}
                {query && !results.length && !matches.length && (
                    <p role="status" className="p-4 text-sm opacity-70">
                        {t("writing.tools.no_results")}
                    </p>
                )}
            </div>
        </WritingToolDialog>
    );
}
