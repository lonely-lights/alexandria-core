import { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import Select from '@alexandria/components/form/Select';
import Toggle from '@alexandria/components/form/Toggle';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import gsap from 'gsap';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
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

/* ══════════════════════════════════════════════════════════
   FIELD VISIBILITY
   ══════════════════════════════════════════════════════════ */

function FieldVisibilitySection({ fieldVisibility, privacyLists, privacyOptions, onDataChanged }: Omit<PrivacyProps, 'section' | 'preferences' | 'options'>) {
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
        });
    }

    const visOpts = privacyOptions.visibility;

    return (
        <div className="space-y-3">
            <p className="mb-4 text-sm text-base-content/60">
                Control who can see each part of your profile. Click any field to change its visibility.
            </p>

            {Object.entries(privacyOptions.fields).map(([fieldKey, config]) => {
                const current = fields[fieldKey];
                const vis = visOpts[current?.visibility ?? 'public'];

                return (
                    <button
                        key={fieldKey}
                        type="button"
                        onClick={() => setEditingField(fieldKey)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-base-content/10 bg-base-100 p-4 text-left transition-all hover:border-base-content/20 hover:shadow-sm"
                    >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-base-300">
                            <i className={`${config.icon} text-sm text-base-content/60`} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium">{config.label}</span>
                            <p className="text-xs text-base-content/40">{config.description}</p>
                        </div>
                        <span className={`badge badge-sm ${
                            current?.visibility === 'public' ? 'badge-success' :
                            current?.visibility === 'friends' ? 'badge-info' :
                            current?.visibility === 'custom' ? 'badge-secondary' : ''
                        }`}>
                            <i className={`${vis?.icon ?? 'fa-solid fa-globe'} mr-1 text-[10px]`} />
                            {vis?.label ?? 'Public'}
                        </span>
                    </button>
                );
            })}

            {/* Edit Modal */}
            <FieldVisibilityModal
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

function FieldVisibilityModal({ open, fieldKey, fieldConfig, currentVisibility, currentListIds, visibilityOptions, lists, onSave, onClose }: {
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
            <ModalHeader title={fieldConfig?.label ?? 'Field Visibility'} onClose={onClose} />
            <div className="space-y-3 p-6">
                {Object.entries(visibilityOptions).map(([key, opt]) => (
                    <label
                        key={key}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition-all ${
                            visibility === key ? 'border-primary bg-primary/5' : 'border-base-content/10 hover:border-base-content/30'
                        }`}
                    >
                        <input type="radio" className="radio radio-primary radio-sm" checked={visibility === key} onChange={() => setVisibility(key)} />
                        <i className={`${opt.icon} w-5 text-center ${visibility === key ? 'text-primary' : 'text-base-content/50'}`} />
                        <div>
                            <span className="text-sm font-medium">{opt.label}</span>
                            <p className="text-xs text-base-content/50">{opt.description}</p>
                        </div>
                    </label>
                ))}

                {visibility === 'custom' && lists.length > 0 && (
                    <div className="mt-2 rounded-2xl bg-base-300/30 p-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.25em] text-primary/80">Include these lists</p>
                        <div className="space-y-1">
                            {lists.map((list) => (
                                <label key={list.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-base-300/50">
                                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={listIds.includes(list.id)} onChange={() => toggleList(list.id)} />
                                    <i className={`fa-solid ${list.icon} text-${list.color} text-sm`} />
                                    <span className="text-sm">{list.name}</span>
                                    <span className="badge badge-ghost badge-sm ml-auto">{list.members_count}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <ModalFooter>
                <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Cancel</button>
                <button type="button" onClick={() => onSave(fieldKey, visibility, visibility === 'custom' ? listIds : [])} className="btn btn-primary rounded-xl">
                    Save
                </button>
            </ModalFooter>
        </Modal>
    );
}

/* ══════════════════════════════════════════════════════════
   GENERAL PRIVACY SETTINGS
   ══════════════════════════════════════════════════════════ */

function PrivacySettingsSection({ preferences, options }: { preferences: Record<string, unknown>; options: Record<string, Record<string, string>> }) {
    const form = useForm({
        profile_visibility: preferences.profile_visibility as string,
        show_online_status: preferences.show_online_status as boolean,
        show_activity_status: preferences.show_activity_status as boolean,
        allow_project_invites: preferences.allow_project_invites as string,
    });

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        form.put('/account/preferences');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Select label="Profile Visibility" name="profile_visibility" options={options.profile_visibility} value={form.data.profile_visibility} onChange={(e) => form.setData('profile_visibility', e.target.value)} />
            <Toggle label="Show Online Status" description="Let others see when you're online" checked={form.data.show_online_status} onChange={(v) => form.setData('show_online_status', v)} />
            <Toggle label="Show Activity Status" description="Let others see your recent activity" checked={form.data.show_activity_status} onChange={(v) => form.setData('show_activity_status', v)} />
            <Select label="Allow Project Invites" name="allow_project_invites" options={options.allow_project_invites} value={form.data.allow_project_invites} onChange={(e) => form.setData('allow_project_invites', e.target.value)} />

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn btn-primary rounded-xl" disabled={form.processing}>
                    {form.processing ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Privacy'}
                </button>
            </div>
        </form>
    );
}

/* ══════════════════════════════════════════════════════════
   PRIVACY LISTS (CRUD)
   ══════════════════════════════════════════════════════════ */

function PrivacyListsSection({ privacyLists: initialLists, privacyOptions, onDataChanged }: Omit<PrivacyProps, 'section' | 'preferences' | 'options' | 'fieldVisibility'>) {
    const [lists, setLists] = useState<PrivacyList[]>(initialLists);
    const [editingList, setEditingList] = useState<PrivacyList | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const iconOptions = privacyOptions.list_icons;
    const colorOptions = privacyOptions.list_colors;

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-2 rounded-2xl bg-info/10 p-3 text-sm text-info">
                <i className="fa-solid fa-circle-info mt-0.5" />
                <span>Privacy lists let you group people — like "Close Friends" or "Writing Group" — so you can share specific profile fields with just those groups.</span>
            </div>

            {/* List display */}
            {lists.length > 0 ? (
                <div className="space-y-3">
                    {lists.map((list) => (
                        <ListCard
                            key={list.id}
                            list={list}
                            onEdit={() => setEditingList(list)}
                            onDelete={() => {
                                fetch(`/account/privacy-lists/${list.id}`, { method: 'DELETE', headers: csrfHeaders() })
                                    .then(() => {
                                        setLists((prev) => prev.filter((l) => l.id !== list.id));
                                        onDataChanged();
                                    });
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-base-300">
                        <i className="fa-solid fa-users-rectangle text-xl text-base-content/30" />
                    </div>
                    <p className="text-base-content/50">No privacy lists yet</p>
                </div>
            )}

            {/* Create form */}
            {!showCreate ? (
                <button type="button" onClick={() => setShowCreate(true)} className="btn btn-ghost w-full gap-2 rounded-2xl border-2 border-dashed border-base-content/10 text-base-content/50 hover:border-primary/30 hover:text-primary">
                    <i className="fa-solid fa-plus" /> Create List
                </button>
            ) : (
                <ListForm
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
                            });
                    }}
                    onCancel={() => setShowCreate(false)}
                />
            )}

            {/* Edit modal */}
            <EditListModal
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
                    });
                }}
                onClose={() => setEditingList(null)}
            />
        </div>
    );
}

function ListCard({ list, onEdit, onDelete }: { list: PrivacyList; onEdit: () => void; onDelete: () => void }) {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (cardRef.current) {
            gsap.fromTo(cardRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
        }
    }, []);

    return (
        <div ref={cardRef} className="group flex items-center gap-3 rounded-2xl border border-base-content/10 bg-base-100 p-4 transition-all hover:border-base-content/20">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-${list.color}/20`}>
                <i className={`fa-solid ${list.icon} text-${list.color}`} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{list.name}</span>
                    {list.is_system && <span className="badge badge-ghost badge-sm">System</span>}
                    <span className="badge badge-sm badge-ghost">{list.members_count} {list.members_count === 1 ? 'member' : 'members'}</span>
                </div>
                {list.description && <p className="truncate text-xs text-base-content/50">{list.description}</p>}
            </div>
            {!list.is_system && (
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={onEdit} className="btn btn-ghost btn-sm btn-square"><i className="fa-solid fa-pen text-xs" /></button>
                    <button type="button" onClick={onDelete} className="btn btn-ghost btn-sm btn-square text-error"><i className="fa-solid fa-trash text-xs" /></button>
                </div>
            )}
        </div>
    );
}

function ListForm({ iconOptions, colorOptions, initialData, onSave, onCancel }: {
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
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (formRef.current) {
            gsap.fromTo(formRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.2)' });
        }
    }, []);

    return (
        <div ref={formRef} className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
            <h4 className="font-serif text-xl font-bold leading-tight"><i className="fa-solid fa-plus mr-2 text-primary" />{initialData ? 'Edit List' : 'New List'}</h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="form-control">
                    <label className="label py-1"><span className="label-text text-sm">Name</span></label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input input-bordered rounded-xl focus:input-primary" placeholder="e.g., Close Friends" maxLength={50} />
                </div>
                <div className="form-control">
                    <label className="label py-1"><span className="label-text text-sm">Description</span></label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input input-bordered rounded-xl focus:input-primary" placeholder="Optional" maxLength={255} />
                </div>
            </div>

            {/* Icon picker */}
            <div>
                <label className="label py-1"><span className="label-text text-sm">Icon</span></label>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(iconOptions).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            title={label}
                            onClick={() => setIcon(key)}
                            className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${icon === key ? `bg-${color}/20 ring-2 ring-${color}` : 'bg-base-300 hover:bg-base-300/70'}`}
                        >
                            <i className={`fa-solid ${key} ${icon === key ? `text-${color}` : 'text-base-content/50'}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Color picker */}
            <div>
                <label className="label py-1"><span className="label-text text-sm">Color</span></label>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(colorOptions).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            title={label}
                            onClick={() => setColor(key)}
                            className={`flex h-10 w-10 items-center justify-center rounded-full bg-${key} transition-all ${color === key ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-base-content/50 scale-110' : 'opacity-60 hover:opacity-100'}`}
                        >
                            {color === key && <i className={`fa-solid fa-check text-xs text-${key}-content`} />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="btn btn-ghost rounded-xl">Cancel</button>
                <button type="button" onClick={() => onSave({ name, description: description || null, icon, color })} className="btn btn-primary rounded-xl" disabled={!name}>
                    <i className="fa-solid fa-plus mr-1" /> {initialData ? 'Save' : 'Create List'}
                </button>
            </div>
        </div>
    );
}

function EditListModal({ list, iconOptions, colorOptions, onSave, onClose }: {
    list: PrivacyList | null;
    iconOptions: Record<string, string>;
    colorOptions: Record<string, string>;
    onSave: (data: { name: string; description: string | null; icon: string; color: string }) => void;
    onClose: () => void;
}) {
    if (!list) return <Modal open={false} onClose={onClose}><span /></Modal>;

    return (
        <Modal open={!!list} onClose={onClose}>
            <ModalHeader title={`Edit "${list.name}"`} onClose={onClose} />
            <div className="p-6">
                <ListForm
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
