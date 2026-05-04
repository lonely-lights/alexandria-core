import Modal from '@alexandria/components/ui/Modal';

interface PromptPreviewModalProps {
    open: boolean;
    onClose: () => void;
    promptPreview: { prompt: string; token_estimate: number } | null;
    promptLoading: boolean;
}

export default function PromptPreviewModal({ open, onClose, promptPreview, promptLoading }: PromptPreviewModalProps) {
    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-4xl">
            <div className="flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold">Prompt Preview</h2>
                        <p className="mt-0.5 text-xs text-base-content/40">The full prompt that will be sent to the AI</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {promptPreview && (
                            <div className="flex items-center gap-2 rounded-lg bg-base-200/50 px-3 py-1.5">
                                <i className="fa-solid fa-coins text-xs text-amber-500" />
                                <span className="text-xs font-medium text-base-content/60">
                                    ~{promptPreview.token_estimate.toLocaleString()} tokens
                                </span>
                            </div>
                        )}
                        <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                    {promptLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <span className="loading loading-spinner loading-md text-base-content/30" />
                        </div>
                    ) : promptPreview ? (
                        <pre className="whitespace-pre-wrap break-words rounded-xl bg-base-200/30 p-5 font-mono text-xs leading-relaxed text-base-content/70">
                            {promptPreview.prompt}
                        </pre>
                    ) : (
                        <p className="py-8 text-center text-sm text-base-content/30">Failed to load prompt</p>
                    )}
                </div>
            </div>
        </Modal>
    );
}
