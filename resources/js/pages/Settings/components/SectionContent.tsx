import { router } from '@inertiajs/react';
import ProfileSection from '../Sections/ProfileSection';
import PreferencesSection from '../Sections/PreferencesSection';
import LinksSection from '../Sections/LinksSection';
import PrivacySections from '../Sections/PrivacySections';
import AiSections from '../Sections/AiSections';
import SecuritySection from '../Sections/SecuritySection';
import type { SettingsBodyProps } from '../SettingsBody';
import SectionCard from './SectionCard';
import useT from '@alexandria/hooks/useT';

/**
 * Section content router — picks the correct section component for the
 * current `activeSection` key. Profile sections render directly because
 * they own their own banner/avatar layout; everything else renders
 * inside a `<SectionCard>` with a header derived from the metadata
 * tables below.
 */
export default function SectionContent({
    activeSection,
    profile,
    usernameStatus,
    links,
    linkPlatforms,
    fieldVisibility,
    privacyLists,
    privacyOptions,
    ai,
    twoFactor,
    preferences,
    options,
    onPreviewChange,
    accountManagementSlot,
    applyViewPreferences,
}: {
    activeSection: string;
    profile: SettingsBodyProps['profile'];
    usernameStatus: SettingsBodyProps['usernameStatus'];
    links: SettingsBodyProps['links'];
    linkPlatforms: SettingsBodyProps['linkPlatforms'];
    fieldVisibility: SettingsBodyProps['fieldVisibility'];
    privacyLists: SettingsBodyProps['privacyLists'];
    privacyOptions: SettingsBodyProps['privacyOptions'];
    ai: SettingsBodyProps['ai'];
    twoFactor?: SettingsBodyProps['twoFactor'];
    preferences: Record<string, unknown>;
    options: Record<string, Record<string, string>>;
    onPreviewChange: (preview: { display_name: string | null; pronouns: string[]; tagline: string | null; location: string | null; website: string | null }) => void;
    accountManagementSlot?: SettingsBodyProps['accountManagementSlot'];
    applyViewPreferences?: SettingsBodyProps['applyViewPreferences'];
}) {
    const t = useT();
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

    // Security section — Fortify-driven 2FA. Core ships the UI, the
    // consumer app's controller resolves the `twoFactor` prop from
    // the user model.
    if (activeSection === 'security') {
        return (
            <SectionCard
                icon="fa-key"
                title={t('security.header_title')}
                subtitle={t('security.header_subtitle')}
                label={t('security.header_label')}
            >
                {twoFactor
                    ? <SecuritySection twoFactor={twoFactor} />
                    : (
                        <div
                            className="py-10 text-center text-sm"
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}
                        >
                            <i className="fa-solid fa-circle-info mr-1" />
                            Two-factor authentication is not configured by the consumer app.
                        </div>
                    )}
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
