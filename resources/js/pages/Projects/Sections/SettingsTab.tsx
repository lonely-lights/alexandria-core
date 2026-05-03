import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { useEnterAnimation } from '@alexandria/hooks/useEnterAnimation';
import ProjectDetailsSection from './settings/ProjectDetailsSection';
import MembersSection from './settings/MembersSection';
import DangerZoneSection from './settings/DangerZoneSection';
import ActionButton from '@alexandria/components/ui/ActionButton';
import type { ProjectDetail, ProjectSettings } from '@alexandria/types/projects';

interface SettingsTabProps {
    project: ProjectDetail;
    settings: ProjectSettings;
}

const TABS = [
    { key: 'details', label: 'Project', icon: 'fa-pen-to-square' },
    { key: 'media', label: 'Media', icon: 'fa-image' },
    { key: 'ai-sorting', label: 'AI Sorting', icon: 'fa-wand-magic-sparkles' },
    { key: 'members', label: 'Members', icon: 'fa-users' },
    { key: 'danger', label: 'Danger Zone', icon: 'fa-triangle-exclamation' },
];

export default function SettingsTab({ project, settings }: SettingsTabProps) {
    const [activeTab, setActiveTab] = useState('details');

    return (
        <div className="flex flex-col gap-8 lg:flex-row">
            {/* Left nav */}
            <nav className="hidden w-48 flex-shrink-0 space-y-1 lg:block">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition-all ${
                            activeTab === tab.key ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
                        }`}
                    >
                        <i className={`fa-solid ${tab.icon} w-4 text-center ${
                            activeTab === tab.key ? 'text-primary' : tab.key === 'danger' ? 'text-error' : 'text-base-content/50'
                        }`} />
                        <span className={tab.key === 'danger' && activeTab !== tab.key ? 'text-error' : ''}>{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Mobile tabs */}
            <div className="flex gap-1 overflow-x-auto lg:hidden">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                            activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-base-200'
                        }`}
                    >
                        <i className={`fa-solid ${tab.icon} text-xs`} />
                        {tab.label}
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

const DEFAULT_INSTRUCTIONS = `You are an AI assistant for Alexandria, a worldbuilding application.

Your task is to analyze a note and determine which blueprint(s) it should be categorized under.

## Instructions

1. Read the note content carefully from the DATA CONTEXT below
2. Examine the available blueprints in the project
3. Determine which blueprint(s) best match the note's content
4. Return your analysis as structured JSON`;

function AiSortingSection({ projectId }: { projectId: number }) {
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
                <h2 className="text-xl font-bold">AI Sorting Prompts</h2>
                <p className="mt-1 text-sm text-base-content/50">
                    Customize how AI categorizes your notes into blueprints. The instructions you write here replace the default preamble — the response format and rules are locked to ensure consistency.
                </p>
            </div>

            {editing ? (
                /* Editor */
                <div className="space-y-4 rounded-2xl border border-base-300 bg-base-100 p-6">
                    <div>
                        <label className="text-xs font-semibold text-base-content/60">Prompt Name</label>
                        <input
                            type="text"
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            placeholder="e.g., Default Sorting, Character-focused, Location-heavy..."
                            className="input input-bordered mt-1 w-full rounded-xl text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-base-content/60">Instructions</label>
                        <p className="mt-0.5 text-xs text-base-content/30">
                            This is the editable preamble that guides the AI. The response format and rules are automatically appended.
                        </p>
                        <textarea
                            value={editing.instructions}
                            onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
                            rows={12}
                            className="textarea textarea-bordered mt-2 w-full rounded-xl font-mono text-xs leading-relaxed"
                        />
                    </div>

                    {/* Locked section preview */}
                    <div className="rounded-xl border border-base-content/5 bg-base-200/20 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-base-content/30">
                            <i className="fa-solid fa-lock text-[0.625rem]" />
                            System-locked (appended automatically)
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-base-content/30">
{`## Response Format

Return ONLY valid JSON in this exact format:
{
  "analysis": { "summary": "...", "detected_entities": [...] },
  "categorizations": [{ "blueprint_slug": "...", "confidence": 0.95, "reasoning": "..." }]
}

## Rules
- Confidence must be between 0.0 and 1.0
- Only suggest blueprints that exist in the DATA CONTEXT
- If no blueprint matches well (confidence < 0.5), return an empty categorizations array
- A note can match multiple blueprints if it contains different entity types`}
                        </pre>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={editing.is_default}
                            onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                            className="checkbox checkbox-primary checkbox-sm"
                        />
                        <span className="text-sm text-base-content/60">Set as default sorting prompt</span>
                    </label>

                    <div className="flex items-center justify-between">
                        <button onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">Cancel</button>
                        <ActionButton
                            icon="fa-solid fa-save"
                            label={isNew ? 'Create Prompt' : 'Save Changes'}
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
                        <div className="rounded-2xl border border-dashed border-base-content/10 py-12 text-center">
                            <i className="fa-solid fa-wand-magic-sparkles mb-3 text-3xl text-base-content/10" />
                            <p className="text-sm text-base-content/30">No custom sorting prompts</p>
                            <p className="mt-1 text-xs text-base-content/20">The system default will be used. Create a custom prompt to tailor AI sorting for your project.</p>
                            <button onClick={startNew} className="btn btn-primary btn-sm mt-4">
                                <i className="fa-solid fa-plus text-xs" /> Create Sorting Prompt
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {prompts.map((prompt) => (
                                <div key={prompt.id} className="group flex items-center gap-4 rounded-2xl border border-base-300 bg-base-100 px-5 py-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">{prompt.name}</span>
                                            {prompt.is_default && (
                                                <span className="badge badge-primary badge-sm">Default</span>
                                            )}
                                        </div>
                                        <p className="mt-1 truncate text-xs text-base-content/40">{prompt.instructions.slice(0, 120)}...</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button onClick={() => startEdit(prompt)} className="btn btn-ghost btn-xs rounded-lg" title="Edit">
                                            <i className="fa-solid fa-pencil text-xs text-base-content/40" />
                                        </button>
                                        <button onClick={() => void deletePrompt(prompt.id)} className="btn btn-ghost btn-xs rounded-lg" title="Delete">
                                            <i className="fa-solid fa-trash text-xs text-error/30" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={startNew} className="btn btn-ghost btn-sm gap-1.5 text-primary">
                                <i className="fa-solid fa-plus text-xs" /> Add Another Prompt
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
        if (!confirm('Remove this image?')) return;
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
                <h2 className="text-lg font-bold">Media</h2>
                <p className="text-sm text-base-content/50">Manage the project's page image and banner.</p>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <span className="loading loading-spinner loading-md" />
                </div>
            )}

            {/* Inherit downward toggle */}
            <div className="rounded-xl border border-base-300/50 bg-base-100 p-5">
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        checked={inheritDownward}
                        onChange={(e) => void toggleInheritDownward(e.target.checked)}
                        className="checkbox checkbox-primary checkbox-sm mt-0.5"
                    />
                    <div>
                        <span className="text-sm font-semibold">Inherit media downward</span>
                        <p className="mt-0.5 text-xs text-base-content/50">
                            When on, covers and banners set at the project or blueprint level apply
                            to everything beneath unless overridden.
                        </p>
                    </div>
                </label>
            </div>

            {!loading && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Page Image */}
                    <div className="rounded-xl border border-base-300/50 bg-base-100 p-5">
                        <h3 className="mb-3 text-sm font-semibold">
                            <i className="fa-solid fa-image mr-2 text-primary/60" />
                            Page Image
                        </h3>
                        {pageImage ? (
                            <div className="space-y-3">
                                <img
                                    src={pageImage.conversions.square ?? pageImage.original_url}
                                    alt={pageImage.alt_text ?? ''}
                                    className="h-32 w-32 rounded-xl object-cover"
                                />
                                {pageImage.alt_text && (
                                    <p className="text-xs text-base-content/40">Alt: {pageImage.alt_text}</p>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => setShowUploader('page_image')} className="btn btn-ghost btn-xs">Change</button>
                                    <button onClick={() => void removeMedia(pageImage.id)} className="btn btn-ghost btn-xs text-error">Remove</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowUploader('page_image')}
                                className="flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed border-base-300 transition-colors hover:border-primary/30 hover:bg-base-200/20"
                            >
                                <div className="text-center">
                                    <i className="fa-solid fa-plus text-lg text-base-content/20" />
                                    <p className="mt-1 text-xs text-base-content/30">Upload</p>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Banner */}
                    <div className="rounded-xl border border-base-300/50 bg-base-100 p-5">
                        <h3 className="mb-3 text-sm font-semibold">
                            <i className="fa-solid fa-panorama mr-2 text-secondary/60" />
                            Banner
                        </h3>
                        {banner ? (
                            <div className="space-y-3">
                                <img
                                    src={banner.conversions.desktop ?? banner.original_url}
                                    alt={banner.alt_text ?? ''}
                                    className="aspect-[1920/400] w-full rounded-lg object-cover"
                                />
                                {banner.alt_text && (
                                    <p className="text-xs text-base-content/40">Alt: {banner.alt_text}</p>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => setShowUploader('banner')} className="btn btn-ghost btn-xs">Change</button>
                                    <button onClick={() => void removeMedia(banner.id)} className="btn btn-ghost btn-xs text-error">Remove</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowUploader('banner')}
                                className="flex aspect-[1920/400] w-full items-center justify-center rounded-lg border-2 border-dashed border-base-300 transition-colors hover:border-secondary/30 hover:bg-base-200/20"
                            >
                                <div className="text-center">
                                    <i className="fa-solid fa-plus text-lg text-base-content/20" />
                                    <p className="mt-1 text-xs text-base-content/30">Upload Banner</p>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Project-wide Media Library placeholder */}
            <div className="rounded-xl border-2 border-dashed border-base-300 py-12 text-center">
                <i className="fa-solid fa-photo-film text-3xl text-base-content/15" />
                <p className="mt-2 text-sm font-medium text-base-content/40">Project Media Library</p>
                <p className="mt-1 text-xs text-base-content/30">Browse and search all images across this project — coming soon</p>
            </div>

            {/* Uploader Modal */}
            {showUploader && (
                <ImageUploaderModal
                    modelType="projects"
                    modelId={projectId}
                    collection={showUploader}
                    onUploaded={() => { setShowUploader(null); void fetchMedia(); }}
                    onClose={() => setShowUploader(null)}
                />
            )}
        </div>
    );
}

/* ── Uploader wrapped in Modal ── */

import Modal from '@alexandria/components/ui/Modal';
import ImageUploader from '@alexandria/components/media/ImageUploader';

function ImageUploaderModal({ modelType, modelId, collection, onUploaded, onClose }: {
    modelType: 'projects' | 'blueprints' | 'entries';
    modelId: number;
    collection: 'page_image' | 'banner' | 'gallery';
    onUploaded: () => void;
    onClose: () => void;
}) {
    return (
        <Modal open={true} onClose={onClose} maxWidth="max-w-lg">
            <div className="p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <i className="fa-solid fa-cloud-arrow-up text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold">Upload {collection === 'page_image' ? 'Page Image' : collection === 'banner' ? 'Banner' : 'Image'}</h3>
                        <p className="text-xs text-base-content/40">JPEG, PNG, or WebP</p>
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
