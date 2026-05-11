import { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { useEnterAnimation } from '@alexandria/hooks/useEnterAnimation';
import ProjectDetailsSection from './settings/ProjectDetailsSection';
import MembersSection from './settings/MembersSection';
import DangerZoneSection from './settings/DangerZoneSection';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Modal from '@alexandria/components/ui/Modal';
import ImageUploader from '@alexandria/components/media/ImageUploader';
import useT, { type Translator } from '@alexandria/hooks/useT';
import type { ProjectDetail, ProjectSettings } from '@alexandria/types/projects';

interface SettingsTabProps {
    project: ProjectDetail;
    settings: ProjectSettings;
}

const TABS: { key: string; labelKey: string; icon: string }[] = [
    { key: 'details', labelKey: 'projects.settings_tab.tab.project', icon: 'fa-pen-to-square' },
    { key: 'media', labelKey: 'projects.settings_tab.tab.media', icon: 'fa-image' },
    { key: 'ai-sorting', labelKey: 'projects.settings_tab.tab.ai_sorting', icon: 'fa-wand-magic-sparkles' },
    { key: 'members', labelKey: 'projects.settings_tab.tab.members', icon: 'fa-users' },
    { key: 'danger', labelKey: 'projects.settings_tab.tab.danger', icon: 'fa-triangle-exclamation' },
];

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

function navTabStyle(active: boolean, isDanger: boolean): CSSProperties {
    if (active) {
        return {
            background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
            color: 'var(--theme-brand-primary-500)',
            borderRadius: 'var(--theme-radius-button)',
            transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
        };
    }
    return {
        background: 'transparent',
        color: isDanger ? 'var(--theme-status-error-stroke)' : 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-button)',
        transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    };
}

function mobileTabStyle(active: boolean): CSSProperties {
    if (active) {
        return {
            background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
            color: 'var(--theme-brand-primary-500)',
            borderRadius: 'var(--theme-radius-button)',
        };
    }
    return {
        background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
        color: 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-button)',
    };
}

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1.5rem',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
};

const textareaStyle: CSSProperties = {
    ...inputStyle,
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    lineHeight: '1.6',
    resize: 'vertical',
};

const lockedSectionStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1rem',
};

const ghostBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
};

const primaryBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    gap: '0.375rem',
};

const ghostPrimaryLinkStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    gap: '0.375rem',
};

const iconBtnGhostStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
};

const promptItemStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1rem 1.25rem',
};

const defaultBadgeStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
};

const dashedEmptyStyle: CSSProperties = {
    border: '2px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const mediaCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1.25rem',
};

const dashedUploadBoxStyle: CSSProperties = {
    border: '2px dashed color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    transition: 'border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const uploaderIconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: '9999px',
};

export default function SettingsTab({ project, settings }: SettingsTabProps) {
    const t = useT();
    const [activeTab, setActiveTab] = useState('details');

    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            {/* Left nav */}
            <nav className="hidden w-48 flex-shrink-0 space-y-1 lg:block">
                {TABS.map((tab) => {
                    const isDanger = tab.key === 'danger';
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
                                style={isActive
                                    ? { color: 'var(--theme-brand-primary-500)' }
                                    : isDanger
                                        ? { color: 'var(--theme-status-error-stroke)' }
                                        : labelText}
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
                        <i className={`fa-solid ${tab.icon} text-xs`} aria-hidden="true" />
                        {t(tab.labelKey)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <AnimatedContent sectionKey={activeTab}>
                    {activeTab === 'details' && <ProjectDetailsSection project={project} />}
                    {activeTab === 'media' && <ProjectMediaSection project={project} />}
                    {activeTab === 'ai-sorting' && <AiSortingSection projectId={project.id} />}
                    {activeTab === 'members' && project.can.manage_members && <MembersSection project={project} settings={settings} />}
                    {activeTab === 'danger' && project.can.delete && <DangerZoneSection project={project} />}
                </AnimatedContent>
            </div>
        </div>
    );
}

/* ── AI Sorting Section ── */

interface SortingPrompt {
    id: number;
    name: string;
    instructions: string;
    is_default: boolean;
}

/**
 * Default AI prompt content the user sees as a starting point when
 * creating a new sorting prompt. NOT translated — this is AI-prompt
 * content where precise wording drives model behavior; localizing it
 * needs a deeper redesign than swapping strings.
 */
const DEFAULT_INSTRUCTIONS = `You are an AI assistant for Alexandria, a worldbuilding application.

Your task is to analyze a note and determine which blueprint(s) it should be categorized under.

## Instructions

1. Read the note content carefully from the DATA CONTEXT below
2. Examine the available blueprints in the project
3. Determine which blueprint(s) best match the note's content
4. Return your analysis as structured JSON`;

/**
 * The system-appended portion shown to the user as a locked preview.
 * Also intentionally English-only for the same AI-prompt-fidelity reason.
 */
const LOCKED_PREAMBLE = `## Response Format

Return ONLY valid JSON in this exact format:
{
  "analysis": { "summary": "...", "detected_entities": [...] },
  "categorizations": [{ "blueprint_slug": "...", "confidence": 0.95, "reasoning": "..." }]
}

## Rules
- Confidence must be between 0.0 and 1.0
- Only suggest blueprints that exist in the DATA CONTEXT
- If no blueprint matches well (confidence < 0.5), return an empty categorizations array
- A note can match multiple blueprints if it contains different entity types`;

function AiSortingSection({ projectId }: { projectId: number }) {
    const t = useT();
    const [prompts, setPrompts] = useState<SortingPrompt[]>([]);
    const [editing, setEditing] = useState<SortingPrompt | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/sorting-prompts`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.ok ? r.json() : [])
            .then(setPrompts)
            .catch(() => setPrompts([]));
    }, [projectId]);

    function startNew() {
        setEditing({ id: 0, name: '', instructions: DEFAULT_INSTRUCTIONS, is_default: prompts.length === 0 });
        setIsNew(true);
    }

    function startEdit(prompt: SortingPrompt) {
        setEditing({ ...prompt });
        setIsNew(false);
    }

    async function save() {
        if (!editing) return;
        setSaving(true);
        const res = await fetch(`/api/v1/projects/${projectId}/sorting-prompts`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
            body: JSON.stringify({
                id: isNew ? null : editing.id,
                name: editing.name,
                instructions: editing.instructions,
                is_default: editing.is_default,
            }),
        });
        if (res.ok) {
            const saved = await res.json();
            if (isNew) {
                setPrompts((prev) => saved.is_default ? [...prev.map((p: SortingPrompt) => ({ ...p, is_default: false })), saved] : [...prev, saved]);
            } else {
                setPrompts((prev) => prev.map((p) => p.id === saved.id ? saved : (saved.is_default ? { ...p, is_default: false } : p)));
            }
            setEditing(null);
        }
        setSaving(false);
    }

    async function deletePrompt(id: number) {
        await fetch(`/api/v1/projects/${projectId}/sorting-prompts/${id}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        });
        setPrompts((prev) => prev.filter((p) => p.id !== id));
        if (editing?.id === id) setEditing(null);
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">{t('projects.settings_tab.ai_sorting.title')}</h2>
                <p className="mt-1 text-sm" style={labelText}>
                    {t('projects.settings_tab.ai_sorting.subtitle')}
                </p>
            </div>

            {editing ? (
                /* Editor */
                <div className="space-y-4" style={cardStyle}>
                    <div>
                        <label className="text-xs font-semibold" style={bodyText}>
                            {t('projects.settings_tab.ai_sorting.name_label')}
                        </label>
                        <input
                            type="text"
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            placeholder={t('projects.settings_tab.ai_sorting.name_placeholder')}
                            className="mt-1 w-full"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold" style={bodyText}>
                            {t('projects.settings_tab.ai_sorting.instructions_label')}
                        </label>
                        <p className="mt-0.5 text-xs" style={microText}>
                            {t('projects.settings_tab.ai_sorting.instructions_hint')}
                        </p>
                        <textarea
                            value={editing.instructions}
                            onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
                            rows={12}
                            className="mt-2 w-full"
                            style={textareaStyle}
                        />
                    </div>

                    {/* Locked section preview */}
                    <div style={lockedSectionStyle}>
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={microText}>
                            <i className="fa-solid fa-lock text-[0.625rem]" aria-hidden="true" />
                            {t('projects.settings_tab.ai_sorting.locked_header')}
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed" style={microText}>
                            {LOCKED_PREAMBLE}
                        </pre>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={editing.is_default}
                            onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                            className="alex-checkbox"
                        />
                        <span className="text-sm" style={bodyText}>
                            {t('projects.settings_tab.ai_sorting.set_default_label')}
                        </span>
                    </label>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="alex-btn"
                            style={ghostBtnStyle}
                        >
                            {t('projects.settings_tab.ai_sorting.cancel')}
                        </button>
                        <ActionButton
                            icon="fa-solid fa-save"
                            label={isNew
                                ? t('projects.settings_tab.ai_sorting.create_prompt')
                                : t('projects.settings_tab.ai_sorting.save_changes')}
                            onClick={() => void save()}
                            loading={saving}
                            disabled={!editing.name.trim() || !editing.instructions.trim()}
                        />
                    </div>
                </div>
            ) : (
                /* List */
                <>
                    {prompts.length === 0 ? (
                        <div className="py-12 text-center" style={dashedEmptyStyle}>
                            <i
                                className="fa-solid fa-wand-magic-sparkles mb-3 text-3xl"
                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }}
                                aria-hidden="true"
                            />
                            <p className="text-sm" style={microText}>
                                {t('projects.settings_tab.ai_sorting.empty.title')}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' }}>
                                {t('projects.settings_tab.ai_sorting.empty.subtitle')}
                            </p>
                            <button
                                type="button"
                                onClick={startNew}
                                className="alex-btn mt-4 inline-flex items-center"
                                style={primaryBtnStyle}
                            >
                                <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
                                {t('projects.settings_tab.ai_sorting.empty.button')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {prompts.map((prompt) => (
                                <div key={prompt.id} className="group flex items-center gap-4" style={promptItemStyle}>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">{prompt.name}</span>
                                            {prompt.is_default && (
                                                <span style={defaultBadgeStyle}>
                                                    {t('projects.settings_tab.ai_sorting.default_badge')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 truncate text-xs" style={fadedText}>
                                            {prompt.instructions.slice(0, 120)}...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(prompt)}
                                            className="alex-btn"
                                            style={iconBtnGhostStyle}
                                            title={t('projects.settings_tab.ai_sorting.tooltip.edit')}
                                            aria-label={t('projects.settings_tab.ai_sorting.tooltip.edit')}
                                        >
                                            <i className="fa-solid fa-pencil text-xs" style={fadedText} aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void deletePrompt(prompt.id)}
                                            className="alex-btn"
                                            style={iconBtnGhostStyle}
                                            title={t('projects.settings_tab.ai_sorting.tooltip.delete')}
                                            aria-label={t('projects.settings_tab.ai_sorting.tooltip.delete')}
                                        >
                                            <i
                                                className="fa-solid fa-trash text-xs"
                                                style={{ color: 'color-mix(in srgb, var(--theme-status-error-stroke) 30%, transparent)' }}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={startNew}
                                className="alex-btn inline-flex items-center"
                                style={ghostPrimaryLinkStyle}
                            >
                                <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
                                {t('projects.settings_tab.ai_sorting.add_another')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function AnimatedContent({ sectionKey, children }: { sectionKey: string; children: ReactNode }) {
    const ref = useEnterAnimation<HTMLDivElement>(sectionKey);

    return <div ref={ref}>{children}</div>;
}

/* ── Project Media Section ── */

function ProjectMediaSection({ project }: { project: ProjectDetail }) {
    const t = useT();
    const projectId = project.id;
    const [media, setMedia] = useState<Array<{ id: number; collection: string; original_url: string; conversions: Record<string, string>; alt_text: string | null; caption: string | null }>>([]);
    const [loading, setLoading] = useState(true);
    const [showUploader, setShowUploader] = useState<'page_image' | 'banner' | null>(null);

    const fetchMedia = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/projects/${projectId}/media`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (res.ok) setMedia(await res.json());
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { void fetchMedia(); }, [fetchMedia]);

    const pageImage = media.find((m) => m.collection === 'page_image');
    const banner = media.find((m) => m.collection === 'banner');
    const [inheritDownward, setInheritDownward] = useState(project.inherit_media_downward);

    async function toggleInheritDownward(next: boolean) {
        setInheritDownward(next);
        router.put(
            `/p/${project.slug}/settings`,
            {
                name: project.name,
                logline: project.logline ?? '',
                summary: project.summary ?? '',
                contents: project.contents ?? '',
                inherit_media_downward: next,
            },
            { preserveState: true, preserveScroll: true },
        );
    }

    async function removeMedia(mediaId: number) {
        if (!confirm(t('projects.settings_tab.media.confirm_remove'))) return;
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        await fetch(`/api/v1/projects/${projectId}/media/${mediaId}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrfToken },
            credentials: 'same-origin',
        });
        void fetchMedia();
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold">{t('projects.settings_tab.media.title')}</h2>
                <p className="text-sm" style={labelText}>{t('projects.settings_tab.media.subtitle')}</p>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <i className="fa-solid fa-circle-notch fa-spin text-base" style={microText} aria-hidden="true" />
                </div>
            )}

            {/* Inherit downward toggle */}
            <div style={mediaCardStyle}>
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        checked={inheritDownward}
                        onChange={(e) => void toggleInheritDownward(e.target.checked)}
                        className="alex-checkbox mt-0.5"
                    />
                    <div>
                        <span className="text-sm font-semibold">{t('projects.settings_tab.media.inherit_label')}</span>
                        <p className="mt-0.5 text-xs" style={labelText}>
                            {t('projects.settings_tab.media.inherit_hint')}
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
                                style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)' }}
                                aria-hidden="true"
                            />
                            {t('projects.settings_tab.media.page_image_heading')}
                        </h3>
                        {pageImage ? (
                            <MediaPreview
                                src={pageImage.conversions.square ?? pageImage.original_url}
                                alt={pageImage.alt_text}
                                aspectClass="h-32 w-32"
                                onChange={() => setShowUploader('page_image')}
                                onRemove={() => void removeMedia(pageImage.id)}
                                t={t}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowUploader('page_image')}
                                className="flex h-32 w-32 items-center justify-center"
                                style={dashedUploadBoxStyle}
                            >
                                <UploadPlaceholder label={t('projects.settings_tab.media.upload')} />
                            </button>
                        )}
                    </div>

                    {/* Banner */}
                    <div style={mediaCardStyle}>
                        <h3 className="mb-3 text-sm font-semibold">
                            <i
                                className="fa-solid fa-panorama mr-2"
                                style={{ color: 'color-mix(in srgb, var(--theme-brand-secondary-500) 60%, transparent)' }}
                                aria-hidden="true"
                            />
                            {t('projects.settings_tab.media.banner_heading')}
                        </h3>
                        {banner ? (
                            <MediaPreview
                                src={banner.conversions.desktop ?? banner.original_url}
                                alt={banner.alt_text}
                                aspectClass="aspect-[1920/400] w-full"
                                onChange={() => setShowUploader('banner')}
                                onRemove={() => void removeMedia(banner.id)}
                                t={t}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowUploader('banner')}
                                className="flex aspect-[1920/400] w-full items-center justify-center"
                                style={dashedUploadBoxStyle}
                            >
                                <UploadPlaceholder label={t('projects.settings_tab.media.upload_banner')} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Project-wide Media Library placeholder */}
            <div className="py-12 text-center" style={dashedEmptyStyle}>
                <i
                    className="fa-solid fa-photo-film text-3xl"
                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)' }}
                    aria-hidden="true"
                />
                <p className="mt-2 text-sm font-medium" style={fadedText}>
                    {t('projects.settings_tab.media.library_title')}
                </p>
                <p className="mt-1 text-xs" style={microText}>
                    {t('projects.settings_tab.media.library_subtitle')}
                </p>
            </div>

            {/* Uploader Modal */}
            {showUploader && (
                <ImageUploaderModal
                    modelType="projects"
                    modelId={projectId}
                    collection={showUploader}
                    onUploaded={() => { setShowUploader(null); void fetchMedia(); }}
                    onClose={() => setShowUploader(null)}
                    t={t}
                />
            )}
        </div>
    );
}

function MediaPreview({ src, alt, aspectClass, onChange, onRemove, t }: {
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
                alt={alt ?? ''}
                className={`${aspectClass} rounded-xl object-cover`}
            />
            {alt && (
                <p className="text-xs" style={fadedText}>
                    {t('projects.settings_tab.media.alt_label')} {alt}
                </p>
            )}
            <div className="flex gap-2">
                <button type="button" onClick={onChange} className="alex-btn" style={iconBtnGhostStyle}>
                    {t('projects.settings_tab.media.change')}
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    className="alex-btn"
                    style={{ ...iconBtnGhostStyle, color: 'var(--theme-status-error-stroke)' }}
                >
                    {t('projects.settings_tab.media.remove')}
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
                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' }}
                aria-hidden="true"
            />
            <p className="mt-1 text-xs" style={microText}>
                {label}
            </p>
        </div>
    );
}

/* ── Uploader wrapped in Modal ── */

function ImageUploaderModal({ modelType, modelId, collection, onUploaded, onClose, t }: {
    modelType: 'projects' | 'blueprints' | 'entries';
    modelId: number;
    collection: 'page_image' | 'banner' | 'gallery';
    onUploaded: () => void;
    onClose: () => void;
    t: Translator;
}) {
    const titleKey = collection === 'page_image'
        ? 'projects.settings_tab.media.uploader.title_page_image'
        : collection === 'banner'
            ? 'projects.settings_tab.media.uploader.title_banner'
            : 'projects.settings_tab.media.uploader.title_default';

    return (
        <Modal open={true} onClose={onClose} maxWidth="max-w-lg">
            <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center" style={uploaderIconWrapStyle}>
                        <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-bold">{t(titleKey)}</h3>
                        <p className="text-xs" style={fadedText}>
                            {t('projects.settings_tab.media.uploader.file_type_hint')}
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
