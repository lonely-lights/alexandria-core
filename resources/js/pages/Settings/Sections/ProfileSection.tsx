import { type ReactNode, type SyntheticEvent, useEffect, useState, useRef, useCallback } from 'react';
import { useForm, router } from '@inertiajs/react';
import gsap from 'gsap';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import RichTextEditor from '@alexandria/components/editor/RichTextEditor';

interface ProfileData {
    display_name: string | null;
    username: string;
    pronouns: string[];
    tagline: string | null;
    bio: string | null;
    private_bio: string | null;
    location: string | null;
    website: string | null;
    birth_month: number | null;
    birth_day: number | null;
    birth_year: number | null;
    dob_visibility: string;
    avatar_url: string;
    avatar_thumb_url: string;
    banner_url: string;
    has_avatar: boolean;
    has_banner: boolean;
}

interface UsernameStatus {
    can_change: boolean;
    next_change_date: string | null;
    next_change_diff: string | null;
    can_revert: boolean;
    revertable_username: string | null;
}

interface ProfileSectionProps {
    profile: ProfileData;
    usernameStatus?: UsernameStatus;
    options: {
        pronouns: Record<string, string>;
        dob_visibility: Record<string, string>;
    };
    activeSection?: string;
    onPreviewChange?: (preview: { display_name: string | null; pronouns: string[]; tagline: string | null; location: string | null; website: string | null }) => void;
}

const MONTHS: Record<string, string> = {
    '': 'Month',
    '1': 'January', '2': 'February', '3': 'March', '4': 'April',
    '5': 'May', '6': 'June', '7': 'July', '8': 'August',
    '9': 'September', '10': 'October', '11': 'November', '12': 'December',
};

const SECTION_META: Record<string, { icon: string; title: string; subtitle: string; fromColor: string; toColor: string }> = {
    identity: { icon: 'fa-user-circle', title: 'Identity', subtitle: 'How others see and identify you', fromColor: 'from-primary/10', toColor: 'to-secondary/5' },
    about: { icon: 'fa-feather', title: 'About', subtitle: 'Tell the world about yourself', fromColor: 'from-secondary/10', toColor: 'to-accent/5' },
    details: { icon: 'fa-circle-info', title: 'Details', subtitle: 'Personal details and preferences', fromColor: 'from-accent/10', toColor: 'to-primary/5' },
};

export default function ProfileSection({ profile, usernameStatus, options, activeSection = 'identity', onPreviewChange }: ProfileSectionProps) {
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const form = useForm({
        display_name: profile.display_name ?? '',
        pronouns: profile.pronouns,
        custom_pronouns: '',
        tagline: profile.tagline ?? '',
        bio: profile.bio ?? '',
        private_bio: profile.private_bio ?? '',
        private_bio_visibility: 'private',
        location: profile.location ?? '',
        website: profile.website ?? '',
        birth_month: profile.birth_month?.toString() ?? '',
        birth_day: profile.birth_day?.toString() ?? '',
        birth_year: profile.birth_year?.toString() ?? '',
        dob_visibility: profile.dob_visibility,
    });

    // Push form changes to the profile card preview
    useEffect(() => {
        onPreviewChange?.({
            display_name: form.data.display_name || null,
            pronouns: form.data.pronouns,
            tagline: form.data.tagline || null,
            location: form.data.location || null,
            website: form.data.website || null,
        });
    }, [form.data.display_name, form.data.pronouns, form.data.tagline, form.data.location, form.data.website, onPreviewChange]);

    function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();
        form.put('/account/profile');
    }

    function togglePronoun(pronoun: string) {
        const current = form.data.pronouns;
        if (current.includes(pronoun)) {
            form.setData('pronouns', current.filter((p) => p !== pronoun));
        } else {
            form.setData('pronouns', [...current, pronoun]);
        }
    }

    const meta = SECTION_META[activeSection] ?? SECTION_META.identity;

    return (
        <form onSubmit={handleSubmit}>
            <div className="overflow-hidden rounded-3xl border border-base-content/10 bg-base-200 shadow-xl">
                {/* Section Header */}
                <div className={`relative overflow-hidden px-6 py-6 bg-gradient-to-br ${meta.fromColor} via-transparent ${meta.toColor}`}>
                    <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/5 blur-2xl" />
                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/20">
                            <i className={`fa-solid ${meta.icon} text-xl text-primary`} />
                        </div>
                        <div>
                            <h3 className="font-serif text-2xl font-bold leading-tight">{meta.title}</h3>
                            <p className="mt-0.5 text-sm text-base-content/60">{meta.subtitle}</p>
                        </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                </div>

                {/* Section Content */}
                <div className="space-y-6 p-6">
                    {activeSection === 'identity' && (
                        <>
                            {/* Username */}
                            <FieldRow label="Username" hint="@mentions & URL">
                                <div className="flex items-stretch gap-2">
                                    <div className="flex flex-1 items-center rounded-2xl bg-base-300/50 px-4 py-3">
                                        <span className="mr-1 text-base-content/40">@</span>
                                        <span className="truncate font-mono font-medium">{profile.username}</span>
                                    </div>
                                    {usernameStatus?.can_change ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowUsernameModal(true)}
                                            className="btn btn-ghost rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary"
                                        >
                                            <i className="fa-solid fa-pen text-xs" />
                                            Change
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowUsernameModal(true)}
                                            className="btn btn-ghost rounded-2xl text-base-content/50"
                                        >
                                            <i className="fa-solid fa-font text-xs" />
                                            Edit Case
                                        </button>
                                    )}
                                </div>
                                {usernameStatus && !usernameStatus.can_change && usernameStatus.next_change_date && (
                                    <div className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
                                        <i className="fa-solid fa-clock mr-1" />
                                        Full changes available {usernameStatus.next_change_date} ({usernameStatus.next_change_diff})
                                        {usernameStatus.can_revert && usernameStatus.revertable_username && (
                                            <span className="block mt-1 text-base-content/60">
                                                You can revert to <strong>@{usernameStatus.revertable_username}</strong> or edit casing.
                                            </span>
                                        )}
                                    </div>
                                )}
                            </FieldRow>

                            {/* Display Name */}
                            <FieldRow label="Display Name" hint="How you want to be called">
                                <input
                                    type="text"
                                    value={form.data.display_name}
                                    onChange={(e) => form.setData('display_name', e.target.value)}
                                    className="input input-bordered h-12 w-full rounded-2xl focus:input-primary"
                                    placeholder="How you want to be called"
                                    maxLength={255}
                                />
                                {form.errors.display_name && <p className="mt-1 text-sm text-error">{form.errors.display_name}</p>}
                            </FieldRow>

                            {/* Pronouns */}
                            <FieldRow label="Pronouns" hint="Select one or more">
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(options.pronouns).map(([value, label]) => (
                                        <label key={value} className="cursor-pointer">
                                            <input type="checkbox" className="peer hidden" checked={form.data.pronouns.includes(value)} onChange={() => togglePronoun(value)} />
                                            <span className="inline-block rounded-full border-2 border-base-300 px-4 py-2 text-sm font-medium transition-all hover:border-base-content/30 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary">
                                                {label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={form.data.custom_pronouns}
                                    onChange={(e) => form.setData('custom_pronouns', e.target.value)}
                                    className="input input-bordered mt-2 h-10 w-full rounded-2xl text-sm focus:input-primary"
                                    placeholder="Custom pronouns"
                                    maxLength={50}
                                />
                            </FieldRow>

                            {/* Pronoun Reordering */}
                            <AnimatedCollapse visible={form.data.pronouns.length > 1}>
                                <PronounReorder
                                    pronouns={form.data.pronouns}
                                    customPronouns={form.data.custom_pronouns}
                                    labels={options.pronouns}
                                    onReorder={(reordered) => form.setData('pronouns', reordered)}
                                />
                            </AnimatedCollapse>
                        </>
                    )}

                    {activeSection === 'about' && (
                        <>
                            {/* Tagline */}
                            <div>
                                <label className="label"><span className="label-text font-semibold">Tagline</span></label>
                                <input
                                    type="text"
                                    value={form.data.tagline}
                                    onChange={(e) => form.setData('tagline', e.target.value)}
                                    className="input input-bordered h-12 w-full rounded-2xl focus:input-primary"
                                    placeholder="A short one-liner about you"
                                    maxLength={150}
                                />
                                {form.errors.tagline && <p className="mt-1 text-sm text-error">{form.errors.tagline}</p>}
                            </div>

                            {/* Bio */}
                            <div>
                                <RichTextEditor
                                    label="Bio"
                                    value={form.data.bio}
                                    onChange={(wiki) => form.setData('bio', wiki)}
                                    placeholder="Tell others about yourself"
                                    maxLength={1000}
                                    tier="free"
                                />
                                {form.errors.bio && <p className="mt-1 text-sm text-error">{form.errors.bio}</p>}
                            </div>

                            {/* Private Bio */}
                            <div>
                                <RichTextEditor
                                    label="Private Bio"
                                    value={form.data.private_bio}
                                    onChange={(wiki) => form.setData('private_bio', wiki)}
                                    placeholder="Only visible based on your visibility settings"
                                    maxLength={1000}
                                    tier="free"
                                />
                                {form.errors.private_bio && <p className="mt-1 text-sm text-error">{form.errors.private_bio}</p>}
                            </div>
                        </>
                    )}

                    {activeSection === 'details' && (
                        <>
                            {/* Location */}
                            <FieldRow label="Location" hint="City, Country">
                                <input
                                    type="text"
                                    value={form.data.location}
                                    onChange={(e) => form.setData('location', e.target.value)}
                                    className="input input-bordered h-12 w-full rounded-2xl focus:input-primary"
                                    placeholder="City, Country"
                                    maxLength={100}
                                />
                                {form.errors.location && <p className="mt-1 text-sm text-error">{form.errors.location}</p>}
                            </FieldRow>

                            {/* Website */}
                            <FieldRow label="Website" hint="Your personal site">
                                <input
                                    type="url"
                                    value={form.data.website}
                                    onChange={(e) => form.setData('website', e.target.value)}
                                    className="input input-bordered h-12 w-full rounded-2xl focus:input-primary"
                                    placeholder="https://example.com"
                                    maxLength={255}
                                />
                                {form.errors.website && <p className="mt-1 text-sm text-error">{form.errors.website}</p>}
                            </FieldRow>

                            {/* Birthday */}
                            <FieldRow label="Birthday" hint="Date of birth">
                                <div className="grid grid-cols-3 gap-3">
                                    <select
                                        value={form.data.birth_month}
                                        onChange={(e) => form.setData('birth_month', e.target.value)}
                                        className="select select-bordered h-12 rounded-2xl focus:select-primary"
                                    >
                                        {Object.entries(MONTHS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={form.data.birth_day}
                                        onChange={(e) => form.setData('birth_day', e.target.value)}
                                        className="select select-bordered h-12 rounded-2xl focus:select-primary"
                                    >
                                        <option value="">Day</option>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={form.data.birth_year}
                                        onChange={(e) => form.setData('birth_year', e.target.value)}
                                        className="select select-bordered h-12 rounded-2xl focus:select-primary"
                                    >
                                        <option value="">Year</option>
                                        {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                {(form.errors.birth_month || form.errors.birth_day || form.errors.birth_year) && (
                                    <p className="mt-1 text-sm text-error">
                                        {form.errors.birth_month || form.errors.birth_day || form.errors.birth_year}
                                    </p>
                                )}
                            </FieldRow>

                            {/* DOB Visibility */}
                            <BirthdayVisibilityPicker
                                month={form.data.birth_month}
                                day={form.data.birth_day}
                                year={form.data.birth_year}
                                value={form.data.dob_visibility}
                                onChange={(v) => form.setData('dob_visibility', v)}
                            />
                        </>
                    )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end border-t border-base-300/50 px-6 pb-6 pt-6">
                    <button type="submit" className="btn btn-primary gap-2 rounded-xl px-8" disabled={form.processing}>
                        {form.processing ? (
                            <>
                                <span className="loading loading-spinner loading-sm" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-floppy-disk" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <UsernameChangeModal
                open={showUsernameModal}
                currentUsername={profile.username}
                usernameStatus={usernameStatus!}
                onClose={() => setShowUsernameModal(false)}
                onSuccess={() => {
                    setShowUsernameModal(false);
                    router.reload({ only: ['profile', 'usernameStatus'] });
                }}
            />
        </form>
    );
}

/* ── Username Change Modal ── */
function UsernameChangeModal({ open, currentUsername, usernameStatus, onClose, onSuccess }: {
    open: boolean;
    currentUsername: string;
    usernameStatus: UsernameStatus;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [newUsername, setNewUsername] = useState('');
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availability, setAvailability] = useState<{ available: boolean | null; message: string | null }>({ available: null, message: null });
    const [error, setError] = useState<string | null>(null);
    const [showRevert, setShowRevert] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
    const feedbackRef = useRef<HTMLDivElement>(null);

    const isCaseOnly = newUsername.length > 0 && newUsername.toLowerCase() === currentUsername.toLowerCase() && newUsername !== currentUsername;
    const isSame = newUsername === currentUsername;
    const isValid = /^[a-zA-Z0-9_-]*$/.test(newUsername) && newUsername.length <= 30;

    // typeof check guards SSR — `document` doesn't exist in Node.js
    // when Inertia renders the page server-side. The csrfToken is
    // only used inside fetch() handlers that fire client-side, so
    // an empty fallback during SSR is harmless.
    const csrfToken = typeof document !== 'undefined'
        ? document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''
        : '';

    const checkAvailability = useCallback((username: string) => {
        if (!username || username === currentUsername) {
            setAvailability({ available: null, message: null });
            return;
        }

        if (!/^[a-zA-Z0-9_-]*$/.test(username) || username.length > 30) return;

        setChecking(true);
        fetch('/account/username/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ username }),
        })
            .then((r) => r.json())
            .then((data) => {
                setAvailability(data);
                setChecking(false);
                if (feedbackRef.current) {
                    gsap.fromTo(feedbackRef.current, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' });
                }
            })
            .catch(() => setChecking(false));
    }, [currentUsername]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleInputChange(value: string) {
        setNewUsername(value);
        setError(null);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!value || value === currentUsername) {
            setAvailability({ available: null, message: null });
            return;
        }

        // Validate format
        if (!/^[a-zA-Z0-9_-]*$/.test(value)) {
            setAvailability({ available: false, message: 'Only letters, numbers, dashes, and underscores' });
            return;
        }
        if (value.length > 30) {
            setAvailability({ available: false, message: 'Username must be 30 characters or less' });
            return;
        }

        debounceRef.current = setTimeout(() => checkAvailability(value), 300);
    }

    function handleSave() {
        if (isSame || !isValid || saving) return;

        setSaving(true);
        setError(null);

        fetch('/account/username', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ username: newUsername }),
        })
            .then((r) => r.json())
            .then((data) => {
                setSaving(false);
                if (data.success) {
                    onSuccess();
                } else {
                    setError(data.message);
                }
            })
            .catch(() => {
                setSaving(false);
                setError('Something went wrong. Please try again.');
            });
    }

    function handleRevert() {
        setSaving(true);
        setError(null);

        fetch('/account/username/revert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        })
            .then((r) => r.json())
            .then((data) => {
                setSaving(false);
                if (data.success) {
                    onSuccess();
                } else {
                    setError(data.message);
                }
            })
            .catch(() => {
                setSaving(false);
                setError('Something went wrong. Please try again.');
            });
    }

    const canSubmit = !isSame && isValid && newUsername.length > 0 && availability.available === true && !saving;

    const modalTitle = showRevert ? 'Revert Username' : (usernameStatus.can_change ? 'Change Username' : 'Edit Username Casing');

    return (
        <Modal open={open} onClose={onClose}>
            <ModalHeader title={modalTitle} onClose={onClose} />

                {showRevert && usernameStatus.can_revert && usernameStatus.revertable_username ? (
                    /* ── Revert View ── */
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-center gap-4">
                            <div className="rounded-xl bg-base-300 px-4 py-2 text-center">
                                <p className="text-xs text-base-content/50">Current</p>
                                <p className="font-mono font-bold">@{currentUsername}</p>
                            </div>
                            <i className="fa-solid fa-arrow-right text-base-content/30" />
                            <div className="rounded-xl bg-primary/10 px-4 py-2 text-center">
                                <p className="text-xs text-primary/70">Revert to</p>
                                <p className="font-mono font-bold text-primary">@{usernameStatus.revertable_username}</p>
                            </div>
                        </div>

                        <div className="rounded-xl bg-warning/10 p-4 text-sm space-y-1">
                            <p className="font-medium text-warning"><i className="fa-solid fa-triangle-exclamation mr-1" /> Important</p>
                            <ul className="list-disc list-inside text-base-content/70 space-y-0.5">
                                <li>The 6-month cooldown remains active</li>
                                <li>@{currentUsername} becomes immediately available</li>
                                <li>You cannot reserve usernames by reverting</li>
                            </ul>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-error/10 p-3 text-sm text-error">
                                <i className="fa-solid fa-circle-xmark mr-1" /> {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setShowRevert(false)} className="btn btn-ghost rounded-xl">Back</button>
                            <button onClick={handleRevert} className="btn btn-warning rounded-xl" disabled={saving}>
                                {saving ? <><span className="loading loading-spinner loading-sm" /> Reverting...</> : 'Revert Username'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Change / Case Edit View ── */
                    <div className="p-6 space-y-4">
                        {/* Info box */}
                        {usernameStatus.can_change ? (
                            <div className="rounded-xl bg-info/10 p-4 text-sm space-y-1">
                                <p className="font-medium text-info"><i className="fa-solid fa-circle-info mr-1" /> Before you change</p>
                                <ul className="list-disc list-inside text-base-content/70 space-y-0.5">
                                    <li>6-month cooldown after changing</li>
                                    <li>14 days to revert if needed</li>
                                    <li>Old username becomes available to others</li>
                                </ul>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-base-300/50 p-4 text-sm">
                                <p className="text-base-content/70">
                                    <i className="fa-solid fa-info-circle mr-1 text-info" />
                                    Casing changes are always allowed — only the capitalization is updated.
                                </p>
                            </div>
                        )}

                        {/* Current username */}
                        <div>
                            <label className="label"><span className="label-text text-base-content/50">Current username</span></label>
                            <div className="flex items-center rounded-2xl bg-base-300/50 px-4 py-3">
                                <span className="mr-1 text-base-content/40">@</span>
                                <span className="font-mono font-medium">{currentUsername}</span>
                            </div>
                        </div>

                        {/* New username input */}
                        <div>
                            <label className="label"><span className="label-text">New username</span></label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40">@</span>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    className={`input input-bordered h-12 w-full rounded-2xl pl-8 font-mono focus:input-primary ${
                                        availability.available === false ? 'input-error' : availability.available === true ? 'input-success' : ''
                                    }`}
                                    placeholder={currentUsername}
                                    maxLength={30}
                                    autoFocus
                                />
                                {/* Status icon */}
                                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                    {checking ? (
                                        <span className="loading loading-spinner loading-xs" />
                                    ) : availability.available === true ? (
                                        <i className="fa-solid fa-circle-check text-success" />
                                    ) : availability.available === false ? (
                                        <i className="fa-solid fa-circle-xmark text-error" />
                                    ) : null}
                                </span>
                            </div>
                            {/* Feedback message */}
                            {availability.message && (
                                <div ref={feedbackRef} className={`mt-1.5 text-xs ${availability.available ? 'text-success' : 'text-error'}`}>
                                    {availability.message}
                                </div>
                            )}
                            <p className="mt-3 text-xs text-base-content/40">Letters, numbers, dashes, and underscores only</p>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-error/10 p-3 text-sm text-error">
                                <i className="fa-solid fa-circle-xmark mr-1" /> {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                            <div>
                                {usernameStatus.can_revert && usernameStatus.revertable_username && (
                                    <button
                                        type="button"
                                        onClick={() => setShowRevert(true)}
                                        className="btn btn-ghost btn-sm rounded-xl text-warning"
                                    >
                                        <i className="fa-solid fa-rotate-left text-xs" />
                                        Revert to @{usernameStatus.revertable_username}
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Cancel</button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="btn btn-primary rounded-xl"
                                    disabled={!canSubmit}
                                >
                                    {saving ? (
                                        <><span className="loading loading-spinner loading-sm" /> Saving...</>
                                    ) : isCaseOnly ? (
                                        'Update Casing'
                                    ) : (
                                        'Change Username'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </Modal>
    );
}

/* ── Animated Collapse (expand/contract with fade) ── */
function AnimatedCollapse({ visible, children }: { visible: boolean; children: ReactNode }) {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const mounted = useRef(false);
    const [shouldRender, setShouldRender] = useState(visible);

    useEffect(() => {
        const outer = outerRef.current;
        const inner = innerRef.current;

        if (visible) {
            setShouldRender(true);
        }

        // Skip animation on initial mount
        if (!mounted.current) {
            mounted.current = true;
            if (outer && visible) {
                outer.style.height = 'auto';
                outer.style.overflow = 'visible';
            }
            return;
        }

        if (!outer || !inner) return;

        if (visible) {
            // Expand then fade in
            const contentHeight = inner.scrollHeight;
            gsap.timeline()
                .set(outer, { height: 0, overflow: 'hidden' })
                .set(inner, { opacity: 0 })
                .to(outer, { height: contentHeight, duration: 0.3, ease: 'power2.out' })
                .to(inner, { opacity: 1, duration: 0.2, ease: 'power1.out' })
                .set(outer, { height: 'auto', overflow: 'visible' });
        } else {
            // Fade out then contract
            gsap.timeline({
                onComplete: () => setShouldRender(false),
            })
                .set(outer, { height: outer.scrollHeight, overflow: 'hidden' })
                .to(inner, { opacity: 0, duration: 0.15, ease: 'power1.in' })
                .to(outer, { height: 0, duration: 0.25, ease: 'power2.in' });
        }
    }, [visible]);

    if (!shouldRender) return null;

    return (
        <div ref={outerRef}>
            <div ref={innerRef}>{children}</div>
        </div>
    );
}

/* ── Pronoun Drag-to-Reorder ── */
function PronounReorder({ pronouns, customPronouns, labels, onReorder }: {
    pronouns: string[];
    customPronouns: string;
    labels: Record<string, string>;
    onReorder: (reordered: string[]) => void;
}) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    function handleDrop(targetIndex: number) {
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const reordered = [...pronouns];
        const [moved] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, moved);
        onReorder(reordered);
        setDraggedIndex(null);
        setDragOverIndex(null);
    }

    function getLabel(pronoun: string): string {
        if (pronoun === 'custom') return customPronouns || 'Custom';
        return labels[pronoun] ?? pronoun;
    }

    return (
        <div className="rounded-2xl bg-base-300/30 p-4">
            <p className="mb-3 text-xs text-base-content/50">
                <i className="fa-solid fa-grip-vertical mr-1" />
                Drag to reorder your pronouns:
            </p>
            <div className="flex flex-wrap gap-2">
                {pronouns.map((pronoun, index) => (
                    <div
                        key={pronoun}
                        draggable
                        onDragStart={(e) => {
                            setDraggedIndex(index);
                            e.currentTarget.classList.add('opacity-50');
                        }}
                        onDragEnd={(e) => {
                            e.currentTarget.classList.remove('opacity-50');
                            setDraggedIndex(null);
                            setDragOverIndex(null);
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverIndex(index);
                        }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                            e.preventDefault();
                            handleDrop(index);
                        }}
                        className={`inline-flex cursor-grab select-none items-center gap-2 rounded-full border border-base-300 bg-base-300 px-3 py-1.5 text-sm transition-all hover:border-primary/50 hover:shadow-sm active:cursor-grabbing ${
                            dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                    >
                        <i className="fa-solid fa-grip-vertical text-[10px] text-base-content/30" />
                        <span className="font-medium">{getLabel(pronoun)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Birthday Visibility Picker ── */

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function formatBirthdayPreview(visibility: string, month: string, day: string, year: string): string {
    const monthName = month ? MONTH_NAMES[parseInt(month)] : '';
    const y = parseInt(year);

    switch (visibility) {
        case 'full': return monthName && day && year ? `${monthName} ${day}, ${year}` : '';
        case 'month_day': return monthName && day ? `${monthName} ${day}` : '';
        case 'year': return year || '';
        case 'age': {
            if (!y) return '';
            const today = new Date();
            const m = month ? parseInt(month) : 0;
            const d = day ? parseInt(day) : 0;
            let age = today.getFullYear() - y;
            if (m && (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && d && today.getDate() < d))) {
                age--;
            }
            return `${age} years old`;
        }
        default: return '';
    }
}

function BirthdayVisibilityPicker({ month, day, year, value, onChange }: {
    month: string; day: string; year: string; value: string;
    onChange: (v: string) => void;
}) {
    const hasMonth = !!month;
    const hasDay = !!day;
    const hasYear = !!year;
    const hasAny = hasMonth || hasDay || hasYear;

    // Build available options based on filled fields (mirrors PHP logic)
    const availableOptions: { key: string; preview: string }[] = [];

    if (hasMonth && hasDay && hasYear) {
        availableOptions.push({ key: 'full', preview: formatBirthdayPreview('full', month, day, year) });
    }
    if (hasMonth && hasDay) {
        availableOptions.push({ key: 'month_day', preview: formatBirthdayPreview('month_day', month, day, year) });
    }
    if (hasYear) {
        availableOptions.push({ key: 'year', preview: formatBirthdayPreview('year', month, day, year) });
        availableOptions.push({ key: 'age', preview: formatBirthdayPreview('age', month, day, year) });
    }

    if (!hasAny) {
        return (
            <p className="text-sm italic text-base-content/50">
                <i className="fa-solid fa-info-circle mr-1" />
                Fill in birthday fields above to see display options
            </p>
        );
    }

    return (
        <div>
            <label className="label">
                <span className="label-text font-semibold">Show Birthday As</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
                {availableOptions.map(({ key, preview }) => (
                    <label
                        key={key}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                            value === key
                                ? 'border-primary bg-primary/5'
                                : 'border-base-300 hover:border-base-content/30'
                        }`}
                    >
                        <input
                            type="radio"
                            name="dob_visibility"
                            value={key}
                            checked={value === key}
                            onChange={() => onChange(key)}
                            className="radio radio-primary radio-sm"
                        />
                        <span className="text-sm font-medium">{preview}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

/* ── Two-column field row (matches original 38.2% / flex-1 layout) ── */
function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex-shrink-0 sm:w-[38.2%]">
                <span className="text-sm font-semibold">{label}</span>
                {hint && <p className="text-xs text-base-content/50">{hint}</p>}
            </div>
            <div className="flex-1">{children}</div>
        </div>
    );
}
