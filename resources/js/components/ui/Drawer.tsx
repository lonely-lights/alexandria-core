import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useFloatingPanel } from '../../hooks/useFloatingPanel';

export type DrawerSide = 'left' | 'right';

interface DrawerProps {
    children: ReactNode;
    open: boolean;
    onClose: () => void;
    /** Edge the panel slides in from. Default 'right'. */
    side?: DrawerSide;
    /**
     * Tailwind max-width class controlling the drawer's width on
     * `sm+` viewports. Default 'sm:max-w-2xl'. Below the breakpoint
     * the drawer goes edge-to-edge.
     */
    maxWidth?: string;
    /** Optional aria label for the panel itself. */
    ariaLabel?: string;
}

/**
 * Side-aligned slide-over panel. Same family as Modal/Sheet — owns the
 * useFloatingPanel lifecycle (scroll lock + GSAP enter/exit + Escape +
 * backdrop click) but slides in from the left or right edge instead
 * of fading in centred or rising from the bottom.
 *
 * Use for "open the same UI without leaving this route" surfaces:
 * Settings, Notes, Filters, etc. The panel goes edge-to-edge on
 * mobile and caps at `maxWidth` on `sm+` so wider content (like the
 * full SettingsBody) has room to breathe.
 *
 * Theming is via `--theme-*` tokens — no DaisyUI-shaped utilities.
 */
export default function Drawer({
    children,
    open,
    onClose,
    side = 'right',
    maxWidth = 'sm:max-w-2xl',
    ariaLabel,
}: DrawerProps) {
    // Slide direction depends on which edge we anchor to. Right-anchored
    // panel enters from off-screen-right (translateX 100%), left from
    // off-screen-left (-100%). Same on exit.
    const offscreen = side === 'right' ? '100%' : '-100%';

    const { backdropRef, panelRef, animateClose } = useFloatingPanel(
        open,
        onClose,
        {
            enter: {
                from: { x: offscreen },
                to: { x: 0, duration: 0.4, ease: 'power3.out' },
            },
            exit: { x: offscreen, duration: 0.28, ease: 'power3.in' },
            backdropExitDuration: 0.28,
        },
    );

    if (!open) return null;

    const justifyClass = side === 'right' ? 'justify-end' : 'justify-start';

    return createPortal(
        <div className={`fixed inset-0 z-[100] flex ${justifyClass}`}>
            <div
                ref={backdropRef}
                className="absolute inset-0"
                style={{
                    background: 'rgba(0, 0, 0, 0.55)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                }}
                onClick={animateClose}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                className={`relative h-full w-full ${maxWidth} flex flex-col`}
                style={{
                    background: 'var(--theme-base-surface)',
                    color: 'var(--theme-base-content)',
                    borderLeft: side === 'right' ? '1px solid var(--theme-base-400)' : 'none',
                    borderRight: side === 'left' ? '1px solid var(--theme-base-400)' : 'none',
                    boxShadow:
                        side === 'right'
                            ? '-16px 0 40px rgba(0, 0, 0, 0.32)'
                            : '16px 0 40px rgba(0, 0, 0, 0.32)',
                }}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}

export function DrawerHeader({
    title,
    onClose,
    rightSlot,
}: {
    title: string;
    onClose: () => void;
    rightSlot?: ReactNode;
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
            <div className="flex items-center gap-2">
                {rightSlot}
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
        </div>
    );
}
