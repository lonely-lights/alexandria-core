import { useForm } from "@inertiajs/react";
import { type CSSProperties, type SyntheticEvent } from "react";
import RichTextEditor from "@alexandria/components/editor/RichTextEditor";
import useT from "@alexandria/hooks/useT";
import type { AiInstruction, ProjectDetail } from "@alexandria/types/projects";

interface ProjectDetailsSectionProps {
    project: ProjectDetail;
    instructions: AiInstruction[];
}

/* ── Theme styles ── */

const errorText: CSSProperties = { color: "var(--theme-status-error-stroke)" };

const cardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
    padding: "1.5rem",
};

const inputStyle: CSSProperties = {
    background: "var(--theme-base-surface)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    color: "var(--theme-base-content)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
};

const primaryBtnStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    gap: "0.375rem",
};

export default function ProjectDetailsSection({
    project,
    instructions,
}: ProjectDetailsSectionProps) {
    const t = useT();
    const form = useForm({
        name: project.name,
        logline: project.logline ?? "",
        summary: project.summary ?? "",
        contents: project.contents ?? "",
    });

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        form.put(`/p/${project.slug}/settings`);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div style={cardStyle}>
                <h3 className="mb-4 text-lg font-bold">
                    {t("projects.details.title")}
                </h3>

                <div className="space-y-4">
                    <div className="flex flex-col">
                        <label className="mb-1 text-sm font-semibold">
                            {t("projects.details.field.name")}
                        </label>
                        <input
                            type="text"
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData("name", e.target.value)
                            }
                            style={inputStyle}
                            maxLength={255}
                        />
                        {form.errors.name && (
                            <p className="mt-1 text-sm" style={errorText}>
                                {form.errors.name}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-1 text-sm font-semibold">
                            {t("projects.details.field.logline")}
                        </label>
                        <input
                            type="text"
                            value={form.data.logline}
                            onChange={(e) =>
                                form.setData("logline", e.target.value)
                            }
                            style={inputStyle}
                            placeholder={t(
                                "projects.details.field.logline_placeholder",
                            )}
                            maxLength={500}
                        />
                        {form.errors.logline && (
                            <p className="mt-1 text-sm" style={errorText}>
                                {form.errors.logline}
                            </p>
                        )}
                    </div>

                    <div>
                        <RichTextEditor
                            label={t("projects.details.field.summary")}
                            value={form.data.summary}
                            onChange={(wiki) => form.setData("summary", wiki)}
                            placeholder={t(
                                "projects.details.field.summary_placeholder",
                            )}
                            maxLength={5000}
                            tier="free"
                        />
                        {form.errors.summary && (
                            <p className="mt-1 text-sm" style={errorText}>
                                {form.errors.summary}
                            </p>
                        )}
                    </div>

                    <div>
                        <RichTextEditor
                            label={t("projects.details.field.contents")}
                            value={form.data.contents}
                            onChange={(wiki) => form.setData("contents", wiki)}
                            placeholder={t(
                                "projects.details.field.contents_placeholder",
                            )}
                            maxLength={50000}
                            tier="premium"
                            enableAi
                            projectId={project.id}
                            aiInstructions={instructions}
                        />
                        {form.errors.contents && (
                            <p className="mt-1 text-sm" style={errorText}>
                                {form.errors.contents}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="alex-btn inline-flex items-center"
                    style={{
                        ...primaryBtnStyle,
                        opacity: form.processing ? 0.5 : 1,
                    }}
                >
                    {form.processing && (
                        <i
                            className="fa-solid fa-circle-notch fa-spin text-sm"
                            aria-hidden="true"
                        />
                    )}
                    {form.processing
                        ? t("projects.details.saving")
                        : t("projects.details.save")}
                </button>
            </div>
        </form>
    );
}
