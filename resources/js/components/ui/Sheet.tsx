import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useFloatingPanel } from '../../hooks/useFloatingPanel';

interface SheetProps {
    children: ReactNode;
    open: boolean;
    onClose: () => void;
    /** Optional title rendered with a close button. */
    title?: string;
    /** Cap on the sheet's height. Default 85vh. */
    maxHeight?: string;
}

/**
 * Bottom-aligned sheet styled after iOS settings sheets — slides up from
 * the lower edge, leaves a gap above so the page stays visible, has a
 * grabber handle at the top. Use for context menus, settings popovers,
 * any "tap to summon" UI that doesn't deserve a full modal.
 *
 * Wider than the Modal primitive (`max-w-lg` floor) and pinned to the
 * bottom on every viewport so the affordance is consistent across sizes.
 */
export default function Sheet({
    children,
    open,
    onClose,
    title,
    maxHeight = '85vh',
}: SheetProps) {
    const { backdropRef, panelRef, animateClose } = useFloatingPanel(
        open,
        onClose,
        {
            enter: {
                from: { y: '100%' },
                to: { y: 0, duration: 0.4, ease: 'power3.out' },
            },
            exit: { y: '100%', duration: 0.28, ease: 'power3.in' },
            backdropExitDuration: 0.28,
        },
    );

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:p-4">
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
                className="relative w-full sm:max-w-lg"
                style={{
                    maxHeight,
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    background: 'var(--theme-base-surface)',
                    color: 'var(--theme-base-content)',
                    border: '1px solid var(--theme-base-400)',
                    borderBottom: 'none',
                    borderTopLeftRadius: 'var(--theme-radius-card)',
                    borderTopRightRadius: 'var(--theme-radius-card)',
                    boxShadow: '0 -16px 40px rgba(0, 0, 0, 0.32)',
                }}
            >
                <div className="flex justify-center pt-3 pb-1">
                    <span
                        aria-hidden="true"
                        className="block h-1 w-10 rounded-full"
                        style={{
                            background:
                                'color-mix(in srgb, var(--theme-base-content) 25%, transparent)',
                        }}
                    />
                </div>

                {title && (
                    <div
                        className="flex items-center justify-between px-5 pb-3"
                        style={{
                            borderBottom: '1px solid var(--theme-base-400)',
                        }}
                    >
                        <h3
                            className="text-base font-bold"
                            style={{
                                fontFamily:
                                    'var(--theme-typography-heading-family)',
                            }}
                        >
                            {title}
                        </h3>
                        <button
                            type="button"
                            onClick={animateClose}
                            aria-label="Close"
                            className="alex-modal-close inline-flex h-8 w-8 items-center justify-center rounded-full"
                            style={{ color: 'var(--theme-base-content)' }}
                        >
                            <i
                                className="fa-solid fa-xmark"
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                )}

                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: `calc(${maxHeight} - 4rem)` }}
                >
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
