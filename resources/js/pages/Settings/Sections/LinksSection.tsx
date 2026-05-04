import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

interface UserLink {
    id: number;
    platform_id: number | null;
    platform_name: string | null;
    platform_icon: string | null;
    platform_color: string | null;
    handle: string | null;
    url: string;
    label: string | null;
    visibility: string;
}

interface Platform {
    id: number;
    slug: string;
    name: string;
    icon: string;
    color: string;
    base_url: string | null;
    url_pattern: string | null;
}

interface LinksSectionProps {
    links: UserLink[];
    platforms: Record<string, Platform[]>;
    onLinksChanged: () => void;
}

const VISIBILITY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    public: { label: 'Public', icon: 'fa-globe', color: 'badge-success' },
    authenticated: { label: 'Members', icon: 'fa-users', color: 'badge-info' },
    private: { label: 'Private', icon: 'fa-lock', color: '' },
};

const TYPE_LABELS: Record<string, string> = {
    social: 'Social Media',
    support: 'Creator Support',
    professional: 'Professional',
    creative: 'Creative',
    other: 'Other',
};

export default function LinksSection({ links: initialLinks, platforms, onLinksChanged }: LinksSectionProps) {
    const [links, setLinks] = useState<UserLink[]>(initialLinks);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingLink, setEditingLink] = useState<UserLink | null>(null);

    return (
        <div className="space-y-6">
            {/* Link List */}
            {links.length > 0 ? (
                <div className="space-y-3">
                    {links.map((link) => (
                        <LinkCard
                            key={link.id}
                            link={link}
                            onEdit={() => setEditingLink(link)}
                            onDelete={() => {
                                fetch(`/account/links/${link.id}`, { method: 'DELETE', headers: csrfHeaders() })
                                    .then(() => {
                                        setLinks((prev) => prev.filter((l) => l.id !== link.id));
                                        onLinksChanged();
                                    });
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-base-300">
                        <i className="fa-solid fa-link text-2xl text-base-content/30" />
                    </div>
                    <p className="text-base-content/50">No links yet</p>
                    <p className="mt-1 text-xs text-base-content/40">Add your social media, portfolio, and support links</p>
                </div>
            )}

            {/* Add Button */}
            {!showAddForm ? (
                <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-ghost w-full gap-2 rounded-2xl border-2 border-dashed border-base-content/30 bg-base-200/50 text-base-content/80 transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                    <i className="fa-solid fa-plus" />
                    Add Link
                </button>
            ) : (
                <AddLinkForm
                    platforms={platforms}
                    onAdd={(newLink) => {
                        setLinks((prev) => [...prev, newLink]);
                        setShowAddForm(false);
                        onLinksChanged();
                    }}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Edit Modal */}
            <EditLinkModal
                link={editingLink}
                onSave={(updated) => {
                    setLinks((prev) => prev.map((l) => l.id === updated.id ? { ...l, ...updated } : l));
                    setEditingLink(null);
                    onLinksChanged();
                }}
                onClose={() => setEditingLink(null)}
            />
        </div>
    );
}

/* ── Link Card ── */
function LinkCard({ link, onEdit, onDelete }: { link: UserLink; onEdit: () => void; onDelete: () => void }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const vis = VISIBILITY_CONFIG[link.visibility] ?? VISIBILITY_CONFIG.private;

    useEffect(() => {
        if (cardRef.current) {
            gsap.fromTo(cardRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
        }
    }, []);

    return (
        <div
            ref={cardRef}
            className="group flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 transition-all hover:border-base-content/20 hover:shadow-sm"
        >
            {/* Platform Icon */}
            <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: (link.platform_color ?? '#666') + '20' }}
            >
                <i
                    className={`${link.platform_icon ?? 'fa-solid fa-link'} text-lg`}
                    style={{ color: link.platform_color ?? undefined }}
                />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{link.platform_name ?? 'Link'}</span>
                    {link.label && (
                        <span className="badge badge-sm badge-ghost">{link.label}</span>
                    )}
                    <span className={`badge badge-sm ${vis.color}`}>
                        <i className={`fa-solid ${vis.icon} mr-1 text-[10px]`} />
                        {vis.label}
                    </span>
                </div>
                <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-primary hover:underline"
                >
                    {link.handle ? `@${link.handle}` : link.url}
                </a>
            </div>

            {/* Actions */}
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={onEdit} className="btn btn-ghost btn-sm btn-square">
                    <i className="fa-solid fa-pen text-xs" />
                </button>
                <button type="button" onClick={onDelete} className="btn btn-ghost btn-sm btn-square text-error">
                    <i className="fa-solid fa-trash text-xs" />
                </button>
            </div>
        </div>
    );
}

/* ── Add Link Form ── */
function AddLinkForm({ platforms, onAdd, onCancel }: {
    platforms: Record<string, Platform[]>;
    onAdd: (link: UserLink) => void;
    onCancel: () => void;
}) {
    const [platformId, setPlatformId] = useState('');
    const [handle, setHandle] = useState('');
    const [url, setUrl] = useState('');
    const [label, setLabel] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (formRef.current) {
            gsap.fromTo(formRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.2)' });
        }
    }, []);

    // Find selected platform
    const allPlatforms = Object.values(platforms).flat();
    const selectedPlatform = platformId ? allPlatforms.find((p) => p.id === parseInt(platformId)) : null;

    // Auto-generate URL from handle
    useEffect(() => {
        if (selectedPlatform && handle) {
            if (selectedPlatform.url_pattern) {
                setUrl(selectedPlatform.url_pattern.replace('{handle}', handle));
            } else if (selectedPlatform.base_url) {
                setUrl(selectedPlatform.base_url + handle);
            }
        }
    }, [handle, selectedPlatform]);

    function handleSubmit() {
        if (!platformId || !url) return;
        setSaving(true);
        setError(null);

        fetch('/account/links', {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ platform_id: parseInt(platformId), handle: handle || null, url, label: label || null, visibility }),
        })
            .then((r) => r.json())
            .then((data) => {
                setSaving(false);
                if (data.id) {
                    onAdd(data);
                } else {
                    setError(data.message ?? 'Failed to add link');
                }
            })
            .catch(() => { setSaving(false); setError('Something went wrong'); });
    }

    return (
        <div ref={formRef} className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h4 className="mb-4 font-serif text-xl font-bold leading-tight">
                <i className="fa-solid fa-plus mr-2 text-primary" />
                Add New Link
            </h4>

            <div className="space-y-4">
                {/* Platform */}
                <div>
                    <label className="label py-1"><span className="label-text text-sm">Platform</span></label>
                    <select
                        value={platformId}
                        onChange={(e) => { setPlatformId(e.target.value); setUrl(''); setHandle(''); }}
                        className="select select-bordered h-12 w-full rounded-2xl focus:select-primary"
                    >
                        <option value="">Select a platform...</option>
                        {Object.entries(platforms).map(([type, items]) => (
                            <optgroup key={type} label={TYPE_LABELS[type] ?? type}>
                                {items.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Handle */}
                {selectedPlatform && (selectedPlatform.url_pattern || selectedPlatform.base_url) && (
                    <div>
                        <label className="label py-1"><span className="label-text text-sm">Username / Handle</span></label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40">@</span>
                            <input
                                type="text"
                                value={handle}
                                onChange={(e) => setHandle(e.target.value)}
                                className="input input-bordered h-12 w-full rounded-2xl pl-8 focus:input-primary"
                                placeholder="username"
                            />
                        </div>
                    </div>
                )}

                {/* URL */}
                <div>
                    <label className="label py-1">
                        <span className="label-text text-sm">URL</span>
                        <span className="label-text-alt text-xs text-base-content/40">{handle && selectedPlatform?.url_pattern ? 'Auto-generated' : 'Required'}</span>
                    </label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="input input-bordered h-12 w-full rounded-2xl focus:input-primary"
                        placeholder="https://..."
                    />
                </div>

                {/* Label */}
                <div>
                    <label className="label py-1">
                        <span className="label-text text-sm">Label</span>
                        <span className="label-text-alt text-xs text-base-content/40">Optional</span>
                    </label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="input input-bordered h-12 w-full rounded-2xl focus:input-primary"
                        placeholder='e.g., "Personal", "Work"'
                        maxLength={50}
                    />
                </div>

                {/* Visibility */}
                <div>
                    <label className="label py-1"><span className="label-text text-sm">Visibility</span></label>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                            <label key={key} className="cursor-pointer">
                                <input type="radio" className="peer hidden" checked={visibility === key} onChange={() => setVisibility(key)} />
                                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-base-300 px-3 py-1.5 text-xs font-medium transition-all hover:border-base-content/30 peer-checked:border-secondary peer-checked:bg-secondary/10 peer-checked:text-secondary">
                                    <i className={`fa-solid ${config.icon}`} />
                                    {config.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-error"><i className="fa-solid fa-circle-xmark mr-1" />{error}</p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onCancel} className="btn btn-ghost rounded-xl">Cancel</button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="btn btn-primary rounded-xl"
                        disabled={!platformId || !url || saving}
                    >
                        {saving ? <><span className="loading loading-spinner loading-sm" /> Adding...</> : <><i className="fa-solid fa-plus mr-1" /> Add Link</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Edit Link Modal ── */
function EditLinkModal({ link, onSave, onClose }: {
    link: UserLink | null;
    onSave: (updated: Partial<UserLink> & { id: number }) => void;
    onClose: () => void;
}) {
    const [handle, setHandle] = useState('');
    const [url, setUrl] = useState('');
    const [label, setLabel] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (link) {
            setHandle(link.handle ?? '');
            setUrl(link.url);
            setLabel(link.label ?? '');
            setVisibility(link.visibility);
        }
    }, [link]);

    function handleSave() {
        if (!link || !url) return;
        setSaving(true);

        fetch(`/account/links/${link.id}`, {
            method: 'PUT',
            headers: csrfHeaders(),
            body: JSON.stringify({ handle: handle || null, url, label: label || null, visibility }),
        })
            .then(() => {
                setSaving(false);
                onSave({ id: link.id, handle, url, label, visibility });
            })
            .catch(() => setSaving(false));
    }

    return (
        <Modal open={!!link} onClose={onClose}>
            <ModalHeader title={`Edit ${link?.platform_name ?? 'Link'}`} onClose={onClose} />
            <div className="space-y-4 p-6">
                <div>
                    <label className="label py-1"><span className="label-text text-sm">Username / Handle</span></label>
                    <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)}
                           className="input input-bordered h-12 w-full rounded-2xl focus:input-primary" placeholder="username" />
                </div>
                <div>
                    <label className="label py-1"><span className="label-text text-sm">URL</span></label>
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                           className="input input-bordered h-12 w-full rounded-2xl focus:input-primary" placeholder="https://..." />
                </div>
                <div>
                    <label className="label py-1"><span className="label-text text-sm">Label</span></label>
                    <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                           className="input input-bordered h-12 w-full rounded-2xl focus:input-primary" placeholder="Optional" maxLength={50} />
                </div>
                <div>
                    <label className="label py-1"><span className="label-text text-sm">Visibility</span></label>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                            <label key={key} className="cursor-pointer">
                                <input type="radio" className="peer hidden" checked={visibility === key} onChange={() => setVisibility(key)} />
                                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-base-300 px-3 py-1.5 text-xs font-medium transition-all hover:border-base-content/30 peer-checked:border-secondary peer-checked:bg-secondary/10 peer-checked:text-secondary">
                                    <i className={`fa-solid ${config.icon}`} />
                                    {config.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-base-content/10 px-6 py-4">
                <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Cancel</button>
                <button type="button" onClick={handleSave} className="btn btn-primary rounded-xl" disabled={!url || saving}>
                    {saving ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Changes'}
                </button>
            </div>
        </Modal>
    );
}
