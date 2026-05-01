import { useState, useEffect } from 'react';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

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

const QUICK_ACTIONS = [
    { action: 'rewrite', label: 'Rewrite', icon: 'fa-rotate', color: 'text-info', description: 'Improve selected text', needsSelection: true },
    { action: 'expand', label: 'Expand', icon: 'fa-expand', color: 'text-accent', description: 'Add more detail', needsSelection: true },
    { action: 'summarize', label: 'Summarize', icon: 'fa-compress', color: 'text-warning', description: 'Make it shorter', needsSelection: true },
    { action: 'continue', label: 'Continue', icon: 'fa-forward', color: 'text-primary', description: 'Keep writing from here', needsSelection: false },
];

export default function AiWritingModal({ open, hasSelection, aiInstructions, onClose, onExecute, loading }: AiWritingModalProps) {
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
            <ModalHeader title="AI Writing Assistant" onClose={onClose} />

            <div className="space-y-4 p-6">
                {/* Quick Actions */}
                <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/40">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((qa) => (
                            <button
                                key={qa.action}
                                type="button"
                                onClick={() => onExecute(qa.action, '', getInstructionId())}
                                disabled={loading || (qa.needsSelection && !hasSelection)}
                                className={`flex items-center gap-3 rounded-xl border border-base-300 p-3 text-left transition-all hover:border-base-content/20 hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                                <i className={`fa-solid ${qa.icon} ${qa.color}`} />
                                <div>
                                    <span className="text-sm font-medium">{qa.label}</span>
                                    <p className="text-xs text-base-content/50">{qa.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Saved Prompts */}
                {savedPrompts.length > 0 && (
                    <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/40">Saved Prompts</h4>
                        <div className="max-h-32 space-y-1 overflow-y-auto">
                            {savedPrompts.map((sp) => (
                                <div key={sp.id} className="group flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onExecute('custom', sp.prompt, getInstructionId())}
                                        disabled={loading}
                                        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-base-200"
                                    >
                                        <i className="fa-solid fa-bookmark flex-shrink-0 text-xs text-secondary" />
                                        <span className="truncate font-medium">{sp.label}</span>
                                        <span className="ml-auto truncate text-xs text-base-content/40">{sp.prompt.substring(0, 40)}...</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePrompt(sp.id)}
                                        className="btn btn-ghost btn-xs opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <i className="fa-solid fa-xmark text-xs text-error" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Custom Prompt */}
                <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/40">
                        {hasSelection ? 'Custom Instruction' : 'Generate'}
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
                        className="textarea textarea-bordered w-full rounded-xl focus:textarea-secondary"
                        placeholder={hasSelection ? 'Tell the AI what to do with the selected text...' : 'Describe what you want the AI to write...'}
                        rows={2}
                        autoFocus
                    />

                    {/* Save for later */}
                    <div className="mt-2 flex items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-base-content/60">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-secondary"
                                checked={savePrompt}
                                onChange={(e) => setSavePrompt(e.target.checked)}
                            />
                            Save for future use
                        </label>
                        {savePrompt && (
                            <input
                                type="text"
                                value={promptLabel}
                                onChange={(e) => setPromptLabel(e.target.value)}
                                className="input input-bordered input-sm flex-1 rounded-lg focus:input-secondary"
                                placeholder="Prompt name..."
                                maxLength={100}
                            />
                        )}
                    </div>
                </div>

                {/* Loading indicator */}
                {loading && (
                    <div className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary">
                        <span className="loading loading-spinner loading-sm" />
                        Generating...
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-base-content/10 px-6 py-4">
                <div className="space-y-1">
                    <p className="text-xs text-base-content/40">
                        {hasSelection ? 'Selected text will be sent to AI' : 'Full editor content will be sent'}
                    </p>
                    {aiInstructions.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-base-content/50">
                                <i className="fa-solid fa-scroll mr-1 text-secondary/50" />
                                Instructions:
                            </label>
                            <select
                                value={selectedInstructionId ?? ''}
                                onChange={(e) => setSelectedInstructionId(e.target.value ? parseInt(e.target.value) : null)}
                                className="select select-bordered select-xs rounded-lg text-xs"
                            >
                                <option value="">None</option>
                                {aiInstructions.map((inst) => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.label}{inst.is_default ? ' (default)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm rounded-xl">Cancel</button>
                    <button
                        type="button"
                        onClick={handleExecuteCustom}
                        className="btn btn-secondary btn-sm rounded-xl"
                        disabled={!customPrompt.trim() || loading}
                    >
                        <i className="fa-solid fa-wand-magic-sparkles mr-1" />
                        {hasSelection ? 'Apply' : 'Generate'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
