import type { CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import type { AiUserSettings } from '@alexandria/types/ai-dashboard';

interface UserDefaultsSidebarProps {
    userSettings: AiUserSettings | null;
}

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const cardOverflowHidden: CSSProperties = { ...cardStyle, overflow: 'hidden' };

const cardHeaderBorder: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const dtText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };

const warningCalloutStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-status-warning-stroke) 20%, transparent)',
    background: 'color-mix(in srgb, var(--theme-status-warning-fill) 25%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
};

const quickLinkRowStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-input)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

function iconBubbleStyle(kind: 'secondary' | 'accent'): CSSProperties {
    if (kind === 'secondary') {
        return {
            background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 15%, transparent)',
            color: 'var(--theme-brand-secondary-500)',
            borderRadius: 'var(--theme-radius-input)',
        };
    }
    // "accent" maps to brand-secondary-700 since the theme system has
    // no third-tier brand color; using a deeper shade keeps the two
    // quick-link rows visually distinct.
    return {
        background: 'color-mix(in srgb, var(--theme-brand-secondary-700) 15%, transparent)',
        color: 'var(--theme-brand-secondary-700)',
        borderRadius: 'var(--theme-radius-input)',
    };
}

/**
 * Readonly sidebar card showing the user's account-level AI defaults
 * (provider, models, API key validity) + deep links to their global
 * AI settings page. Shown on the right side of the project AI
 * Settings tab so users can orient between project overrides and
 * account defaults without switching pages.
 */
export default function UserDefaultsSidebar({ userSettings }: UserDefaultsSidebarProps) {
    const t = useT();
    const dash = t('ai.user_defaults.dash');

    return (
        <>
            {/* Your Defaults */}
            <div className="p-4" style={cardStyle}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <i className="fa-solid fa-user" style={fadedText} aria-hidden="true" />
                    {t('ai.user_defaults.title')}
                </h3>

                {userSettings ? (
                    <dl className="space-y-2.5 text-sm">
                        <div>
                            <dt className="text-xs" style={dtText}>{t('ai.user_defaults.provider')}</dt>
                            <dd className="font-medium">{userSettings.provider_name}</dd>
                        </div>
                        <div>
                            <dt className="text-xs" style={dtText}>{t('ai.user_defaults.analyst_model')}</dt>
                            <dd className="font-medium">{userSettings.analyst_model || dash}</dd>
                        </div>
                        <div>
                            <dt className="text-xs" style={dtText}>{t('ai.user_defaults.creative_model')}</dt>
                            <dd className="font-medium">{userSettings.creative_model || dash}</dd>
                        </div>
                        <div>
                            <dt className="text-xs" style={dtText}>{t('ai.user_defaults.api_key')}</dt>
                            <dd>
                                {userSettings.has_valid_key ? (
                                    <span
                                        className="flex items-center gap-1"
                                        style={{ color: 'var(--theme-status-success-stroke)' }}
                                    >
                                        <i className="fa-solid fa-circle-check text-xs" aria-hidden="true" />
                                        {t('ai.user_defaults.key_valid')}
                                    </span>
                                ) : (
                                    <span
                                        className="flex items-center gap-1"
                                        style={{ color: 'var(--theme-status-error-stroke)' }}
                                    >
                                        <i className="fa-solid fa-circle-xmark text-xs" aria-hidden="true" />
                                        {t('ai.user_defaults.key_not_set')}
                                    </span>
                                )}
                            </dd>
                        </div>
                    </dl>
                ) : (
                    <div className="p-3" style={warningCalloutStyle}>
                        <div className="flex items-start gap-2">
                            <i
                                className="fa-solid fa-triangle-exclamation mt-0.5 text-xs"
                                style={{ color: 'var(--theme-status-warning-stroke)' }}
                                aria-hidden="true"
                            />
                            <div className="text-xs">
                                <p
                                    className="font-medium"
                                    style={{ color: 'var(--theme-status-warning-stroke)' }}
                                >
                                    {t('ai.user_defaults.empty.title')}
                                </p>
                                <p className="mt-1" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' }}>
                                    {t('ai.user_defaults.empty.body')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Links — deep into global settings so a user who
                hasn't configured their account yet knows exactly where
                to go. */}
            <div style={cardOverflowHidden}>
                <div className="px-5 py-3" style={cardHeaderBorder}>
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <i className="fa-solid fa-link" style={fadedText} aria-hidden="true" />
                        {t('ai.user_defaults.quick_links_title')}
                    </h3>
                </div>
                <div className="p-3">
                    <a
                        href="/settings#ai"
                        className="alex-notes-tag-row group flex items-center gap-3 p-3"
                        style={quickLinkRowStyle}
                    >
                        <div
                            className="flex h-8 w-8 items-center justify-center"
                            style={iconBubbleStyle('secondary')}
                        >
                            <i className="fa-solid fa-key text-sm" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{t('ai.user_defaults.api_keys_title')}</div>
                            <div className="text-xs" style={fadedText}>{t('ai.user_defaults.api_keys_desc')}</div>
                        </div>
                        <i className="fa-solid fa-chevron-right text-xs" style={microText} aria-hidden="true" />
                    </a>
                    <a
                        href="/settings#ai"
                        className="alex-notes-tag-row group flex items-center gap-3 p-3"
                        style={quickLinkRowStyle}
                    >
                        <div
                            className="flex h-8 w-8 items-center justify-center"
                            style={iconBubbleStyle('accent')}
                        >
                            <i className="fa-solid fa-microchip text-sm" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{t('ai.user_defaults.global_settings_title')}</div>
                            <div className="text-xs" style={fadedText}>{t('ai.user_defaults.global_settings_desc')}</div>
                        </div>
                        <i className="fa-solid fa-chevron-right text-xs" style={microText} aria-hidden="true" />
                    </a>
                </div>
            </div>
        </>
    );
}
