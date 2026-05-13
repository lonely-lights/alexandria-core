import { type CSSProperties, useState, useEffect } from "react";
import Modal from "@alexandria/components/ui/Modal";
import useT from "@alexandria/hooks/useT";
import { useDateFormatters } from "@alexandria/lib/formatDate";

const headerStyle: CSSProperties = { background: "var(--theme-base-300)" };

const helperStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const helperFainterStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const helperSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

const closeBtnStyle: CSSProperties = {
    borderRadius: "9999px",
    width: "1.5rem",
    height: "1.5rem",
};

const footerDividerStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

const dotEndedStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
};

const dotActiveStyle: CSSProperties = {
    background: "var(--theme-status-success-stroke)",
};

const intensityBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    flexShrink: 0,
};

const primaryLinkStyle: CSSProperties = {
    color: "var(--theme-brand-primary-500)",
};

export interface CalcDetailItem {
    name: string;
    detail: string | null;
    url?: string | null;
    start?: string | null;
    end?: string | null;
    intensity?: number | null;
}

export function CalcDetailModal({
    entryName,
    colLabel,
    calcKey,
    entryId,
    onClose,
}: {
    entryName: string;
    colLabel: string;
    calcKey: string;
    entryId: number;
    onClose: () => void;
}) {
    const t = useT();
    const [items, setItems] = useState<CalcDetailItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { fmtDate } = useDateFormatters();

    useEffect(() => {
        fetch(
            `/api/v1/entries/${entryId}/calculated/${encodeURIComponent(calcKey)}`,
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
                setItems(data.items ?? []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [entryId, calcKey]);

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <div
                className="flex items-center justify-between px-5 py-3"
                style={headerStyle}
            >
                <div>
                    <h3 className="text-sm font-semibold">{colLabel}</h3>
                    <p className="text-xs" style={helperStyle}>
                        {entryName}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                    style={closeBtnStyle}
                >
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <i
                            className="fa-solid fa-circle-notch fa-spin text-sm"
                            style={helperSoftStyle}
                        />
                    </div>
                ) : items.length === 0 ? (
                    <p
                        className="py-6 text-center text-sm italic"
                        style={helperSoftStyle}
                    >
                        {t("blueprints.calc_detail.empty")}
                    </p>
                ) : (
                    <div className="space-y-1">
                        {items.map((item, i) => {
                            const hasDates =
                                item.start !== undefined && item.start !== null;

                            return (
                                <div
                                    key={i}
                                    className="alex-row flex items-start gap-3 px-3 py-2"
                                    style={{
                                        borderRadius:
                                            "var(--theme-radius-input)",
                                    }}
                                >
                                    {hasDates && (
                                        <div
                                            className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                                            style={
                                                item.end
                                                    ? dotEndedStyle
                                                    : dotActiveStyle
                                            }
                                        />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        {item.url ? (
                                            <a
                                                href={item.url}
                                                className="text-sm font-medium hover:underline"
                                                style={primaryLinkStyle}
                                            >
                                                {item.name}
                                            </a>
                                        ) : (
                                            <p className="text-sm font-medium">
                                                {item.name}
                                            </p>
                                        )}
                                        {hasDates && (
                                            <p
                                                className="text-xs"
                                                style={helperFainterStyle}
                                            >
                                                {item.end
                                                    ? `${fmtDate(item.start)} — ${fmtDate(item.end)}`
                                                    : t(
                                                          "blueprints.calc_detail.since",
                                                      ).replace(
                                                          ":date",
                                                          fmtDate(item.start) ??
                                                              "",
                                                      )}
                                            </p>
                                        )}
                                        {item.detail && (
                                            <p
                                                className="text-xs"
                                                style={helperStyle}
                                            >
                                                {item.detail}
                                            </p>
                                        )}
                                    </div>
                                    {item.intensity != null && (
                                        <span style={intensityBadgeStyle}>
                                            {t(
                                                "blueprints.calc_detail.intensity",
                                            ).replace(
                                                ":value",
                                                String(item.intensity),
                                            )}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div
                className="flex items-center justify-between px-5 py-3"
                style={footerDividerStyle}
            >
                <p className="text-xs" style={helperFainterStyle}>
                    {t(
                        items.length === 1
                            ? "blueprints.calc_detail.count.singular"
                            : "blueprints.calc_detail.count.plural",
                    ).replace(":count", String(items.length))}
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="alex-btn alex-btn--ghost inline-flex items-center px-3 py-1 text-sm"
                    style={{ borderRadius: "var(--theme-radius-button)" }}
                >
                    {t("common.close")}
                </button>
            </div>
        </Modal>
    );
}
