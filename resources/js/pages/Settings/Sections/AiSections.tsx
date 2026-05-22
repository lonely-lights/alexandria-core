import { useState, type ReactNode } from 'react';
import Toggle from '@alexandria/components/form/Toggle';
import Modal from '@alexandria/components/ui/Modal';
import Button from '@alexandria/components/ui/Button';
import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { useEnterAnimation } from '@alexandria/hooks/useEnterAnimation';
import useT, { type Translator } from '@alexandria/hooks/useT';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';

interface Provider { id: number; name: string; slug: string; }
interface ApiKey {
    id: number; ai_provider_id: number; label: string; api_key_last_four: string;
    is_active: boolean; is_expired: boolean; expiration_status: string; last_used_status: string;
}
interface AiModel {
    id: number; ai_provider_id: number; model_id: string; display_name: string;
    category: string; context_window: number | null;
    formatted_input_price: string; formatted_output_price: string;
    supports_json_mode: boolean; supports_vision: boolean; is_recommended: boolean;
    provider_name: string;
}

interface AiData {
    providers: Provider[];
    apiKeys: ApiKey[];
    providersWithKeys: number[];
    models: AiModel[];
    selectedModels: Record<string, number | null>;
    usage: { requests: number; tokens: number; cost: number };
    preferences: { ai_suggestions: boolean; ai_auto_categorize: boolean; ai_response_length: string };
}

interface AiSectionsProps {
    section: string;
    ai: AiData;
    onDataChanged: () => void;
}

export default function AiSections({ section, ai, onDataChanged }: AiSectionsProps) {
    switch (section) {
        case 'connection':
            return <ConnectionSection providers={ai.providers} apiKeys={ai.apiKeys} onDataChanged={onDataChanged} />;
        case 'models':
            return <ModelsSection models={ai.models} selectedModels={ai.selectedModels} providersWithKeys={ai.providersWithKeys} onDataChanged={onDataChanged} />;
        case 'usage':
            return <UsageSection usage={ai.usage} />;
        case 'preferences':
            return <PreferencesSection preferences={ai.preferences} onDataChanged={onDataChanged} />;
        default:
            return null;
    }
}

/* ── Pill-shaped status badge — used for Key Added / Expired / Active /
   JSON / Vision / Recommended chips. Variant maps to `--theme-status-*`
   or `--theme-brand-*` token families so preset swaps repaint. ── */
type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'primary' | 'neutral';

function StatusBadge({ children, variant = 'neutral' }: { children: ReactNode; variant?: BadgeVariant }) {
    const palettes: Record<BadgeVariant, { bg: string; fg: string }> = {
        success: { bg: 'var(--theme-status-success-subtle)', fg: 'var(--theme-status-success-fill)' },
        error: { bg: 'var(--theme-status-error-subtle)', fg: 'var(--theme-status-error-stroke)' },
        warning: { bg: 'var(--theme-status-warning-subtle)', fg: 'var(--theme-status-warning-fill)' },
        info: { bg: 'var(--theme-status-info-subtle)', fg: 'var(--theme-status-info-fill)' },
        primary: {
            bg: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
            fg: 'var(--theme-brand-primary-500)',
        },
        neutral: {
            bg: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
            fg: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
        },
    };
    const p = palettes[variant];
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold"
            style={{
                background: p.bg,
                color: p.fg,
                borderRadius: '9999px',
            }}
        >
            {children}
        </span>
    );
}

/* ══════════════════════════════════════════════════════════
   CONNECTION (API Keys)
   ══════════════════════════════════════════════════════════ */

function ConnectionSection({ providers, apiKeys: initialKeys, onDataChanged }: {
    providers: Provider[]; apiKeys: ApiKey[]; onDataChanged: () => void;
}) {
    const t = useT();
    const toast = useToastContext();
    const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
    const [selectedProvider, setSelectedProvider] = useState<number>(providers[0]?.id ?? 0);
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteKeyId, setDeleteKeyId] = useState<number | null>(null);

    const providerKeys = keys.filter((k) => k.ai_provider_id === selectedProvider);
    const deleteKey = deleteKeyId ? keys.find((k) => k.id === deleteKeyId) : null;

    function handleActivate(keyId: number) {
        fetch(`/account/ai/keys/${keyId}/activate`, { method: 'PUT', headers: csrfHeaders() })
            .then(() => {
                setKeys((prev) => prev.map((k) =>
                    k.ai_provider_id === selectedProvider
                        ? { ...k, is_active: k.id === keyId }
                        : k
                ));
                onDataChanged();
                toast.show(t('settings.toast.api_key_activated'), { type: 'success' });
            });
    }

    function handleDelete() {
        if (!deleteKeyId) return;
        fetch(`/account/ai/keys/${deleteKeyId}`, { method: 'DELETE', headers: csrfHeaders() })
            .then(() => {
                setKeys((prev) => prev.filter((k) => k.id !== deleteKeyId));
                setDeleteKeyId(null);
                onDataChanged();
                toast.show(t('settings.toast.api_key_deleted'), { type: 'success' });
            });
    }

    const selectedProviderObj = providers.find((p) => p.id === selectedProvider);

    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    };
    const keyRowStyle = {
        background: 'var(--theme-base-page)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };

    return (
        <div className="space-y-6">
            {/* Provider selector cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {providers.map((p) => {
                    const hasKeys = keys.some((k) => k.ai_provider_id === p.id && !k.is_expired);
                    const activeKey = keys.find((k) => k.ai_provider_id === p.id && k.is_active);
                    const selected = selectedProvider === p.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => { setSelectedProvider(p.id); setShowAddForm(false); }}
                            className={`alex-pref-card p-4 text-left ${selected ? 'alex-pref-card--selected' : ''}`}
                        >
                            <span className="text-sm font-semibold">{p.name}</span>
                            <div className="mt-1">
                                {hasKeys ? (
                                    <StatusBadge variant="success">{t('ai.connection.key_added_badge')}</StatusBadge>
                                ) : (
                                    <StatusBadge variant="neutral">{t('ai.connection.no_key_badge')}</StatusBadge>
                                )}
                            </div>
                            {activeKey && (
                                <p className="mt-1 truncate text-xs" style={fadedTextStyle}>{activeKey.label}</p>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Keys for selected provider */}
            {providerKeys.length > 0 ? (
                <div className="space-y-3">
                    {providerKeys.map((key) => (
                        <div key={key.id} className="group flex items-center gap-3 p-4" style={keyRowStyle}>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{key.label}</span>
                                    {key.is_active && <StatusBadge variant="primary">{t('ai.connection.active_badge')}</StatusBadge>}
                                    {key.is_expired && <StatusBadge variant="error">{t('ai.connection.expired_badge')}</StatusBadge>}
                                </div>
                                <div className="mt-0.5 flex items-center gap-3 text-xs" style={fadedTextStyle}>
                                    <span className="font-mono">••••{key.api_key_last_four}</span>
                                    <span>{key.expiration_status}</span>
                                    <span>{key.last_used_status}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {!key.is_active && !key.is_expired && (
                                    <Button variant="ghost" size="sm" onClick={() => handleActivate(key.id)}>
                                        {t('ai.connection.activate_button')}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteKeyId(key.id)}
                                    icon="fa-solid fa-trash text-xs"
                                    iconPosition="before"
                                    aria-label={t('ai.connection.delete_button')}
                                >
                                    <span className="sr-only">{t('ai.connection.delete_button')}</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="py-4 text-center text-sm" style={fadedTextStyle}>
                    {t('ai.connection.empty_state').replace(':provider', selectedProviderObj?.name ?? t('ai.connection.empty_state_default'))}
                </p>
            )}

            {/* Add key trigger / inline form */}
            {!showAddForm ? (
                <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all"
                    style={{
                        border: '2px dashed color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
                        color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                        background: 'transparent',
                    }}
                >
                    <i className="fa-solid fa-plus" />
                    {t('ai.connection.add_key_button')}
                </button>
            ) : (
                <AddKeyForm
                    t={t}
                    provider={selectedProviderObj!}
                    onAdd={(newKey) => {
                        setKeys((prev) => [...prev, newKey]);
                        setShowAddForm(false);
                        onDataChanged();
                        toast.show(t('settings.toast.api_key_added'), { type: 'success' });
                    }}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Delete confirmation */}
            <Modal open={!!deleteKeyId} onClose={() => setDeleteKeyId(null)}>
                <div className="p-6 text-center">
                    <div
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                        style={{ background: 'var(--theme-status-error-subtle)' }}
                    >
                        <i className="fa-solid fa-key text-xl" style={{ color: 'var(--theme-status-error-stroke)' }} />
                    </div>
                    <h3 className="font-serif text-xl font-bold leading-tight">{t('ai.connection.delete_modal_title')}</h3>
                    <p className="mt-2 text-sm" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' }}>
                        {deleteKey && <><strong>{deleteKey.label}</strong> (••••{deleteKey.api_key_last_four})</>}
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                        <Button variant="ghost" onClick={() => setDeleteKeyId(null)}>{t('common.cancel')}</Button>
                        <Button variant="danger" onClick={handleDelete}>{t('ai.connection.delete_button')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function AddKeyForm({ t, provider, onAdd, onCancel }: {
    t: Translator;
    provider: Provider; onAdd: (key: ApiKey) => void; onCancel: () => void;
}) {
    const [label, setLabel] = useState(`Personal - ${provider.name} - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
    const [apiKey, setApiKey] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string; details?: Record<string, unknown> } | null>(null);
    const [validating, setValidating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [skipValidation, setSkipValidation] = useState(false);
    const formRef = useEnterAnimation<HTMLDivElement>({ y: 12, duration: 0.3, ease: 'back.out(1.2)' });

    function handleValidate() {
        setValidating(true);
        setValidationResult(null);

        fetch('/account/ai/keys/validate', {
            method: 'POST', headers: csrfHeaders(),
            body: JSON.stringify({ provider_slug: provider.slug, api_key: apiKey }),
        })
            .then((r) => r.json())
            .then((data) => { setValidating(false); setValidationResult(data); })
            .catch(() => { setValidating(false); setValidationResult({ valid: false, message: t('ai.connection.validation_failed') }); });
    }

    function handleSave() {
        setSaving(true);
        fetch('/account/ai/keys', {
            method: 'POST', headers: csrfHeaders(),
            body: JSON.stringify({ ai_provider_id: provider.id, label, api_key: apiKey, expires_at: expiresAt || null }),
        })
            .then((r) => r.json())
            .then((data) => { setSaving(false); if (data.id) onAdd(data); })
            .catch(() => setSaving(false));
    }

    const canSave = apiKey.length >= 10 && !!label && (validationResult?.valid || skipValidation);

    const containerStyle = {
        background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const validationStyle = (valid: boolean) => ({
        background: valid ? 'var(--theme-status-success-subtle)' : 'var(--theme-status-error-subtle)',
        color: valid ? 'var(--theme-status-success-fill)' : 'var(--theme-status-error-stroke)',
        borderRadius: 'var(--theme-radius-card)',
    });

    return (
        <div ref={formRef} className="space-y-4 p-5" style={containerStyle}>
            <h4 className="font-serif text-xl font-bold leading-tight">
                <i className="fa-solid fa-plus mr-2" style={{ color: 'var(--theme-brand-primary-500)' }} />
                {t('ai.connection.add_form_heading').replace(':provider', provider.name)}
            </h4>

            <Input
                size="md"
                label={t('ai.connection.label_field')}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={100}
            />

            <Input
                size="md"
                type="password"
                label={t('ai.connection.api_key_field')}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setValidationResult(null); setSkipValidation(false); }}
                placeholder={t('ai.connection.api_key_placeholder')}
                className="font-mono"
            />

            {apiKey.length >= 10 && !validationResult && (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleValidate}
                    loading={validating}
                    icon="fa-solid fa-check-double"
                    iconPosition="before"
                >
                    {validating ? t('ai.connection.validating') : t('ai.connection.validate_button')}
                </Button>
            )}

            {validationResult && (
                <div className="p-3 text-sm" style={validationStyle(validationResult.valid)}>
                    <i className={`fa-solid ${validationResult.valid ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1`} />
                    {validationResult.message}
                </div>
            )}

            {validationResult && !validationResult.valid && (
                <label
                    className="flex cursor-pointer items-center gap-2 text-sm"
                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' }}
                >
                    <input
                        type="checkbox"
                        className="alex-checkbox"
                        checked={skipValidation}
                        onChange={(e) => setSkipValidation(e.target.checked)}
                    />
                    {t('ai.connection.skip_validation')}
                </label>
            )}

            <Input
                size="md"
                type="date"
                label={t('ai.connection.expires_field')}
                hint={t('ai.connection.expires_optional')}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
            />

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button variant="primary" onClick={handleSave} loading={saving} disabled={!canSave}>
                    {saving ? t('common.saving') : t('ai.connection.save_key_button')}
                </Button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   MODELS
   ══════════════════════════════════════════════════════════ */

interface ModelCategoryConfig {
    key: 'sorting_model_id' | 'reasoning_model_id' | 'writing_model_id' | 'image_model_id' | 'video_model_id';
    labelKey: string;
    descriptionKey: string;
    icon: string;
    iconColor: string;
    cats: string[];
}

function ModelsSection({ models, selectedModels: initial, providersWithKeys, onDataChanged }: {
    models: AiModel[]; selectedModels: Record<string, number | null>; providersWithKeys: number[]; onDataChanged: () => void;
}) {
    const t = useT();
    const toast = useToastContext();
    const [selected, setSelected] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    if (providersWithKeys.length === 0) {
        return (
            <div className="py-8 text-center">
                <div
                    className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: 'var(--theme-status-warning-subtle)' }}
                >
                    <i className="fa-solid fa-key text-xl" style={{ color: 'var(--theme-status-warning-fill)' }} />
                </div>
                <p className="font-serif text-xl font-bold leading-tight">{t('ai.models.no_keys_heading')}</p>
                <p className="mt-1 text-sm" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' }}>
                    {t('ai.models.no_keys_description')}
                </p>
            </div>
        );
    }

    const categories: ModelCategoryConfig[] = [
        { key: 'sorting_model_id', labelKey: 'ai.models.sorting_label', descriptionKey: 'ai.models.sorting_description', icon: 'fa-bolt', iconColor: 'var(--theme-brand-accent-500)', cats: ['analyst', 'general', 'fast'] },
        { key: 'reasoning_model_id', labelKey: 'ai.models.reasoning_label', descriptionKey: 'ai.models.reasoning_description', icon: 'fa-brain', iconColor: 'var(--theme-status-info-fill)', cats: ['analyst', 'creative', 'general'] },
        { key: 'writing_model_id', labelKey: 'ai.models.writing_label', descriptionKey: 'ai.models.writing_description', icon: 'fa-wand-magic-sparkles', iconColor: 'var(--theme-brand-primary-500)', cats: ['creative', 'general'] },
        { key: 'image_model_id', labelKey: 'ai.models.image_label', descriptionKey: 'ai.models.image_description', icon: 'fa-image', iconColor: 'var(--theme-brand-secondary-500)', cats: ['image'] },
        { key: 'video_model_id', labelKey: 'ai.models.video_label', descriptionKey: 'ai.models.video_description', icon: 'fa-video', iconColor: 'var(--theme-status-error-stroke)', cats: ['video'] },
    ];

    function handleSave() {
        setSaving(true);
        setSuccess(false);
        fetch('/account/ai/models', { method: 'PUT', headers: csrfHeaders(), body: JSON.stringify(selected) })
            .then(() => {
                setSaving(false);
                setSuccess(true);
                onDataChanged();
                toast.show(t('settings.toast.models_saved'), { type: 'success' });
                setTimeout(() => setSuccess(false), 3000);
            })
            .catch(() => setSaving(false));
    }

    function formatContext(tokens: number): string {
        return `${tokens.toLocaleString()} ${t('ai.models.tokens_suffix')}`;
    }

    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    };
    const infoCardStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {categories.map(({ key, labelKey, icon, iconColor, cats }) => {
                    const available = models.filter((m) => cats.includes(m.category));

                    const grouped: Record<string, AiModel[]> = {};
                    available.forEach((m) => {
                        const g = m.provider_name ?? 'Other';
                        (grouped[g] ??= []).push(m);
                    });
                    const sortedProviders = Object.keys(grouped).sort();

                    const selectedModel = available.find((m) => m.id === selected[key]);

                    return (
                        <div key={key}>
                            <span className="mb-1.5 block text-sm font-semibold">
                                <i className={`fa-solid ${icon} mr-2`} style={{ color: iconColor }} />
                                {t(labelKey)}
                            </span>
                            <select
                                value={selected[key] ?? ''}
                                onChange={(e) => setSelected((prev) => ({ ...prev, [key]: e.target.value ? parseInt(e.target.value) : null }))}
                                className="alex-select h-10 w-full text-sm"
                            >
                                <option value="">{t('ai.models.select_placeholder')}</option>
                                {sortedProviders.map((provName) => (
                                    <optgroup key={provName} label={provName}>
                                        {grouped[provName].map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.display_name}{m.is_recommended ? ' ★' : ''}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>

                            {selectedModel && (
                                <div className="mt-2 p-4 text-sm" style={infoCardStyle}>
                                    <div className="flex items-center justify-between">
                                        <span style={fadedTextStyle}>{t('ai.models.info_provider')}</span>
                                        <span className="font-medium">{selectedModel.provider_name}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                        <span style={fadedTextStyle}>{t('ai.models.info_pricing')}</span>
                                        <span className="font-mono text-xs">
                                            <span style={{ color: 'var(--theme-status-success-fill)' }}>{selectedModel.formatted_input_price}</span>
                                            <span> {t('ai.models.pricing_in_suffix')} / </span>
                                            <span style={{ color: 'var(--theme-status-warning-fill)' }}>{selectedModel.formatted_output_price}</span>
                                            <span> {t('ai.models.pricing_out_suffix')}</span>
                                        </span>
                                    </div>
                                    {selectedModel.context_window && (
                                        <div className="mt-1 flex items-center justify-between">
                                            <span style={fadedTextStyle}>{t('ai.models.info_context')}</span>
                                            <span className="font-mono text-xs">{formatContext(selectedModel.context_window)}</span>
                                        </div>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedModel.supports_json_mode && <StatusBadge variant="success">{t('ai.models.feature_json')}</StatusBadge>}
                                        {selectedModel.supports_vision && <StatusBadge variant="info">{t('ai.models.feature_vision')}</StatusBadge>}
                                        {selectedModel.is_recommended && <StatusBadge variant="warning">{t('ai.models.feature_recommended')}</StatusBadge>}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-end gap-3">
                {success && (
                    <span className="text-sm" style={{ color: 'var(--theme-status-success-fill)' }}>
                        <i className="fa-solid fa-circle-check mr-1" />
                        {t('ai.models.saved_indicator')}
                    </span>
                )}
                <Button variant="primary" onClick={handleSave} loading={saving}>
                    {saving ? t('common.saving') : t('ai.models.save_button')}
                </Button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   USAGE
   ══════════════════════════════════════════════════════════ */

function UsageSection({ usage }: { usage: { requests: number; tokens: number; cost: number } }) {
    const t = useT();
    const stats = [
        { labelKey: 'ai.usage.tokens_label', value: usage.tokens >= 1000 ? `${(usage.tokens / 1000).toFixed(1)}k` : usage.tokens.toString(), icon: 'fa-coins', color: 'var(--theme-brand-primary-500)' },
        { labelKey: 'ai.usage.cost_label', value: `$${usage.cost.toFixed(2)}`, icon: 'fa-dollar-sign', color: 'var(--theme-status-success-fill)' },
        { labelKey: 'ai.usage.requests_label', value: usage.requests.toString(), icon: 'fa-arrow-right-arrow-left', color: 'var(--theme-brand-secondary-500)' },
    ];

    const cardStyle = {
        background: 'var(--theme-base-page)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    };

    return (
        <div className="space-y-6">
            <p className="text-sm" style={fadedTextStyle}>{t('ai.usage.heading')}</p>

            <div className="grid grid-cols-3 gap-3">
                {stats.map((stat) => (
                    <div key={stat.labelKey} className="p-5 text-center" style={cardStyle}>
                        <i className={`fa-solid ${stat.icon} text-lg`} style={{ color: stat.color }} />
                        <p className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight">{stat.value}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[.25em]" style={fadedTextStyle}>
                            {t(stat.labelKey)}
                        </p>
                    </div>
                ))}
            </div>

            {usage.requests === 0 && (
                <p className="text-center text-sm" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' }}>
                    {t('ai.usage.empty_state')}
                </p>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   PREFERENCES
   ══════════════════════════════════════════════════════════ */

function PreferencesSection({ preferences, onDataChanged }: {
    preferences: { ai_suggestions: boolean; ai_auto_categorize: boolean; ai_response_length: string };
    onDataChanged: () => void;
}) {
    const t = useT();
    const toast = useToastContext();
    const [responseLength, setResponseLength] = useState(preferences.ai_response_length);
    const [suggestions, setSuggestions] = useState(preferences.ai_suggestions);
    const [autoCategorize, setAutoCategorize] = useState(preferences.ai_auto_categorize);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    function handleSave() {
        setSaving(true);
        setSuccess(false);
        fetch('/account/ai/preferences', {
            method: 'PUT', headers: csrfHeaders(),
            body: JSON.stringify({ ai_response_length: responseLength, ai_suggestions: suggestions, ai_auto_categorize: autoCategorize }),
        })
            .then(() => {
                setSaving(false);
                setSuccess(true);
                onDataChanged();
                toast.show(t('settings.toast.ai_preferences_saved'), { type: 'success' });
                setTimeout(() => setSuccess(false), 3000);
            })
            .catch(() => setSaving(false));
    }

    return (
        <div className="space-y-6">
            <Select
                size="md"
                label={t('ai.preferences.response_length_label')}
                value={responseLength}
                onChange={(e) => setResponseLength(e.target.value)}
                options={[
                    { value: 'concise', label: t('ai.preferences.response_length_concise') },
                    { value: 'balanced', label: t('ai.preferences.response_length_balanced') },
                    { value: 'detailed', label: t('ai.preferences.response_length_detailed') },
                ]}
            />

            <Toggle
                label={t('ai.preferences.suggestions_label')}
                description={t('ai.preferences.suggestions_description')}
                checked={suggestions}
                onChange={setSuggestions}
            />
            <Toggle
                label={t('ai.preferences.auto_categorize_label')}
                description={t('ai.preferences.auto_categorize_description')}
                checked={autoCategorize}
                onChange={setAutoCategorize}
            />

            <div className="flex items-center justify-end gap-3 pt-4">
                {success && (
                    <span className="text-sm" style={{ color: 'var(--theme-status-success-fill)' }}>
                        <i className="fa-solid fa-circle-check mr-1" />
                        {t('ai.preferences.saved_indicator')}
                    </span>
                )}
                <Button variant="primary" onClick={handleSave} loading={saving}>
                    {saving ? t('common.saving') : t('ai.preferences.save_button')}
                </Button>
            </div>
        </div>
    );
}
