import {
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import { router } from "@inertiajs/react";
import { useJsonFetch } from "@alexandria/lib/fetchJson";
import { useEnterAnimation } from "@alexandria/hooks/useEnterAnimation";
import ProjectDetailsSection from "./settings/ProjectDetailsSection";
import AiHelpersSection from "./settings/AiHelpersSection";
import MembersSection from "./settings/MembersSection";
import DangerZoneSection from "./settings/DangerZoneSection";
import Modal from "@alexandria/components/ui/Modal";
import ImageUploader from "@alexandria/components/media/ImageUploader";
import useT, { type Translator } from "@alexandria/hooks/useT";
import type {
    AiInstruction,
    ProjectDetail,
    ProjectSettings,
} from "@alexandria/types/projects";

interface SettingsTabProps {
    project: ProjectDetail;
    settings: ProjectSettings;
}

const TABS: { key: string; labelKey: string; icon: string }[] = [
    {
        key: "details",
        labelKey: "projects.settings_tab.tab.project",
        icon: "fa-pen-to-square",
    },
    {
        key: "media",
        labelKey: "projects.settings_tab.tab.media",
        icon: "fa-image",
    },
    {
        key: "ai-helpers",
        labelKey: "projects.settings_tab.tab.ai_helpers",
        icon: "fa-wand-magic-sparkles",
    },
    {
        key: "members",
        labelKey: "projects.settings_tab.tab.members",
        icon: "fa-users",
    },
    {
        key: "danger",
        labelKey: "projects.settings_tab.tab.danger",
        icon: "fa-triangle-exclamation",
    },
];

/* ── Theme styles ── */

const fadedText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const microText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const labelText: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

function navTabStyle(active: boolean, isDanger: boolean): CSSProperties {
    if (active) {
        return {
            background:
                "color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)",
            color: "var(--theme-brand-primary-500)",
            borderRadius: "var(--theme-radius-button)",
            transition:
                "background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
        };
    }
    return {
        background: "transparent",
        color: isDanger
            ? "var(--theme-status-error-stroke)"
            : "var(--theme-base-content)",
        borderRadius: "var(--theme-radius-button)",
        transition:
            "background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
    };
}

function mobileTabStyle(active: boolean): CSSProperties {
    if (active) {
        return {
            background:
                "color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)",
            color: "var(--theme-brand-primary-500)",
            borderRadius: "var(--theme-radius-button)",
        };
    }
    return {
        background:
            "color-mix(in srgb, var(--theme-base-content) 6%, transparent)",
        color: "var(--theme-base-content)",
        borderRadius: "var(--theme-radius-button)",
    };
}

const iconBtnGhostStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-button)",
    padding: "0.25rem 0.5rem",
    fontSize: "0.75rem",
};

const dashedEmptyStyle: CSSProperties = {
    border: "2px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const mediaCardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
    padding: "1.25rem",
};

const dashedUploadBoxStyle: CSSProperties = {
    border: "2px dashed color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const uploaderIconWrapStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)",
    color: "var(--theme-brand-primary-500)",
    borderRadius: "9999px",
};

export default function SettingsTab({ project, settings }: SettingsTabProps) {
    const t = useT();
    const [activeTab, setActiveTab] = useState("details");
    // Lifted so the RTE in ProjectDetailsSection stays in sync with edits
    // made from the AI Helpers tab — switching tabs would otherwise show
    // a stale snapshot of project.ai_instructions.
    const [instructions, setInstructions] = useState<AiInstruction[]>(
        project.ai_instructions,
    );

    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            {/* Left nav */}
            <nav className="hidden w-48 flex-shrink-0 space-y-1 lg:block">
                {TABS.map((tab) => {
                    const isDanger = tab.key === "danger";
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm"
                            style={navTabStyle(isActive, isDanger)}
                            aria-pressed={isActive}
                        >
                            <i
                                className={`fa-solid ${tab.icon} w-4 text-center`}
                                style={
                                    isActive
                                        ? {
                                              color: "var(--theme-brand-primary-500)",
                                          }
                                        : isDanger
                                          ? {
                                                color: "var(--theme-status-error-stroke)",
                                            }
                                          : labelText
                                }
                                aria-hidden="true"
                            />
                            <span>{t(tab.labelKey)}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Mobile tabs */}
            <div className="flex gap-1 overflow-x-auto lg:hidden">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap"
                        style={mobileTabStyle(activeTab === tab.key)}
                        aria-pressed={activeTab === tab.key}
                    >
                        <i
                            className={`fa-solid ${tab.icon} text-xs`}
                            aria-hidden="true"
                        />
                        {t(tab.labelKey)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <AnimatedContent sectionKey={activeTab}>
                    {activeTab === "details" && (
                        <ProjectDetailsSection
                            project={project}
                            instructions={instructions}
                        />
                    )}
                    {activeTab === "media" && (
                        <ProjectMediaSection project={project} />
                    )}
                    {activeTab === "ai-helpers" && (
                        <AiHelpersSection
                            projectId={project.id}
                            instructions={instructions}
                            onInstructionsChange={setInstructions}
                        />
                    )}
                    {activeTab === "members" && project.can.manage_members && (
                        <MembersSection project={project} settings={settings} />
                    )}
                    {activeTab === "danger" && project.can.delete && (
                        <DangerZoneSection project={project} />
                    )}
                </AnimatedContent>
            </div>
        </div>
    );
}

function AnimatedContent({
    sectionKey,
    children,
}: {
    sectionKey: string;
    children: ReactNode;
}) {
    const ref = useEnterAnimation<HTMLDivElement>(sectionKey);

    return <div ref={ref}>{children}</div>;
}

/* ── Project Media Section ── */

type ProjectMediaItem = {
    id: number;
    collection: string;
    original_url: string;
    conversions: Record<string, string>;
    alt_text: string | null;
    caption: string | null;
};

function ProjectMediaSection({ project }: { project: ProjectDetail }) {
    const t = useT();
    const projectId = project.id;
    const [showUploader, setShowUploader] = useState<
        "page_image" | "banner" | null
    >(null);

    const { data, loading, refetch: fetchMedia } = useJsonFetch<ProjectMediaItem[]>(
        `/api/v1/projects/${projectId}/media`,
    );
    const media = data ?? [];

    const pageImage = media.find((m) => m.collection === "page_image");
    const banner = media.find((m) => m.collection === "banner");
    const [inheritDownward, setInheritDownward] = useState(
        project.inherit_media_downward,
    );

    async function toggleInheritDownward(next: boolean) {
        setInheritDownward(next);
        router.put(
            `/p/${project.slug}/settings`,
            {
                name: project.name,
                logline: project.logline ?? "",
                summary: project.summary ?? "",
                contents: project.contents ?? "",
                inherit_media_downward: next,
            },
            { preserveState: true, preserveScroll: true },
        );
    }

    async function removeMedia(mediaId: number) {
        if (!confirm(t("projects.settings_tab.media.confirm_remove"))) return;
        const csrfToken =
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? "";
        await fetch(`/api/v1/projects/${projectId}/media/${mediaId}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-TOKEN": csrfToken,
            },
            credentials: "same-origin",
        });
        fetchMedia();
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold">
                    {t("projects.settings_tab.media.title")}
                </h2>
                <p className="text-sm" style={labelText}>
                    {t("projects.settings_tab.media.subtitle")}
                </p>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <i
                        className="fa-solid fa-circle-notch fa-spin text-base"
                        style={microText}
                        aria-hidden="true"
                    />
                </div>
            )}

            {/* Inherit downward toggle */}
            <div style={mediaCardStyle}>
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        checked={inheritDownward}
                        onChange={(e) =>
                            void toggleInheritDownward(e.target.checked)
                        }
                        className="alex-checkbox mt-0.5"
                    />
                    <div>
                        <span className="text-sm font-semibold">
                            {t("projects.settings_tab.media.inherit_label")}
                        </span>
                        <p className="mt-0.5 text-xs" style={labelText}>
                            {t("projects.settings_tab.media.inherit_hint")}
                        </p>
                    </div>
                </label>
            </div>

            {!loading && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Page Image */}
                    <div style={mediaCardStyle}>
                        <h3 className="mb-3 text-sm font-semibold">
                            <i
                                className="fa-solid fa-image mr-2"
                                style={{
                                    color: "color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)",
                                }}
                                aria-hidden="true"
                            />
                            {t(
                                "projects.settings_tab.media.page_image_heading",
                            )}
                        </h3>
                        {pageImage ? (
                            <MediaPreview
                                src={
                                    pageImage.conversions.square ??
                                    pageImage.original_url
                                }
                                alt={pageImage.alt_text}
                                aspectClass="h-32 w-32"
                                onChange={() => setShowUploader("page_image")}
                                onRemove={() => void removeMedia(pageImage.id)}
                                t={t}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowUploader("page_image")}
                                className="flex h-32 w-32 items-center justify-center"
                                style={dashedUploadBoxStyle}
                            >
                                <UploadPlaceholder
                                    label={t(
                                        "projects.settings_tab.media.upload",
                                    )}
                                />
                            </button>
                        )}
                    </div>

                    {/* Banner */}
                    <div style={mediaCardStyle}>
                        <h3 className="mb-3 text-sm font-semibold">
                            <i
                                className="fa-solid fa-panorama mr-2"
                                style={{
                                    color: "color-mix(in srgb, var(--theme-brand-secondary-500) 60%, transparent)",
                                }}
                                aria-hidden="true"
                            />
                            {t("projects.settings_tab.media.banner_heading")}
                        </h3>
                        {banner ? (
                            <MediaPreview
                                src={
                                    banner.conversions.desktop ??
                                    banner.original_url
                                }
                                alt={banner.alt_text}
                                aspectClass="aspect-[1920/400] w-full"
                                onChange={() => setShowUploader("banner")}
                                onRemove={() => void removeMedia(banner.id)}
                                t={t}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowUploader("banner")}
                                className="flex aspect-[1920/400] w-full items-center justify-center"
                                style={dashedUploadBoxStyle}
                            >
                                <UploadPlaceholder
                                    label={t(
                                        "projects.settings_tab.media.upload_banner",
                                    )}
                                />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Project-wide Media Library placeholder */}
            <div className="py-12 text-center" style={dashedEmptyStyle}>
                <i
                    className="fa-solid fa-photo-film text-3xl"
                    style={{
                        color: "color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
                    }}
                    aria-hidden="true"
                />
                <p className="mt-2 text-sm font-medium" style={fadedText}>
                    {t("projects.settings_tab.media.library_title")}
                </p>
                <p className="mt-1 text-xs" style={microText}>
                    {t("projects.settings_tab.media.library_subtitle")}
                </p>
            </div>

            {/* Uploader Modal */}
            {showUploader && (
                <ImageUploaderModal
                    modelType="projects"
                    modelId={projectId}
                    collection={showUploader}
                    onUploaded={() => {
                        setShowUploader(null);
                        fetchMedia();
                    }}
                    onClose={() => setShowUploader(null)}
                    t={t}
                />
            )}
        </div>
    );
}

function MediaPreview({
    src,
    alt,
    aspectClass,
    onChange,
    onRemove,
    t,
}: {
    src: string;
    alt: string | null;
    aspectClass: string;
    onChange: () => void;
    onRemove: () => void;
    t: Translator;
}) {
    return (
        <div className="space-y-3">
            <img
                src={src}
                alt={alt ?? ""}
                className={`${aspectClass} rounded-xl object-cover`}
            />
            {alt && (
                <p className="text-xs" style={fadedText}>
                    {t("projects.settings_tab.media.alt_label")} {alt}
                </p>
            )}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onChange}
                    className="alex-btn"
                    style={iconBtnGhostStyle}
                >
                    {t("projects.settings_tab.media.change")}
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    className="alex-btn"
                    style={{
                        ...iconBtnGhostStyle,
                        color: "var(--theme-status-error-stroke)",
                    }}
                >
                    {t("projects.settings_tab.media.remove")}
                </button>
            </div>
        </div>
    );
}

function UploadPlaceholder({ label }: { label: string }) {
    return (
        <div className="text-center">
            <i
                className="fa-solid fa-plus text-lg"
                style={{
                    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                }}
                aria-hidden="true"
            />
            <p className="mt-1 text-xs" style={microText}>
                {label}
            </p>
        </div>
    );
}

/* ── Uploader wrapped in Modal ── */

function ImageUploaderModal({
    modelType,
    modelId,
    collection,
    onUploaded,
    onClose,
    t,
}: {
    modelType: "projects" | "blueprints" | "entries";
    modelId: number;
    collection: "page_image" | "banner" | "gallery";
    onUploaded: () => void;
    onClose: () => void;
    t: Translator;
}) {
    const titleKey =
        collection === "page_image"
            ? "projects.settings_tab.media.uploader.title_page_image"
            : collection === "banner"
              ? "projects.settings_tab.media.uploader.title_banner"
              : "projects.settings_tab.media.uploader.title_default";

    return (
        <Modal open={true} onClose={onClose} maxWidth="max-w-lg">
            <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                        style={uploaderIconWrapStyle}
                    >
                        <i
                            className="fa-solid fa-cloud-arrow-up"
                            aria-hidden="true"
                        />
                    </div>
                    <div>
                        <h3 className="font-bold">{t(titleKey)}</h3>
                        <p className="text-xs" style={fadedText}>
                            {t(
                                "projects.settings_tab.media.uploader.file_type_hint",
                            )}
                        </p>
                    </div>
                </div>
                <ImageUploader
                    modelType={modelType}
                    modelId={modelId}
                    collection={collection}
                    onUploaded={onUploaded}
                    onClose={onClose}
                />
            </div>
        </Modal>
    );
}
