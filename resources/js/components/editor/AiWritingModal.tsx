import { useState, useEffect, type CSSProperties } from 'react';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT from '@alexandria/hooks/useT';

interface SavedPrompt {
    id: number;
    label: string;
    prompt: string;
    action: string;
}

interface AiInstructionOption {
    id: number;
    label: string;
    is_default: boolean;
}

interface AiWritingModalProps {
    open: boolean;
    hasSelection: boolean;
    aiInstructions: AiInstructionOption[];
    onClose: () => void;
    onExecute: (action: string, prompt: string, instructionId: number | null) => void;
    loading: boolean;
}

interface QuickAction {
    action: string;
    labelKey: string;
    icon: string;
    color: string;
    descKey: string;
    needsSelection: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
    { action: 'rewrite', labelKey: 'ai.write.action.rewrite.label', descKey: 'ai.write.action.rewrite.desc', icon: 'fa-rotate', color: 'var(--theme-status-info-stroke)', needsSelection: true },
    { action: 'expand', labelKey: 'ai.write.action.expand.label', descKey: 'ai.write.action.expand.desc', icon: 'fa-expand', color: 'var(--theme-brand-secondary-700)', needsSelection: true },
    { action: 'summarize', labelKey: 'ai.write.action.summarize.label', descKey: 'ai.write.action.summarize.desc', icon: 'fa-compress', color: 'var(--theme-status-warning-stroke)', needsSelection: true },
    { action: 'continue', labelKey: 'ai.write.action.continue.label', descKey: 'ai.write.action.continue.desc', icon: 'fa-forward', color: 'var(--theme-brand-primary-500)', needsSelection: false },
];

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

const sectionHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
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

const textareaStyle: CSSProperties = {
    ...inputStyle,
    resize: 'vertical',
};

const quickActionStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    background: 'transparent',
    borderRadius: 'var(--theme-radius-card)',
    padding: '0.75rem',
    transition: 'border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const savedPromptRowStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-input)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const loadingPillStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 10%, transparent)',
    color: 'var(--theme-brand-secondary-500)',
    borderRadius: 'var(--theme-radius-card)',
};

const footerBorderStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const cancelBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
};

const submitBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-secondary-500)',
    color: 'var(--theme-brand-secondary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    gap: '0.25rem',
};

const deleteIconBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-status-error-stroke)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem',
    fontSize: '0.75rem',
};

export default function AiWritingModal({ open, hasSelection, aiInstructions, onClose, onExecute, loading }: AiWritingModalProps) {
    const t = useT();
    const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [savePrompt, setSavePrompt] = useState(false);
    const [promptLabel, setPromptLabel] = useState('');
    const [loaded, setLoaded] = useState(false);

    // Selected instruction: default to the default one, or 'none'
    const defaultInstruction = aiInstructions.find((i) => i.is_default);
    const [selectedInstructionId, setSelectedInstructionId] = useState<number | null>(defaultInstruction?.id ?? null);

    // Fetch saved prompts on first open
    useEffect(() => {
        if (open && !loaded) {
            fetch('/api/v1/ai/prompts', {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            })
                .then((r) => r.json())
                .then((data) => {
                    setSavedPrompts(Array.isArray(data) ? data : []);
                    setLoaded(true);
                })
                .catch(() => setLoaded(true));
        }
    }, [open, loaded]);

    // Reset on close
    useEffect(() => {
        if (!open) {
            setCustomPrompt('');
            setSavePrompt(false);
            setPromptLabel('');
            setSelectedInstructionId(defaultInstruction?.id ?? null);
        }
    }, [open, defaultInstruction?.id]);

    function getInstructionId(): number | null {
        return selectedInstructionId;
    }

    function handleExecuteCustom() {
        if (!customPrompt.trim()) return;

        // Save if checkbox is checked
        if (savePrompt && promptLabel.trim()) {
            fetch('/api/v1/ai/prompts', {
                method: 'POST',
                headers: csrfHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({ label: promptLabel, prompt: customPrompt, action: 'custom' }),
            })
                .then((r) => r.json())
                .then((newPrompt) => {
                    if (newPrompt.id) {
                        setSavedPrompts((prev) => [...prev, newPrompt]);
                    }
                })
                .catch(() => {});
        }

        onExecute('custom', customPrompt, getInstructionId());
    }

    function handleDeletePrompt(id: number) {
        fetch(`/api/v1/ai/prompts/${id}`, {
            method: 'DELETE',
            headers: csrfHeaders(),
            credentials: 'same-origin',
        }).then(() => {
            setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
        });
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader title={t('ai.write.title')} onClose={onClose} />

            <div className="space-y-4 p-6">
                {/* Quick Actions */}
                <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={sectionHeadingStyle}>
                        {t('ai.write.section.quick_actions')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((qa) => {
                            const isDisabled = loading || (qa.needsSelection && !hasSelection);
                            return (
                                <button
                                    key={qa.action}
                                    type="button"
                                    onClick={() => onExecute(qa.action, '', getInstructionId())}
                                    disabled={isDisabled}
                                    className="alex-notes-tag-row flex items-center gap-3 text-left disabled:cursor-not-allowed"
                                    style={{ ...quickActionStyle, opacity: isDisabled ? 0.4 : 1 }}
                                >
                                    <i className={`fa-solid ${qa.icon}`} style={{ color: qa.color }} aria-hidden="true" />
                                    <div>
                                        <span className="text-sm font-medium">{t(qa.labelKey)}</span>
                                        <p className="text-xs" style={labelText}>{t(qa.descKey)}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Saved Prompts */}
                {savedPrompts.length > 0 && (
                    <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={sectionHeadingStyle}>
                            {t('ai.write.section.saved_prompts')}
                        </h4>
                        <div className="max-h-32 space-y-1 overflow-y-auto">
                            {savedPrompts.map((sp) => (
                                <div key={sp.id} className="group flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onExecute('custom', sp.prompt, getInstructionId())}
                                        disabled={loading}
                                        className="alex-notes-tag-row flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm"
                                        style={savedPromptRowStyle}
                                    >
                                        <i
                                            className="fa-solid fa-bookmark flex-shrink-0 text-xs"
                                            style={{ color: 'var(--theme-brand-secondary-500)' }}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate font-medium">{sp.label}</span>
                                        <span className="ml-auto truncate text-xs" style={fadedText}>
                                            {sp.prompt.substring(0, 40)}...
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePrompt(sp.id)}
                                        className="alex-btn opacity-0 transition-opacity group-hover:opacity-100"
                                        style={deleteIconBtnStyle}
                                        aria-label="Delete prompt"
                                    >
                                        <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Custom Prompt */}
                <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={sectionHeadingStyle}>
                        {hasSelection ? t('ai.write.section.custom_instruction') : t('ai.write.section.generate')}
                    </h4>
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) {
                                e.preventDefault();
                                handleExecuteCustom();
                            }
                        }}
                        className="w-full"
                        style={textareaStyle}
                        placeholder={hasSelection
                            ? t('ai.write.placeholder.selection')
                            : t('ai.write.placeholder.no_selection')}
                        rows={2}
                        autoFocus
                    />

                    {/* Save for later */}
                    <div className="mt-2 flex items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2 text-sm" style={muteText}>
                            <input
                                type="checkbox"
                                className="alex-checkbox"
                                checked={savePrompt}
                                onChange={(e) => setSavePrompt(e.target.checked)}
                            />
                            {t('ai.write.save_for_later')}
                        </label>
                        {savePrompt && (
                            <input
                                type="text"
                                value={promptLabel}
                                onChange={(e) => setPromptLabel(e.target.value)}
                                className="flex-1"
                                style={inputStyle}
                                placeholder={t('ai.write.save_label_placeholder')}
                                maxLength={100}
                            />
                        )}
                    </div>
                </div>

                {/* Loading indicator */}
                {loading && (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm" style={loadingPillStyle}>
                        <i className="fa-solid fa-circle-notch fa-spin text-sm" aria-hidden="true" />
                        {t('ai.write.generating')}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4" style={footerBorderStyle}>
                <div className="space-y-1">
                    <p className="text-xs" style={fadedText}>
                        {hasSelection ? t('ai.write.footer.send_selection') : t('ai.write.footer.send_full')}
                    </p>
                    {aiInstructions.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label className="text-xs" style={labelText}>
                                <i
                                    className="fa-solid fa-scroll mr-1"
                                    style={{ color: 'color-mix(in srgb, var(--theme-brand-secondary-500) 50%, transparent)' }}
                                    aria-hidden="true"
                                />
                                {t('ai.write.footer.instructions')}
                            </label>
                            <select
                                value={selectedInstructionId ?? ''}
                                onChange={(e) => setSelectedInstructionId(e.target.value ? parseInt(e.target.value) : null)}
                                className="text-xs"
                                style={selectStyle}
                            >
                                <option value="">{t('ai.write.footer.instructions_none')}</option>
                                {aiInstructions.map((inst) => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.label}{inst.is_default ? t('ai.write.footer.instructions_default_suffix') : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="alex-btn" style={cancelBtnStyle}>
                        {t('ai.write.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleExecuteCustom}
                        className="alex-btn inline-flex items-center"
                        style={{ ...submitBtnStyle, opacity: (!customPrompt.trim() || loading) ? 0.5 : 1 }}
                        disabled={!customPrompt.trim() || loading}
                    >
                        <i className="fa-solid fa-wand-magic-sparkles mr-1" aria-hidden="true" />
                        {hasSelection ? t('ai.write.apply') : t('ai.write.generate')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
