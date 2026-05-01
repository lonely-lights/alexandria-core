import { type ReactNode, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

interface ModalProps {
    children: ReactNode;
    open: boolean;
    onClose: () => void;
    maxWidth?: string;
}

export default function Modal({ children, open, onClose, maxWidth = 'max-w-md' }: ModalProps) {
    const backdropRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef(false);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    // Animate in on mount
    useEffect(() => {
        if (!open) return;
        closingRef.current = false;

        if (backdropRef.current) {
            gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
        }
        if (panelRef.current) {
            gsap.fromTo(panelRef.current,
                { opacity: 0, scale: 0.92, y: 24 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' },
            );
        }
    }, [open]);

    // Escape key
    useEffect(() => {
        if (!open) return;

        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') animateClose();
        }

        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    const animateClose = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;

        const tl = gsap.timeline({ onComplete: onClose });

        if (panelRef.current) {
            tl.to(panelRef.current, { opacity: 0, scale: 0.95, y: 12, duration: 0.2, ease: 'power2.in' }, 0);
        }
        if (backdropRef.current) {
            tl.to(backdropRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
        }
    }, [onClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                ref={backdropRef}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={animateClose}
            />
            <div
                ref={panelRef}
                className={`relative w-full ${maxWidth} overflow-hidden rounded-3xl border border-base-content/10 bg-base-200 shadow-2xl`}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}

/* ── Convenience sub-components ── */

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
    return (
        <div className="flex items-center justify-between border-b border-base-content/10 px-6 py-4">
            <h3 className="text-lg font-bold">{title}</h3>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                <i className="fa-solid fa-xmark" />
            </button>
        </div>
    );
}

export function ModalFooter({ children }: { children: ReactNode }) {
    return (
        <div className="flex justify-end gap-2 border-t border-base-content/10 px-6 py-4">
            {children}
        </div>
    );
}
