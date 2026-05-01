import { type ReactNode } from 'react';
import Modal from './Modal';
import ActionButton from './ActionButton';

interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    /** Body content. String or rich JSX (e.g. with the item name styled). */
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Visual treatment for the confirm action. `danger` uses error styling
        + an alert icon — appropriate for deletes. */
    variant?: 'default' | 'danger';
    /** Disable the confirm button (e.g. while a save is in flight). */
    loading?: boolean;
}

/**
 * Reusable confirmation modal — replaces `window.confirm()` calls so confirms
 * match the rest of the app's chrome instead of the browser's native dialog.
 */
export default function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    loading = false,
}: ConfirmModalProps) {
    const isDanger = variant === 'danger';

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <div className="flex flex-col">
                <div className={`flex items-start gap-3 border-b px-5 py-3 ${
                    isDanger
                        ? 'border-error/30 bg-error/5'
                        : 'border-base-content/10 bg-base-200/50'
                }`}>
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        isDanger ? 'bg-error/20 text-error' : 'bg-primary/15 text-primary'
                    }`}>
                        <i className={`fa-solid ${isDanger ? 'fa-triangle-exclamation' : 'fa-circle-question'} text-sm`} />
                    </div>
                    <h2 className="pt-1 text-sm font-semibold text-base-content">{title}</h2>
                </div>

                <div className="px-5 py-4 text-sm text-base-content/80">
                    {message}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-base-content/10 px-5 py-3">
                    <ActionButton
                        icon="fa-solid fa-xmark"
                        label={cancelLabel}
                        variant="ghost"
                        onClick={onClose}
                    />
                    <ActionButton
                        icon={isDanger ? 'fa-solid fa-trash' : 'fa-solid fa-check'}
                        label={confirmLabel}
                        onClick={onConfirm}
                        loading={loading}
                        variant={isDanger ? 'error' : 'primary'}
                    />
                </div>
            </div>
        </Modal>
    );
}
