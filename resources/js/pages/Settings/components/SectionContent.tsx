import { router } from '@inertiajs/react';
import useT from '@alexandria/hooks/useT';
import ProfileSection from '../Sections/ProfileSection';
import PreferencesSection from '../Sections/PreferencesSection';
import LinksSection from '../Sections/LinksSection';
import PrivacySections from '../Sections/PrivacySections';
import AiSections from '../Sections/AiSections';
import SecuritySection from '../Sections/SecuritySection';
import type { SettingsBodyProps } from '../SettingsBody';
import SectionCard from './SectionCard';

/**
 * Section content router — picks the correct section component for the
 * current `activeSection` key. Profile sections render directly because
 * they own their own banner/avatar layout; everything else renders
 * inside a `<SectionCard>` with a header derived from the metadata
 * tables below.
 *
 * Card titles + subtitles + labels live as `settings.section.*` lang
 * keys so consumers can re-skin the chrome without touching React.
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
    const fadedTextStyle = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

    // Profile sections
    if (['identity', 'about', 'details'].includes(activeSection)) {
        return <ProfileSection profile={profile} usernameStatus={usernameStatus} options={options as { pronouns: Record<string, string>; dob_visibility: Record<string, string> }} activeSection={activeSection} onPreviewChange={onPreviewChange} />;
    }

    // Links section
    if (activeSection === 'links') {
        return (
            <SectionCard
                icon="fa-link"
                title={t('settings.section.links.title')}
                subtitle={t('settings.section.links.subtitle')}
                label={t('settings.section.links.label')}
            >
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
                        <div className="py-10 text-center text-sm" style={fadedTextStyle}>
                            <i className="fa-solid fa-circle-info mr-1" />
                            {t('settings.section.security.unconfigured')}
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
            <SectionCard
                icon="fa-user-gear"
                title={t('settings.section.account.title')}
                subtitle={t('settings.section.account.subtitle')}
                label={t('settings.section.account.label')}
            >
                {accountManagementSlot
                    ? accountManagementSlot({ email: profile.email, emailVerified: profile.email_verified })
                    : (
                        <div className="py-10 text-center text-sm" style={fadedTextStyle}>
                            <i className="fa-solid fa-circle-info mr-1" />
                            {t('settings.section.account.unconfigured')}
                        </div>
                    )}
            </SectionCard>
        );
    }

    // Privacy sections
    const privacySectionMap: Record<string, { sub: string; icon: string }> = {
        'privacy-visibility': { sub: 'visibility', icon: 'fa-eye' },
        'privacy-settings': { sub: 'settings', icon: 'fa-lock' },
        'privacy-lists': { sub: 'lists', icon: 'fa-users-rectangle' },
    };

    const privacyMeta = privacySectionMap[activeSection];
    if (privacyMeta) {
        return (
            <SectionCard
                icon={privacyMeta.icon}
                title={t(`settings.section.${activeSection}.title`)}
                subtitle={t(`settings.section.${activeSection}.subtitle`)}
                label={t('settings.section.privacy.label')}
            >
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
    const aiSectionMap: Record<string, { sub: string; icon: string }> = {
        'ai-connection': { sub: 'connection', icon: 'fa-plug' },
        'ai-models': { sub: 'models', icon: 'fa-cubes' },
        'ai-usage': { sub: 'usage', icon: 'fa-chart-pie' },
        'ai-preferences': { sub: 'preferences', icon: 'fa-sliders' },
    };

    const aiMeta = aiSectionMap[activeSection];
    if (aiMeta) {
        return (
            <SectionCard
                icon={aiMeta.icon}
                title={t(`settings.section.${activeSection}.title`)}
                subtitle={t(`settings.section.${activeSection}.subtitle`)}
                label={t('settings.section.ai.label')}
            >
                <AiSections
                    section={aiMeta.sub}
                    ai={ai as never}
                    onDataChanged={() => router.reload({ only: ['ai'] })}
                />
            </SectionCard>
        );
    }

    // Preference / accessibility / tools section pages.
    const sectionMeta: Record<string, { mapped: string; icon: string; labelKey: string }> = {
        'pref-appearance': { mapped: 'appearance', icon: 'fa-palette', labelKey: 'settings.section.preferences.label' },
        'pref-language': { mapped: 'language', icon: 'fa-globe', labelKey: 'settings.section.preferences.label' },
        'pref-notifications': { mapped: 'notifications', icon: 'fa-bell', labelKey: 'settings.section.preferences.label' },
        'tools-editor': { mapped: 'editor', icon: 'fa-pen-to-square', labelKey: 'settings.section.tools.label' },
        'a11y-visual': { mapped: 'a11y-visual', icon: 'fa-eye', labelKey: 'settings.section.accessibility.label' },
        'a11y-motion': { mapped: 'a11y-motion', icon: 'fa-wand-magic-sparkles', labelKey: 'settings.section.accessibility.label' },
        'a11y-assistive': { mapped: 'a11y-assistive', icon: 'fa-universal-access', labelKey: 'settings.section.accessibility.label' },
    };

    const meta = sectionMeta[activeSection];
    if (meta) {
        return (
            <SectionCard
                icon={meta.icon}
                title={t(`settings.section.${activeSection}.title`)}
                subtitle={t(`settings.section.${activeSection}.subtitle`)}
                label={t(meta.labelKey)}
            >
                <PreferencesSection
                    section={meta.mapped}
                    preferences={preferences}
                    options={options}
                    applyViewPreferences={applyViewPreferences}
                />
            </SectionCard>
        );
    }

    // Placeholder sections — not-yet-built tools sub-pages.
    const placeholders: Record<string, { icon: string }> = {
        'tools-shortcuts': { icon: 'fa-keyboard' },
        'tools-integrations': { icon: 'fa-plug' },
    };

    const placeholder = placeholders[activeSection];
    if (placeholder) {
        return (
            <SectionCard
                icon={placeholder.icon}
                title={t(`settings.placeholder.${activeSection}.title`)}
                subtitle={t(`settings.placeholder.${activeSection}.subtitle`)}
                label={t('settings.section.tools.label')}
            >
                <div className="py-10 text-center">
                    <div
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)' }}
                    >
                        <i
                            className={`fa-solid ${placeholder.icon} text-2xl`}
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                            aria-hidden="true"
                        />
                    </div>
                    <h3 className="font-serif text-2xl font-bold">{t('settings.placeholder.coming_soon')}</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm" style={fadedTextStyle}>
                        {t(`settings.placeholder.${activeSection}.description`)}
                    </p>
                </div>
            </SectionCard>
        );
    }

    return null;
}
