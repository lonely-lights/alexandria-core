import { Link, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import useT from "../../hooks/useT";
import type { BottomNavTab } from "../../types/navigation";
import Modal from "../ui/Modal";

interface BottomNavProps {
    /**
     * Tabs to render left-to-right. Five tabs render evenly spaced across the
     * bar; layout is symmetric so consumers should always pass exactly five.
     */
    tabs: BottomNavTab[];
    /** A peek menu requires a deliberate reveal before tabs become actionable. */
    presentation?: "standard" | "peek";
    /** Force one tab active when its href does not match the nested route. */
    activeTabId?: string;
}

/**
 * Mobile bottom navigation (lg-and-down). Five evenly-spaced tabs over a
 * blurred surface-card background. The "create" affordance is intentionally
 * NOT here — it lives in a separate floating action button anchored to the
 * lower-right.
 *
 * Tabs route via Inertia <Link>. A tab with `href: '#'` + an `onClick`
 * handler renders as a <button> so consumers can wire popovers / modals
 * without abusing anchor semantics.
 */
export default function BottomNav({
    tabs,
    presentation = "standard",
    activeTabId,
}: BottomNavProps) {
    const url = usePage().url;
    const t = useT();
    const [peekOpen, setPeekOpen] = useState(false);
    const touchStartYRef = useRef<number | null>(null);
    const isPeek = presentation === "peek";
    const expanded = !isPeek || peekOpen;

    // Scroll-aware fade (owner, 2026-08-26): scrolling dims the pill to
    // 60% opacity so content leads; touching/entering the pill lights it
    // back up. Passive listener — never blocks the scroll.
    const [dimmed, setDimmed] = useState(false);

    useEffect(() => {
        let idleTimer: ReturnType<typeof setTimeout> | undefined;

        // Dim while scrolling; a 250ms quiet gap counts as "stopped" and
        // relights the pill (owner tuning, 2026-08-26).
        const onScroll = () => {
            setDimmed(true);
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => setDimmed(false), 250);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            clearTimeout(idleTimer);
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    useEffect(() => {
        if (!isPeek) {
            return;
        }

        const closeForEditorFocus = (event: FocusEvent) => {
            const target = event.target;

            if (
                target instanceof HTMLElement &&
                (target.matches("input, textarea, select") ||
                    target.isContentEditable ||
                    target.closest('[contenteditable="true"]') !== null)
            ) {
                setPeekOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setPeekOpen(false);
            }
        };

        document.addEventListener("focusin", closeForEditorFocus);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("focusin", closeForEditorFocus);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isPeek]);

    if (!expanded) {
        return (
            <button
                type="button"
                aria-label={t("nav.mobile.open_navigation")}
                aria-expanded={false}
                aria-controls="alexandria-mobile-bottom-navigation"
                onClick={() => setPeekOpen(true)}
                className="fixed right-4 z-40 flex items-center justify-center rounded-full text-sm lg:hidden"
                style={{
                    bottom: "calc(var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 2.25rem)",
                    width: "2.75rem",
                    minHeight: "2.75rem",
                    color: "var(--theme-brand-primary-highlight-fg)",
                    background:
                        "color-mix(in srgb, var(--theme-base-chrome) 96%, transparent)",
                    border: "1px solid var(--theme-base-400)",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                }}
            >
                <i className="fa-solid fa-bars" aria-hidden="true" />
            </button>
        );
    }

    if (isPeek) {
        return (
            <Modal
                open={peekOpen}
                onClose={() => setPeekOpen(false)}
                maxWidth="max-w-xs"
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="alexandria-mobile-navigation-title"
                >
                    <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid var(--theme-base-400)" }}
                    >
                        <h2
                            id="alexandria-mobile-navigation-title"
                            className="text-base font-semibold"
                            style={{
                                fontFamily:
                                    "var(--theme-typography-heading-family)",
                            }}
                        >
                            {t("nav.mobile.navigation_title")}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setPeekOpen(false)}
                            aria-label={t("nav.mobile.close_navigation")}
                            className="alex-modal-close inline-flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ color: "var(--theme-base-content)" }}
                        >
                            <i
                                className="fa-solid fa-xmark"
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                    <nav
                        id="alexandria-mobile-bottom-navigation"
                        aria-label={t("nav.mobile.primary_navigation")}
                        onTouchStart={(event) => {
                            touchStartYRef.current =
                                event.touches[0]?.clientY ?? null;
                        }}
                        onTouchEnd={(event) => {
                            const startY = touchStartYRef.current;
                            const endY =
                                event.changedTouches[0]?.clientY ?? null;
                            touchStartYRef.current = null;

                            if (
                                startY !== null &&
                                endY !== null &&
                                endY - startY > 32
                            ) {
                                setPeekOpen(false);
                            }
                        }}
                        className="flex flex-col items-stretch gap-1 p-3"
                    >
                        {tabs.map((tab) => (
                            <Tab
                                key={tab.id}
                                tab={tab}
                                active={
                                    tab.id === activeTabId ||
                                    isActive(tab, url)
                                }
                                onActivate={() => setPeekOpen(false)}
                                layout="menu"
                            />
                        ))}
                    </nav>
                </div>
            </Modal>
        );
    }

    return (
        <nav
            id="alexandria-mobile-bottom-navigation"
            aria-label={t("nav.mobile.primary_navigation")}
            onPointerDown={() => setDimmed(false)}
            onPointerEnter={() => setDimmed(false)}
            onTouchStart={() => setDimmed(false)}
            className="fixed inset-x-4 z-40 flex items-stretch gap-1 lg:hidden"
            style={{
                    // Floating pill (owner direction, 2026-08-26, settled
                    // after the edge-to-edge experiments — Reddit-app
                    // reference): inset from the sides, riding above the
                    // home-indicator zone, fully rounded, each tab's
                    // highlight its own pill inside the capsule.
                bottom: "calc(var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 0.3125rem)",
                minHeight: "3.875rem",
                padding: "0.375rem",
                borderRadius: "999px",
                    // base-chrome is the elevated-chrome surface (darker than
                    // page in light mode, lighter in dark) — same role as
                    // the top navbar. Near-solid so content scrolling under
                    // the float reads as depth, not bleed-through.
                background:
                    "color-mix(in srgb, var(--theme-base-chrome) 96%, transparent)",
                border: "1px solid var(--theme-base-400)",
                boxShadow: "0 10px 28px rgba(0, 0, 0, 0.38)",
                opacity: dimmed ? 0.4 : 1,
                transition: "opacity 300ms ease",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
            }}
        >
            {tabs.map((tab) => (
                <Tab
                    key={tab.id}
                    tab={tab}
                    active={tab.id === activeTabId || isActive(tab, url)}
                    layout="bar"
                />
            ))}
        </nav>
    );
}

function isActive(tab: BottomNavTab, url: string): boolean {
    if (tab.href === "#" || tab.href === "") {
        return false;
    }
    return url === tab.href || url.startsWith(`${tab.href}/`);
}

interface TabProps {
    tab: BottomNavTab;
    active: boolean;
    onActivate?: () => void;
    layout: "bar" | "menu";
}

// Active + hover tabs read the brand-primary highlight aliases — pre-
// resolved by the emitter so callers don't need light-dark() / a CSS
// feature gate. In light mode the aliases point at -100/-700; in dark
// at -800/-200. Same numeric stop = same semantic role across modes.
const ACTIVE_COLOR = "var(--theme-brand-primary-highlight-fg)";
const ACTIVE_BG = "var(--theme-brand-primary-highlight-bg)";

function Tab({ tab, active, onActivate, layout }: TabProps) {
    const colorVar = active
        ? ACTIVE_COLOR
        : "color-mix(in srgb, var(--theme-surface-on-page) 65%, transparent)";

    const backgroundVar = active ? ACTIVE_BG : "transparent";

    const className =
        layout === "menu"
            ? "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left no-underline transition-colors"
            : "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1 text-center no-underline transition-colors";

    const inner = (
        <>
            <span
                className={`relative inline-flex items-center justify-center ${
                    layout === "menu" ? "w-5 shrink-0" : ""
                }`}
            >
                {renderIcon(tab.icon)}
                {tab.badge != null && tab.badge !== "" && (
                    <span
                        className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none"
                        style={{
                            background: "var(--theme-brand-primary-500)",
                            color: "var(--theme-brand-primary-on)",
                        }}
                    >
                        {tab.badge}
                    </span>
                )}
            </span>
            <span
                className={
                    layout === "menu"
                        ? "text-[0.8125rem] tracking-tight"
                        : "text-[0.6875rem] tracking-tight"
                }
                style={{ fontWeight: active ? 600 : 500 }}
            >
                {tab.label}
            </span>
        </>
    );

    // The active pill wears a brand border ring as its indicator (owner,
    // 2026-08-26 — replaces the old 2px top-edge bar). Transparent border
    // on the rest so activation never shifts layout.
    const baseStyle = {
        color: colorVar,
        background: backgroundVar,
        border: active
            ? "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)"
            : "1px solid transparent",
    };

    // Action-only tabs (href '#') render as buttons. Useful for tabs that
    // open modals / sheets rather than navigating.
    if (tab.href === "#" || tab.href === "") {
        return (
            <button
                type="button"
                aria-label={tab.label}
                className={className}
                style={baseStyle}
                onClick={(e) => {
                    onActivate?.();
                    tab.onClick?.({ preventDefault: () => e.preventDefault() });
                }}
            >
                {inner}
            </button>
        );
    }

    return (
        <Link
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className={className}
            style={baseStyle}
            onClick={(e) => {
                onActivate?.();

                if (tab.onClick) {
                    tab.onClick({
                        preventDefault: () => e.preventDefault(),
                    });
                }
            }}
        >
            {inner}
        </Link>
    );
}

function renderIcon(icon: string | ReactNode | undefined): ReactNode {
    if (icon == null) return null;
    if (typeof icon === "string") {
        const cls = icon.includes(" ") ? icon : `fa-solid ${icon}`;
        return <i className={`${cls} text-base`} aria-hidden="true" />;
    }
    return icon;
}
