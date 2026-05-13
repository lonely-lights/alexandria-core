import { type CSSProperties, useState, useEffect } from "react";
import useT from "@alexandria/hooks/useT";
import Modal from "@alexandria/components/ui/Modal";
import ActionButton from "@alexandria/components/ui/ActionButton";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";

interface DependencyPreview {
    id: number;
    name: string;
    type: string;
    detail?: string;
}

interface ArchiveEntryModalProps {
    open: boolean;
    entryId: number;
    entryName: string;
    projectId: number;
    onClose: () => void;
    onArchived: () => void;
}

const warningIconWrapStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-status-warning-fill) 70%, transparent)",
};

const warningIconStyle: CSSProperties = {
    color: "var(--theme-status-warning-stroke)",
};

const bodyTextStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};
const helperFainterStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const helperSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const helperStrongStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

const depListShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-200) 50%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const depRowBorderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
};

export default function ArchiveEntryModal({
    open,
    entryId,
    entryName,
    projectId,
    onClose,
    onArchived,
}: ArchiveEntryModalProps) {
    const [dependencies, setDependencies] = useState<DependencyPreview[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [cascadeChildren, setCascadeChildren] = useState(false);
    const [archiving, setArchiving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setDependencies([]);
        setLoaded(false);
        setExpanded(false);
        setCascadeChildren(false);
        setArchiving(false);

        fetch(
            `/api/v1/projects/${projectId}/entries/${entryId}/archive-preview`,
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
                setDependencies(data.connections ?? []);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, [open, entryId]);

    function handleArchive() {
        setArchiving(true);
        fetch(`/api/v1/projects/${projectId}/entries/${entryId}/archive`, {
            method: "PUT",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ cascade_children: cascadeChildren }),
        })
            .then(() => {
                setArchiving(false);
                onArchived();
            })
            .catch(() => setArchiving(false));
    }

    const t = useT();
    const childEntries = dependencies.filter((d) => d.type === "entry");
    const connections = dependencies.filter((d) => d.type === "connection");

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <div className="p-6 text-center">
                <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                    style={warningIconWrapStyle}
                >
                    <i
                        className="fa-solid fa-box-archive text-xl"
                        style={warningIconStyle}
                    />
                </div>
                <h3 className="text-lg font-bold">{t("entries.archive.title")}</h3>
                <p className="mt-2 text-sm" style={bodyTextStyle}>
                    {t("entries.archive.body")
                        .split(":name")
                        .flatMap((part, i, arr) =>
                            i < arr.length - 1
                                ? [part, <strong key={i}>{entryName}</strong>]
                                : [part],
                        )}
                </p>

                {!loaded ? (
                    <div
                        className="mt-4 flex items-center justify-center gap-2 text-sm"
                        style={helperFainterStyle}
                    >
                        <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                        {t("entries.archive.checking_dependencies")}
                    </div>
                ) : dependencies.length > 0 ? (
                    <div className="mt-4 text-left">
                        {/* Expandable dependency list */}
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
                            style={warningIconStyle}
                        >
                            <i className="fa-solid fa-sitemap text-xs" />
                            <span>
                                {t(
                                    dependencies.length === 1
                                        ? "entries.archive.dependency_count.singular"
                                        : "entries.archive.dependency_count.plural",
                                ).replace(":count", String(dependencies.length))}
                            </span>
                            <i
                                className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                            />
                        </button>

                        {expanded && (
                            <div
                                className="mt-2 max-h-40 overflow-y-auto"
                                style={depListShellStyle}
                            >
                                {dependencies.map((d, i) => {
                                    const isLast =
                                        i === dependencies.length - 1;
                                    return (
                                        <div
                                            key={`${d.type}-${d.id}`}
                                            className="flex items-center gap-2 px-3 py-2"
                                            style={
                                                isLast ? {} : depRowBorderStyle
                                            }
                                        >
                                            <i
                                                className={`text-xs ${d.type === "connection" ? "fa-solid fa-diagram-project" : "fa-solid fa-file"}`}
                                                style={helperSoftStyle}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className="truncate text-sm"
                                                    style={helperStrongStyle}
                                                >
                                                    {d.name}
                                                </p>
                                                {d.detail && (
                                                    <p
                                                        className="text-xs"
                                                        style={
                                                            helperFainterStyle
                                                        }
                                                    >
                                                        {d.detail}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Cascade checkbox - only show if there are child entries */}
                        {childEntries.length > 0 && (
                            <label className="mt-3 flex cursor-pointer items-start gap-2">
                                <input
                                    type="checkbox"
                                    checked={cascadeChildren}
                                    onChange={(e) =>
                                        setCascadeChildren(e.target.checked)
                                    }
                                    className="mt-0.5"
                                    style={{
                                        accentColor:
                                            "var(--theme-status-warning-stroke)",
                                    }}
                                />
                                <span
                                    className="text-sm"
                                    style={helperStrongStyle}
                                >
                                    {t(
                                        childEntries.length === 1
                                            ? "entries.archive.cascade_label.singular"
                                            : "entries.archive.cascade_label.plural",
                                    ).replace(":count", String(childEntries.length))}
                                    <span
                                        className="block text-xs"
                                        style={helperFainterStyle}
                                    >
                                        {t("entries.archive.cascade_hint")}
                                    </span>
                                </span>
                            </label>
                        )}

                        {connections.length > 0 && (
                            <p
                                className="mt-2 text-xs"
                                style={helperFainterStyle}
                            >
                                <i className="fa-solid fa-diagram-project mr-1 text-[9px]" />
                                {t(
                                    connections.length === 1
                                        ? "entries.archive.connections_note.singular"
                                        : "entries.archive.connections_note.plural",
                                ).replace(":count", String(connections.length))}
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="mt-4 text-sm" style={helperFainterStyle}>
                        {t("entries.archive.no_dependencies")}
                    </p>
                )}

                <div className="mt-6 flex justify-center gap-2">
                    <ActionButton
                        icon="fa-solid fa-xmark"
                        label={t("common.cancel")}
                        variant="ghost"
                        onClick={onClose}
                    />
                    <ActionButton
                        icon="fa-solid fa-box-archive"
                        label={t("entries.archive.action")}
                        variant="warning"
                        onClick={handleArchive}
                        loading={archiving}
                        disabled={!loaded}
                    />
                </div>
            </div>
        </Modal>
    );
}
