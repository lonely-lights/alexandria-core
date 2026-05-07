import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useFloatingPanel } from '../../hooks/useFloatingPanel';

interface ModalProps {
    children: ReactNode;
    open: boolean;
    onClose: () => void;
    maxWidth?: string;
}

export default function Modal({
    children,
    open,
    onClose,
    maxWidth = 'max-w-md',
}: ModalProps) {
    const { backdropRef, panelRef, animateClose } = useFloatingPanel(
        open,
        onClose,
        {
            enter: {
                from: { opacity: 0, scale: 0.92, y: 24 },
                to: {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    duration: 0.35,
                    ease: 'back.out(1.6)',
                },
            },
            exit: {
                opacity: 0,
                scale: 0.95,
                y: 12,
                duration: 0.2,
                ease: 'power2.in',
            },
        },
    );

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                ref={backdropRef}
                className="absolute inset-0"
                style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                }}
                onClick={animateClose}
            />
            <div
                ref={panelRef}
                className={`relative w-full ${maxWidth} overflow-hidden`}
                style={{
                    background: 'var(--theme-base-surface)',
                    color: 'var(--theme-base-content)',
                    border: '1px solid var(--theme-base-400)',
                    borderRadius: 'var(--theme-radius-card)',
                    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.32)',
                }}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}

export function ModalHeader({
    title,
    onClose,
}: {
    title: string;
    onClose: () => void;
}) {
    return (
        <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--theme-base-400)' }}
        >
            <h3
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--theme-typography-heading-family)' }}
            >
                {title}
            </h3>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="alex-modal-close inline-flex h-8 w-8 items-center justify-center rounded-full"
                style={{ color: 'var(--theme-base-content)' }}
            >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
        </div>
    );
}

export function ModalFooter({ children }: { children: ReactNode }) {
    return (
        <div
            className="flex justify-end gap-2 px-6 py-4"
            style={{ borderTop: '1px solid var(--theme-base-400)' }}
        >
            {children}
        </div>
    );
}
