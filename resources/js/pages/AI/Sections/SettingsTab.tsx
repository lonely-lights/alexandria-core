import { useState, type CSSProperties } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { useJsonFetch } from '@alexandria/lib/fetchJson';
import useT from '@alexandria/hooks/useT';
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

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const formLabelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' };
const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

const sectionCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1.5rem',
};

const toggleRowDivider: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
};

const selectStyle: CSSProperties = {
    ...inputStyle,
    paddingRight: '2rem',
};

const saveBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    gap: '0.375rem',
};

const clearBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-status-error-stroke)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    gap: '0.25rem',
};

/* ── Toggle Row ── */

function ToggleRow({
    label,
    description,
    checked,
    onChange,
    isLast,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (val: boolean) => void;
    isLast?: boolean;
}) {
    return (
        <label
            className="flex cursor-pointer items-center justify-between gap-4 py-3"
            style={isLast ? undefined : toggleRowDivider}
        >
            <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs" style={labelText}>{description}</p>
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="alex-toggle"
            />
        </label>
    );
}

/* ── Settings Tab ── */

export default function SettingsTab({ projectId, stats, settings, providers, userSettings }: SettingsTabProps) {
    const t = useT();
    const [form, setForm] = useState<FormState>(() => initForm(settings));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    /* Fetch models when provider changes; null URL skips the fetch + resets data. */
    const { data: providerModels, loading: modelsLoading } = useJsonFetch<ProviderModels>(
        form.ai_provider_id === null
            ? null
            : `/api/v1/ai/providers/${form.ai_provider_id}/models`,
    );

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
        // Resetting ai_provider_id to null also makes useJsonFetch above
        // see a null URL → it resets providerModels to null automatically.
        setForm((prev) => ({
            ...prev,
            ai_provider_id: null,
            analyst_model_name: null,
            creative_model_name: null,
        }));
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
                <div style={sectionCardStyle}>
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <i
                            className="fa-solid fa-sliders"
                            style={{ color: 'var(--theme-brand-primary-500)' }}
                            aria-hidden="true"
                        />
                        {t('ai.settings_tab.project_settings.title')}
                    </h2>

                    <div>
                        <ToggleRow
                            label={t('ai.settings_tab.toggle.ai_enabled.label')}
                            description={t('ai.settings_tab.toggle.ai_enabled.desc')}
                            checked={form.ai_enabled}
                            onChange={(val) => set('ai_enabled', val)}
                        />
                        <ToggleRow
                            label={t('ai.settings_tab.toggle.auto_categorize.label')}
                            description={t('ai.settings_tab.toggle.auto_categorize.desc')}
                            checked={form.auto_categorize}
                            onChange={(val) => set('auto_categorize', val)}
                        />
                        <ToggleRow
                            label={t('ai.settings_tab.toggle.require_approval.label')}
                            description={t('ai.settings_tab.toggle.require_approval.desc')}
                            checked={form.require_approval}
                            onChange={(val) => set('require_approval', val)}
                            isLast
                        />
                    </div>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        {/* Routing Action */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold" style={formLabelText}>
                                {t('ai.settings_tab.routing.label')}
                            </label>
                            <select
                                value={form.default_routing_action}
                                onChange={(e) => set('default_routing_action', e.target.value)}
                                className="w-full max-w-xs"
                                style={selectStyle}
                            >
                                <option value="suggest">{t('ai.settings_tab.routing.suggest')}</option>
                                <option value="copy">{t('ai.settings_tab.routing.copy')}</option>
                                <option value="move">{t('ai.settings_tab.routing.move')}</option>
                            </select>
                            <p className="mt-1 text-xs" style={fadedText}>
                                {t('ai.settings_tab.routing.help')}
                            </p>
                        </div>

                        {/* Monthly Budget */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold" style={formLabelText}>
                                {t('ai.settings_tab.budget.label')}
                            </label>
                            <div className="flex items-center gap-1">
                                <span className="text-sm" style={muteText}>$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={form.monthly_budget}
                                    onChange={(e) => set('monthly_budget', e.target.value)}
                                    className="w-32"
                                    style={inputStyle}
                                />
                            </div>
                            <p className="mt-1 text-xs" style={fadedText}>
                                {t('ai.settings_tab.budget.help')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Model Overrides */}
                <div style={sectionCardStyle}>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <i
                                className="fa-solid fa-microchip"
                                style={{ color: 'var(--theme-brand-secondary-500)' }}
                                aria-hidden="true"
                            />
                            {t('ai.settings_tab.overrides.title')}
                        </h2>
                        {form.ai_provider_id !== null && (
                            <button
                                type="button"
                                onClick={clearOverrides}
                                className="alex-btn inline-flex items-center"
                                style={clearBtnStyle}
                            >
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                                {t('ai.settings_tab.overrides.clear')}
                            </button>
                        )}
                    </div>

                    <p className="mb-4 text-xs" style={labelText}>
                        {t('ai.settings_tab.overrides.help')}
                    </p>

                    {/* Provider */}
                    <div className="mb-4">
                        <label className="mb-1.5 block text-xs font-semibold" style={formLabelText}>
                            {t('ai.settings_tab.overrides.provider_label')}
                        </label>
                        <select
                            value={form.ai_provider_id ?? ''}
                            onChange={(e) =>
                                handleProviderChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            className="w-full max-w-xs"
                            style={selectStyle}
                        >
                            <option value="">{t('ai.settings_tab.overrides.provider_default')}</option>
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
                                <label className="mb-1.5 block text-xs font-semibold" style={formLabelText}>
                                    {t('ai.settings_tab.overrides.analyst_label')}
                                </label>
                                {modelsLoading ? (
                                    <div className="flex items-center gap-2 text-xs" style={fadedText}>
                                        <i className="fa-solid fa-circle-notch fa-spin text-xs" aria-hidden="true" />
                                        {t('ai.settings_tab.overrides.loading')}
                                    </div>
                                ) : (
                                    <select
                                        value={form.analyst_model_name ?? ''}
                                        onChange={(e) => set('analyst_model_name', e.target.value || null)}
                                        className="w-full"
                                        style={selectStyle}
                                    >
                                        <option value="">{t('ai.settings_tab.overrides.model_default')}</option>
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
                                <label className="mb-1.5 block text-xs font-semibold" style={formLabelText}>
                                    {t('ai.settings_tab.overrides.creative_label')}
                                </label>
                                {modelsLoading ? (
                                    <div className="flex items-center gap-2 text-xs" style={fadedText}>
                                        <i className="fa-solid fa-circle-notch fa-spin text-xs" aria-hidden="true" />
                                        {t('ai.settings_tab.overrides.loading')}
                                    </div>
                                ) : (
                                    <select
                                        value={form.creative_model_name ?? ''}
                                        onChange={(e) => set('creative_model_name', e.target.value || null)}
                                        className="w-full"
                                        style={selectStyle}
                                    >
                                        <option value="">{t('ai.settings_tab.overrides.model_default')}</option>
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
                        className="alex-btn inline-flex items-center"
                        style={{ ...saveBtnStyle, opacity: saving ? 0.5 : 1 }}
                    >
                        {saving && <i className="fa-solid fa-circle-notch fa-spin text-xs" aria-hidden="true" />}
                        {saving ? t('ai.settings_tab.save.saving') : t('ai.settings_tab.save.action')}
                    </button>
                    {saved && (
                        <span
                            className="flex items-center gap-1.5 text-sm"
                            style={{ color: 'var(--theme-status-success-stroke)' }}
                        >
                            <i className="fa-solid fa-check" aria-hidden="true" />
                            {t('ai.settings_tab.save.confirmed')}
                        </span>
                    )}
                </div>
            </div>

            {/* Right — readonly sidebar (usage summary + user defaults
                + quick links). Extracted into focused components so this
                file stays under ~350 lines. */}
            <div className="space-y-4">
                <UsageSidebar stats={stats} monthlyBudget={form.monthly_budget} />
                <UserDefaultsSidebar userSettings={userSettings} />
            </div>
        </div>
    );
}
