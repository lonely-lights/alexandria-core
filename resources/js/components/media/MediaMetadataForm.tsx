import { useEffect, useState, type CSSProperties } from "react";
import { csrfHeaders } from "@alexandria/lib/csrfHeaders";
import Button from "@alexandria/components/ui/Button";
import Input from "@alexandria/components/form/Input";
import Textarea from "@alexandria/components/form/Textarea";
import useT from "@alexandria/hooks/useT";

interface MediaMetadataFormProps {
    media: { id: number; alt_text: string | null; caption: string | null };
    modelType: "projects" | "blueprints" | "entries";
    modelId: number;
    onSaved: () => void;
}

const ALT_TEXT_MAX = 1000;

const labelRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "0.25rem",
};

const labelStyle: CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

const labelAltStyle: CSSProperties = {
    fontSize: "0.75rem",
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const errorColor = "var(--theme-status-error-stroke)";

const errorTextStyle: CSSProperties = {
    fontSize: "0.75rem",
    color: errorColor,
};

const requiredStarStyle: CSSProperties = {
    color: errorColor,
};

const formWrapStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
};

const saveButtonWrapStyle: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
};

export default function MediaMetadataForm({
    media,
    modelType,
    modelId,
    onSaved,
}: MediaMetadataFormProps) {
    const t = useT();
    const [altText, setAltText] = useState(media.alt_text ?? "");
    const [caption, setCaption] = useState(media.caption ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setAltText(media.alt_text ?? "");
        setCaption(media.caption ?? "");
    }, [media.id, media.alt_text, media.caption]);

    const handleSave = async () => {
        if (!altText.trim()) {
            setError(t("forms.media.error.alt_required"));
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/v1/${modelType}/${modelId}/media/${media.id}`,
                {
                    method: "PUT",
                    credentials: "same-origin",
                    headers: csrfHeaders(),
                    body: JSON.stringify({ alt_text: altText, caption }),
                },
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setError(
                    data?.message ??
                        t("forms.media.error.metadata_save_failed"),
                );
                return;
            }

            onSaved();
        } catch {
            setError(t("common.error.unexpected"));
        } finally {
            setIsSaving(false);
        }
    };

    const altTextRemaining = ALT_TEXT_MAX - altText.length;
    const altCounterStyle: CSSProperties =
        altTextRemaining < 0
            ? { ...labelAltStyle, color: errorColor }
            : labelAltStyle;

    return (
        <div style={formWrapStyle}>
            {/* Alt text */}
            <div>
                <div style={labelRowStyle}>
                    <label htmlFor="media-alt-text" style={labelStyle}>
                        Alt text <span style={requiredStarStyle}>*</span>
                    </label>
                    <span style={altCounterStyle}>
                        {altText.length}/{ALT_TEXT_MAX}
                    </span>
                </div>
                <Input
                    id="media-alt-text"
                    type="text"
                    placeholder={t("forms.media.alt_placeholder")}
                    value={altText}
                    maxLength={ALT_TEXT_MAX}
                    onChange={(e) => setAltText(e.target.value)}
                />
            </div>

            {/* Caption */}
            <div>
                <div style={labelRowStyle}>
                    <label htmlFor="media-caption" style={labelStyle}>
                        Caption
                    </label>
                    <span style={labelAltStyle}>Optional</span>
                </div>
                <Textarea
                    id="media-caption"
                    placeholder={t("forms.media.caption_placeholder")}
                    rows={2}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    style={{ resize: "none" }}
                />
            </div>

            {error && <p style={errorTextStyle}>{error}</p>}

            <div style={saveButtonWrapStyle}>
                <Button
                    variant="primary"
                    size="sm"
                    loading={isSaving}
                    disabled={altTextRemaining < 0}
                    onClick={handleSave}
                >
                    Save
                </Button>
            </div>
        </div>
    );
}
