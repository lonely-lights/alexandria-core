import { useState, useEffect, type ReactNode } from 'react';
import { useForm } from '@inertiajs/react';
import Select from '@alexandria/components/form/Select';
import Toggle from '@alexandria/components/form/Toggle';
import Input from '@alexandria/components/form/Input';
import Button from '@alexandria/components/ui/Button';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import { useEnterAnimation } from '@alexandria/hooks/useEnterAnimation';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT, { type Translator } from '@alexandria/hooks/useT';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import type { SyntheticEvent } from 'react';

interface FieldConfig {
    label: string;
    icon: string;
    description: string;
}

interface VisibilityOption {
    label: string;
    icon: string;
    description: string;
}

interface PrivacyList {
    id: number;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    is_system: boolean;
    members_count: number;
}

interface PrivacyProps {
    section: string;
    fieldVisibility: Record<string, { visibility: string; include_list_ids: number[] }>;
    privacyLists: PrivacyList[];
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
    privacyOptions: {
        fields: Record<string, FieldConfig>;
        visibility: Record<string, VisibilityOption>;
        list_icons: Record<string, string>;
        list_colors: Record<string, string>;
    };
    onDataChanged: () => void;
}

export default function PrivacySections({ section, ...props }: PrivacyProps) {
    switch (section) {
        case 'visibility': return <FieldVisibilitySection {...props} />;
        case 'settings': return <PrivacySettingsSection preferences={props.preferences} options={props.options} />;
        case 'lists': return <PrivacyListsSection {...props} />;
        default: return null;
    }
}

/* ── Color slug → theme token resolver ──
 * Privacy lists store a colour slug (`primary`, `info`, `success`, …)
 * that historically rendered as DaisyUI utility classes (`bg-primary`,
 * `text-info`, …). With the token migration we resolve the slug to a
 * `--theme-*` CSS variable at render time so preset swaps repaint the
 * lists alongside the rest of the chrome.
 *
 * Brand roles (primary/secondary/accent/neutral) map to `--theme-brand-*`;
 * status roles (info/success/warning/error) to `--theme-status-*`. Unknown
 * slugs fall back to brand-primary so the chip still renders.
 */
function resolveColorVar(slug: string): string {
    switch (slug) {
        case 'primary': return 'var(--theme-brand-primary-500)';
        case 'secondary': return 'var(--theme-brand-secondary-500)';
        case 'accent': return 'var(--theme-brand-accent-500)';
        case 'neutral': return 'var(--theme-base-500)';
        case 'info': return 'var(--theme-status-info-fill)';
        case 'success': return 'var(--theme-status-success-fill)';
        case 'warning': return 'var(--theme-status-warning-fill)';
        case 'error': return 'var(--theme-status-error-stroke)';
        default: return 'var(--theme-brand-primary-500)';
    }
}

/* ── Pill-shaped status badge — same family as AiSections ── */
type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary' | 'neutral';

function StatusBadge({ children, variant = 'neutral', icon }: { children: ReactNode; variant?: BadgeVariant; icon?: string }) {
    const palettes: Record<BadgeVariant, { bg: string; fg: string }> = {
        success: { bg: 'var(--theme-status-success-subtle)', fg: 'var(--theme-status-success-fill)' },
        error: { bg: 'var(--theme-status-error-subtle)', fg: 'var(--theme-status-error-stroke)' },
        warning: { bg: 'var(--theme-status-warning-subtle)', fg: 'var(--theme-status-warning-fill)' },
        info: { bg: 'var(--theme-status-info-subtle)', fg: 'var(--theme-status-info-fill)' },
        primary: {
            bg: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
            fg: 'var(--theme-brand-primary-500)',
        },
        secondary: {
            bg: 'color-mix(in srgb, var(--theme-brand-secondary-500) 12%, transparent)',
            fg: 'var(--theme-brand-secondary-500)',
        },
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

function visibilityVariant(visibility: string | undefined): BadgeVariant {
    switch (visibility) {
        case 'public': return 'success';
        case 'friends': return 'info';
        case 'custom': return 'secondary';
        default: return 'neutral';
    }
}

/* ══════════════════════════════════════════════════════════
   FIELD VISIBILITY
   ══════════════════════════════════════════════════════════ */

function FieldVisibilitySection({ fieldVisibility, privacyLists, privacyOptions, onDataChanged }: Omit<PrivacyProps, 'section' | 'preferences' | 'options'>) {
    const t = useT();
    const toast = useToastContext();
    const [fields, setFields] = useState(fieldVisibility);
    const [editingField, setEditingField] = useState<string | null>(null);

    const editConfig = editingField ? privacyOptions.fields[editingField] : null;
    const editData = editingField ? fields[editingField] : null;

    function handleSave(field: string, visibility: string, includeListIds: number[]) {
        fetch('/account/field-visibility', {
            method: 'PUT',
            headers: csrfHeaders(),
            body: JSON.stringify({ field, visibility, include_list_ids: includeListIds }),
        }).then(() => {
            setFields((prev) => ({ ...prev, [field]: { visibility, include_list_ids: includeListIds } }));
            setEditingField(null);
            onDataChanged();
            toast.show(t('settings.toast.field_visibility_saved'), { type: 'success' });
        });
    }

    const visOpts = privacyOptions.visibility;
    const fieldRowStyle = {
        background: 'var(--theme-base-page)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const iconBoxStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
        borderRadius: 'var(--theme-radius-input)',
    };
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    };

    return (
        <div className="space-y-3">
            <p className="mb-4 text-sm" style={fadedTextStyle}>{t('privacy.visibility.intro')}</p>

            {Object.entries(privacyOptions.fields).map(([fieldKey, config]) => {
                const current = fields[fieldKey];
                const vis = visOpts[current?.visibility ?? 'public'];

                return (
                    <button
                        key={fieldKey}
                        type="button"
                        onClick={() => setEditingField(fieldKey)}
                        className="flex w-full items-center gap-3 p-4 text-left transition-shadow hover:shadow-sm"
                        style={fieldRowStyle}
                    >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center" style={iconBoxStyle}>
                            <i className={`${config.icon} text-sm`} style={{ color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium">{config.label}</span>
                            <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}>
                                {config.description}
                            </p>
                        </div>
                        <StatusBadge
                            variant={visibilityVariant(current?.visibility)}
                            icon={vis?.icon ?? 'fa-solid fa-globe'}
                        >
                            {vis?.label ?? t('privacy.visibility.public_fallback')}
                        </StatusBadge>
                    </button>
                );
            })}

            <FieldVisibilityModal
                t={t}
                open={!!editingField}
                fieldKey={editingField ?? ''}
                fieldConfig={editConfig}
                currentVisibility={editData?.visibility ?? 'public'}
                currentListIds={editData?.include_list_ids ?? []}
                visibilityOptions={visOpts}
                lists={privacyLists}
                onSave={handleSave}
                onClose={() => setEditingField(null)}
            />
        </div>
    );
}

function FieldVisibilityModal({ t, open, fieldKey, fieldConfig, currentVisibility, currentListIds, visibilityOptions, lists, onSave, onClose }: {
    t: Translator;
    open: boolean;
    fieldKey: string;
    fieldConfig: FieldConfig | null;
    currentVisibility: string;
    currentListIds: number[];
    visibilityOptions: Record<string, VisibilityOption>;
    lists: PrivacyList[];
    onSave: (field: string, visibility: string, listIds: number[]) => void;
    onClose: () => void;
}) {
    const [visibility, setVisibility] = useState(currentVisibility);
    const [listIds, setListIds] = useState<number[]>(currentListIds);

    useEffect(() => {
        setVisibility(currentVisibility);
        setListIds(currentListIds);
    }, [currentVisibility, currentListIds, open]);

    function toggleList(id: number) {
        setListIds((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);
    }

    return (
        <Modal open={open} onClose={onClose}>
            <ModalHeader title={fieldConfig?.label ?? t('privacy.visibility.modal_title_fallback')} onClose={onClose} />
            <div className="space-y-3 p-6">
                {Object.entries(visibilityOptions).map(([key, opt]) => {
                    const selected = visibility === key;
                    return (
                        <label
                            key={key}
                            className={`alex-pref-card flex cursor-pointer items-center gap-3 p-3 ${selected ? 'alex-pref-card--selected' : ''}`}
                        >
                            <input
                                type="radio"
                                className="alex-checkbox"
                                style={{ borderRadius: '9999px' }}
                                checked={selected}
                                onChange={() => setVisibility(key)}
                            />
                            <i
                                className={`${opt.icon} w-5 text-center`}
                                style={{
                                    color: selected
                                        ? 'var(--theme-brand-primary-500)'
                                        : 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                                }}
                                aria-hidden="true"
                            />
                            <div>
                                <span className="text-sm font-medium">{opt.label}</span>
                                <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                                    {opt.description}
                                </p>
                            </div>
                        </label>
                    );
                })}

                {visibility === 'custom' && lists.length > 0 && (
                    <div
                        className="mt-2 p-3"
                        style={{
                            background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
                            borderRadius: 'var(--theme-radius-card)',
                        }}
                    >
                        <p
                            className="mb-2 text-[11px] font-semibold uppercase tracking-[.25em]"
                            style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 80%, transparent)' }}
                        >
                            {t('privacy.visibility.include_lists_header')}
                        </p>
                        <div className="space-y-1">
                            {lists.map((list) => (
                                <label
                                    key={list.id}
                                    className="flex cursor-pointer items-center gap-2 p-2"
                                    style={{ borderRadius: 'var(--theme-radius-input)' }}
                                >
                                    <input
                                        type="checkbox"
                                        className="alex-checkbox"
                                        checked={listIds.includes(list.id)}
                                        onChange={() => toggleList(list.id)}
                                    />
                                    <i className={`fa-solid ${list.icon} text-sm`} style={{ color: resolveColorVar(list.color) }} />
                                    <span className="text-sm">{list.name}</span>
                                    <span className="ml-auto">
                                        <StatusBadge variant="neutral">{list.members_count}</StatusBadge>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
                <Button
                    variant="primary"
                    onClick={() => onSave(fieldKey, visibility, visibility === 'custom' ? listIds : [])}
                >
                    {t('privacy.visibility.save_button')}
                </Button>
            </ModalFooter>
        </Modal>
    );
}

/* ══════════════════════════════════════════════════════════
   GENERAL PRIVACY SETTINGS
   ══════════════════════════════════════════════════════════ */

function PrivacySettingsSection({ preferences, options }: { preferences: Record<string, unknown>; options: Record<string, Record<string, string>> }) {
    const t = useT();
    const toast = useToastContext();
    const form = useForm({
        profile_visibility: preferences.profile_visibility as string,
        show_online_status: preferences.show_online_status as boolean,
        show_activity_status: preferences.show_activity_status as boolean,
        allow_project_invites: preferences.allow_project_invites as string,
    });

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        form.put('/account/preferences', {
            onSuccess: () => toast.show(t('settings.toast.privacy_saved'), { type: 'success' }),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Select
                size="md"
                label={t('privacy.settings.profile_visibility_label')}
                name="profile_visibility"
                options={options.profile_visibility}
                value={form.data.profile_visibility}
                onChange={(e) => form.setData('profile_visibility', e.target.value)}
            />
            <Toggle
                label={t('privacy.settings.online_label')}
                description={t('privacy.settings.online_description')}
                checked={form.data.show_online_status}
                onChange={(v) => form.setData('show_online_status', v)}
            />
            <Toggle
                label={t('privacy.settings.activity_label')}
                description={t('privacy.settings.activity_description')}
                checked={form.data.show_activity_status}
                onChange={(v) => form.setData('show_activity_status', v)}
            />
            <Select
                size="md"
                label={t('privacy.settings.invites_label')}
                name="allow_project_invites"
                options={options.allow_project_invites}
                value={form.data.allow_project_invites}
                onChange={(e) => form.setData('allow_project_invites', e.target.value)}
            />

            <div className="flex justify-end pt-4">
                <Button type="submit" variant="primary" loading={form.processing}>
                    {form.processing ? t('common.saving') : t('privacy.settings.save_button')}
                </Button>
            </div>
        </form>
    );
}

/* ══════════════════════════════════════════════════════════
   PRIVACY LISTS (CRUD)
   ══════════════════════════════════════════════════════════ */

function PrivacyListsSection({ privacyLists: initialLists, privacyOptions, onDataChanged }: Omit<PrivacyProps, 'section' | 'preferences' | 'options' | 'fieldVisibility'>) {
    const t = useT();
    const toast = useToastContext();
    const [lists, setLists] = useState<PrivacyList[]>(initialLists);
    const [editingList, setEditingList] = useState<PrivacyList | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const iconOptions = privacyOptions.list_icons;
    const colorOptions = privacyOptions.list_colors;

    const introStyle = {
        background: 'var(--theme-status-info-subtle)',
        color: 'var(--theme-status-info-fill)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const emptyIconBoxStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    };
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-2 p-3 text-sm" style={introStyle}>
                <i className="fa-solid fa-circle-info mt-0.5" />
                <span>{t('privacy.lists.intro')}</span>
            </div>

            {lists.length > 0 ? (
                <div className="space-y-3">
                    {lists.map((list) => (
                        <ListCard
                            key={list.id}
                            t={t}
                            list={list}
                            onEdit={() => setEditingList(list)}
                            onDelete={() => {
                                fetch(`/account/privacy-lists/${list.id}`, { method: 'DELETE', headers: csrfHeaders() })
                                    .then(() => {
                                        setLists((prev) => prev.filter((l) => l.id !== list.id));
                                        onDataChanged();
                                        toast.show(t('settings.toast.list_deleted'), { type: 'success' });
                                    });
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={emptyIconBoxStyle}>
                        <i className="fa-solid fa-users-rectangle text-xl" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }} />
                    </div>
                    <p style={fadedTextStyle}>{t('privacy.lists.empty_state')}</p>
                </div>
            )}

            {!showCreate ? (
                <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all"
                    style={{
                        border: '2px dashed color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
                        color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                        background: 'transparent',
                    }}
                >
                    <i className="fa-solid fa-plus" /> {t('privacy.lists.create_button')}
                </button>
            ) : (
                <ListForm
                    t={t}
                    iconOptions={iconOptions}
                    colorOptions={colorOptions}
                    onSave={(data) => {
                        fetch('/account/privacy-lists', {
                            method: 'POST',
                            headers: csrfHeaders(),
                            body: JSON.stringify(data),
                        })
                            .then((r) => r.json())
                            .then((newList) => {
                                setLists((prev) => [...prev, newList]);
                                setShowCreate(false);
                                onDataChanged();
                                toast.show(t('settings.toast.list_created'), { type: 'success' });
                            });
                    }}
                    onCancel={() => setShowCreate(false)}
                />
            )}

            <EditListModal
                t={t}
                list={editingList}
                iconOptions={iconOptions}
                colorOptions={colorOptions}
                onSave={(data) => {
                    if (!editingList) return;
                    fetch(`/account/privacy-lists/${editingList.id}`, {
                        method: 'PUT',
                        headers: csrfHeaders(),
                        body: JSON.stringify(data),
                    }).then(() => {
                        setLists((prev) => prev.map((l) => l.id === editingList.id ? { ...l, ...data } : l));
                        setEditingList(null);
                        onDataChanged();
                        toast.show(t('settings.toast.list_updated'), { type: 'success' });
                    });
                }}
                onClose={() => setEditingList(null)}
            />
        </div>
    );
}

function ListCard({ t, list, onEdit, onDelete }: { t: Translator; list: PrivacyList; onEdit: () => void; onDelete: () => void }) {
    const cardRef = useEnterAnimation<HTMLDivElement>({ y: 8, duration: 0.3 });

    const colorVar = resolveColorVar(list.color);
    const cardStyle = {
        background: 'var(--theme-base-page)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const iconBoxStyle = {
        background: `color-mix(in srgb, ${colorVar} 20%, transparent)`,
        borderRadius: 'var(--theme-radius-input)',
    };
    const memberWord = list.members_count === 1 ? t('privacy.lists.member_singular') : t('privacy.lists.member_plural');

    return (
        <div ref={cardRef} className="group flex items-center gap-3 p-4" style={cardStyle}>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center" style={iconBoxStyle}>
                <i className={`fa-solid ${list.icon}`} style={{ color: colorVar }} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{list.name}</span>
                    {list.is_system && <StatusBadge variant="neutral">{t('privacy.lists.system_badge')}</StatusBadge>}
                    <StatusBadge variant="neutral">{`${list.members_count} ${memberWord}`}</StatusBadge>
                </div>
                {list.description && (
                    <p className="truncate text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                        {list.description}
                    </p>
                )}
            </div>
            {!list.is_system && (
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="sm" onClick={onEdit} icon="fa-solid fa-pen text-xs" iconPosition="before" aria-label={t('common.edit')}>
                        <span className="sr-only">{t('common.edit')}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDelete} icon="fa-solid fa-trash text-xs" iconPosition="before" aria-label={t('common.delete')}>
                        <span className="sr-only">{t('common.delete')}</span>
                    </Button>
                </div>
            )}
        </div>
    );
}

function ListForm({ t, iconOptions, colorOptions, initialData, onSave, onCancel }: {
    t: Translator;
    iconOptions: Record<string, string>;
    colorOptions: Record<string, string>;
    initialData?: { name: string; description: string; icon: string; color: string };
    onSave: (data: { name: string; description: string | null; icon: string; color: string }) => void;
    onCancel: () => void;
}) {
    const [name, setName] = useState(initialData?.name ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [icon, setIcon] = useState(initialData?.icon ?? 'fa-users');
    const [color, setColor] = useState(initialData?.color ?? 'primary');
    const formRef = useEnterAnimation<HTMLDivElement>({ y: 12, duration: 0.3, ease: 'back.out(1.2)' });

    const containerStyle = {
        background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const colorVar = resolveColorVar(color);

    return (
        <div ref={formRef} className="space-y-4 p-5" style={containerStyle}>
            <h4 className="font-serif text-xl font-bold leading-tight">
                <i className="fa-solid fa-plus mr-2" style={{ color: 'var(--theme-brand-primary-500)' }} />
                {initialData ? t('privacy.lists.edit_heading') : t('privacy.lists.new_heading')}
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                    size="md"
                    label={t('privacy.lists.name_field')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('privacy.lists.name_placeholder')}
                    maxLength={50}
                />
                <Input
                    size="md"
                    label={t('privacy.lists.description_field')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('privacy.lists.description_placeholder')}
                    maxLength={255}
                />
            </div>

            <div>
                <span className="mb-1.5 block text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                    {t('privacy.lists.icon_field')}
                </span>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(iconOptions).map(([key, label]) => {
                        const selected = icon === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                title={label}
                                onClick={() => setIcon(key)}
                                className="flex h-12 w-12 items-center justify-center transition-all"
                                style={{
                                    background: selected
                                        ? `color-mix(in srgb, ${colorVar} 20%, transparent)`
                                        : 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                    border: selected ? `2px solid ${colorVar}` : '2px solid transparent',
                                    borderRadius: 'var(--theme-radius-input)',
                                }}
                            >
                                <i
                                    className={`fa-solid ${key}`}
                                    style={{ color: selected ? colorVar : 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}
                                />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <span className="mb-1.5 block text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                    {t('privacy.lists.color_field')}
                </span>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(colorOptions).map(([key, label]) => {
                        const selected = color === key;
                        const swatchVar = resolveColorVar(key);
                        return (
                            <button
                                key={key}
                                type="button"
                                title={label}
                                onClick={() => setColor(key)}
                                className="flex h-10 w-10 items-center justify-center rounded-full transition-all"
                                style={{
                                    background: swatchVar,
                                    opacity: selected ? 1 : 0.6,
                                    transform: selected ? 'scale(1.1)' : 'scale(1)',
                                    boxShadow: selected
                                        ? `0 0 0 2px var(--theme-base-page), 0 0 0 4px color-mix(in srgb, var(--theme-base-content) 50%, transparent)`
                                        : 'none',
                                }}
                            >
                                {selected && <i className="fa-solid fa-check text-xs" style={{ color: 'white' }} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button
                    variant="primary"
                    onClick={() => onSave({ name, description: description || null, icon, color })}
                    disabled={!name}
                    icon="fa-solid fa-plus"
                    iconPosition="before"
                >
                    {initialData ? t('privacy.lists.save_button') : t('privacy.lists.create_action_button')}
                </Button>
            </div>
        </div>
    );
}

function EditListModal({ t, list, iconOptions, colorOptions, onSave, onClose }: {
    t: Translator;
    list: PrivacyList | null;
    iconOptions: Record<string, string>;
    colorOptions: Record<string, string>;
    onSave: (data: { name: string; description: string | null; icon: string; color: string }) => void;
    onClose: () => void;
}) {
    if (!list) return <Modal open={false} onClose={onClose}><span /></Modal>;

    return (
        <Modal open={!!list} onClose={onClose}>
            <ModalHeader title={t('privacy.lists.edit_modal_title').replace(':name', list.name)} onClose={onClose} />
            <div className="p-6">
                <ListForm
                    t={t}
                    iconOptions={iconOptions}
                    colorOptions={colorOptions}
                    initialData={{ name: list.name, description: list.description ?? '', icon: list.icon, color: list.color }}
                    onSave={onSave}
                    onCancel={onClose}
                />
            </div>
        </Modal>
    );
}
