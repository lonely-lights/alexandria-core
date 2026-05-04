import { useEffect, useState } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import type { AiDashboardStats, AiProvider, AiProjectSettings, AiUserSettings } from '@alexandria/types/ai-dashboard';
import UsageSidebar from './Settings/UsageSidebar';
import UserDefaultsSidebar from './Settings/UserDefaultsSidebar';

interface SettingsTabProps {
    projectId: number;
    stats: AiDashboardStats;
    settings: AiProjectSettings | null;
    providers: AiProvider[];
    userSettings: AiUserSettings | null;
}

interface ModelOption {
    model_id: string;
    display_name: string;
    is_flagship: boolean;
    is_recommended: boolean;
}

interface ProviderModels {
    analyst: ModelOption[];
    creative: ModelOption[];
}

interface FormState {
    ai_enabled: boolean;
    auto_categorize: boolean;
    require_approval: boolean;
    default_routing_action: string;
    ai_provider_id: number | null;
    analyst_model_name: string | null;
    creative_model_name: string | null;
    monthly_budget: string;
}

function initForm(settings: AiProjectSettings | null): FormState {
    return {
        ai_enabled: settings?.ai_enabled ?? true,
        auto_categorize: settings?.auto_categorize ?? false,
        require_approval: settings?.require_approval ?? true,
        default_routing_action: settings?.default_routing_action ?? 'suggest',
        ai_provider_id: settings?.ai_provider_id ?? null,
        analyst_model_name: settings?.analyst_model_name ?? null,
        creative_model_name: settings?.creative_model_name ?? null,
        monthly_budget: settings?.monthly_budget != null ? String(settings.monthly_budget) : '',
    };
}

/* ── Toggle Row ── */

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (val: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
            <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-base-content/50">{description}</p>
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="toggle toggle-primary"
            />
        </label>
    );
}

/* ── Settings Tab ── */

export default function SettingsTab({ projectId, stats, settings, providers, userSettings }: SettingsTabProps) {
    const [form, setForm] = useState<FormState>(() => initForm(settings));
    const [providerModels, setProviderModels] = useState<ProviderModels | null>(null);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    /* Fetch models when provider changes */
    useEffect(() => {
        if (form.ai_provider_id === null) {
            setProviderModels(null);
            return;
        }
        setModelsLoading(true);
        fetch(`/api/v1/ai/providers/${form.ai_provider_id}/models`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data: ProviderModels) => setProviderModels(data))
            .catch(() => setProviderModels(null))
            .finally(() => setModelsLoading(false));
    }, [form.ai_provider_id]);

    function set<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function handleProviderChange(providerId: number | null) {
        setForm((prev) => ({
            ...prev,
            ai_provider_id: providerId,
            analyst_model_name: null,
            creative_model_name: null,
        }));
    }

    function clearOverrides() {
        setForm((prev) => ({
            ...prev,
            ai_provider_id: null,
            analyst_model_name: null,
            creative_model_name: null,
        }));
        setProviderModels(null);
    }

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        try {
            await fetch(`/api/v1/projects/${projectId}/ai/dashboard-settings`, {
                method: 'PUT',
                headers: csrfHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({
                    ai_enabled: form.ai_enabled,
                    auto_categorize: form.auto_categorize,
                    require_approval: form.require_approval,
                    default_routing_action: form.default_routing_action,
                    ai_provider_id: form.ai_provider_id,
                    analyst_model_name: form.analyst_model_name,
                    creative_model_name: form.creative_model_name,
                    monthly_budget: form.monthly_budget !== '' ? parseFloat(form.monthly_budget) : null,
                }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {/* Left — main content */}
            <div className="space-y-6 lg:col-span-2">
                {/* Project AI Settings */}
                <div className="rounded-xl border border-base-300/50 bg-base-100 p-6">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <i className="fa-solid fa-sliders text-primary" />
                        Project AI Settings
                    </h2>

                    <div className="divide-y divide-base-200">
                        <ToggleRow
                            label="Enable AI Features"
                            description="Master switch for all AI functionality in this project."
                            checked={form.ai_enabled}
                            onChange={(val) => set('ai_enabled', val)}
                        />
                        <ToggleRow
                            label="Auto-Categorize"
                            description="Automatically route notes to entries without manual review."
                            checked={form.auto_categorize}
                            onChange={(val) => set('auto_categorize', val)}
                        />
                        <ToggleRow
                            label="Require Approval"
                            description="AI commands must be reviewed before they are executed."
                            checked={form.require_approval}
                            onChange={(val) => set('require_approval', val)}
                        />
                    </div>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        {/* Routing Action */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-base-content/70">
                                Default Routing Action
                            </label>
                            <select
                                value={form.default_routing_action}
                                onChange={(e) => set('default_routing_action', e.target.value)}
                                className="select select-bordered select-sm w-full max-w-xs rounded-xl"
                            >
                                <option value="suggest">Suggest</option>
                                <option value="copy">Copy</option>
                                <option value="move">Move</option>
                            </select>
                            <p className="mt-1 text-xs text-base-content/40">
                                What to do when AI matches a note to an entry.
                            </p>
                        </div>

                        {/* Monthly Budget */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-base-content/70">
                                Monthly Budget
                            </label>
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-base-content/60">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={form.monthly_budget}
                                    onChange={(e) => set('monthly_budget', e.target.value)}
                                    className="input input-bordered input-sm w-32 rounded-xl"
                                />
                            </div>
                            <p className="mt-1 text-xs text-base-content/40">
                                Leave blank for no limit.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Model Overrides */}
                <div className="rounded-xl border border-base-300/50 bg-base-100 p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <i className="fa-solid fa-microchip text-secondary" />
                            Model Overrides
                        </h2>
                        {form.ai_provider_id !== null && (
                            <button
                                type="button"
                                onClick={clearOverrides}
                                className="btn btn-ghost btn-xs rounded-lg text-error"
                            >
                                <i className="fa-solid fa-xmark" />
                                Clear Overrides
                            </button>
                        )}
                    </div>

                    <p className="mb-4 text-xs text-base-content/50">
                        Override the provider and models used for this project. Leave unset to use your account defaults.
                    </p>

                    {/* Provider */}
                    <div className="mb-4">
                        <label className="mb-1.5 block text-xs font-semibold text-base-content/70">
                            Provider
                        </label>
                        <select
                            value={form.ai_provider_id ?? ''}
                            onChange={(e) =>
                                handleProviderChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            className="select select-bordered select-sm w-full max-w-xs rounded-xl"
                        >
                            <option value="">Use user default</option>
                            {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Model selects — only when provider chosen */}
                    {form.ai_provider_id !== null && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Analyst Model */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-base-content/70">
                                    Analyst Model
                                </label>
                                {modelsLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-base-content/40">
                                        <span className="loading loading-spinner loading-xs" />
                                        Loading…
                                    </div>
                                ) : (
                                    <select
                                        value={form.analyst_model_name ?? ''}
                                        onChange={(e) => set('analyst_model_name', e.target.value || null)}
                                        className="select select-bordered select-sm w-full rounded-xl"
                                    >
                                        <option value="">Use provider default</option>
                                        {(providerModels?.analyst ?? []).map((m) => (
                                            <option key={m.model_id} value={m.model_id}>
                                                {m.display_name}
                                                {m.is_flagship ? ' ★' : m.is_recommended ? ' ✓' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Creative Model */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-base-content/70">
                                    Creative Model
                                </label>
                                {modelsLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-base-content/40">
                                        <span className="loading loading-spinner loading-xs" />
                                        Loading…
                                    </div>
                                ) : (
                                    <select
                                        value={form.creative_model_name ?? ''}
                                        onChange={(e) => set('creative_model_name', e.target.value || null)}
                                        className="select select-bordered select-sm w-full rounded-xl"
                                    >
                                        <option value="">Use provider default</option>
                                        {(providerModels?.creative ?? []).map((m) => (
                                            <option key={m.model_id} value={m.model_id}>
                                                {m.display_name}
                                                {m.is_flagship ? ' ★' : m.is_recommended ? ' ✓' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Save */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary rounded-xl gap-1.5"
                    >
                        {saving && <span className="loading loading-spinner loading-xs" />}
                        {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                    {saved && (
                        <span className="flex items-center gap-1.5 text-sm text-success">
                            <i className="fa-solid fa-check" />
                            Settings saved
                        </span>
                    )}
                </div>
            </div>

            {/* Right — readonly sidebar (usage summary + user
                defaults + quick links). Extracted into focused
                components so this file stays under ~350 lines. */}
            <div className="space-y-4">
                <UsageSidebar stats={stats} monthlyBudget={form.monthly_budget} />
                <UserDefaultsSidebar userSettings={userSettings} />
            </div>
        </div>
    );
}
