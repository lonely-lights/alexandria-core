import { type CSSProperties, useState, useEffect } from "react";
import useT from "@alexandria/hooks/useT";
import Modal, { ModalHeader } from "@alexandria/components/ui/Modal";
import type { EntryPreview } from "@alexandria/types/projects";
import { stripWikiMarkup } from "@alexandria/lib/stripWikiMarkup";

interface StubPreviewModalProps {
    entryId: number | null;
    open: boolean;
    onClose: () => void;
}

const badgeBase: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.125rem 0.5rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
};

const badgeGhostStyle: CSSProperties = {
    ...badgeBase,
    background:
        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

const badgeWarningStyle: CSSProperties = {
    ...badgeBase,
    background: "var(--theme-status-warning-stroke)",
    color: "var(--theme-status-warning-content)",
};

const summaryStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};
const emptySummaryStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const attrLabelStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const attrValueStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
};
const notFoundStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const attributesBoxStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-300) 50%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

export default function StubPreviewModal({
    entryId,
    open,
    onClose,
}: StubPreviewModalProps) {
    const t = useT();
    const [preview, setPreview] = useState<EntryPreview | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !entryId) return;

        setLoading(true);
        setPreview(null);

        fetch(`/api/v1/entries/${entryId}/preview`, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.id) setPreview(data as EntryPreview);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [entryId, open]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
            {loading && (
                <>
                    <ModalHeader title={t("common.loading")} onClose={onClose} />
                    <div className="flex items-center justify-center p-8">
                        <i
                            className="fa-solid fa-circle-notch fa-spin text-base"
                            style={{
                                color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
                            }}
                        />
                    </div>
                </>
            )}

            {!loading && preview && (
                <>
                    <ModalHeader title={preview.name} onClose={onClose} />
                    <div className="px-6 py-4">
                        {/* Blueprint badge */}
                        {preview.blueprint_name && (
                            <div className="mb-3">
                                <span style={badgeGhostStyle}>
                                    {preview.blueprint_icon && (
                                        <i
                                            className={`${preview.blueprint_icon.includes(" ") ? preview.blueprint_icon : "fa-solid " + preview.blueprint_icon} text-[10px] fa-fw`}
                                        />
                                    )}
                                    {preview.blueprint_name}
                                </span>
                                <span
                                    className="ml-1"
                                    style={badgeWarningStyle}
                                >
                                    {t("entries.stub.badge")}
                                </span>
                            </div>
                        )}

                        {/* Thumbnail + Summary */}
                        <div className="flex gap-4">
                            {preview.thumbnail_url && (
                                <img
                                    src={preview.thumbnail_url}
                                    alt={preview.name}
                                    className="h-20 w-20 flex-shrink-0 rounded-xl object-cover shadow-md"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                {preview.summary ? (
                                    <p
                                        className="text-sm leading-relaxed"
                                        style={summaryStyle}
                                    >
                                        {stripWikiMarkup(preview.summary)}
                                    </p>
                                ) : (
                                    <p
                                        className="text-sm italic"
                                        style={emptySummaryStyle}
                                    >
                                        {t("entries.stub.no_summary")}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Attributes */}
                        {preview.attributes.length > 0 && (
                            <div
                                className="mt-4 space-y-1 p-3"
                                style={attributesBoxStyle}
                            >
                                {preview.attributes.map((attr, i) => (
                                    <div key={i} className="flex gap-3 text-sm">
                                        <span
                                            className="w-[38.2%] flex-shrink-0 font-medium"
                                            style={attrLabelStyle}
                                        >
                                            {attr.label}
                                        </span>
                                        <span style={attrValueStyle}>
                                            {attr.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {!loading && !preview && (
                <>
                    <ModalHeader title={t("entries.stub.not_found")} onClose={onClose} />
                    <div
                        className="p-6 text-center text-sm"
                        style={notFoundStyle}
                    >
                        {t("entries.stub.not_found_body")}
                    </div>
                </>
            )}
        </Modal>
    );
}
