import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchOptions } from "@alexandria/editor/extensions/writingSearch";
import useT from "@alexandria/hooks/useT";
import type { WritingEditorBridge } from "../ribbon/writingRibbonContext";

/** The bridge reads mutable editor state; its snapshot is versioned by the tick. */
function readSearchState(
    editor: WritingEditorBridge | null,
    query: string,
    options: SearchOptions,
    editorTick: number,
) {
    return {
        count: editor?.findMatches?.(query, options).length ?? 0,
        canUndo: editor?.canUndo() ?? false,
        editorTick,
    };
}

export default function FindReplaceBar({
    editor,
    editorTick,
    canUpdate,
    sectionTitle,
    replaceInitially,
    onClose,
}: {
    editor: WritingEditorBridge | null;
    editorTick: number;
    canUpdate: boolean;
    sectionTitle: string;
    replaceInitially: boolean;
    onClose: () => void;
}) {
    const t = useT();
    const [query, setQuery] = useState("");
    const [replacement, setReplacement] = useState("");
    const [replacing, setReplacing] = useState(replaceInitially);
    const [options, setOptions] = useState<SearchOptions>({
        matchCase: false,
        wholeWord: false,
    });
    const [requestedMatch, setCurrent] = useState(0);
    const { count, canUndo } = useMemo(
        () => readSearchState(editor, query, options, editorTick),
        [editor, editorTick, query, options],
    );
    const current = Math.min(requestedMatch, Math.max(0, count - 1));
    const [message, setMessage] = useState("");
    const bridge = useRef(editor);
    useEffect(() => {
        bridge.current = editor;
        editor?.searchText?.(query, options, current);
    }, [editor, editorTick, query, options, current]);
    useEffect(
        () => () => {
            bridge.current?.searchText?.("", {
                matchCase: false,
                wholeWord: false,
            });
        },
        [],
    );
    function navigate(direction: number) {
        if (!count) {
            return;
        }

        const next = (current + direction + count) % count;
        setCurrent(next);
        const matches = editor?.searchText?.(query, options, next) ?? [];

        if (matches[next]) {
            editor?.selectTextMatch?.(matches[next]);
        }
    }
    function replace(all: boolean) {
        const changed =
            editor?.replaceText?.(
                query,
                replacement,
                options,
                all ? undefined : current,
            ) ?? 0;
        setMessage(
            t("writing.find.replaced").replace(":count", String(changed)),
        );
    }

    return (
        <section
            className="writing-find-bar shrink-0 border-b px-3 py-2"
            aria-label={t("writing.find.title")}
            style={{
                background: "var(--theme-base-surface)",
                borderColor: "var(--theme-base-400)",
            }}
        >
            <div className="flex items-center gap-1">
                <input
                    type="search"
                    autoFocus
                    aria-label={t("writing.find.find")}
                    placeholder={t("writing.find.find")}
                    className="writing-tool-search min-w-0 flex-1"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setCurrent(0);
                        setMessage("");
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            navigate(event.shiftKey ? -1 : 1);
                        }

                        if (event.key === "Escape") {
                            onClose();
                        }
                    }}
                />
                <span className="shrink-0 text-xs tabular-nums" role="status">
                    {count ? Math.min(current + 1, count) : 0}/{count}
                </span>
                <button
                    type="button"
                    className="writing-touch-button"
                    disabled={!count}
                    aria-label={t("writing.find.previous")}
                    onClick={() => navigate(-1)}
                >
                    <i className="fa-solid fa-chevron-up" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className="writing-touch-button"
                    disabled={!count}
                    aria-label={t("writing.find.next")}
                    onClick={() => navigate(1)}
                >
                    <i
                        className="fa-solid fa-chevron-down"
                        aria-hidden="true"
                    />
                </button>
                <button
                    type="button"
                    className="writing-touch-button"
                    aria-label={t("writing.tools.close")}
                    onClick={onClose}
                >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span
                    className="max-w-48 truncate opacity-65"
                    title={sectionTitle}
                >
                    {t("writing.find.scope")}: {sectionTitle}
                </span>
                <label className="flex min-h-8 items-center gap-1">
                    <input
                        type="checkbox"
                        checked={options.matchCase}
                        onChange={(e) => {
                            setOptions({
                                ...options,
                                matchCase: e.target.checked,
                            });
                            setCurrent(0);
                        }}
                    />
                    {t("writing.find.match_case")}
                </label>
                <label className="flex min-h-8 items-center gap-1">
                    <input
                        type="checkbox"
                        checked={options.wholeWord}
                        onChange={(e) => {
                            setOptions({
                                ...options,
                                wholeWord: e.target.checked,
                            });
                            setCurrent(0);
                        }}
                    />
                    {t("writing.find.whole_word")}
                </label>
                {canUpdate && (
                    <button
                        type="button"
                        className="min-h-8"
                        aria-expanded={replacing}
                        onClick={() => setReplacing(!replacing)}
                    >
                        {t("writing.find.replace")}
                    </button>
                )}
            </div>
            {replacing && canUpdate && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                        aria-label={t("writing.find.replace_with")}
                        placeholder={t("writing.find.replace_with")}
                        className="writing-tool-search min-w-0 flex-1"
                        value={replacement}
                        onChange={(event) => setReplacement(event.target.value)}
                    />
                    <button
                        type="button"
                        className="writing-touch-button px-2 text-xs"
                        disabled={!count}
                        onClick={() => replace(false)}
                    >
                        {t("writing.find.replace")}
                    </button>
                    <button
                        type="button"
                        className="writing-touch-button px-2 text-xs"
                        disabled={!count}
                        onClick={() => replace(true)}
                    >
                        {t("writing.find.replace_all")}
                    </button>
                    <button
                        type="button"
                        className="writing-touch-button"
                        disabled={!canUndo}
                        onClick={() => editor?.undo()}
                        aria-label={t("writing.ribbon.undo")}
                    >
                        <i
                            className="fa-solid fa-rotate-left"
                            aria-hidden="true"
                        />
                    </button>
                </div>
            )}
            {message && (
                <p role="status" className="pt-1 text-xs">
                    {message}
                </p>
            )}
        </section>
    );
}
