import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Button from '@alexandria/components/ui/Button';
import Input from '@alexandria/components/form/Input';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT, { type Translator } from '@alexandria/hooks/useT';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';

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

type VisibilityVariant = 'success' | 'info' | 'neutral';

interface VisibilityConfig {
    labelKey: string;
    icon: string;
    variant: VisibilityVariant;
}

const VISIBILITY_CONFIG: Record<string, VisibilityConfig> = {
    public: { labelKey: 'links.visibility.public', icon: 'fa-globe', variant: 'success' },
    authenticated: { labelKey: 'links.visibility.authenticated', icon: 'fa-users', variant: 'info' },
    private: { labelKey: 'links.visibility.private', icon: 'fa-lock', variant: 'neutral' },
};

/* ── Status pill — matches AiSections / PrivacySections families. ── */
function StatusBadge({ children, variant = 'neutral', icon }: {
    children: React.ReactNode;
    variant?: VisibilityVariant;
    icon?: string;
}) {
    const palettes: Record<VisibilityVariant, { bg: string; fg: string }> = {
        success: { bg: 'var(--theme-status-success-subtle)', fg: 'var(--theme-status-success-fill)' },
        info: { bg: 'var(--theme-status-info-subtle)', fg: 'var(--theme-status-info-fill)' },
        neutral: {
            bg: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
            fg: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
        },
    };
    const p = palettes[variant];
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: p.bg, color: p.fg, borderRadius: '9999px' }}
        >
            {icon && <i className={`${icon} text-[10px]`} />}
            {children}
        </span>
    );
}

/* ── Visibility radio-pill cluster, shared between Add and Edit forms. ── */
function VisibilityPicker({ t, value, onChange }: { t: Translator; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <span className="mb-1.5 block text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                {t('links.form.visibility_field')}
            </span>
            <div className="flex flex-wrap gap-2">
                {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => {
                    const selected = value === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onChange(key)}
                            aria-pressed={selected}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                            style={{
                                border: `2px solid ${selected ? 'var(--theme-brand-secondary-500)' : 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)'}`,
                                background: selected
                                    ? 'color-mix(in srgb, var(--theme-brand-secondary-500) 12%, transparent)'
                                    : 'transparent',
                                color: selected
                                    ? 'var(--theme-brand-secondary-500)'
                                    : 'var(--theme-base-content)',
                                borderRadius: '9999px',
                            }}
                        >
                            <i className={`fa-solid ${config.icon}`} />
                            {t(config.labelKey)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function LinksSection({ links: initialLinks, platforms, onLinksChanged }: LinksSectionProps) {
    const t = useT();
    const toast = useToastContext();
    const [links, setLinks] = useState<UserLink[]>(initialLinks);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingLink, setEditingLink] = useState<UserLink | null>(null);

    return (
        <div className="space-y-6">
            {links.length > 0 ? (
                <div className="space-y-3">
                    {links.map((link) => (
                        <LinkCard
                            key={link.id}
                            t={t}
                            link={link}
                            onEdit={() => setEditingLink(link)}
                            onDelete={() => {
                                fetch(`/account/links/${link.id}`, { method: 'DELETE', headers: csrfHeaders() })
                                    .then(() => {
                                        setLinks((prev) => prev.filter((l) => l.id !== link.id));
                                        onLinksChanged();
                                        toast.show(t('settings.toast.link_deleted'), { type: 'success' });
                                    });
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center py-10 text-center">
                    <div
                        className="mb-3 flex h-16 w-16 items-center justify-center rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)' }}
                    >
                        <i className="fa-solid fa-link text-2xl" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }} />
                    </div>
                    <p style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>{t('links.empty_heading')}</p>
                    <p className="mt-1 text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}>
                        {t('links.empty_subtitle')}
                    </p>
                </div>
            )}

            {!showAddForm ? (
                <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all"
                    style={{
                        border: '2px dashed color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
                        background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
                        color: 'color-mix(in srgb, var(--theme-base-content) 75%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                    }}
                >
                    <i className="fa-solid fa-plus" />
                    {t('links.add_button')}
                </button>
            ) : (
                <AddLinkForm
                    t={t}
                    platforms={platforms}
                    onAdd={(newLink) => {
                        setLinks((prev) => [...prev, newLink]);
                        setShowAddForm(false);
                        onLinksChanged();
                        toast.show(t('settings.toast.link_added'), { type: 'success' });
                    }}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            <EditLinkModal
                t={t}
                link={editingLink}
                onSave={(updated) => {
                    setLinks((prev) => prev.map((l) => l.id === updated.id ? { ...l, ...updated } : l));
                    setEditingLink(null);
                    onLinksChanged();
                    toast.show(t('settings.toast.link_updated'), { type: 'success' });
                }}
                onClose={() => setEditingLink(null)}
            />
        </div>
    );
}

/* ── Link Card ── */
function LinkCard({ t, link, onEdit, onDelete }: { t: Translator; link: UserLink; onEdit: () => void; onDelete: () => void }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const vis = VISIBILITY_CONFIG[link.visibility] ?? VISIBILITY_CONFIG.private;

    useEffect(() => {
        if (cardRef.current) {
            gsap.fromTo(cardRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
        }
    }, []);

    const cardStyle = {
        background: 'var(--theme-base-page)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const platformColor = link.platform_color ?? '#666';

    return (
        <div ref={cardRef} className="group flex items-center gap-3 p-4 transition-shadow hover:shadow-sm" style={cardStyle}>
            <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                style={{
                    backgroundColor: `color-mix(in srgb, ${platformColor} 20%, transparent)`,
                    borderRadius: 'var(--theme-radius-input)',
                }}
            >
                <i
                    className={`${link.platform_icon ?? 'fa-solid fa-link'} text-lg`}
                    style={{ color: link.platform_color ?? undefined }}
                />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{link.platform_name ?? t('links.card.fallback_name')}</span>
                    {link.label && <StatusBadge variant="neutral">{link.label}</StatusBadge>}
                    <StatusBadge variant={vis.variant} icon={`fa-solid ${vis.icon}`}>
                        {t(vis.labelKey)}
                    </StatusBadge>
                </div>
                <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm hover:underline"
                    style={{ color: 'var(--theme-brand-primary-500)' }}
                >
                    {link.handle ? `@${link.handle}` : link.url}
                </a>
            </div>

            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    icon="fa-solid fa-pen text-xs"
                    iconPosition="before"
                    aria-label={t('common.edit')}
                >
                    <span className="sr-only">{t('common.edit')}</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    icon="fa-solid fa-trash text-xs"
                    iconPosition="before"
                    aria-label={t('common.delete')}
                >
                    <span className="sr-only">{t('common.delete')}</span>
                </Button>
            </div>
        </div>
    );
}

/* ── Add Link Form ── */
function AddLinkForm({ t, platforms, onAdd, onCancel }: {
    t: Translator;
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

    const allPlatforms = Object.values(platforms).flat();
    const selectedPlatform = platformId ? allPlatforms.find((p) => p.id === parseInt(platformId)) : null;

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
                    setError(data.message ?? t('links.error.add_failed'));
                }
            })
            .catch(() => { setSaving(false); setError(t('links.error.generic')); });
    }

    const containerStyle = {
        background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const showHandle = selectedPlatform && (selectedPlatform.url_pattern || selectedPlatform.base_url);
    const urlHint = handle && selectedPlatform?.url_pattern ? t('links.form.url_auto') : t('links.form.url_required');

    return (
        <div ref={formRef} className="p-5" style={containerStyle}>
            <h4 className="mb-4 font-serif text-xl font-bold leading-tight">
                <i className="fa-solid fa-plus mr-2" style={{ color: 'var(--theme-brand-primary-500)' }} />
                {t('links.form.add_heading')}
            </h4>

            <div className="space-y-4">
                <div>
                    <span className="mb-1.5 block text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                        {t('links.form.platform_field')}
                    </span>
                    <select
                        value={platformId}
                        onChange={(e) => { setPlatformId(e.target.value); setUrl(''); setHandle(''); }}
                        className="alex-select h-12 w-full text-sm"
                    >
                        <option value="">{t('links.form.platform_placeholder')}</option>
                        {Object.entries(platforms).map(([type, items]) => (
                            <optgroup key={type} label={t(`links.type.${type}`, type)}>
                                {items.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {showHandle && (
                    <div>
                        <span className="mb-1.5 block text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                            {t('links.form.handle_field')}
                        </span>
                        <div className="relative">
                            <span
                                className="absolute left-4 top-1/2 z-10 -translate-y-1/2"
                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}
                            >@</span>
                            <Input
                                size="md"
                                value={handle}
                                onChange={(e) => setHandle(e.target.value)}
                                placeholder={t('links.form.handle_placeholder')}
                                className="pl-8"
                            />
                        </div>
                    </div>
                )}

                <Input
                    size="md"
                    type="url"
                    label={t('links.form.url_field')}
                    hint={urlHint}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('links.form.url_placeholder')}
                />

                <Input
                    size="md"
                    label={t('links.form.label_field')}
                    hint={t('links.form.label_optional')}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t('links.form.label_placeholder')}
                    maxLength={50}
                />

                <VisibilityPicker t={t} value={visibility} onChange={setVisibility} />

                {error && (
                    <p className="text-sm" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        <i className="fa-solid fa-circle-xmark mr-1" />{error}
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!platformId || !url}
                        loading={saving}
                        icon="fa-solid fa-plus"
                        iconPosition="before"
                    >
                        {saving ? t('links.adding') : t('links.add_action_button')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Edit Link Modal ── */
function EditLinkModal({ t, link, onSave, onClose }: {
    t: Translator;
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

    const platformName = link?.platform_name ?? t('links.card.fallback_name');
    const dividerStyle = {
        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    };

    return (
        <Modal open={!!link} onClose={onClose}>
            <ModalHeader title={t('links.form.edit_heading').replace(':platform', platformName)} onClose={onClose} />
            <div className="space-y-4 p-6">
                <Input
                    size="md"
                    label={t('links.form.handle_field')}
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder={t('links.form.handle_placeholder')}
                />
                <Input
                    size="md"
                    type="url"
                    label={t('links.form.url_field')}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('links.form.url_placeholder')}
                />
                <Input
                    size="md"
                    label={t('links.form.label_field')}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t('links.form.label_optional')}
                    maxLength={50}
                />
                <VisibilityPicker t={t} value={visibility} onChange={setVisibility} />
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4" style={dividerStyle}>
                <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
                <Button variant="primary" onClick={handleSave} disabled={!url} loading={saving}>
                    {saving ? t('common.saving') : t('links.save_button')}
                </Button>
            </div>
        </Modal>
    );
}
