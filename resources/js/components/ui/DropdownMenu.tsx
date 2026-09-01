import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHoverOffDismiss } from '@alexandria/hooks/useHoverOffDismiss';

interface DropdownMenuItem {
    label: string;
    icon?: string;
    onClick?: () => void;
    href?: string;
    badge?: string | number;
    divider?: false;
    /** Render as a danger action (status-error tinted text + hover bg). */
    danger?: boolean;
}

interface DropdownMenuDivider {
    divider: true;
}

/**
 * Escape hatch for a consumer-owned row (e.g. an app-contributed
 * `menuActions` slot component) that needs to render itself — an Inertia
 * `<Link>` with its own routing, for instance — rather than describe itself
 * as a `DropdownMenuItem` data object. The node is expected to already match
 * the surrounding items' visual styling; the menu only wraps it enough to
 * close on click.
 */
interface DropdownMenuCustom {
    custom: ReactNode;
}

type DropdownMenuEntry = DropdownMenuItem | DropdownMenuDivider | DropdownMenuCustom;

const MENU_TRANSITION_MS = 150;

interface DropdownMenuProps {
    /** Menu items — use { divider: true } for separators */
    items: DropdownMenuEntry[];
    /** Custom trigger element — defaults to 3-dot icon button */
    trigger?: ReactNode;
    /** Alignment of the dropdown relative to the trigger */
    align?: 'left' | 'right';
    density?: 'default' | 'compact';
    labelAlign?: 'left' | 'right';
    menuStyle?: CSSProperties;
    menuClassName?: string;
    inheritCssVariables?: string[];
    /**
     * Hover-off auto-dismiss (Stage 11 rework): when set to a positive
     * number, the menu closes itself `autoDismissMs` after the pointer
     * leaves both the trigger and the open menu (re-entering either one
     * cancels the pending close). Reads from the user's
     * `menu_dismiss_delay_ms` preference at call sites that wire it up —
     * unset/0/null leaves this OFF, matching prior click/outside-click-
     * only behavior.
     */
    autoDismissMs?: number | null;
}

function DropdownRow({
    item,
    onClose,
    density,
    labelAlign,
}: {
    item: DropdownMenuItem;
    onClose: () => void;
    density: 'default' | 'compact';
    labelAlign: 'left' | 'right';
}) {
    const [hovered, setHovered] = useState(false);

    const iconClass = item.icon
        ? (item.icon.includes(' ') ? item.icon : `fa-solid ${item.icon}`)
        : null;

    // Color resolution branches on danger flag + hover state. Danger
    // rows track --theme-status-error-stroke; non-danger rows track
    // --theme-base-content with alpha-mix variants.
    //
    // Contrast fix (Stage 11 Slice 4): danger text is full stroke at rest
    // (was 80% — too similar to muted non-danger text). Hover bg uses the
    // pre-baked --theme-status-error-subtle token (fill @ 10% opacity)
    // for token consistency instead of an ad-hoc 12% mix.
    // Danger text pulls 50% toward base-content: on dark themes that
    // lightens the red toward the near-white content color, on light
    // themes it darkens it — contrast improves in BOTH directions
    // against the menu surface (owner review, 2026-08-31: 65% stroke
    // was still hard to see on dark section-pane menus; brightened
    // to an even 50/50 split with base-content).
    const dangerText = 'color-mix(in srgb, var(--theme-status-error-stroke) 50%, var(--theme-base-content))';
    const baseColor = item.danger ? dangerText : 'var(--theme-base-content)';
    const fadedColor = item.danger
        ? dangerText
        : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)';
    const iconFadedColor = item.danger
        ? `color-mix(in srgb, ${dangerText} 80%, transparent)`
        : 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';
    const hoverBg = item.danger
        ? 'var(--theme-status-error-subtle)'
        : 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)';

    const rowStyle: CSSProperties = {
        background: hovered ? hoverBg : 'transparent',
        color: hovered ? baseColor : fadedColor,
        transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    };

    const iconStyle: CSSProperties = {
        color: hovered ? baseColor : iconFadedColor,
    };

    const badgeStyle: CSSProperties = {
        background: hovered
            ? 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)'
            : 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        color: hovered
            ? 'var(--theme-base-content)'
            : 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
        borderRadius: 'var(--theme-radius-button)',
    };

    const content = (
        <>
            {iconClass && <i className={`${iconClass} w-5 flex-shrink-0 text-center text-xs`} style={iconStyle} />}
            <span className={`flex-1 ${labelAlign === 'right' ? 'text-right' : ''}`}>{item.label}</span>
            {item.badge != null && (
                <span
                    className="ml-4 flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium"
                    style={badgeStyle}
                >
                    {item.badge}
                </span>
            )}
        </>
    );

    const rowClass = density === 'compact'
        ? 'flex w-full items-center gap-3 px-3.5 py-2 text-left text-[13px]'
        : 'flex w-full items-center gap-3 px-4 py-2 text-left text-sm';
    const handlers = {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
    };

    if (item.href) {
        return (
            <a href={item.href} className={rowClass} style={rowStyle} onClick={onClose} {...handlers}>
                {content}
            </a>
        );
    }

    return (
        <button
            type="button"
            onClick={() => { item.onClick?.(); onClose(); }}
            className={rowClass}
            style={rowStyle}
            {...handlers}
        >
            {content}
        </button>
    );
}

export default function DropdownMenu({
    items,
    trigger,
    align = 'right',
    density = 'default',
    labelAlign = 'left',
    menuStyle: menuStyleOverride,
    menuClassName = '',
    inheritCssVariables = [],
    autoDismissMs = null,
}: DropdownMenuProps) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [defaultTriggerHovered, setDefaultTriggerHovered] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Only armed while the menu is actually open — leaving delayMs at
    // its real value while closed would let a stale timer, started by
    // idly hovering + unhovering the trigger before ever opening the
    // menu, slam the menu shut the instant it's next opened.
    const { handlePointerEnter: handleHoverOffEnter, handlePointerLeave: handleHoverOffLeave } = useHoverOffDismiss({
        delayMs: open ? autoDismissMs : null,
        onDismiss: () => setOpen(false),
    });

    function getPosition(): CSSProperties {
        if (!triggerRef.current) return { opacity: 0 };
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const spaceBelow = viewportH - rect.bottom;
        const flipUp = spaceBelow < 280;
        const left = Math.max(8, align === 'right' ? rect.right - 240 : rect.left);

        if (flipUp) {
            return { bottom: viewportH - rect.top + 4, left };
        }
        return { top: rect.bottom + 4, left };
    }

    useEffect(() => {
        if (open) {
            setMounted(true);
            const frame = window.requestAnimationFrame(() => setVisible(true));

            return () => window.cancelAnimationFrame(frame);
        }

        setVisible(false);

        const timeout = window.setTimeout(() => setMounted(false), MENU_TRANSITION_MS);

        return () => window.clearTimeout(timeout);
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!mounted) return;
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                menuRef.current && !menuRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [mounted]);

    // Close on scroll (menu position would be stale)
    useEffect(() => {
        if (!mounted) return;
        const handleScroll = () => setOpen(false);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [mounted]);

    const defaultTriggerStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2rem',
        height: '2rem',
        borderRadius: 'var(--theme-radius-button)',
        background: defaultTriggerHovered
            ? 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)'
            : 'transparent',
        color: defaultTriggerHovered
            ? 'var(--theme-base-content)'
            : 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
        transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    };

    function inheritedVariableStyle(): CSSProperties {
        if (!triggerRef.current || inheritCssVariables.length === 0) {
            return {};
        }

        const computed = getComputedStyle(triggerRef.current);
        const values: Record<string, string> = {};

        for (const variable of inheritCssVariables) {
            const value = computed.getPropertyValue(variable).trim();

            if (value !== '') {
                values[variable] = value;
            }
        }

        return values as CSSProperties;
    }

    const menuStyle: CSSProperties = {
        ...inheritedVariableStyle(),
        ...getPosition(),
        background: 'var(--theme-base-surface)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
        color: 'var(--theme-base-content)',
        boxShadow: '0 12px 32px rgb(0 0 0 / 0.22)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-0.5rem) scale(0.985)',
        transformOrigin: 'top left',
        transition: 'opacity 150ms ease, transform 150ms ease, visibility 150ms ease',
        visibility: visible ? 'visible' : 'hidden',
        ...menuStyleOverride,
    };

    const dividerStyle: CSSProperties = {
        height: '1px',
        background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    };

    return (
        <div ref={triggerRef} onMouseEnter={handleHoverOffEnter} onMouseLeave={handleHoverOffLeave}>
            {/* Trigger */}
            {trigger ? (
                <span onClick={() => setOpen(!open)} className="cursor-pointer">{trigger}</span>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    onMouseEnter={() => setDefaultTriggerHovered(true)}
                    onMouseLeave={() => setDefaultTriggerHovered(false)}
                    style={defaultTriggerStyle}
                    aria-label="More options"
                >
                    <i className="fa-solid fa-ellipsis-vertical text-sm" />
                </button>
            )}

            {/* Menu — portaled to body to escape overflow containers.
                Uses --theme-* tokens so the panel tracks the active
                preset (page surface + content text + theme corner
                radius). */}
            {mounted && createPortal(
                <div
                    ref={menuRef}
                    className={`fixed z-[9999] overflow-hidden ${menuClassName || 'w-60'}`}
                    data-open={visible ? 'true' : 'false'}
                    style={menuStyle}
                    onMouseEnter={handleHoverOffEnter}
                    onMouseLeave={handleHoverOffLeave}
                >
                    {items.map((item, i) => {
                        if ('divider' in item && item.divider) {
                            return <div key={i} style={dividerStyle} />;
                        }

                        if ('custom' in item) {
                            return (
                                <div key={i} className="contents" onClick={() => setOpen(false)}>
                                    {item.custom}
                                </div>
                            );
                        }

                        return (
                            <DropdownRow
                                key={i}
                                item={item}
                                onClose={() => setOpen(false)}
                                density={density}
                                labelAlign={labelAlign}
                            />
                        );
                    })}
                </div>,
                document.body,
            )}
        </div>
    );
}
