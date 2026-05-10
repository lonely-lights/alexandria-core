import { type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

interface PromptPreviewModalProps {
    open: boolean;
    onClose: () => void;
    promptPreview: { prompt: string; token_estimate: number } | null;
    promptLoading: boolean;
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };

const tokenChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

const promptBoxStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const headerBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

export default function PromptPreviewModal({ open, onClose, promptPreview, promptLoading }: PromptPreviewModalProps) {
    const t = useT();

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-4xl">
            <div className="flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-6 py-4" style={headerBorderStyle}>
                    <div>
                        <h2 className="text-lg font-bold">{t('notes.prompt_preview.title')}</h2>
                        <p className="mt-0.5 text-xs" style={fadedText}>
                            {t('notes.prompt_preview.subtitle')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {promptPreview && (
                            <div className="flex items-center gap-2 px-3 py-1.5" style={tokenChipStyle}>
                                <i className="fa-solid fa-coins text-xs" style={{ color: 'var(--theme-status-warning-stroke)' }} />
                                <span className="text-xs font-medium" style={muteText}>
                                    {t('notes.prompt_preview.tokens').replace(':count', promptPreview.token_estimate.toLocaleString())}
                                </span>
                            </div>
                        )}
                        <button onClick={onClose} className="alex-notes-modal-icon-btn" aria-label={t('notes.modal.tooltip.close')}>
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                    {promptLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <i
                                className="fa-solid fa-circle-notch fa-spin text-2xl"
                                style={microText}
                                aria-hidden="true"
                            />
                        </div>
                    ) : promptPreview ? (
                        <pre
                            className="whitespace-pre-wrap break-words p-5 font-mono text-xs leading-relaxed"
                            style={promptBoxStyle}
                        >
                            {promptPreview.prompt}
                        </pre>
                    ) : (
                        <p className="py-8 text-center text-sm" style={microText}>
                            {t('notes.prompt_preview.failed')}
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
}

