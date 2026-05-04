import type { AiUserSettings } from '@alexandria/types/ai-dashboard';

interface UserDefaultsSidebarProps {
    userSettings: AiUserSettings | null;
}

/**
 * Readonly sidebar card showing the user's account-level AI defaults
 * (provider, models, API key validity) + deep links to their global
 * AI settings page. Shown on the right side of the project AI
 * Settings tab so users can orient between project overrides and
 * account defaults without switching pages.
 */
export default function UserDefaultsSidebar({ userSettings }: UserDefaultsSidebarProps) {
    return (
        <>
            {/* Your Defaults */}
            <div className="rounded-xl border border-base-content/10 bg-base-200 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <i className="fa-solid fa-user text-base-content/50" />
                    Your Defaults
                </h3>

                {userSettings ? (
                    <dl className="space-y-2.5 text-sm">
                        <div>
                            <dt className="text-xs text-base-content/40">Provider</dt>
                            <dd className="font-medium">{userSettings.provider_name}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-base-content/40">Analyst Model</dt>
                            <dd className="font-medium">{userSettings.analyst_model || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-base-content/40">Creative Model</dt>
                            <dd className="font-medium">{userSettings.creative_model || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-base-content/40">API Key</dt>
                            <dd>
                                {userSettings.has_valid_key ? (
                                    <span className="flex items-center gap-1 text-success">
                                        <i className="fa-solid fa-circle-check text-xs" />
                                        Valid
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-error">
                                        <i className="fa-solid fa-circle-xmark text-xs" />
                                        Not set
                                    </span>
                                )}
                            </dd>
                        </div>
                    </dl>
                ) : (
                    <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
                        <div className="flex items-start gap-2">
                            <i className="fa-solid fa-triangle-exclamation mt-0.5 text-xs text-warning" />
                            <div className="text-xs">
                                <p className="font-medium text-warning">No AI settings configured</p>
                                <p className="mt-1 text-base-content/60">Set up your AI provider and API keys first.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Links — deep into global settings so a user who
                hasn't configured their account yet knows exactly where
                to go. */}
            <div className="overflow-hidden rounded-xl border border-base-content/10 bg-base-200">
                <div className="border-b border-base-content/5 px-5 py-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <i className="fa-solid fa-link text-base-content/50" />
                        Quick Links
                    </h3>
                </div>
                <div className="p-3">
                    <a
                        href="/settings#ai"
                        className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-base-300/50"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                            <i className="fa-solid fa-key text-sm text-secondary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium transition-colors group-hover:text-secondary">API Keys</div>
                            <div className="text-xs text-base-content/50">Manage your API keys</div>
                        </div>
                        <i className="fa-solid fa-chevron-right text-xs text-base-content/30" />
                    </a>
                    <a
                        href="/settings#ai"
                        className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-base-300/50"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                            <i className="fa-solid fa-microchip text-sm text-accent" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium transition-colors group-hover:text-accent">Global AI Settings</div>
                            <div className="text-xs text-base-content/50">Default models & preferences</div>
                        </div>
                        <i className="fa-solid fa-chevron-right text-xs text-base-content/30" />
                    </a>
                </div>
            </div>
        </>
    );
}
