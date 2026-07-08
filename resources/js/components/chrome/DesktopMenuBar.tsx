import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import useT from '@alexandria/hooks/useT';
import { resolveGate, type GateVerdict } from '@alexandria/ribbon/ribbonGates';
import type { RibbonGates, RibbonRequires } from '@alexandria/ribbon/types';

export interface DesktopMenuBarItemDef {
    id: string;
    /** Translation key — passed to useT() for the label. */
    labelKey: string;
    /** FontAwesome class (short form 'fa-star' or qualified 'fa-solid fa-star'). */
    icon?: string;
    onSelect?: () => void;
    href?: string;
    /** Gate requirement. Omit for always-visible items. */
    requires?: RibbonRequires;
    disabled?: boolean;
    /**
     * Check/radio affordance for view-toggle items. When set (even false),
     * the row renders a checkmark column so all items in the menu align.
     * Active item has checked=true; inactive have checked=false.
     */
    checked?: boolean;
}

export interface DesktopMenuBarMenuDef {
    id: string;
    /** Translation key for the menu trigger label (e.g. 'blueprints.menu.file'). */
    labelKey: string;
    items: DesktopMenuBarItemDef[];
}

interface DesktopMenuBarProps {
    menus: DesktopMenuBarMenuDef[];
    gates?: RibbonGates;
}

const TRANSITION_MS = 150;

// ── Pure helpers (exported for unit testing) ──────────────────────────────────

/**
 * Map items to {item, verdict}, dropping any whose verdict is 'hidden'.
 * Locked items remain: they render disabled + lock glyph + locked_hint title.
 */
export function resolveMenuItems(
    items: DesktopMenuBarItemDef[],
    gates: RibbonGates | undefined,
): Array<DesktopMenuBarItemDef & { verdict: GateVerdict }> {
    return items
        .map(item => ({ ...item, verdict: resolveGate(item.requires, gates) }))
        .filter(({ verdict }) => verdict !== 'hidden');
}

/**
 * Return only the menus that have at least one non-hidden item after gate
 * resolution. A menu whose every item is hidden is omitted entirely.
 */
export function filterVisibleMenus(
    menus: DesktopMenuBarMenuDef[],
    gates: RibbonGates | undefined,
): DesktopMenuBarMenuDef[] {
    return menus.filter(menu =>
        menu.items.some(item => resolveGate(item.requires, gates) !== 'hidden'),
    );
}

// ── Menu item row ─────────────────────────────────────────────────────────────

interface MenuRowProps {
    label: string;
    item: DesktopMenuBarItemDef & { verdict: GateVerdict };
    lockedHint: string;
    onClose: () => void;
}

function MenuRow({ label, item, lockedHint, onClose }: MenuRowProps) {
    const [hovered, setHovered] = useState(false);
    const isLocked = item.verdict === 'locked';
    const isDisabled = isLocked || (item.disabled ?? false);

    const iconClass = item.icon
        ? (item.icon.includes(' ') ? item.icon : `fa-solid ${item.icon}`)
        : null;

    const rowStyle: CSSProperties = {
        color: isDisabled
            ? 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)'
            : hovered
                ? 'var(--theme-base-content)'
                : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
        background: hovered && !isDisabled
            ? 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)'
            : 'transparent',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition:
            'background-color var(--theme-motion-duration-fast, 120ms) ease,' +
            'color var(--theme-motion-duration-fast, 120ms) ease',
    };

    const handlers = {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
    };

    /* When any item in the menu carries a `checked` field (view toggles),
     * all items expose the column for visual alignment. */
    const hasCheckColumn = item.checked !== undefined;

    const content = (
        <>
            {hasCheckColumn && (
                <span className="w-4 flex-shrink-0 text-center text-[10px]" aria-hidden="true">
                    {item.checked && <i className="fa-solid fa-check" />}
                </span>
            )}
            {iconClass && (
                <i
                    className={`${iconClass} w-4 flex-shrink-0 text-center text-xs`}
                    aria-hidden="true"
                />
            )}
            <span className="min-w-0 flex-1 text-[13px]">{label}</span>
            {isLocked && (
                <i
                    className="fa-solid fa-lock ml-auto flex-shrink-0 text-[9px] opacity-50"
                    aria-hidden="true"
                />
            )}
        </>
    );

    const rowClass = 'flex w-full items-center gap-2 px-3 py-1.5 text-left';

    if (item.href && !isDisabled) {
        return (
            <a
                href={item.href}
                role="menuitem"
                className={rowClass}
                style={rowStyle}
                title={isLocked ? lockedHint : undefined}
                onClick={onClose}
                {...handlers}
            >
                {content}
            </a>
        );
    }

    return (
        <button
            type="button"
            role="menuitem"
            className={rowClass}
            style={rowStyle}
            disabled={isDisabled}
            title={isLocked ? lockedHint : undefined}
            onClick={() => {
                if (!isDisabled) {
                    item.onSelect?.();
                    onClose();
                }
            }}
            {...handlers}
        >
            {content}
        </button>
    );
}

// ── DesktopMenuBar ────────────────────────────────────────────────────────────

/**
 * Lightweight File/Edit/View-style desktop menu bar.
 *
 * Generic — receives `menus` (declarative data) + optional `gates`
 * (RibbonGates), then applies `resolveGate` per item:
 *   hidden   → item omitted entirely
 *   locked   → item renders disabled + fa-lock + writing.ribbon.locked_hint title
 *   visible  → normal
 *
 * A menu whose items are all hidden is not rendered.
 *
 * Desktop-only (hidden below the `md` breakpoint); mobile surfaces
 * use the existing ActionButton + tab chrome pattern.
 */
export default function DesktopMenuBar({ menus, gates }: DesktopMenuBarProps) {
    const t = useT();
    const [openId, setOpenId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const dropdownRef = useRef<HTMLDivElement>(null);

    const visibleMenus = filterVisibleMenus(menus, gates);

    // Mount / unmount the portal dropdown with a brief fade transition.
    useEffect(() => {
        if (openId !== null) {
            setMounted(true);
            const frame = window.requestAnimationFrame(() => setVisible(true));
            return () => window.cancelAnimationFrame(frame);
        }
        setVisible(false);
        const timeout = window.setTimeout(() => setMounted(false), TRANSITION_MS);
        return () => window.clearTimeout(timeout);
    }, [openId]);

    // Close on outside click.
    useEffect(() => {
        if (!mounted) { return; }
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            let inTrigger = false;
            for (const btn of triggerRefs.current.values()) {
                if (btn?.contains(target)) {
                    inTrigger = true;
                    break;
                }
            }
            if (!inTrigger && !(dropdownRef.current?.contains(target) ?? false)) {
                setOpenId(null);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [mounted]);

    // Close on scroll (portal position would be stale).
    useEffect(() => {
        if (!mounted) { return; }
        const handler = () => setOpenId(null);
        window.addEventListener('scroll', handler, true);
        return () => window.removeEventListener('scroll', handler, true);
    }, [mounted]);

    function getDropdownPosition(): CSSProperties {
        if (!openId) { return {}; }
        const btn = triggerRefs.current.get(openId);
        if (!btn) { return { opacity: 0 }; }
        const rect = btn.getBoundingClientRect();
        const flipUp = window.innerHeight - rect.bottom < 280;
        const left = Math.max(8, rect.left);
        return flipUp
            ? { bottom: window.innerHeight - rect.top + 2, left }
            : { top: rect.bottom + 2, left };
    }

    if (visibleMenus.length === 0) { return null; }

    const barStyle: CSSProperties = {
        background: 'color-mix(in srgb, var(--theme-base-content) 3%, var(--theme-base-page))',
        borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    };

    const activeMenu = openId ? visibleMenus.find(m => m.id === openId) : null;
    const activeItems = activeMenu ? resolveMenuItems(activeMenu.items, gates) : [];
    const lockedHint = t('writing.ribbon.locked_hint');

    return (
        <div
            className="hidden md:flex items-center gap-px px-3 py-0.5"
            style={barStyle}
            data-desktop-menu-bar
        >
            {visibleMenus.map(menu => {
                const isOpen = openId === menu.id;

                const triggerStyle: CSSProperties = {
                    fontSize: '0.8125rem',
                    fontWeight: isOpen ? 600 : 500,
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--theme-radius-button)',
                    color: isOpen
                        ? 'var(--theme-base-content)'
                        : 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                    background: isOpen
                        ? 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)'
                        : 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    lineHeight: 1.5,
                    transition:
                        'background-color var(--theme-motion-duration-fast, 120ms) ease,' +
                        'color var(--theme-motion-duration-fast, 120ms) ease',
                };

                return (
                    <button
                        key={menu.id}
                        ref={btn => { if (btn) { triggerRefs.current.set(menu.id, btn); } }}
                        type="button"
                        className="alex-desktop-menu-trigger"
                        data-menu-id={menu.id}
                        data-open={isOpen ? 'true' : 'false'}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        onClick={() =>
                            setOpenId(prev => (prev === menu.id ? null : menu.id))
                        }
                        style={triggerStyle}
                    >
                        {t(menu.labelKey)}
                    </button>
                );
            })}

            {/* Single portal for the currently-open menu dropdown. */}
            {mounted && openId !== null && createPortal(
                <div
                    ref={dropdownRef}
                    role="menu"
                    className="fixed z-[9999] w-52 overflow-hidden py-1"
                    data-desktop-menu-dropdown={openId}
                    style={{
                        ...getDropdownPosition(),
                        background: 'var(--theme-base-surface)',
                        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                        boxShadow: '0 12px 32px rgb(0 0 0 / 0.22)',
                        opacity: visible ? 1 : 0,
                        pointerEvents: visible ? 'auto' : 'none',
                        transform: visible
                            ? 'translateY(0) scale(1)'
                            : 'translateY(-0.375rem) scale(0.985)',
                        transformOrigin: 'top left',
                        transition: 'opacity 150ms ease, transform 150ms ease, visibility 150ms ease',
                        visibility: visible ? 'visible' : 'hidden',
                    }}
                >
                    {activeItems.map(item => (
                        <MenuRow
                            key={item.id}
                            label={t(item.labelKey)}
                            item={item}
                            lockedHint={lockedHint}
                            onClose={() => setOpenId(null)}
                        />
                    ))}
                </div>,
                document.body,
            )}
        </div>
    );
}
