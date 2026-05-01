import { usePage, router } from '@inertiajs/react';
import { useState, useRef, useEffect, type ChangeEvent, type ReactNode } from 'react';
import gsap from 'gsap';
import AppLayout from '@alexandria/layouts/AppLayout';
import AvatarWithRing, { type AvatarRingOption } from '@alexandria/components/ui/AvatarWithRing';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import { useEnterAnimation } from '@alexandria/hooks/useEnterAnimation';
import ProfileSection from './Sections/ProfileSection';
import PreferencesSection, { type ViewPreferences } from './Sections/PreferencesSection';
import LinksSection from './Sections/LinksSection';
import PrivacySections from './Sections/PrivacySections';
import AiSections from './Sections/AiSections';

/**
 * Account Settings page shell.
 *
 * Lifts the legacy `Account.tsx` settings page into core. The six
 * framework-generic section bodies (Profile, Preferences, Links, AI,
 * Privacy + sub-sections) ship in `./Sections/`. The legacy
 * `AccountManagementSection` (email/password change + danger zone) is
 * intentionally NOT lifted — billing, account deletion, and any
 * paid-tier concerns belong in the consumer app per ADR-010. The page
 * exposes an `accountManagementSlot` render-prop so the SaaS app can
 * render its own AccountManagementSection inside the "account" tab.
 *
 * Endpoint contracts (consumer apps must expose these routes):
 * - `PUT /account/profile`             — profile fields incl. bio
 * - `PUT /account/username`            — username change
 * - `POST /account/username/check`     — username availability
 * - `POST /account/username/revert`    — revert recent username change
 * - `PUT /account/avatar-ring`         — avatar-ring selection
 * - `POST/DELETE /account/avatar`      — avatar upload / removal
 * - `POST/DELETE /account/banner`      — banner upload / removal
 * - `PUT /account/preferences`         — preferences (theme, etc.)
 * - `POST/PUT/DELETE /account/links[/{id}]`         — profile links CRUD
 * - `PUT /account/field-visibility`                 — field-level privacy
 * - `POST/PUT/DELETE /account/privacy-lists[/{id}]` — privacy lists
 * - `POST/PUT/DELETE /account/ai/keys[/{id}]`       — BYOK API keys
 * - `POST /account/ai/keys/validate`                — key validation
 * - `PUT  /account/ai/keys/{id}/activate`           — activate a key
 * - `PUT  /account/ai/models`                       — model selection
 * - `PUT  /account/ai/preferences`                  — AI preferences
 *
 * Note: the legacy AccountManagementSection (handled APP-side) hits
 * `PUT /account/email`, `PUT /account/password`, and
 * `DELETE /account/delete`. Those routes are the consumer app's
 * responsibility.
 */

/**
 * Page props delivered by Inertia from the consumer-app backend. The
 * shape is a contract between the SaaS app's controller and this page;
 * see the docblock above for the route surface that backs it.
 */
interface AccountInertiaProps {
    profile: {
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
        email: string;
        email_verified: boolean;
        avatar_ring_id: number | null;
        avatar_ring_slug: string;
    };
    avatarRings: Record<number, AvatarRingOption>;
    usernameStatus: {
        can_change: boolean;
        next_change_date: string | null;
        next_change_diff: string | null;
        can_revert: boolean;
        revertable_username: string | null;
    };
    links: Array<{
        id: number; platform_id: number | null; platform_name: string | null;
        platform_icon: string | null; platform_color: string | null;
        handle: string | null; url: string; label: string | null; visibility: string;
    }>;
    linkPlatforms: Record<string, Array<{
        id: number; slug: string; name: string; icon: string; color: string;
        base_url: string | null; url_pattern: string | null;
    }>>;
    fieldVisibility: Record<string, { visibility: string; include_list_ids: number[] }>;
    privacyLists: Array<{
        id: number; name: string; description: string | null; icon: string; color: string;
        is_system: boolean; members_count: number;
    }>;
    privacyOptions: {
        fields: Record<string, { label: string; icon: string; description: string }>;
        visibility: Record<string, { label: string; icon: string; description: string }>;
        list_icons: Record<string, string>;
        list_colors: Record<string, string>;
    };
    ai: Record<string, unknown>;
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
}

/**
 * Component-level props supplied by the consumer app's wrapper page
 * (NOT delivered through Inertia). These are render-time slots and
 * callbacks that decouple framework-generic UI from app-specific
 * concerns like billing and DOM-side preference application.
 */
interface AccountSlotProps {
    /**
     * Optional slot rendered inside the "account" sub-section. The SaaS
     * consumer app passes its own AccountManagementSection here (email/
     * password change + billing + danger zone — kept APP-side per
     * ADR-010).
     */
    accountManagementSlot?: (ctx: { email: string; emailVerified: boolean }) => ReactNode;
    /**
     * Optional callback invoked when the user toggles a view-related
     * preference (font size, reduced motion, high contrast, etc.).
     * Consumer apps wire this to a small DOM helper that mirrors the
     * preference onto `<html>` as data-* attributes for optimistic UI
     * updates. See `PreferencesSection` for the contract.
     */
    applyViewPreferences?: (prefs: ViewPreferences) => void;
}

interface NavItem {
    key: string;
    label: string;
    icon: string;
    color?: string;
    children?: NavItem[];
}

const ALL_NAV: NavItem[] = [
    {
        key: 'profile', label: 'Profile', icon: 'fa-user', color: 'primary',
        children: [
            { key: 'identity', label: 'Identity', icon: 'fa-user-circle' },
            { key: 'about', label: 'About', icon: 'fa-feather' },
            { key: 'details', label: 'Details', icon: 'fa-circle-info' },
            { key: 'links', label: 'Links', icon: 'fa-link' },
            { key: 'account', label: 'Account', icon: 'fa-user-gear' },
        ],
    },
    {
        key: 'preferences', label: 'Preferences', icon: 'fa-sliders',
        children: [
            { key: 'pref-appearance', label: 'Appearance', icon: 'fa-palette' },
            { key: 'pref-language', label: 'Formats', icon: 'fa-globe' },
            { key: 'pref-notifications', label: 'Notifications', icon: 'fa-bell' },
        ],
    },
    {
        key: 'privacy', label: 'Privacy', icon: 'fa-shield-halved',
        children: [
            { key: 'privacy-visibility', label: 'Visibility', icon: 'fa-eye' },
            { key: 'privacy-settings', label: 'Privacy', icon: 'fa-lock' },
            { key: 'privacy-lists', label: 'Lists', icon: 'fa-users-rectangle' },
        ],
    },
    {
        key: 'tools', label: 'Tools', icon: 'fa-toolbox',
        children: [
            { key: 'tools-editor', label: 'Editor', icon: 'fa-pen-to-square' },
            { key: 'tools-shortcuts', label: 'Shortcuts', icon: 'fa-keyboard' },
            { key: 'tools-integrations', label: 'Integrations', icon: 'fa-plug' },
        ],
    },
    {
        key: 'ai', label: 'AI', icon: 'fa-microchip',
        children: [
            { key: 'ai-connection', label: 'Connection', icon: 'fa-plug' },
            { key: 'ai-models', label: 'Models', icon: 'fa-cubes' },
            { key: 'ai-usage', label: 'Usage', icon: 'fa-chart-pie' },
            { key: 'ai-preferences', label: 'Preferences', icon: 'fa-sliders' },
        ],
    },
    {
        key: 'accessibility', label: 'Accessibility', icon: 'fa-universal-access',
        children: [
            { key: 'a11y-visual', label: 'Visual', icon: 'fa-eye' },
            { key: 'a11y-motion', label: 'Motion', icon: 'fa-wand-magic-sparkles' },
            { key: 'a11y-assistive', label: 'Assistive', icon: 'fa-universal-access' },
        ],
    },
];

export default function Account({ accountManagementSlot, applyViewPreferences }: AccountSlotProps = {}) {
    const { profile, avatarRings, usernameStatus, links, linkPlatforms, fieldVisibility, privacyLists, privacyOptions, ai, preferences, options } = usePage<{ props: AccountInertiaProps }>().props as unknown as AccountInertiaProps;
    const [activeSection, setActiveSection] = useState('identity');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ profile: true });
    const [showRingModal, setShowRingModal] = useState(false);
    const [savedRingId, setSavedRingId] = useState<number | null>(profile.avatar_ring_id);
    const [previewRingId, setPreviewRingId] = useState<number | null>(profile.avatar_ring_id);
    const avatarInput = useRef<HTMLInputElement>(null);
    const bannerInput = useRef<HTMLInputElement>(null);
    const [mediaError, setMediaError] = useState<string | null>(null);

    // Live preview state for the profile card
    const [livePreview, setLivePreview] = useState({
        display_name: profile.display_name,
        pronouns: profile.pronouns,
        tagline: profile.tagline,
        location: profile.location,
        website: profile.website,
    });

    const previewRing = previewRingId !== null ? avatarRings[previewRingId] : null;

    function toggleGroup(key: string) {
        setExpandedGroups((prev) => {
            const isExpanding = !prev[key];
            if (isExpanding) {
                // Collapse all others, expand this one
                const next: Record<string, boolean> = {};
                for (const k of Object.keys(prev)) {
                    next[k] = false;
                }
                next[key] = true;
                return next;
            }
            return { ...prev, [key]: false };
        });
    }

    function handleNavClick(item: NavItem) {
        if (item.children) {
            toggleGroup(item.key);
            if (!expandedGroups[item.key]) {
                setActiveSection(item.children[0].key);
            }
        } else {
            setActiveSection(item.key);
        }
    }

    function isActive(key: string): boolean {
        return activeSection === key
            || activeSection.startsWith(key + '-')
            || ALL_NAV.find((item) => item.key === key)?.children?.some((child) => child.key === activeSection) === true;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setMediaError(null);
        if (file.size > MAX_FILE_SIZE) {
            setMediaError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`);
            return;
        }
        router.post('/account/avatar', { avatar: file }, {
            forceFormData: true,
            onError: (errors) => setMediaError(Object.values(errors).flat().join(', ')),
        });
    }

    function handleBannerChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setMediaError(null);
        if (file.size > MAX_FILE_SIZE) {
            setMediaError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`);
            return;
        }
        router.post('/account/banner', { banner: file }, {
            forceFormData: true,
            onError: (errors) => setMediaError(Object.values(errors).flat().join(', ')),
        });
    }

    function removeAvatar() {
        router.delete('/account/avatar');
    }

    function removeBanner() {
        router.delete('/account/banner');
    }

    return (
        <AppLayout title="Settings" immersive>
            {/* ── Banner ── */}
            <div className="relative h-56 overflow-hidden sm:h-64 lg:h-72">
                <div className="absolute inset-0">
                    {profile.has_banner ? (
                        <img src={profile.banner_url} alt="Profile banner" className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary via-secondary to-accent opacity-90" />
                    )}
                    {/* Gradient overlay for smooth blend */}
                    <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/60 via-[30%] to-transparent" />
                    {/* Grain texture */}
                    <div
                        className="absolute inset-0 opacity-[0.08]"
                        style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')" }}
                    />
                    {/* Bottom border */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-base-content/5 via-base-content/20 to-base-content/5" />
                </div>
                {/* Banner controls */}
                <div className="absolute right-8 top-24 z-10 flex gap-2">
                    <button onClick={() => bannerInput.current?.click()} className="btn btn-sm bg-base-100/80 backdrop-blur-sm">
                        <i className="fa-solid fa-camera" />
                        {profile.has_banner ? 'Change Banner' : 'Upload Banner'}
                    </button>
                    {profile.has_banner && (
                        <button onClick={removeBanner} className="btn btn-sm btn-error bg-error/80 backdrop-blur-sm">
                            <i className="fa-solid fa-trash" /> Remove
                        </button>
                    )}
                    <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                </div>
            </div>

            {/* Upload error */}
            {mediaError && (
                <div className="mx-auto max-w-6xl px-4 pt-3">
                    <div className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-4 py-2 text-sm text-error">
                        <i className="fa-solid fa-circle-exclamation" />
                        {mediaError}
                        <button onClick={() => setMediaError(null)} className="ml-auto btn btn-ghost btn-xs btn-circle">
                            <i className="fa-solid fa-xmark text-[10px]" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Pseudo-depth shadow ── */}
            <div className="h-24 bg-gradient-to-b from-base-content/[0.03] to-transparent" />

            {/* ── Main Content ── */}
            <div className="relative -mt-32 z-10 px-4 pb-8 sm:-mt-36">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col gap-8 lg:flex-row">

                        {/* ── LEFT SIDEBAR: Profile Card ── */}
                        <div className="-mt-12 flex-shrink-0 sm:-mt-16 lg:w-80">
                            <div className="sticky top-4">
                                {/* Avatar with Ring */}
                                <div className="relative z-10 mb-4 flex justify-center">
                                    <div className="group relative">
                                        <AvatarWithRing
                                            src={profile.has_avatar ? profile.avatar_url : null}
                                            alt={profile.display_name ?? profile.username}
                                            initials={(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
                                            size={128}
                                            ring={previewRing?.slug ?? 'none'}
                                            ringSettings={previewRing?.settings}
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="mask mask-squircle flex h-32 w-32 items-center justify-center gap-1 bg-black/60 opacity-0 transition-all duration-300 group-hover:opacity-100">
                                                <button onClick={() => avatarInput.current?.click()} className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20">
                                                    <i className="fa-solid fa-camera" />
                                                </button>
                                                {profile.has_avatar && (
                                                    <button onClick={removeAvatar} className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20">
                                                        <i className="fa-solid fa-trash" />
                                                    </button>
                                                )}
                                                <button onClick={() => setShowRingModal(true)} className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20">
                                                    <i className="fa-solid fa-ring" />
                                                </button>
                                            </div>
                                        </div>
                                        <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                    </div>
                                </div>

                                {/* User info preview */}
                                <div className="px-6 pb-6 text-center">
                                    <h2 className="truncate text-xl font-bold">
                                        {livePreview.display_name || profile.username}
                                    </h2>
                                    <p className="text-sm text-base-content/60">
                                        <span className="text-base-content/40">@</span>{profile.username}
                                        <AnimatedPronouns pronouns={livePreview.pronouns} labels={options.pronouns as Record<string, string>} />
                                    </p>
                                    {livePreview.location && (
                                        <p className="text-sm text-base-content/50 flex items-center justify-center gap-1">
                                            <i className="fa-solid fa-location-dot text-xs" />
                                            <span>{livePreview.location}</span>
                                        </p>
                                    )}
                                    {livePreview.tagline && (
                                        <p className="mt-3 text-sm text-base-content/70 line-clamp-2">
                                            {livePreview.tagline}
                                        </p>
                                    )}
                                    {livePreview.website && (
                                        <div className="mt-4 flex justify-center border-t border-base-200 pt-4 text-sm">
                                            <a href={livePreview.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                                <i className="fa-solid fa-link text-xs" />
                                                <span>Website</span>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation */}
                                <div className="border-t border-base-200">
                                    <nav className="space-y-1 p-2">
                                        {ALL_NAV.map((item) => (
                                            <div key={item.key}>
                                                <button
                                                    onClick={() => handleNavClick(item)}
                                                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all duration-200 ${
                                                        isActive(item.key)
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'hover:bg-base-200'
                                                    }`}
                                                >
                                                    <i className={`fa-solid ${item.icon} w-5 text-center ${
                                                        isActive(item.key) ? 'text-primary' : 'text-base-content/50'
                                                    }`} />
                                                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                                                    {item.children && (
                                                        <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-300 ${
                                                            expandedGroups[item.key] ? 'rotate-180' : ''
                                                        }`} />
                                                    )}
                                                </button>

                                                {/* Nested items */}
                                                {item.children && expandedGroups[item.key] && (
                                                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-base-300/50 pl-4">
                                                        {item.children.map((child) => (
                                                            <button
                                                                key={child.key}
                                                                onClick={() => setActiveSection(child.key)}
                                                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ${
                                                                    activeSection === child.key
                                                                        ? 'bg-primary/10 text-primary'
                                                                        : 'text-base-content/70 hover:bg-base-200/70'
                                                                }`}
                                                            >
                                                                <i className={`fa-solid ${child.icon} w-4 text-center ${
                                                                    activeSection === child.key ? 'text-primary' : 'text-base-content/40'
                                                                }`} />
                                                                <span>{child.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </nav>
                                </div>
                            </div>
                        </div>

                        {/* ── MOBILE NAVIGATION ── */}
                        <MobileNav
                            activeSection={activeSection}
                            expandedGroups={expandedGroups}
                            onSectionChange={setActiveSection}
                            onToggleGroup={toggleGroup}
                        />

                        {/* ── RIGHT: Content Area ── */}
                        <div className="min-w-0 flex-1 sm:mt-6">
                            <AnimatedSection sectionKey={activeSection}>
                                <SectionContent
                                    activeSection={activeSection}
                                    profile={profile}
                                    usernameStatus={usernameStatus}
                                    links={links}
                                    linkPlatforms={linkPlatforms}
                                    fieldVisibility={fieldVisibility}
                                    privacyLists={privacyLists}
                                    privacyOptions={privacyOptions}
                                    ai={ai}
                                    preferences={preferences}
                                    options={options}
                                    onPreviewChange={setLivePreview}
                                    accountManagementSlot={accountManagementSlot}
                                    applyViewPreferences={applyViewPreferences}
                                />
                            </AnimatedSection>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Ring Selector Modal ── */}
            {showRingModal && (
                <RingModal
                    rings={avatarRings}
                    savedRingId={savedRingId}
                    previewRingId={previewRingId}
                    avatarSrc={profile.has_avatar ? profile.avatar_url : null}
                    initials={(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
                    onPreview={setPreviewRingId}
                    onSave={(ringId) => {
                        // Optimistic update — close modal and update state instantly
                        setSavedRingId(ringId);
                        setShowRingModal(false);
                        // Persist in the background without any Inertia page visit
                        fetch('/account/avatar-ring', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                            },
                            body: JSON.stringify({ avatar_ring_id: ringId }),
                        }).then();
                    }}
                    onClose={() => {
                        setPreviewRingId(savedRingId);
                        setShowRingModal(false);
                    }}
                />
            )}
        </AppLayout>
    );
}

/* ── Animated Pronouns ── */
function AnimatedPronouns({ pronouns, labels }: { pronouns: string[]; labels: Record<string, string> }) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const [displayed, setDisplayed] = useState(pronouns);
    const [visible, setVisible] = useState(pronouns.length > 0);

    function formatPronouns(keys: string[]): string {
        return keys.map((k) => labels[k] ?? k).join(', ');
    }

    useEffect(() => {
        const container = containerRef.current;

        if (pronouns.length > 0 && !visible) {
            setDisplayed(pronouns);
            setVisible(true);
            if (container) {
                gsap.fromTo(container, { opacity: 0, x: -8, scale: 0.95 }, { opacity: 1, x: 0, scale: 1, duration: 0.3, ease: 'back.out(1.4)' });
            }
        } else if (pronouns.length === 0 && visible) {
            if (container) {
                gsap.to(container, {
                    opacity: 0, x: -8, scale: 0.95, duration: 0.2, ease: 'power2.in',
                    onComplete: () => { setVisible(false); setDisplayed([]); },
                });
            } else {
                setVisible(false);
                setDisplayed([]);
            }
        } else if (pronouns.length > 0 && visible) {
            setDisplayed(pronouns);
            if (container) {
                gsap.fromTo(container, { opacity: 0.4 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
            }
        }
    }, [pronouns]);

    if (!visible) return null;

    return (
        <span ref={containerRef} className="inline-block">
            <span className="mx-1 text-base-content/30">·</span>
            <span>{formatPronouns(displayed)}</span>
        </span>
    );
}

/* ── Animated Section Wrapper ── */
function AnimatedSection({ sectionKey, children }: { sectionKey: string; children: ReactNode }) {
    const ref = useEnterAnimation<HTMLDivElement>(sectionKey);

    return <div ref={ref}>{children}</div>;
}

/* ── Section Header ── */
function SectionHeader({ icon, title, subtitle, label }: {
    icon: string; title: string; subtitle: string; label?: string;
}) {
    return (
        <div className="relative overflow-hidden px-8 py-8 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/5 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-start gap-5">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/15 border border-primary/20">
                    <i className={`fa-solid ${icon} text-xl text-primary`} />
                </div>
                <div className="min-w-0">
                    {label && (
                        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.25em] text-primary/80">
                            {label}
                        </div>
                    )}
                    <h3 className="font-serif text-3xl font-bold leading-tight tracking-tight">{title}</h3>
                    <p className="mt-2 text-sm text-base-content/60 leading-relaxed">{subtitle}</p>
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" aria-hidden="true" />
        </div>
    );
}

/* ── Section Wrapper ── */
function SectionCard({ children, icon, title, subtitle, label }: {
    children: ReactNode; icon: string; title: string; subtitle: string; label?: string;
}) {
    return (
        <div className="overflow-hidden rounded-3xl border border-base-content/10 bg-base-200 shadow-xl">
            <SectionHeader icon={icon} title={title} subtitle={subtitle} label={label} />
            <div className="space-y-6 p-8">
                {children}
            </div>
        </div>
    );
}

/* ── Section Content Router ── */
function SectionContent({ activeSection, profile, usernameStatus, links, linkPlatforms, fieldVisibility, privacyLists, privacyOptions, ai, preferences, options, onPreviewChange, accountManagementSlot, applyViewPreferences }: {
    activeSection: string;
    profile: AccountInertiaProps['profile'];
    usernameStatus: AccountInertiaProps['usernameStatus'];
    links: AccountInertiaProps['links'];
    linkPlatforms: AccountInertiaProps['linkPlatforms'];
    fieldVisibility: AccountInertiaProps['fieldVisibility'];
    privacyLists: AccountInertiaProps['privacyLists'];
    privacyOptions: AccountInertiaProps['privacyOptions'];
    ai: AccountInertiaProps['ai'];
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
    onPreviewChange: (preview: { display_name: string | null; pronouns: string[]; tagline: string | null; location: string | null; website: string | null }) => void;
    accountManagementSlot?: AccountSlotProps['accountManagementSlot'];
    applyViewPreferences?: AccountSlotProps['applyViewPreferences'];
}) {
    // Profile sections
    if (['identity', 'about', 'details'].includes(activeSection)) {
        return <ProfileSection profile={profile} usernameStatus={usernameStatus} options={options as { pronouns: Record<string, string>; dob_visibility: Record<string, string> }} activeSection={activeSection} onPreviewChange={onPreviewChange} />;
    }

    // Links section
    if (activeSection === 'links') {
        return (
            <SectionCard icon="fa-link" title="Connected Links" subtitle="Social media, support links, and other connections" label="Social & Links">
                <LinksSection links={links} platforms={linkPlatforms} onLinksChanged={() => router.reload({ only: ['links'] })} />
            </SectionCard>
        );
    }

    // Account section — rendered via consumer-supplied slot per ADR-010.
    // Core does not ship email/password/danger-zone UI because billing
    // and account-deletion flows are SaaS-app concerns.
    if (activeSection === 'account') {
        return (
            <SectionCard icon="fa-user-gear" title="Account" subtitle="Email, password, and account management" label="Account">
                {accountManagementSlot
                    ? accountManagementSlot({ email: profile.email, emailVerified: profile.email_verified })
                    : (
                        <div className="py-10 text-center text-sm text-base-content/50">
                            <i className="fa-solid fa-circle-info mr-1" />
                            Account management is supplied by the consumer app.
                        </div>
                    )}
            </SectionCard>
        );
    }

    // Privacy sections
    const privacySectionMap: Record<string, { sub: string; icon: string; title: string; subtitle: string }> = {
        'privacy-visibility': { sub: 'visibility', icon: 'fa-eye', title: 'Field Visibility', subtitle: 'Control who can see each part of your profile' },
        'privacy-settings': { sub: 'settings', icon: 'fa-lock', title: 'Privacy Settings', subtitle: 'Global privacy and social interaction preferences' },
        'privacy-lists': { sub: 'lists', icon: 'fa-users-rectangle', title: 'Privacy Lists', subtitle: 'Manage custom groups for granular access control' },
    };

    const privacyMeta = privacySectionMap[activeSection];
    if (privacyMeta) {
        return (
            <SectionCard icon={privacyMeta.icon} title={privacyMeta.title} subtitle={privacyMeta.subtitle} label="Privacy">
                <PrivacySections
                    section={privacyMeta.sub}
                    fieldVisibility={fieldVisibility}
                    privacyLists={privacyLists}
                    privacyOptions={privacyOptions}
                    preferences={preferences}
                    options={options}
                    onDataChanged={() => router.reload({ only: ['fieldVisibility', 'privacyLists'] })}
                />
            </SectionCard>
        );
    }

    // AI sections
    const aiSectionMap: Record<string, { sub: string; icon: string; title: string; subtitle: string }> = {
        'ai-connection': { sub: 'connection', icon: 'fa-plug', title: 'AI Connection', subtitle: 'Manage your API keys and providers' },
        'ai-models': { sub: 'models', icon: 'fa-cubes', title: 'Model Selection', subtitle: 'Choose AI models for different tasks' },
        'ai-usage': { sub: 'usage', icon: 'fa-chart-pie', title: 'Usage', subtitle: 'Track your AI usage this month' },
        'ai-preferences': { sub: 'preferences', icon: 'fa-sliders', title: 'AI Preferences', subtitle: 'Response style and behavior settings' },
    };

    const aiMeta = aiSectionMap[activeSection];
    if (aiMeta) {
        return (
            <SectionCard icon={aiMeta.icon} title={aiMeta.title} subtitle={aiMeta.subtitle} label="AI">
                <AiSections
                    section={aiMeta.sub}
                    ai={ai as never}
                    onDataChanged={() => router.reload({ only: ['ai'] })}
                />
            </SectionCard>
        );
    }

    // Preference/settings sections
    const sectionMeta: Record<string, { mapped: string; icon: string; title: string; subtitle: string; label: string }> = {
        'pref-appearance': { mapped: 'appearance', icon: 'fa-palette', title: 'Appearance', subtitle: 'Theme, font size, and display preferences', label: 'Preferences' },
        'pref-language': { mapped: 'language', icon: 'fa-globe', title: 'Regional Formats', subtitle: 'Date, time, and number formatting', label: 'Preferences' },
        'pref-notifications': { mapped: 'notifications', icon: 'fa-bell', title: 'Notifications', subtitle: 'Email, push, and in-app notification preferences', label: 'Preferences' },
        'tools-editor': { mapped: 'editor', icon: 'fa-pen-to-square', title: 'Editor', subtitle: 'Writing and editing preferences', label: 'Tools' },
        'a11y-visual': { mapped: 'a11y-visual', icon: 'fa-eye', title: 'Visual Accessibility', subtitle: 'Contrast, fonts, and focus indicators', label: 'Accessibility' },
        'a11y-motion': { mapped: 'a11y-motion', icon: 'fa-wand-magic-sparkles', title: 'Motion & Animation', subtitle: 'Reduce motion and transitions', label: 'Accessibility' },
        'a11y-assistive': { mapped: 'a11y-assistive', icon: 'fa-universal-access', title: 'Assistive Technology', subtitle: 'Screen reader and keyboard support', label: 'Accessibility' },
    };

    const meta = sectionMeta[activeSection];
    if (meta) {
        return (
            <SectionCard icon={meta.icon} title={meta.title} subtitle={meta.subtitle} label={meta.label}>
                <PreferencesSection
                    section={meta.mapped}
                    preferences={preferences}
                    options={options}
                    applyViewPreferences={applyViewPreferences}
                />
            </SectionCard>
        );
    }

    // Placeholder sections
    const placeholders: Record<string, { icon: string; title: string; subtitle: string; description: string }> = {
        'tools-shortcuts': { icon: 'fa-keyboard', title: 'Keyboard Shortcuts', subtitle: 'Customize your key bindings', description: 'Customizable keyboard shortcuts will let you navigate and edit faster with your preferred key combinations.' },
        'tools-integrations': { icon: 'fa-plug', title: 'Integrations', subtitle: 'Connect your favorite tools', description: 'Connect your favorite tools like Notion, Google Drive, Dropbox, and more to streamline your workflow.' },
    };

    const placeholder = placeholders[activeSection];
    if (placeholder) {
        return (
            <SectionCard icon={placeholder.icon} title={placeholder.title} subtitle={placeholder.subtitle} label="Tools">
                <div className="py-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-300">
                        <i className={`fa-solid ${placeholder.icon} text-2xl text-base-content/30`} />
                    </div>
                    <h3 className="font-serif text-2xl font-bold">Coming Soon</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-base-content/50">{placeholder.description}</p>
                </div>
            </SectionCard>
        );
    }

    return null;
}

/* ── Mobile Navigation ── */
function MobileNav({ activeSection, expandedGroups, onSectionChange, onToggleGroup }: {
    activeSection: string;
    expandedGroups: Record<string, boolean>;
    onSectionChange: (key: string) => void;
    onToggleGroup: (key: string) => void;
}) {
    const [open, setOpen] = useState(false);

    const currentLabel = ALL_NAV.flatMap((i) => [i, ...(i.children ?? [])]).find((i) => i.key === activeSection)?.label ?? 'Settings';

    return (
        <div className="space-y-2 lg:hidden">
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className="btn btn-ghost w-full justify-between rounded-xl bg-base-200/50"
                >
                    <span>{currentLabel}</span>
                    <i className={`fa-solid fa-chevron-down text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-base-300/50 bg-base-200 p-2 shadow-lg">
                        {ALL_NAV.map((item) => (
                            <div key={item.key}>
                                <button
                                    onClick={() => {
                                        if (item.children) {
                                            onToggleGroup(item.key);
                                        } else {
                                            onSectionChange(item.key);
                                            setOpen(false);
                                        }
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${activeSection === item.key ? 'bg-primary/10 text-primary' : ''}`}
                                >
                                    <i className={`fa-solid ${item.icon} w-4`} />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.children && <i className={`fa-solid fa-chevron-down text-xs ${expandedGroups[item.key] ? 'rotate-180' : ''}`} />}
                                </button>
                                {item.children && expandedGroups[item.key] && item.children.map((child) => (
                                    <button
                                        key={child.key}
                                        onClick={() => { onSectionChange(child.key); setOpen(false); }}
                                        className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-10 pr-3 text-sm ${activeSection === child.key ? 'bg-primary/10 text-primary' : 'text-base-content/70'}`}
                                    >
                                        <i className={`fa-solid ${child.icon} w-4`} />
                                        {child.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Ring Selector Modal ── */
function RingModal({ rings, savedRingId, previewRingId, avatarSrc, initials, onPreview, onSave, onClose }: {
    rings: Record<number, AvatarRingOption>;
    savedRingId: number | null;
    previewRingId: number | null;
    avatarSrc: string | null;
    initials: string;
    onPreview: (id: number | null) => void;
    onSave: (id: number | null) => void;
    onClose: () => void;
}) {
    const previewRing = previewRingId !== null ? rings[previewRingId] : null;

    return (
        <Modal open onClose={onClose}>
            <ModalHeader title="Avatar Ring" onClose={onClose} />

                {/* Preview */}
                <div className="flex justify-center bg-base-300/30 p-6">
                    <AvatarWithRing
                        src={avatarSrc}
                        initials={initials}
                        size={96}
                        ring={previewRing?.slug ?? 'none'}
                        ringSettings={previewRing?.settings}
                    />
                </div>

                {/* Ring Options */}
                <div className="max-h-64 space-y-2 overflow-y-auto p-6">
                    {/* None option */}
                    <button
                        onClick={() => onPreview(null)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                            previewRingId === null
                                ? 'bg-primary/10 ring-2 ring-primary'
                                : 'hover:bg-base-300'
                        }`}
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-300">
                            <i className="fa-solid fa-ban text-base-content/40" />
                        </div>
                        <div>
                            <p className="font-medium">None</p>
                            <p className="text-xs text-base-content/50">No ring around your avatar</p>
                        </div>
                        {previewRingId === null && (
                            <i className="fa-solid fa-check ml-auto text-primary" />
                        )}
                    </button>

                    {Object.entries(rings).map(([id, ring]) => {
                        const ringId = parseInt(id);

                        return (
                            <button
                                key={ringId}
                                onClick={() => onPreview(ringId)}
                                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                                    previewRingId === ringId
                                        ? 'bg-primary/10 ring-2 ring-primary'
                                        : 'hover:bg-base-300'
                                }`}
                            >
                                <AvatarWithRing
                                    src={avatarSrc}
                                    initials={initials}
                                    size={40}
                                    ring={ring.slug}
                                    ringSettings={ring.settings}
                                />
                                <div>
                                    <p className="font-medium">
                                        {ring.label}
                                        {ring.is_animated && (
                                            <span className="badge badge-sm badge-secondary ml-2">Animated</span>
                                        )}
                                    </p>
                                    {ring.description && (
                                        <p className="text-xs text-base-content/50">{ring.description}</p>
                                    )}
                                </div>
                                {previewRingId === ringId && (
                                    <i className="fa-solid fa-check ml-auto text-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <ModalFooter>
                    <button onClick={onClose} className="btn btn-ghost rounded-xl">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(previewRingId)}
                        className="btn btn-primary rounded-xl"
                        disabled={previewRingId === savedRingId}
                    >
                        Save Ring
                    </button>
                </ModalFooter>
        </Modal>
    );
}
