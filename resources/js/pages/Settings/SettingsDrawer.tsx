import { useState, useEffect, useRef, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import useT from '@alexandria/hooks/useT';
import SectionContent from './components/SectionContent';
import SettingsSearch from './components/SettingsSearch';
import { ALL_NAV, resolveNav, resolveNavItem, type NavItem } from './nav-config';
import { type SettingsBodyProps } from './SettingsBody';
import { getSettingsSlots, useSettingsData } from './settingsCache';

/**
 * Mobile-only iOS-style settings drawer.
 *
 * Globally mounted in `<AppLayout>` for authenticated users. Opens by
 * `setOpen(true)` from the layout in response to the
 * `'alexandria-core:settings-drawer-toggle'` event (dispatched by the
 * bottom-nav Settings tab, or anywhere else that wants to open it).
 *
 * Two-pane stack:
 *
 *   1. Root pane — grouped list of every settings section, sourced from
 *      `ALL_NAV` in nav-config. Tap a row to push the detail pane.
 *   2. Detail pane — renders `<SectionContent activeSection=…>` for the
 *      selected key. `←` back pops to root; `✕` close exits the drawer.
 *
 * Data flows through the module-level cache in `settingsCache.ts` —
 * preloaded on AppLayout mount, seeded by the /settings Inertia page on
 * direct URL visits, fetched on first open if neither has happened yet.
 * The drawer's slide-up animation runs unconditionally on `open` so the
 * sheet is on-screen instantly even when the fetch is still in flight;
 * a small skeleton fills the pane area until data arrives.
 *
 * Sheet height defaults to 85dvh — tall enough to feel like the user
 * "entered Settings" while still leaving a peek of the underlying page
 * at the top. One knob to flip via `panelHeight` if we want full-screen.
 */

export interface SettingsDrawerProps {
    /** Drawer open/closed. Owned by AppLayout. */
    open: boolean;
    /** Optional section to show immediately when the drawer opens. */
    initialSection?: string | null;
    /** Called when the drawer's slide-out animation completes. */
    onClose: () => void;
    /** Sheet height. Defaults to `'85dvh'`. Set to `'100dvh'` for full
     *  takeover, `'70dvh'` for shorter. */
    panelHeight?: string;
    /** SaaS app's email/password/danger zone slot. */
    accountManagementSlot?: SettingsBodyProps['accountManagementSlot'];
    /** Mirror view preferences onto `<html>` for optimistic UI. */
    applyViewPreferences?: SettingsBodyProps['applyViewPreferences'];
}

export default function SettingsDrawer({
    open,
    initialSection = null,
    onClose,
    panelHeight = '85dvh',
    accountManagementSlot,
    applyViewPreferences,
}: SettingsDrawerProps) {
    const t = useT();
    const data = useSettingsData();
    const [stack, setStack] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const backdropRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef(false);
    // Swipe-down-to-dismiss state. Refs (not state) so dragging at 60fps
    // doesn't trigger React re-renders for every touchmove — we mutate
    // the panel's transform directly via gsap.set instead.
    const dragStartY = useRef(0);
    const dragStartTime = useRef(0);
    const isDraggingRef = useRef(false);

    // Reset the navigation stack each time the drawer opens — the user
    // Ordinary opens land on the root list, while a search deep link may
    // intentionally land one level in on its complete owning section.
    useEffect(() => {
        if (open) {
            setStack(
                initialSection && findNavItem(initialSection)
                    ? [initialSection]
                    : [],
            );
            setMounted(true);
            closingRef.current = false;
        }
    }, [open, initialSection]);

    // Slide-up entrance + scroll-lock. Runs every time `mounted` flips
    // true (i.e., on each open). GSAP from-tweens force the initial
    // off-screen state so the animation is visible even if React's
    // commit happens after the layout is settled.
    useEffect(() => {
        if (!mounted) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            if (backdropRef.current) {
                gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
            }
            if (panelRef.current) {
                gsap.fromTo(panelRef.current, { y: '100%' }, { y: 0, duration: 0.35, ease: 'power3.out' });
            }
        });

        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                animateClose();
            }
        }
        document.addEventListener('keydown', onKey);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    function animateClose() {
        if (closingRef.current) return;
        closingRef.current = true;
        const tl = gsap.timeline({
            onComplete: () => {
                setMounted(false);
                onClose();
            },
        });
        if (panelRef.current) {
            tl.to(panelRef.current, { y: '100%', duration: 0.25, ease: 'power2.in' }, 0);
        }
        if (backdropRef.current) {
            tl.to(backdropRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
        }
    }

    // Swipe-down-to-dismiss handlers — attached to the handle + header
    // zone only, so they don't fight with the pane body's scroll. On
    // touch-start, capture the start Y + timestamp; on move, translate
    // the panel by the Y delta (capped at 0, so users can't drag the
    // sheet *up*); on end, dismiss if either dragged past the distance
    // threshold or released with high enough downward velocity, else
    // snap back to 0.
    const DRAG_DISMISS_DISTANCE = 120; // px — past this on release = close
    const DRAG_DISMISS_VELOCITY = 0.5; // px/ms — a "flick" closes regardless of distance

    function onDragStart(e: TouchEvent<HTMLDivElement>) {
        if (!panelRef.current || closingRef.current) return;
        dragStartY.current = e.touches[0].clientY;
        dragStartTime.current = Date.now();
        isDraggingRef.current = true;
        // Kill any in-flight entrance/exit tween so we don't fight GSAP.
        gsap.killTweensOf(panelRef.current);
    }

    function onDragMove(e: TouchEvent<HTMLDivElement>) {
        if (!isDraggingRef.current || !panelRef.current) return;
        const deltaY = e.touches[0].clientY - dragStartY.current;
        // Only follow downward drags; upward = no-op (sheet stays put).
        const y = Math.max(0, deltaY);
        gsap.set(panelRef.current, { y });
        if (backdropRef.current) {
            // Fade the backdrop slightly as the sheet starts to leave —
            // visual cue that the dismissal is committing.
            const fade = Math.min(1, y / 400);
            gsap.set(backdropRef.current, { opacity: 1 - fade * 0.5 });
        }
    }

    function onDragEnd(e: TouchEvent<HTMLDivElement>) {
        if (!isDraggingRef.current || !panelRef.current) return;
        isDraggingRef.current = false;
        const deltaY = e.changedTouches[0].clientY - dragStartY.current;
        const elapsed = Math.max(1, Date.now() - dragStartTime.current);
        const velocity = deltaY / elapsed;

        if (deltaY > DRAG_DISMISS_DISTANCE || velocity > DRAG_DISMISS_VELOCITY) {
            animateClose();
        } else {
            // Spring the sheet back into place + restore the backdrop.
            gsap.to(panelRef.current, { y: 0, duration: 0.25, ease: 'power2.out' });
            if (backdropRef.current) {
                gsap.to(backdropRef.current, { opacity: 1, duration: 0.15, ease: 'power2.out' });
            }
        }
    }

    function push(key: string) {
        setStack((prev) => [...prev, key]);
    }
    function pop() {
        setStack((prev) => prev.slice(0, -1));
    }

    if (!mounted) return null;

    const activeKey = stack[stack.length - 1] ?? null;
    // Leaf label in the top bar (iOS Settings.app style — the title
    // bar carries the page you're on, the back button hands you the
    // parent context implicitly). The big <SectionHeader> block that
    // would otherwise repeat this title inside the body is hidden via
    // scoped CSS — see components/settings-drawer.css.
    const activeItem = activeKey ? findNavItem(activeKey) : null;
    const activeLabel = activeItem ? resolveNavItem(activeItem, t).label : null;
    const isDetail = stack.length > 0;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden" role="dialog" aria-modal="true" aria-label={t('settings.drawer.aria_label')}>
            {/* Backdrop — fades in/out with the sheet, dismisses on tap. */}
            <div
                ref={backdropRef}
                onClick={animateClose}
                className="absolute inset-0"
                style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                aria-hidden="true"
            />

            {/* Panel — bottom-anchored sheet. */}
            <div
                ref={panelRef}
                className="relative flex w-full flex-col overflow-hidden"
                style={{
                    background: 'var(--theme-base-page)',
                    borderTop: '1px solid var(--theme-base-400)',
                    borderTopLeftRadius: 'var(--theme-radius-card, 1rem)',
                    borderTopRightRadius: 'var(--theme-radius-card, 1rem)',
                    boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.18)',
                    height: panelHeight,
                    maxHeight: '100dvh',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                }}
            >
                {/* Grab zone — handle pill + header bar. Touch-listeners
                    here translate the panel as the finger moves and
                    dismiss the sheet on release if the drag passed a
                    distance or velocity threshold. Scoped to the top
                    chrome so the body's scroll behaviour isn't hijacked:
                    swiping inside the pane content scrolls normally. */}
                <div
                    onTouchStart={onDragStart}
                    onTouchMove={onDragMove}
                    onTouchEnd={onDragEnd}
                    onTouchCancel={onDragEnd}
                    // `touch-action: none` is the contract that promises
                    // the browser we'll handle the gesture ourselves —
                    // without it, the browser might initiate its own
                    // scroll/zoom behaviour and the touchmove deltas
                    // arrive at the wrong cadence.
                    style={{ touchAction: 'none' }}
                >
                    {/* Drag handle pill — visually anchors the swipe
                        affordance even though the whole top zone is
                        draggable. */}
                    <div className="flex shrink-0 justify-center pt-2 pb-1">
                        <div
                            className="h-1 w-10 rounded-full"
                            style={{ background: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' }}
                            aria-hidden="true"
                        />
                    </div>

                    {/* Header */}
                    <header
                        className="flex shrink-0 items-center gap-2 px-3 py-2"
                        style={{ borderBottom: '1px solid var(--theme-base-400)' }}
                    >
                        {isDetail ? (
                            <button
                                type="button"
                                onClick={pop}
                                aria-label={t('common.back')}
                                className="alex-modal-close inline-flex h-9 w-9 items-center justify-center rounded-full"
                                style={{ color: 'var(--theme-base-content)' }}
                            >
                                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                            </button>
                        ) : (
                            <span className="inline-block h-9 w-9" aria-hidden="true" />
                        )}
                        <h2
                            className="flex-1 text-center text-base font-semibold truncate"
                            style={{ fontFamily: 'var(--theme-typography-heading-family)' }}
                        >
                            {activeLabel ?? t('settings.drawer.title')}
                        </h2>
                        <button
                            type="button"
                            onClick={animateClose}
                            aria-label={t('common.close')}
                            className="alex-modal-close inline-flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ color: 'var(--theme-base-content)' }}
                        >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>
                    </header>
                </div>

                {/* Pane stack — absolute-positioned panes, one translateX
                    on the wrapper shifts the whole stack so the active
                    pane sits in the viewport. */}
                <div className="relative flex-1 overflow-hidden">
                    {!data ? (
                        <PaneSkeleton />
                    ) : (
                        <div
                            className="relative h-full"
                            style={{
                                transform: `translateX(-${stack.length * 100}%)`,
                                transition: 'transform var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard)',
                                willChange: 'transform',
                            }}
                        >
                            <Pane index={0}>
                                <RootList onSelect={push} />
                            </Pane>
                            {stack.map((key, idx) => (
                                <Pane key={key} index={idx + 1}>
                                    {/* The `alex-settings-drawer-pane`
                                        marker scopes the CSS rules in
                                        components/settings-drawer.css —
                                        cards inside lose their rounded
                                        corners + border + shadow, and the
                                        big <SectionHeader> block is
                                        hidden so the drawer's top bar
                                        carries the section context
                                        unchallenged. */}
                                    <div className="alex-settings-drawer-pane h-full overflow-y-auto">
                                        <SectionContent
                                            activeSection={key}
                                            {...data}
                                            onPreviewChange={() => { /* preview is desktop-only — drawer doesn't host the floating profile card */ }}
                                            accountManagementSlot={accountManagementSlot}
                                            applyViewPreferences={applyViewPreferences}
                                        />
                                    </div>
                                </Pane>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function Pane({ index, children }: { index: number; children: ReactNode }) {
    return (
        <div
            className="absolute inset-y-0 w-full"
            style={{ left: `${index * 100}%` }}
        >
            {children}
        </div>
    );
}

/**
 * Pane-area placeholder shown while the settings payload is being
 * fetched. Mirrors the grouped list-row rhythm so the layout doesn't
 * shift when real data lands.
 */
function PaneSkeleton() {
    return (
        <div className="h-full overflow-y-auto pb-4" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((groupIdx) => (
                <section key={groupIdx} className="mt-3">
                    <div
                        className="mx-4 my-2 h-3 w-24 rounded"
                        style={{ background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }}
                    />
                    <ul className="m-0 flex list-none flex-col">
                        {[0, 1, 2, 3].map((rowIdx) => (
                            <li key={rowIdx} className="flex items-center gap-3 px-4 py-3">
                                <div
                                    className="h-5 w-5 rounded"
                                    style={{ background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }}
                                />
                                <div
                                    className="h-3 flex-1 rounded"
                                    style={{ background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)' }}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

function mergedNav(): NavItem[] {
    // Built-ins + consumer-app extras (slot registry) — same merge the
    // desktop rail applies, so app-registered groups appear here too.
    // Unresolved (translation keys): key lookups only. Resolve through
    // `resolveNav` / `resolveNavItem` before rendering any label.
    return [...ALL_NAV, ...(getSettingsSlots().extraNav ?? [])];
}

function RootList({ onSelect }: { onSelect: (key: string) => void }) {
    const t = useT();
    const nav = resolveNav(mergedNav(), t);
    const [isSearching, setIsSearching] = useState(false);

    return (
        <div className="h-full overflow-y-auto pb-4">
            <SettingsSearch
                nav={nav}
                onSelect={onSelect}
                onSearchingChange={setIsSearching}
                sticky
            />
            {!isSearching && (
                nav.map((group) => (
                    <section key={group.key} className="mt-3">
                    <h3
                        className="flex items-center gap-2 px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}
                    >
                        <i className={`fa-solid ${group.icon}`} aria-hidden="true" />
                        {group.label}
                    </h3>
                    <ul className="m-0 flex list-none flex-col">
                        {(group.children ?? []).map((child) => (
                            <li key={child.key}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(child.key)}
                                    className="alex-settings-row flex w-full items-center gap-3 px-4 py-3 text-left"
                                    style={{ color: 'var(--theme-base-content)' }}
                                >
                                    <i
                                        className={`fa-solid ${child.icon} w-5 text-center`}
                                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}
                                        aria-hidden="true"
                                    />
                                    <span className="flex-1 text-sm font-medium">{child.label}</span>
                                    <i
                                        className="fa-solid fa-chevron-right text-xs"
                                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                                        aria-hidden="true"
                                    />
                                </button>
                            </li>
                        ))}
                    </ul>
                    </section>
                ))
            )}
        </div>
    );
}

function findNavItem(key: string): NavItem | null {
    for (const group of mergedNav()) {
        if (group.key === key) return group;
        for (const child of group.children ?? []) {
            if (child.key === key) return child;
        }
    }
    return null;
}
