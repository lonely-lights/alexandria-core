import { type ReactNode, type SyntheticEvent, useEffect, useState, useRef, useCallback } from 'react';
import { useForm, router } from '@inertiajs/react';
import gsap from 'gsap';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import RichTextEditor from '@alexandria/components/editor/RichTextEditor';
import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';
import Button from '@alexandria/components/ui/Button';
import SectionHeader from '../components/SectionHeader';
import { formatBirthdayPreview } from './lib/formatters';
import useT, { type Translator } from '@alexandria/hooks/useT';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';

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

const SECTION_META: Record<string, { icon: string; titleKey: string; subtitleKey: string }> = {
    identity: { icon: 'fa-user-circle', titleKey: 'profile.identity.header_title', subtitleKey: 'profile.identity.header_subtitle' },
    about: { icon: 'fa-feather', titleKey: 'profile.about.header_title', subtitleKey: 'profile.about.header_subtitle' },
    details: { icon: 'fa-circle-info', titleKey: 'profile.details.header_title', subtitleKey: 'profile.details.header_subtitle' },
};

export default function ProfileSection({ profile, usernameStatus, options, activeSection = 'identity', onPreviewChange }: ProfileSectionProps) {
    const t = useT();
    const toast = useToastContext();
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const locationPlaceholder = useRotatingPlaceholder(LOCATION_HINTS, 2200);
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
        form.put('/account/profile', {
            onSuccess: () => toast.show(t('settings.toast.profile_saved'), { type: 'success' }),
        });
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

    const cardStyle = {
        background: 'var(--theme-base-surface)',
        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const dividerStyle = {
        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="overflow-hidden border shadow-xl" style={cardStyle}>
                <SectionHeader icon={meta.icon} title={t(meta.titleKey)} subtitle={t(meta.subtitleKey)} />

                <div className="space-y-6 p-6">
                    {activeSection === 'identity' && (
                        <IdentityFields
                            t={t}
                            profile={profile}
                            usernameStatus={usernameStatus}
                            options={options}
                            form={form}
                            togglePronoun={togglePronoun}
                            onOpenUsernameModal={() => setShowUsernameModal(true)}
                        />
                    )}

                    {activeSection === 'about' && (
                        <AboutFields t={t} form={form} />
                    )}

                    {activeSection === 'details' && (
                        <DetailsFields
                            t={t}
                            form={form}
                            locationPlaceholder={locationPlaceholder}
                        />
                    )}
                </div>

                <div className="flex justify-end border-t px-6 pb-6 pt-6" style={dividerStyle}>
                    <Button type="submit" variant="primary" loading={form.processing} icon="fa-solid fa-floppy-disk" iconPosition="before">
                        {form.processing ? t('common.saving') : t('profile.save_button')}
                    </Button>
                </div>
            </div>

            <UsernameChangeModal
                t={t}
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

/* ── Identity fields ── */
function IdentityFields({
    t,
    profile,
    usernameStatus,
    options,
    form,
    togglePronoun,
    onOpenUsernameModal,
}: {
    t: Translator;
    profile: ProfileData;
    usernameStatus?: UsernameStatus;
    options: ProfileSectionProps['options'];
    form: ReturnType<typeof useForm<ProfileFormData>>;
    togglePronoun: (p: string) => void;
    onOpenUsernameModal: () => void;
}) {
    const usernameRowStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
        borderRadius: 'var(--theme-radius-input)',
    };
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    };
    const cooldownStyle = {
        background: 'var(--theme-status-warning-subtle)',
        color: 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-card)',
        border: '1px solid color-mix(in srgb, var(--theme-status-warning-fill) 35%, transparent)',
    };

    return (
        <>
            <FieldRow label={t('profile.identity.username_label')} hint={t('profile.identity.username_hint')}>
                <div className="flex items-stretch gap-2">
                    <div className="flex h-12 flex-1 items-center px-5" style={usernameRowStyle}>
                        <span className="mr-1" style={fadedTextStyle}>@</span>
                        <span className="truncate font-mono font-medium">{profile.username}</span>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onOpenUsernameModal}
                        icon={usernameStatus?.can_change ? 'fa-solid fa-pen text-xs' : 'fa-solid fa-font text-xs'}
                        iconPosition="before"
                    >
                        {usernameStatus?.can_change
                            ? t('profile.identity.username_change_button')
                            : t('profile.identity.username_edit_case_button')}
                    </Button>
                </div>
                {usernameStatus && !usernameStatus.can_change && usernameStatus.next_change_date && (
                    <div className="mt-2 px-3 py-2 text-xs" style={cooldownStyle}>
                        <i className="fa-solid fa-clock mr-1" style={{ color: 'var(--theme-status-warning-fill)' }} />
                        {t('profile.identity.username_cooldown_message')
                            .replace(':date', usernameStatus.next_change_date)
                            .replace(':diff', usernameStatus.next_change_diff ?? '')}
                        {usernameStatus.can_revert && usernameStatus.revertable_username && (
                            <span className="mt-1 block" style={fadedTextStyle}>
                                {t('profile.identity.username_revert_hint').replace(':username', usernameStatus.revertable_username)}
                            </span>
                        )}
                    </div>
                )}
            </FieldRow>

            <FieldRow label={t('profile.identity.display_name_label')} hint={t('profile.identity.display_name_hint')}>
                <Input
                    size="md"
                    value={form.data.display_name}
                    onChange={(e) => form.setData('display_name', e.target.value)}
                    placeholder={t('profile.identity.display_name_placeholder')}
                    maxLength={255}
                    error={form.errors.display_name}
                />
            </FieldRow>

            <FieldRow label={t('profile.identity.pronouns_label')} hint={t('profile.identity.pronouns_hint')}>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(options.pronouns).map(([value, label]) => (
                        <PronounChip
                            key={value}
                            label={label}
                            selected={form.data.pronouns.includes(value)}
                            onToggle={() => togglePronoun(value)}
                        />
                    ))}
                </div>
                <div className="mt-2">
                    <Input
                        size="sm"
                        value={form.data.custom_pronouns}
                        onChange={(e) => form.setData('custom_pronouns', e.target.value)}
                        placeholder={t('profile.identity.custom_pronouns_placeholder')}
                        maxLength={50}
                    />
                </div>
            </FieldRow>

            <AnimatedCollapse visible={form.data.pronouns.length > 1}>
                <PronounReorder
                    t={t}
                    pronouns={form.data.pronouns}
                    customPronouns={form.data.custom_pronouns}
                    labels={options.pronouns}
                    onReorder={(reordered) => form.setData('pronouns', reordered)}
                />
            </AnimatedCollapse>
        </>
    );
}

/* ── About fields ── */
function AboutFields({ t, form }: { t: Translator; form: ReturnType<typeof useForm<ProfileFormData>> }) {
    return (
        <>
            <div>
                <Input
                    size="md"
                    label={t('profile.about.tagline_label')}
                    value={form.data.tagline}
                    onChange={(e) => form.setData('tagline', e.target.value)}
                    placeholder={t('profile.about.tagline_placeholder')}
                    maxLength={150}
                    error={form.errors.tagline}
                />
            </div>

            <div>
                <RichTextEditor
                    label={t('profile.about.bio_label')}
                    value={form.data.bio}
                    onChange={(wiki) => form.setData('bio', wiki)}
                    placeholder={t('profile.about.bio_placeholder')}
                    maxLength={1000}
                    tier="free"
                />
                {form.errors.bio && (
                    <p className="mt-1 text-sm" style={{ color: 'var(--theme-status-error-stroke)' }}>{form.errors.bio}</p>
                )}
            </div>

            <div>
                <RichTextEditor
                    label={t('profile.about.private_bio_label')}
                    value={form.data.private_bio}
                    onChange={(wiki) => form.setData('private_bio', wiki)}
                    placeholder={t('profile.about.private_bio_placeholder')}
                    maxLength={1000}
                    tier="free"
                />
                {form.errors.private_bio && (
                    <p className="mt-1 text-sm" style={{ color: 'var(--theme-status-error-stroke)' }}>{form.errors.private_bio}</p>
                )}
            </div>
        </>
    );
}

/* ── Details fields ── */
function DetailsFields({
    t,
    form,
    locationPlaceholder,
}: {
    t: Translator;
    form: ReturnType<typeof useForm<ProfileFormData>>;
    locationPlaceholder: string;
}) {
    const monthOptions = Object.entries(MONTHS).slice(1).map(([value, label]) => ({ value, label }));
    const dayOptions = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
    const yearOptions = Array.from({ length: 100 }, (_, i) => {
        const y = String(new Date().getFullYear() - i);
        return { value: y, label: y };
    });
    const errorBag = form.errors.birth_month || form.errors.birth_day || form.errors.birth_year;

    return (
        <>
            <FieldRow label={t('profile.details.location_label')} hint={t('profile.details.location_hint')}>
                <Input
                    size="md"
                    value={form.data.location}
                    onChange={(e) => form.setData('location', e.target.value)}
                    placeholder={locationPlaceholder}
                    maxLength={100}
                    error={form.errors.location}
                />
            </FieldRow>

            <FieldRow label={t('profile.details.website_label')} hint={t('profile.details.website_hint')}>
                <Input
                    size="md"
                    type="url"
                    value={form.data.website}
                    onChange={(e) => form.setData('website', e.target.value)}
                    placeholder={t('profile.details.website_placeholder')}
                    maxLength={255}
                    error={form.errors.website}
                />
            </FieldRow>

            <FieldRow label={t('profile.details.birthday_label')} hint={t('profile.details.birthday_hint')}>
                <div className="grid grid-cols-3 gap-3">
                    <Select
                        size="md"
                        value={form.data.birth_month}
                        onChange={(e) => form.setData('birth_month', e.target.value)}
                        options={monthOptions}
                        placeholder={t('profile.details.birthday_month_placeholder')}
                    />
                    <Select
                        size="md"
                        value={form.data.birth_day}
                        onChange={(e) => form.setData('birth_day', e.target.value)}
                        options={dayOptions}
                        placeholder={t('profile.details.birthday_day_placeholder')}
                    />
                    <Select
                        size="md"
                        value={form.data.birth_year}
                        onChange={(e) => form.setData('birth_year', e.target.value)}
                        options={yearOptions}
                        placeholder={t('profile.details.birthday_year_placeholder')}
                    />
                </div>
                {errorBag && (
                    <p className="mt-1 text-sm" style={{ color: 'var(--theme-status-error-stroke)' }}>{errorBag}</p>
                )}
            </FieldRow>

            <BirthdayVisibilityPicker
                t={t}
                month={form.data.birth_month}
                day={form.data.birth_day}
                year={form.data.birth_year}
                value={form.data.dob_visibility}
                onChange={(v) => form.setData('dob_visibility', v)}
            />
        </>
    );
}

/* ── Pronoun chip — selectable pill button (replaces DaisyUI peer-checked
   pattern; relies on .alex-pref-card surface tokens). ── */
function PronounChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            className={`alex-pref-card px-4 py-2 text-sm font-medium ${selected ? 'alex-pref-card--selected' : ''}`}
            style={{
                color: selected ? 'var(--theme-brand-primary-500)' : 'var(--theme-base-content)',
                borderRadius: '9999px',
            }}
        >
            {label}
        </button>
    );
}

/* ── Username Change Modal ── */
function UsernameChangeModal({ t, open, currentUsername, usernameStatus, onClose, onSuccess }: {
    t: Translator;
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

        if (!/^[a-zA-Z0-9_-]*$/.test(value)) {
            setAvailability({ available: false, message: t('profile.username_modal.format_error') });
            return;
        }
        if (value.length > 30) {
            setAvailability({ available: false, message: t('profile.username_modal.length_error') });
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
                setError(t('profile.username_modal.generic_error'));
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
                setError(t('profile.username_modal.generic_error'));
            });
    }

    const canSubmit = !isSame && isValid && newUsername.length > 0 && availability.available === true && !saving;

    const modalTitle = showRevert
        ? t('profile.username_modal.revert_title')
        : (usernameStatus.can_change ? t('profile.username_modal.change_title') : t('profile.username_modal.case_title'));

    const subtleSurface = {
        background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const errorSurface = {
        background: 'var(--theme-status-error-subtle)',
        color: 'var(--theme-status-error-stroke)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const infoSurface = {
        background: 'var(--theme-status-info-subtle)',
        color: 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-card)',
        border: '1px solid color-mix(in srgb, var(--theme-status-info-fill) 35%, transparent)',
    };
    const warnSurface = {
        background: 'var(--theme-status-warning-subtle)',
        color: 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-card)',
        border: '1px solid color-mix(in srgb, var(--theme-status-warning-fill) 35%, transparent)',
    };
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    };

    return (
        <Modal open={open} onClose={onClose}>
            <ModalHeader title={modalTitle} onClose={onClose} />

            {showRevert && usernameStatus.can_revert && usernameStatus.revertable_username ? (
                <div className="space-y-4 p-6">
                    <div className="flex items-center justify-center gap-4">
                        <div className="px-4 py-2 text-center" style={subtleSurface}>
                            <p className="text-xs" style={fadedTextStyle}>{t('profile.username_modal.revert_current_label')}</p>
                            <p className="font-mono font-bold">@{currentUsername}</p>
                        </div>
                        <i className="fa-solid fa-arrow-right" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }} />
                        <div
                            className="px-4 py-2 text-center"
                            style={{
                                background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
                                borderRadius: 'var(--theme-radius-card)',
                            }}
                        >
                            <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 70%, transparent)' }}>
                                {t('profile.username_modal.revert_target_label')}
                            </p>
                            <p className="font-mono font-bold" style={{ color: 'var(--theme-brand-primary-500)' }}>
                                @{usernameStatus.revertable_username}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1 p-4 text-sm" style={warnSurface}>
                        <p className="font-medium" style={{ color: 'var(--theme-status-warning-fill)' }}>
                            <i className="fa-solid fa-triangle-exclamation mr-1" /> {t('profile.username_modal.revert_important_header')}
                        </p>
                        <ul className="list-inside list-disc space-y-0.5" style={fadedTextStyle}>
                            <li>{t('profile.username_modal.revert_cooldown_remains')}</li>
                            <li>{t('profile.username_modal.revert_old_available').replace(':username', currentUsername)}</li>
                            <li>{t('profile.username_modal.revert_no_reservation')}</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="p-3 text-sm" style={errorSurface}>
                            <i className="fa-solid fa-circle-xmark mr-1" /> {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setShowRevert(false)}>{t('common.back')}</Button>
                        <Button variant="primary" onClick={handleRevert} loading={saving}>
                            {saving ? t('profile.username_modal.reverting') : t('profile.username_modal.revert_button')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 p-6">
                    {usernameStatus.can_change ? (
                        <div className="space-y-1 p-4 text-sm" style={infoSurface}>
                            <p className="font-medium" style={{ color: 'var(--theme-status-info-fill)' }}>
                                <i className="fa-solid fa-circle-info mr-1" /> {t('profile.username_modal.before_change_header')}
                            </p>
                            <ul className="list-inside list-disc space-y-0.5" style={fadedTextStyle}>
                                <li>{t('profile.username_modal.cooldown_after')}</li>
                                <li>{t('profile.username_modal.revert_window')}</li>
                                <li>{t('profile.username_modal.old_becomes_available')}</li>
                            </ul>
                        </div>
                    ) : (
                        <div className="p-4 text-sm" style={subtleSurface}>
                            <p style={fadedTextStyle}>
                                <i className="fa-solid fa-info-circle mr-1" style={{ color: 'var(--theme-status-info-fill)' }} />
                                {t('profile.username_modal.case_only_explanation')}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-xs" style={fadedTextStyle}>
                            {t('profile.username_modal.current_label')}
                        </label>
                        <div className="flex items-center px-4 py-3" style={subtleSurface}>
                            <span className="mr-1" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}>@</span>
                            <span className="font-mono font-medium">{currentUsername}</span>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs" style={fadedTextStyle}>
                            {t('profile.username_modal.new_label')}
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}>@</span>
                            <Input
                                size="md"
                                value={newUsername}
                                onChange={(e) => handleInputChange(e.target.value)}
                                placeholder={currentUsername}
                                maxLength={30}
                                autoFocus
                                className="pl-8 font-mono"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                                {checking ? (
                                    <i className="fa-solid fa-arrows-rotate animate-spin text-xs" />
                                ) : availability.available === true ? (
                                    <i className="fa-solid fa-circle-check" style={{ color: 'var(--theme-status-success-fill)' }} />
                                ) : availability.available === false ? (
                                    <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--theme-status-error-stroke)' }} />
                                ) : null}
                            </span>
                        </div>
                        {availability.message && (
                            <div
                                ref={feedbackRef}
                                className="mt-1.5 text-xs"
                                style={{
                                    color: availability.available
                                        ? 'var(--theme-status-success-fill)'
                                        : 'var(--theme-status-error-stroke)',
                                }}
                            >
                                {availability.message}
                            </div>
                        )}
                        <p className="mt-3 text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}>
                            {t('profile.username_modal.charset_hint')}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 text-sm" style={errorSurface}>
                            <i className="fa-solid fa-circle-xmark mr-1" /> {error}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <div>
                            {usernameStatus.can_revert && usernameStatus.revertable_username && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowRevert(true)}
                                    icon="fa-solid fa-rotate-left text-xs"
                                    iconPosition="before"
                                >
                                    {t('profile.username_modal.revert_to_button').replace(':username', usernameStatus.revertable_username)}
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                loading={saving}
                                disabled={!canSubmit}
                            >
                                {isCaseOnly
                                    ? t('profile.username_modal.update_casing_button')
                                    : t('profile.username_modal.change_button')}
                            </Button>
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
            const contentHeight = inner.scrollHeight;
            gsap.timeline()
                .set(outer, { height: 0, overflow: 'hidden' })
                .set(inner, { opacity: 0 })
                .to(outer, { height: contentHeight, duration: 0.3, ease: 'power2.out' })
                .to(inner, { opacity: 1, duration: 0.2, ease: 'power1.out' })
                .set(outer, { height: 'auto', overflow: 'visible' });
        } else {
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
function PronounReorder({ t, pronouns, customPronouns, labels, onReorder }: {
    t: Translator;
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

    const surfaceStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const chipStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    };

    return (
        <div className="p-4" style={surfaceStyle}>
            <p className="mb-3 text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                <i className="fa-solid fa-grip-vertical mr-1" />
                {t('profile.identity.pronoun_reorder_hint')}
            </p>
            <div className="flex flex-wrap gap-2">
                {pronouns.map((pronoun, index) => {
                    const isDragOver = dragOverIndex === index && draggedIndex !== index;
                    return (
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
                            className="inline-flex cursor-grab select-none items-center gap-2 px-3 py-1.5 text-sm transition-shadow hover:shadow-sm active:cursor-grabbing"
                            style={{
                                ...chipStyle,
                                borderRadius: '9999px',
                                outline: isDragOver ? `2px solid var(--theme-brand-primary-500)` : 'none',
                                outlineOffset: isDragOver ? '2px' : 0,
                            }}
                        >
                            <i className="fa-solid fa-grip-vertical text-[10px]" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }} />
                            <span className="font-medium">{getLabel(pronoun)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Birthday Visibility Picker ── */
const MONTHS: Record<string, string> = {
    '': 'Month',
    '1': 'January', '2': 'February', '3': 'March', '4': 'April',
    '5': 'May', '6': 'June', '7': 'July', '8': 'August',
    '9': 'September', '10': 'October', '11': 'November', '12': 'December',
};

function BirthdayVisibilityPicker({ t, month, day, year, value, onChange }: {
    t: Translator;
    month: string; day: string; year: string; value: string;
    onChange: (v: string) => void;
}) {
    const hasMonth = !!month;
    const hasDay = !!day;
    const hasYear = !!year;
    const hasAny = hasMonth || hasDay || hasYear;
    const ageSuffix = t('profile.details.age_suffix');

    const availableOptions: { key: string; preview: string }[] = [];

    if (hasMonth && hasDay && hasYear) {
        availableOptions.push({ key: 'full', preview: formatBirthdayPreview('full', month, day, year, ageSuffix) });
    }
    if (hasMonth && hasDay) {
        availableOptions.push({ key: 'month_day', preview: formatBirthdayPreview('month_day', month, day, year, ageSuffix) });
    }
    if (hasYear) {
        availableOptions.push({ key: 'year', preview: formatBirthdayPreview('year', month, day, year, ageSuffix) });
        availableOptions.push({ key: 'age', preview: formatBirthdayPreview('age', month, day, year, ageSuffix) });
    }

    if (!hasAny) {
        return (
            <p className="text-sm italic" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                <i className="fa-solid fa-info-circle mr-1" />
                {t('profile.details.dob_visibility_empty')}
            </p>
        );
    }

    return (
        <div className="mb-12">
            <span className="mb-2 block text-sm font-semibold">
                {t('profile.details.dob_visibility_label')}
            </span>
            <div className="grid grid-cols-2 gap-2">
                {availableOptions.map(({ key, preview }) => {
                    const selected = value === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onChange(key)}
                            className={`alex-pref-card flex cursor-pointer items-center gap-3 p-3 ${selected ? 'alex-pref-card--selected' : ''}`}
                        >
                            <span
                                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2"
                                style={{
                                    borderColor: selected
                                        ? 'var(--theme-brand-primary-500)'
                                        : 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
                                }}
                                aria-hidden="true"
                            >
                                {selected && (
                                    <span className="h-2 w-2 rounded-full" style={{ background: 'var(--theme-brand-primary-500)' }} />
                                )}
                            </span>
                            <span className="text-sm font-medium">{preview}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Two-column field row (matches original 38.2% / flex-1 layout) ── */
function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    const hintStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    };
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex-shrink-0 sm:w-[38.2%]">
                <span className="text-sm font-semibold">{label}</span>
                {hint && <p className="text-xs" style={hintStyle}>{hint}</p>}
            </div>
            <div className="flex-1">{children}</div>
        </div>
    );
}

/* ── Rotating placeholder hook ──
 * Cycles through a list of strings to suggest both real and imagined
 * places in the Location field.
 */
const LOCATION_HINTS = [
    'Brooklyn, NY',
    'Shackleton Crater',
    'Reykjavík, Iceland',
    'Ankh-Morpork',
    'Port Townsend, WA',
    'Lothlórien',
    'Marrakech, Morocco',
    'A houseboat in Sausalito',
    'Hobbiton',
    'Edinburgh, Scotland',
    'Aboard the TARDIS',
    'Kyoto, Japan',
    'Off the grid',
];

function useRotatingPlaceholder(values: readonly string[], intervalMs: number): string {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (values.length <= 1) return;
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % values.length);
        }, intervalMs);

        return () => clearInterval(id);
    }, [values, intervalMs]);

    return values[index];
}

/* ── Form data shape for typing the form ref across helpers. ── */
interface ProfileFormData {
    display_name: string;
    pronouns: string[];
    custom_pronouns: string;
    tagline: string;
    bio: string;
    private_bio: string;
    private_bio_visibility: string;
    location: string;
    website: string;
    birth_month: string;
    birth_day: string;
    birth_year: string;
    dob_visibility: string;
}
