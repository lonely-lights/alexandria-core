import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { usePage } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { useToast, type Toast, type ToastOptions, type ToastPosition, type ToastType } from '../../hooks/useToast';
import type { SharedProps } from '@alexandria/types';

interface ToastContextValue {
    toasts: Toast[];
    show: (message: string, options?: ToastOptions) => void;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToastContext must be used within a ToastProvider');
    }

    return context;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; iconColor: string }> = {
    success: { icon: 'fa-solid fa-circle-check', iconColor: 'text-success' },
    info: { icon: 'fa-solid fa-circle-info', iconColor: 'text-info' },
    warning: { icon: 'fa-solid fa-triangle-exclamation', iconColor: 'text-warning' },
    danger: { icon: 'fa-solid fa-circle-exclamation', iconColor: 'text-error' },
    default: { icon: 'fa-solid fa-bell', iconColor: 'text-base-content/70' },
};

const POSITIONS: ToastPosition[] = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
];

interface TimerEntry {
    /** ms remaining when the timer was last scheduled or paused. */
    remainingMs: number;
    /** Date.now() when the timer last started ticking; null while paused. */
    startedAt: number | null;
    /** setTimeout handle while running; null while paused. */
    handle: number | null;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const toast = useToast();
    const { flash } = usePage<SharedProps>().props;

    useEffect(() => {
        if (flash?.message) {
            toast.show(flash.message, {
                type: flash.type,
                description: flash.description,
            });
        }
    }, [flash]);

    // Global pause state — any stack being hovered suspends auto-dismiss
    // across EVERY position. Hovering one toast keeps all of them alive.
    const hoveredStacksRef = useRef(new Set<ToastPosition>());
    const [paused, setPaused] = useState(false);

    function handleStackHover(position: ToastPosition, hovered: boolean) {
        const set = hoveredStacksRef.current;
        if (hovered) {
            set.add(position);
        } else {
            set.delete(position);
        }
        setPaused(set.size > 0);
    }

    // Timer bookkeeping. `timersRef` holds one entry per toast that has a
    // positive duration. We never put timer state in React state because
    // setTimeout handles shouldn't trigger renders.
    const timersRef = useRef(new Map<string, TimerEntry>());
    const dismissRef = useRef(toast.dismiss);
    useEffect(() => {
        dismissRef.current = toast.dismiss;
    }, [toast.dismiss]);

    // Sync the timer map with the current toast list — create entries for
    // new toasts, drop entries for ones that were dismissed.
    useEffect(() => {
        const map = timersRef.current;
        for (const t of toast.toasts) {
            if (t.duration <= 0) continue;
            if (!map.has(t.id)) {
                map.set(t.id, { remainingMs: t.duration, startedAt: null, handle: null });
            }
        }
        for (const id of Array.from(map.keys())) {
            if (!toast.toasts.find((t) => t.id === id)) {
                const entry = map.get(id);
                if (entry?.handle) clearTimeout(entry.handle);
                map.delete(id);
            }
        }
    }, [toast.toasts]);

    // Pause/resume all timers based on hover state. Runs when hover flips
    // OR when the toast list changes (so a toast added during a hover still
    // gets a paused entry that'll resume on hover-leave).
    useEffect(() => {
        const map = timersRef.current;
        if (paused) {
            // Pause: clear handles, bank the remaining time.
            for (const entry of map.values()) {
                if (entry.handle !== null && entry.startedAt !== null) {
                    const elapsed = Date.now() - entry.startedAt;
                    entry.remainingMs = Math.max(0, entry.remainingMs - elapsed);
                    clearTimeout(entry.handle);
                    entry.handle = null;
                    entry.startedAt = null;
                }
            }
            return;
        }

        // Not paused: (re)schedule any timer that isn't currently running.
        for (const [id, entry] of map) {
            if (entry.handle !== null) continue;
            if (entry.remainingMs <= 0) {
                dismissRef.current(id);
                continue;
            }
            entry.startedAt = Date.now();
            entry.handle = window.setTimeout(() => {
                dismissRef.current(id);
            }, entry.remainingMs);
        }
    }, [paused, toast.toasts]);

    // Unmount cleanup — clear any live timers.
    useEffect(() => {
        const map = timersRef.current;
        return () => {
            for (const entry of map.values()) {
                if (entry.handle !== null) clearTimeout(entry.handle);
            }
            map.clear();
        };
    }, []);

    const byPosition = useMemo(() => {
        const grouped = new Map<ToastPosition, Toast[]>();
        for (const t of toast.toasts) {
            const arr = grouped.get(t.position) ?? [];
            arr.push(t);
            grouped.set(t.position, arr);
        }
        return grouped;
    }, [toast.toasts]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {typeof document !== 'undefined' && createPortal(
                <>
                    {POSITIONS.map((pos) => {
                        const items = byPosition.get(pos);
                        if (!items || items.length === 0) return null;

                        return (
                            <ToastStack
                                key={pos}
                                position={pos}
                                toasts={items}
                                onDismiss={toast.dismiss}
                                onHoverChange={handleStackHover}
                            />
                        );
                    })}
                </>,
                document.body,
            )}
        </ToastContext.Provider>
    );
}

/**
 * One container per active position. Newest toast sits on top of the
 * stack; older toasts peek out behind it at reduced scale. Hovering the
 * stack fans every toast out to full size AND suspends auto-dismiss
 * across every position (reported up to the provider).
 */
function ToastStack({
    position,
    toasts,
    onDismiss,
    onHoverChange,
}: {
    position: ToastPosition;
    toasts: Toast[];
    onDismiss: (id: string) => void;
    onHoverChange: (position: ToastPosition, hovered: boolean) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const atBottom = position.startsWith('bottom');

    function setStackHover(next: boolean) {
        setHovered(next);
        onHoverChange(position, next);
    }

    // Newest toast renders first visually (on top of the stack).
    const ordered = [...toasts].reverse();

    // Container owns the mouse target so gaps between toasts still count
    // as hovering. Without this, removing a middle toast briefly exposes
    // empty space under the cursor and onMouseLeave fires, collapsing the
    // stack. The inner wrapper gets an explicit min-height matching the
    // fanned layout for the same reason — toasts are absolutely positioned
    // so the wrapper itself has no intrinsic height.
    const containerClass = [
        'fixed z-[9999] w-full max-w-[380px] px-4 sm:px-0',
        atBottom ? 'bottom-0 pb-6' : 'top-0 pt-6',
        position.endsWith('-left') ? 'left-0 sm:ml-6' : '',
        position.endsWith('-right') ? 'right-0 sm:mr-6' : '',
        position.endsWith('-center') ? 'left-1/2 -translate-x-1/2' : '',
    ]
        .filter(Boolean)
        .join(' ');

    // Slot size when fanned — matches GAP_HOVERED so the hover rectangle
    // covers the full fanned stack.
    const SLOT_PX = 96;
    const innerMinHeight = hovered
        ? `${ordered.length * SLOT_PX}px`
        : `${SLOT_PX + Math.min(ordered.length - 1, 3) * 10}px`;

    return (
        <div
            className={containerClass}
            onMouseEnter={() => setStackHover(true)}
            onMouseLeave={() => setStackHover(false)}
        >
            <div
                className="relative"
                style={{
                    minHeight: innerMinHeight,
                    transition: 'min-height 300ms ease-out',
                }}
            >
                {ordered.map((t, idx) => (
                    <ToastItem
                        key={t.id}
                        toast={t}
                        stackIndex={idx}
                        hovered={hovered}
                        atBottom={atBottom}
                        onDismiss={onDismiss}
                    />
                ))}
            </div>
        </div>
    );
}

function ToastItem({
    toast,
    stackIndex,
    hovered,
    atBottom,
    onDismiss,
}: {
    toast: Toast;
    stackIndex: number;
    hovered: boolean;
    atBottom: boolean;
    onDismiss: (id: string) => void;
}) {
    const config = TOAST_CONFIG[toast.type] ?? TOAST_CONFIG.default;

    const GAP_HOVERED = 96; // px per step when expanded — tight but enough room
                             // for the rotated corners to not visually crash.
    const OFFSET_STACKED = 10; // px per stack level when collapsed
    const SCALE_STEP = 0.04;
    // Subtle spiral: each fanned toast rotates 2° further counter-clockwise
    // than the one above. Combined with a leftward shift per step, the
    // stack reads as cards sitting on the outside of a giant wheel.
    // Only applies when expanded — the top/newest toast (stackIndex 0)
    // stays at 0°/0px so the focus card doesn't tilt.
    const ROTATION_STEP_DEG = 2;
    // Wheel X offset grows non-linearly per step so the curve accelerates —
    // index * (index + 1) gives 0, 2, 6, 12, 20 at indices 0..4.

    let transform: string;
    if (hovered) {
        const y = (atBottom ? -1 : 1) * stackIndex * GAP_HOVERED;
        const x = -(stackIndex * (stackIndex + 1));
        const rotation = stackIndex * -ROTATION_STEP_DEG;
        transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(1)`;
    } else {
        const y = (atBottom ? -1 : 1) * stackIndex * OFFSET_STACKED;
        const scale = Math.max(1 - stackIndex * SCALE_STEP, 0.8);
        transform = `translateY(${y}px) scale(${scale})`;
    }

    const style: CSSProperties = {
        transform,
        zIndex: 100 - stackIndex,
        transition: 'transform 300ms ease-out, opacity 300ms ease-out',
        transformOrigin: atBottom ? 'bottom center' : 'top center',
        opacity: hovered ? 1 : Math.max(1 - stackIndex * 0.15, 0.4),
    };

    const anchorClass = atBottom
        ? 'absolute bottom-0 left-0 right-0'
        : 'absolute top-0 left-0 right-0';

    return (
        <div className={`${anchorClass} pointer-events-auto`} style={style}>
            <div className="overflow-hidden rounded-xl border border-base-content/10 bg-base-100 shadow-lg">
                <div className="flex items-start gap-3 p-4">
                    <i
                        className={`${config.icon} ${config.iconColor} mt-[1px] flex-shrink-0 text-base leading-5`}
                        aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-5 text-base-content">
                            {toast.message}
                        </p>
                        {toast.description && (
                            <p className="mt-1 text-xs leading-snug text-base-content/60">
                                {toast.description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onDismiss(toast.id)}
                        className="mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-base-content/30 transition-colors hover:bg-base-200/50 hover:text-base-content/60"
                        aria-label="Dismiss notification"
                    >
                        <i className="fa-solid fa-xmark text-[10px]" />
                    </button>
                </div>
            </div>
        </div>
    );
}
