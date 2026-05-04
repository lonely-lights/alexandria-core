import { useState, useEffect, useRef } from 'react';
import Toggle from '@alexandria/components/form/Toggle';
import Modal from '@alexandria/components/ui/Modal';
import gsap from 'gsap';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

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
        case 'connection': return <ConnectionSection providers={ai.providers} apiKeys={ai.apiKeys} onDataChanged={onDataChanged} />;
        case 'models': return <ModelsSection models={ai.models} selectedModels={ai.selectedModels} providersWithKeys={ai.providersWithKeys} onDataChanged={onDataChanged} />;
        case 'usage': return <UsageSection usage={ai.usage} />;
        case 'preferences': return <PreferencesSection preferences={ai.preferences} onDataChanged={onDataChanged} />;
        default: return null;
    }
}

/* ══════════════════════════════════════════════════════════
   CONNECTION (API Keys)
   ══════════════════════════════════════════════════════════ */

function ConnectionSection({ providers, apiKeys: initialKeys, onDataChanged }: {
    providers: Provider[]; apiKeys: ApiKey[]; onDataChanged: () => void;
}) {
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
            });
    }

    function handleDelete() {
        if (!deleteKeyId) return;
        fetch(`/account/ai/keys/${deleteKeyId}`, { method: 'DELETE', headers: csrfHeaders() })
            .then(() => {
                setKeys((prev) => prev.filter((k) => k.id !== deleteKeyId));
                setDeleteKeyId(null);
                onDataChanged();
            });
    }

    const selectedProviderObj = providers.find((p) => p.id === selectedProvider);

    return (
        <div className="space-y-6">
            {/* Provider selector */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {providers.map((p) => {
                    const hasKeys = keys.some((k) => k.ai_provider_id === p.id && !k.is_expired);
                    const activeKey = keys.find((k) => k.ai_provider_id === p.id && k.is_active);

                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => { setSelectedProvider(p.id); setShowAddForm(false); }}
                            className={`rounded-2xl border-2 p-4 text-left transition-all ${
                                selectedProvider === p.id ? 'border-primary bg-primary/5' : 'border-base-content/10 hover:border-base-content/30'
                            }`}
                        >
                            <span className="text-sm font-semibold">{p.name}</span>
                            <div className="mt-1">
                                {hasKeys ? (
                                    <span className="badge badge-sm badge-success">Key Added</span>
                                ) : (
                                    <span className="badge badge-sm badge-ghost">No Key</span>
                                )}
                            </div>
                            {activeKey && <p className="mt-1 truncate text-xs text-base-content/50">{activeKey.label}</p>}
                        </button>
                    );
                })}
            </div>

            {/* Keys for selected provider */}
            {providerKeys.length > 0 ? (
                <div className="space-y-3">
                    {providerKeys.map((key) => (
                        <div key={key.id} className="group flex items-center gap-3 rounded-2xl border border-base-content/10 bg-base-100 p-4 transition-all hover:border-base-content/20">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{key.label}</span>
                                    {key.is_active && <span className="badge badge-sm badge-primary">Active</span>}
                                    {key.is_expired && <span className="badge badge-sm badge-error">Expired</span>}
                                </div>
                                <div className="mt-0.5 flex items-center gap-3 text-xs text-base-content/50">
                                    <span className="font-mono">••••{key.api_key_last_four}</span>
                                    <span>{key.expiration_status}</span>
                                    <span>{key.last_used_status}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {!key.is_active && !key.is_expired && (
                                    <button type="button" onClick={() => handleActivate(key.id)} className="btn btn-ghost btn-xs text-primary">Activate</button>
                                )}
                                <button type="button" onClick={() => setDeleteKeyId(key.id)} className="btn btn-ghost btn-xs text-error">
                                    <i className="fa-solid fa-trash text-xs" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="py-4 text-center text-sm text-base-content/50">No API keys for {selectedProviderObj?.name ?? 'this provider'}</p>
            )}

            {/* Add key */}
            {!showAddForm ? (
                <button type="button" onClick={() => setShowAddForm(true)} className="btn btn-ghost w-full gap-2 rounded-2xl border-2 border-dashed border-base-content/10 text-base-content/50 hover:border-primary/30 hover:text-primary">
                    <i className="fa-solid fa-plus" /> Add API Key
                </button>
            ) : (
                <AddKeyForm
                    provider={selectedProviderObj!}
                    onAdd={(newKey) => { setKeys((prev) => [...prev, newKey]); setShowAddForm(false); onDataChanged(); }}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Delete confirmation */}
            <Modal open={!!deleteKeyId} onClose={() => setDeleteKeyId(null)}>
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
                        <i className="fa-solid fa-key text-xl text-error" />
                    </div>
                    <h3 className="font-serif text-xl font-bold leading-tight">Delete API Key?</h3>
                    <p className="mt-2 text-sm text-base-content/60">
                        {deleteKey && <><strong>{deleteKey.label}</strong> (••••{deleteKey.api_key_last_four})</>}
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                        <button type="button" onClick={() => setDeleteKeyId(null)} className="btn btn-ghost rounded-xl">Cancel</button>
                        <button type="button" onClick={handleDelete} className="btn btn-error rounded-xl">Delete Key</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function AddKeyForm({ provider, onAdd, onCancel }: {
    provider: Provider; onAdd: (key: ApiKey) => void; onCancel: () => void;
}) {
    const [label, setLabel] = useState(`Personal - ${provider.name} - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
    const [apiKey, setApiKey] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string; details?: Record<string, unknown> } | null>(null);
    const [validating, setValidating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [skipValidation, setSkipValidation] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (formRef.current) gsap.fromTo(formRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.2)' });
    }, []);

    function handleValidate() {
        setValidating(true);
        setValidationResult(null);

        fetch('/account/ai/keys/validate', {
            method: 'POST', headers: csrfHeaders(),
            body: JSON.stringify({ provider_slug: provider.slug, api_key: apiKey }),
        })
            .then((r) => r.json())
            .then((data) => { setValidating(false); setValidationResult(data); })
            .catch(() => { setValidating(false); setValidationResult({ valid: false, message: 'Validation failed' }); });
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

    const canSave = apiKey.length >= 10 && label && (validationResult?.valid || skipValidation);

    return (
        <div ref={formRef} className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h4 className="font-serif text-xl font-bold leading-tight"><i className="fa-solid fa-plus mr-2 text-primary" />Add {provider.name} Key</h4>

            <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm">Label</span></label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="input input-bordered rounded-xl focus:input-primary" maxLength={100} />
            </div>

            <div className="form-control">
                <label className="label py-1"><span className="label-text text-sm">API Key</span></label>
                <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setValidationResult(null); setSkipValidation(false); }} className="input input-bordered rounded-xl font-mono focus:input-primary" placeholder="sk-..." />
            </div>

            {apiKey.length >= 10 && !validationResult && (
                <button type="button" onClick={handleValidate} className="btn btn-secondary btn-sm rounded-xl" disabled={validating}>
                    {validating ? <><span className="loading loading-spinner loading-xs" /> Validating...</> : <><i className="fa-solid fa-check-double mr-1" /> Validate Key</>}
                </button>
            )}

            {validationResult && (
                <div className={`rounded-2xl p-3 text-sm ${validationResult.valid ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    <i className={`fa-solid ${validationResult.valid ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1`} />
                    {validationResult.message}
                </div>
            )}

            {validationResult && !validationResult.valid && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-base-content/60">
                    <input type="checkbox" className="checkbox checkbox-sm" checked={skipValidation} onChange={(e) => setSkipValidation(e.target.checked)} />
                    Skip validation (not recommended)
                </label>
            )}

            <div className="form-control">
                <label className="label py-1">
                    <span className="label-text text-sm">Expiration Date</span>
                    <span className="label-text-alt text-xs text-base-content/40">Optional</span>
                </label>
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="input input-bordered rounded-xl focus:input-primary" min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="btn btn-ghost rounded-xl">Cancel</button>
                <button type="button" onClick={handleSave} className="btn btn-primary rounded-xl" disabled={!canSave || saving}>
                    {saving ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Key'}
                </button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   MODELS
   ══════════════════════════════════════════════════════════ */

function ModelsSection({ models, selectedModels: initial, providersWithKeys, onDataChanged }: {
    models: AiModel[]; selectedModels: Record<string, number | null>; providersWithKeys: number[]; onDataChanged: () => void;
}) {
    const [selected, setSelected] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    if (providersWithKeys.length === 0) {
        return (
            <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
                    <i className="fa-solid fa-key text-xl text-warning" />
                </div>
                <p className="font-serif text-xl font-bold leading-tight">No valid API keys</p>
                <p className="mt-1 text-sm text-base-content/60">Add an API key in the Connection tab to select models.</p>
            </div>
        );
    }

    const categories = [
        { key: 'analyst_model_id', label: 'Analyst Model', icon: 'fa-chart-line', color: 'text-accent', focusColor: 'focus:select-accent', description: 'For categorization & analysis', cats: ['analyst', 'general', 'fast'] },
        { key: 'creative_model_id', label: 'Creative Model', icon: 'fa-wand-magic-sparkles', color: 'text-info', focusColor: 'focus:select-info', description: 'For content generation', cats: ['creative', 'general', 'fast'] },
        { key: 'image_model_id', label: 'Image Model', icon: 'fa-image', color: 'text-secondary', focusColor: 'focus:select-secondary', description: 'For image generation', cats: ['image'] },
        { key: 'video_model_id', label: 'Video Model', icon: 'fa-video', color: 'text-error', focusColor: 'focus:select-error', description: 'For video generation', cats: ['video'] },
    ];

    function handleSave() {
        setSaving(true);
        setSuccess(false);
        fetch('/account/ai/models', { method: 'PUT', headers: csrfHeaders(), body: JSON.stringify(selected) })
            .then(() => { setSaving(false); setSuccess(true); onDataChanged(); setTimeout(() => setSuccess(false), 3000); })
            .catch(() => setSaving(false));
    }

    function formatContext(tokens: number): string {
        return tokens.toLocaleString() + ' tokens';
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {categories.map(({ key, label, icon, color, focusColor, cats }) => {
                    const available = models.filter((m) => cats.includes(m.category));

                    // Group by provider and sort provider names alphabetically
                    const grouped: Record<string, AiModel[]> = {};
                    available.forEach((m) => {
                        const g = m.provider_name ?? 'Other';
                        (grouped[g] ??= []).push(m);
                    });
                    const sortedProviders = Object.keys(grouped).sort();

                    const selectedModel = available.find((m) => m.id === selected[key]);

                    return (
                        <div key={key} className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold">
                                    <i className={`fa-solid ${icon} mr-2 ${color}`} />
                                    {label}
                                </span>
                            </label>
                            <select
                                value={selected[key] ?? ''}
                                onChange={(e) => setSelected((prev) => ({ ...prev, [key]: e.target.value ? parseInt(e.target.value) : null }))}
                                className={`select select-bordered w-full rounded-xl ${focusColor}`}
                            >
                                <option value="">Select a model...</option>
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

                            {/* Model info card (matches Livewire layout) */}
                            {selectedModel && (
                                <div className="mt-2 rounded-2xl bg-base-200/50 p-4 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-base-content/70">Provider:</span>
                                        <span className="font-medium">{selectedModel.provider_name}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                        <span className="text-base-content/70">Pricing:</span>
                                        <span className="font-mono text-xs">
                                            <span className="text-success">{selectedModel.formatted_input_price}</span> in /
                                            <span className="text-warning"> {selectedModel.formatted_output_price}</span> out
                                        </span>
                                    </div>
                                    {selectedModel.context_window && (
                                        <div className="mt-1 flex items-center justify-between">
                                            <span className="text-base-content/70">Context:</span>
                                            <span className="font-mono text-xs">{formatContext(selectedModel.context_window)}</span>
                                        </div>
                                    )}
                                    <div className="mt-2 flex gap-2">
                                        {selectedModel.supports_json_mode && <span className="badge badge-sm badge-success">JSON</span>}
                                        {selectedModel.supports_vision && <span className="badge badge-sm badge-info">Vision</span>}
                                        {selectedModel.is_recommended && <span className="badge badge-sm badge-warning">Recommended</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-end gap-3">
                {success && <span className="text-sm text-success"><i className="fa-solid fa-circle-check mr-1" />Saved</span>}
                <button type="button" onClick={handleSave} className="btn btn-primary rounded-xl" disabled={saving}>
                    {saving ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Model Settings'}
                </button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   USAGE
   ══════════════════════════════════════════════════════════ */

function UsageSection({ usage }: { usage: { requests: number; tokens: number; cost: number } }) {
    const stats = [
        { label: 'Tokens', value: usage.tokens >= 1000 ? `${(usage.tokens / 1000).toFixed(1)}k` : usage.tokens.toString(), icon: 'fa-coins', color: 'text-primary' },
        { label: 'Est. Cost', value: `$${usage.cost.toFixed(2)}`, icon: 'fa-dollar-sign', color: 'text-success' },
        { label: 'Requests', value: usage.requests.toString(), icon: 'fa-arrow-right-arrow-left', color: 'text-secondary' },
    ];

    return (
        <div className="space-y-6">
            <p className="text-sm text-base-content/60">This month's AI usage across all projects.</p>

            <div className="grid grid-cols-3 gap-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-base-content/10 bg-base-100 p-5 text-center">
                        <i className={`fa-solid ${stat.icon} ${stat.color} text-lg`} />
                        <p className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight">{stat.value}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-base-content/60">{stat.label}</p>
                    </div>
                ))}
            </div>

            {usage.requests === 0 && (
                <p className="text-center text-sm text-base-content/40">No AI usage this month yet.</p>
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
            .then(() => { setSaving(false); setSuccess(true); onDataChanged(); setTimeout(() => setSuccess(false), 3000); })
            .catch(() => setSaving(false));
    }

    return (
        <div className="space-y-6">
            <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Response Length</span></label>
                <select value={responseLength} onChange={(e) => setResponseLength(e.target.value)} className="select select-bordered w-full rounded-xl focus:select-primary">
                    <option value="concise">Concise</option>
                    <option value="balanced">Balanced</option>
                    <option value="detailed">Detailed</option>
                </select>
            </div>

            <Toggle label="AI Suggestions" description="Get AI-powered suggestions while writing" checked={suggestions} onChange={setSuggestions} />
            <Toggle label="Auto-Categorize" description="Automatically categorize new entries using AI" checked={autoCategorize} onChange={setAutoCategorize} />

            <div className="flex items-center justify-end gap-3 pt-4">
                {success && <span className="text-sm text-success"><i className="fa-solid fa-circle-check mr-1" />Saved</span>}
                <button type="button" onClick={handleSave} className="btn btn-primary rounded-xl" disabled={saving}>
                    {saving ? <><span className="loading loading-spinner loading-sm" /> Saving...</> : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
}
