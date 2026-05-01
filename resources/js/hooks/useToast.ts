import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'danger' | 'default';

export type ToastPosition =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';

export interface ToastOptions {
    type?: ToastType;
    description?: string | null;
    position?: ToastPosition;
    /** Milliseconds before auto-dismiss. Default 4000. Pass 0 to persist
        until manually dismissed. */
    duration?: number;
}

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    description: string | null;
    position: ToastPosition;
    duration: number;
}

let toastCounter = 0;

const DEFAULT_POSITION: ToastPosition = 'bottom-right';
const DEFAULT_DURATION = 4000;
const MAX_STACK = 4;

/**
 * State-only hook — auto-dismiss timing lives in ToastProvider so it can
 * pause/resume all toasts together while the user hovers any stack.
 */
export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const show = useCallback(
        (message: string, options: ToastOptions = {}) => {
            const id = `toast-${++toastCounter}`;
            const resolved: Toast = {
                id,
                message,
                type: options.type ?? 'default',
                description: options.description ?? null,
                position: options.position ?? DEFAULT_POSITION,
                duration: options.duration ?? DEFAULT_DURATION,
            };

            setToasts((prev) => {
                // Cap the stack per position — evict the oldest for this
                // position when exceeded so a flood of toasts doesn't fill
                // the screen.
                const samePos = prev.filter((t) => t.position === resolved.position);
                if (samePos.length >= MAX_STACK) {
                    const evictId = samePos[0].id;
                    return [...prev.filter((t) => t.id !== evictId), resolved];
                }

                return [...prev, resolved];
            });
        },
        [],
    );

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, show, dismiss };
}
