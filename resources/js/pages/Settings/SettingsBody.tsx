import { router } from '@inertiajs/react';
import { useState, useRef, type ChangeEvent, type ReactNode } from 'react';
import AvatarWithRing, { type AvatarRingOption } from '@alexandria/components/ui/AvatarWithRing';
import { useEnterAnimation } from '@alexandria/hooks/useEnterAnimation';
import { type ViewPreferences } from './Sections/PreferencesSection';
import { ALL_NAV, type NavItem } from './nav-config';
import AnimatedPronouns from './components/AnimatedPronouns';
import MobileNav from './components/MobileNav';
import RingModal from './components/RingModal';
import SectionContent from './components/SectionContent';

/**
 * Reusable Settings body — the actual UI (state + section rail + content
 * router). Two presentations consume this body so the logic stays DRY:
 *
 *   1. The /settings (and /profile) page, where the body fills the page
 *      under an `AppLayout immersive` wrapper.
 *   2. A future `<SettingsDrawer>` overlay that opens the same body
 *      inside a slide-over without leaving the current route.
 *
 * The body owns its own state (active section, expanded groups, ring
 * preview, etc.) — both shells just pass data in as props.
 *
 * Section bodies live in `./Sections/`. The legacy
 * `AccountManagementSection` (email/password change + danger zone) is
 * intentionally NOT shipped here — billing, account deletion, and any
 * paid-tier concerns belong in the consumer app per ADR-010. The body
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
 * Data the body needs. The /settings page reads these from `usePage()`;
 * a future `<SettingsDrawer>` may pass them from props or a context. The
 * body itself is presentation-source-agnostic.
 */
export interface SettingsBodyProps {
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

export default function SettingsBody({
    profile,
    avatarRings,
    usernameStatus,
    links,
    linkPlatforms,
    fieldVisibility,
    privacyLists,
    privacyOptions,
    ai,
    preferences,
    options,
    accountManagementSlot,
    applyViewPreferences,
}: SettingsBodyProps) {
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
        <>
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
                <div className="mx-auto max-w-7xl px-4 pt-3">
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
                <div className="mx-auto max-w-7xl">
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
        </>
    );
}

/* ── Animated Section Wrapper ── */
function AnimatedSection({ sectionKey, children }: { sectionKey: string; children: ReactNode }) {
    const ref = useEnterAnimation<HTMLDivElement>(sectionKey);

    return <div ref={ref}>{children}</div>;
}

