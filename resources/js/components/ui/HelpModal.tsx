import { type ReactNode } from 'react';
import Modal from './Modal';

interface HelpModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    /** The help content — typically a reference list, tips, or how-to blocks. */
    children: ReactNode;
    /** Max width override. Defaults to `max-w-2xl` — roomier than a typical
        form modal so reference tables + block lists don't feel cramped. */
    maxWidth?: string;
}

/**
 * Reusable help modal for in-context reference material. Uses an info-accented
 * header to signal "this is reference, not an action," with the content area
 * below for whatever help payload the caller provides.
 */
export default function HelpModal({
    open,
    onClose,
    title,
    description,
    children,
    maxWidth = 'max-w-2xl',
}: HelpModalProps) {
    return (
        <Modal open={open} onClose={onClose} maxWidth={maxWidth}>
            <div className="flex max-h-[80vh] flex-col">
                {/* Info-accented header: border + tinted background signal
                    "reference material," matching the Referenced By card style
                    used elsewhere in Blueprint settings. */}
                <div className="flex items-start justify-between gap-3 border-b border-info/30 bg-info/5 px-5 py-3">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-info/20 text-info">
                            <i className="fa-solid fa-circle-info text-sm" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-base-content">{title}</h2>
                            {description && (
                                <p className="mt-0.5 text-xs text-base-content/60">{description}</p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close help"
                        className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content"
                    >
                        <i className="fa-solid fa-xmark text-xs" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {children}
                </div>
            </div>
        </Modal>
    );
}
