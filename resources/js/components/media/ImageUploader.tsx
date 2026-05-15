import {
    useState,
    useRef,
    useCallback,
    type CSSProperties,
    type DragEvent,
    type ChangeEvent,
} from "react";
import { type MediaItem } from "@alexandria/types/media";
import Button from "@alexandria/components/ui/Button";
import Input from "@alexandria/components/form/Input";
import useT from "@alexandria/hooks/useT";

interface ImageUploaderProps {
    modelType: "projects" | "blueprints" | "entries";
    modelId: number;
    collection: "page_image" | "banner" | "gallery";
    onUploaded: (media: MediaItem) => void;
    onClose?: () => void;
    maxSizeKb?: number;
}

const dropzoneBaseStyle: CSSProperties = {
    borderRadius: "var(--theme-radius-card)",
    borderWidth: "2px",
    borderStyle: "dashed",
    padding: "2rem 0",
    textAlign: "center",
    cursor: "pointer",
};

const dropzoneActiveStyle: CSSProperties = {
    ...dropzoneBaseStyle,
    borderColor:
        "color-mix(in srgb, var(--theme-brand-primary-500) 50%, transparent)",
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)",
};

const dropzoneIdleStyle: CSSProperties = {
    ...dropzoneBaseStyle,
    borderColor: "var(--theme-base-300)",
};

const previewFilenameStyle: CSSProperties = {
    fontSize: "0.75rem",
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

const previewReplaceHintStyle: CSSProperties = {
    fontSize: "0.75rem",
    color: "color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)",
};

const uploadIconStyle: CSSProperties = {
    marginBottom: "0.5rem",
    fontSize: "1.5rem",
    color: "color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
};

const uploadPromptStyle: CSSProperties = {
    fontSize: "0.875rem",
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

const uploadSubPromptStyle: CSSProperties = {
    marginTop: "0.25rem",
    fontSize: "0.75rem",
    color: "color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
};

const labelStyle: CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

const labelOptionalStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
};

const errorColor = "var(--theme-status-error-stroke)";

const requiredStarStyle: CSSProperties = {
    color: errorColor,
};

const counterIdleStyle: CSSProperties = {
    fontSize: "0.75rem",
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

const counterOverStyle: CSSProperties = {
    fontSize: "0.75rem",
    color: errorColor,
};

const errorBoxStyle: CSSProperties = {
    borderRadius: "var(--theme-radius-input)",
    background:
        "color-mix(in srgb, var(--theme-status-error-stroke) 10%, transparent)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.75rem",
    color: errorColor,
};

export default function ImageUploader({
    modelType,
    modelId,
    collection,
    onUploaded,
    onClose,
    maxSizeKb = 10240,
}: ImageUploaderProps) {
    const t = useT();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [altText, setAltText] = useState("");
    const [caption, setCaption] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);

    const applyFile = useCallback(
        (selected: File) => {
            setError(null);

            if (selected.size > maxSizeKb * 1024) {
                setError(
                    t("forms.media.error.file_too_large").replace(
                        ":limit",
                        String(maxSizeKb),
                    ),
                );
                return;
            }

            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        },
        [maxSizeKb, t],
    );

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (selected) {
            applyFile(selected);
        }
    }

    function handleDragOver(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragOver(true);
    }

    function handleDragLeave(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragOver(false);
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragOver(false);

        const dropped = e.dataTransfer.files[0];
        if (dropped) {
            applyFile(dropped);
        }
    }

    async function handleUpload() {
        if (!file || !altText.trim() || uploading) {
            return;
        }

        setUploading(true);
        setError(null);

        const csrfToken =
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? "";
        const formData = new FormData();
        formData.append("image", file);
        formData.append("alt_text", altText.trim());
        if (caption.trim()) {
            formData.append("caption", caption.trim());
        }

        try {
            const res = await fetch(
                `/api/v1/${modelType}/${modelId}/media/${collection}`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": csrfToken,
                    },
                    credentials: "same-origin",
                    body: formData,
                },
            );

            if (res.status === 201) {
                const media = (await res.json()) as MediaItem;
                onUploaded(media);
            } else {
                const data = (await res.json().catch(() => ({}))) as {
                    message?: string;
                };
                setError(
                    data.message ??
                        t("forms.media.error.upload_failed").replace(
                            ":status",
                            String(res.status),
                        ),
                );
            }
        } catch {
            setError(t("common.error.unexpected_retry"));
        } finally {
            setUploading(false);
        }
    }

    const canUpload = Boolean(file && altText.trim() && !uploading);
    const isOver = altText.length > 1000;

    return (
        <div className="flex flex-col gap-4">
            {/* Drop zone */}
            <div
                className="alex-image-dropzone transition-colors"
                data-active={isDragOver ? "true" : "false"}
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={isDragOver ? dropzoneActiveStyle : dropzoneIdleStyle}
            >
                {preview ? (
                    <div className="flex flex-col items-center gap-2 px-4">
                        <img
                            src={preview}
                            alt="Preview"
                            className="mx-auto max-h-40 max-w-full object-contain"
                            style={{
                                borderRadius: "var(--theme-radius-input)",
                            }}
                        />
                        <p style={previewFilenameStyle}>{file?.name}</p>
                        <p style={previewReplaceHintStyle}>Click to replace</p>
                    </div>
                ) : (
                    <>
                        <i
                            className="fa-solid fa-cloud-upload"
                            style={uploadIconStyle}
                        />
                        <p style={uploadPromptStyle}>
                            Drag &amp; drop an image, or click to browse
                        </p>
                        <p style={uploadSubPromptStyle}>
                            JPEG, PNG, WebP — max{" "}
                            {maxSizeKb >= 1024
                                ? `${Math.round(maxSizeKb / 1024)} MB`
                                : `${maxSizeKb} KB`}
                        </p>
                    </>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {/* Alt text */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <label htmlFor="uploader-alt-text" style={labelStyle}>
                        Alt Text <span style={requiredStarStyle}>*</span>
                    </label>
                    <span style={isOver ? counterOverStyle : counterIdleStyle}>
                        {altText.length}/1000
                    </span>
                </div>
                <Input
                    id="uploader-alt-text"
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    maxLength={1000}
                    placeholder={t("forms.media.alt_placeholder")}
                    size="md"
                />
            </div>

            {/* Caption */}
            <div className="flex flex-col gap-1">
                <label htmlFor="uploader-caption" style={labelStyle}>
                    Caption <span style={labelOptionalStyle}>(optional)</span>
                </label>
                <Input
                    id="uploader-caption"
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={t("forms.media.caption_placeholder")}
                    size="md"
                />
            </div>

            {/* Error */}
            {error && <div style={errorBoxStyle}>{error}</div>}

            {/* Actions */}
            <div className="flex justify-end gap-2">
                {onClose && (
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={onClose}
                        disabled={uploading}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => void handleUpload()}
                    disabled={!canUpload}
                    loading={uploading}
                >
                    Upload
                </Button>
            </div>
        </div>
    );
}
