import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable theme-aware select primitive — picks a single value from a
 * list of options. Use this whenever a native `<select>` would surface
 * (a) un-themable OS chrome on the option list (Chrome/Edge ignore most
 * CSS on `<option>`), or (b) an arrow indicator we can't pad properly.
 *
 * Visual + interaction shape mirrors `<DropdownMenu>`:
 *   • trigger: button with current label + a custom chevron
 *   • menu: portaled, theme-tokenized panel
 *   • outside-click + Escape + scroll all close the menu
 *
 * Generic over the value type so callers don't need to round-trip
 * through string. Typical usage:
 *
 *     <Select
 *         value={recentLimit}
 *         options={[{ value: 5, label: '5' }, ...]}
 *         onChange={setRecentLimit}
 *         ariaLabel="Items to show"
 *     />
 */

interface SelectOption<T extends string | number> {
    value: T;
    label: string;
}

interface SelectProps<T extends string | number> {
    value: T;
    options: Array<SelectOption<T>>;
    onChange: (next: T) => void;
    /** Optional label rendered before the value inside the trigger. */
    triggerLabel?: ReactNode;
    /** aria-label on the trigger when no visible label is present. */
    ariaLabel?: string;
    /** Sizing/positioning override for the trigger button. */
    className?: string;
    /** Width override for the menu (px). Defaults to trigger width. */
    menuWidth?: number;
    /** Alignment of the menu relative to the trigger. Defaults to 'left' (menu's left edge aligns with the trigger's left edge). */
    align?: 'left' | 'right';
}

export default function Select<T extends string | number>({
    value,
    options,
    onChange,
    triggerLabel,
    ariaLabel,
    className,
    menuWidth,
    align = 'left',
}: SelectProps<T>) {
    const [open, setOpen] = useState(false);
    const [triggerHovered, setTriggerHovered] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    // Position the menu against the trigger's bounding rect. Flips
    // upward when there isn't enough room below — same pattern as
    // DropdownMenu so the two components feel like siblings.
    function getPosition(): CSSProperties {
        if (!triggerRef.current) return { opacity: 0 };
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const desiredHeight = Math.min(options.length * 36 + 8, 280);
        const spaceBelow = viewportH - rect.bottom;
        const flipUp = spaceBelow < desiredHeight + 16;
        const width = menuWidth ?? rect.width;
        const left = align === 'right' ? rect.right - width : rect.left;

        if (flipUp) {
            return { bottom: viewportH - rect.top + 4, left, width };
        }
        return { top: rect.bottom + 4, left, width };
    }

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                menuRef.current && !menuRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
            }
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleScroll = () => setOpen(false);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [open]);

    const triggerStyle: CSSProperties = {
        // `pr-7` (~1.75rem) opens room for the chevron at `right: 0.5rem`
        // — the previous native <select> jammed its arrow against the
        // right edge with no breathing room.
        paddingInline: '0.625rem 1.75rem',
        paddingBlock: '0.375rem',
        background: triggerHovered
            ? 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)'
            : 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-input)',
        color: 'var(--theme-base-content)',
        fontSize: '0.75rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    };

    const menuStyle: CSSProperties = {
        ...getPosition(),
        background: 'var(--theme-base-surface)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
        color: 'var(--theme-base-content)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
        maxHeight: '280px',
        overflowY: 'auto',
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(!open)}
                onMouseEnter={() => setTriggerHovered(true)}
                onMouseLeave={() => setTriggerHovered(false)}
                className={`relative inline-flex items-center gap-1.5 ${className ?? ''}`}
                style={triggerStyle}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {triggerLabel != null && (
                    <span style={{ color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)' }}>
                        {triggerLabel}
                    </span>
                )}
                <span>{selectedOption?.label ?? String(value)}</span>
                <i
                    className={`fa-solid fa-chevron-down absolute text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}
                    style={{
                        right: '0.625rem',
                        top: '50%',
                        transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`,
                        color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
                    }}
                    aria-hidden="true"
                />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[9999] overflow-hidden"
                    style={menuStyle}
                    role="listbox"
                >
                    {options.map((opt) => (
                        <SelectRow
                            key={String(opt.value)}
                            option={opt}
                            active={opt.value === value}
                            onSelect={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                        />
                    ))}
                </div>,
                document.body,
            )}
        </>
    );
}

/**
 * Single option row. Hover state tracks the same hover-tint pattern
 * the rest of the menu family uses; active row carries the brand-tint
 * fill + a check glyph so the user can see the current pick at a glance.
 */
function SelectRow<T extends string | number>({
    option,
    active,
    onSelect,
}: {
    option: SelectOption<T>;
    active: boolean;
    onSelect: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    const rowStyle: CSSProperties = {
        background: active
            ? 'var(--theme-brand-primary-highlight-bg)'
            : hovered
                ? 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)'
                : 'transparent',
        color: active
            ? 'var(--theme-brand-primary-highlight-fg)'
            : 'var(--theme-base-content)',
        transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
        fontWeight: active ? 600 : 500,
        fontSize: '0.8125rem',
    };

    return (
        <button
            type="button"
            onClick={onSelect}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            style={rowStyle}
            role="option"
            aria-selected={active}
        >
            <span className="truncate">{option.label}</span>
            {active && (
                <i className="fa-solid fa-check text-[10px]" aria-hidden="true" />
            )}
        </button>
    );
}
