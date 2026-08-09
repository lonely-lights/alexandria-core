import {
    useCallback,
    useState,
    useEffect,
    useRef,
    type CSSProperties,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Reusable theme-aware picker dropdown — picks a single value from a
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
 *     <PickerDropdown
 *         value={recentLimit}
 *         options={[{ value: 5, label: '5' }, ...]}
 *         onChange={setRecentLimit}
 *         ariaLabel="Items to show"
 *     />
 */

interface PickerDropdownOption<T extends string | number> {
    value: T;
    label: string;
}

interface PickerDropdownProps<T extends string | number> {
    value: T;
    options: Array<PickerDropdownOption<T>>;
    onChange: (next: T) => void;
    /** Optional label rendered before the value inside the trigger. */
    triggerLabel?: ReactNode;
    /** aria-label on the trigger when no visible label is present. */
    ariaLabel?: string;
    /** Sizing/positioning override for the trigger button. */
    className?: string;
    /** Inline overrides for the trigger button. */
    style?: CSSProperties;
    /** Optional data-* attributes for tests/integration hooks. */
    dataAttributes?: Record<`data-${string}`, string>;
    /** Disables the trigger and closes any open menu. */
    disabled?: boolean;
    /** Width override for the menu (px). Defaults to trigger width. */
    menuWidth?: number;
    /** Alignment of the menu relative to the trigger. Defaults to 'left' (menu's left edge aligns with the trigger's left edge). */
    align?: "left" | "right";
    /** When true, the trigger fills its parent (display: flex; width: 100%). Menu width follows the trigger. */
    fullWidth?: boolean;
    /**
     * Optional custom trigger, replacing the default value+chevron
     * button entirely. Everything below the trigger — portalled menu,
     * flip-up positioning, outside-click / Escape / scroll dismissal,
     * option rows — is reused as-is, which is the point: a caller that
     * needs a different affordance (the ribbon's font-size combo box,
     * where only the arrow opens the list) still gets the same popup.
     *
     * The caller MUST attach the supplied `ref` to whatever element the
     * menu should anchor against and be measured by; that element also
     * defines "inside" for outside-click dismissal.
     */
    trigger?: (api: {
        open: boolean;
        toggle: () => void;
        close: () => void;
        ref: (node: HTMLElement | null) => void;
    }) => ReactNode;
}

export default function PickerDropdown<T extends string | number>({
    value,
    options,
    onChange,
    triggerLabel,
    ariaLabel,
    className,
    style,
    dataAttributes,
    disabled = false,
    menuWidth,
    align = "left",
    fullWidth = false,
    trigger,
}: PickerDropdownProps<T>) {
    const [open, setOpen] = useState(false);
    const [triggerHovered, setTriggerHovered] = useState(false);
    // HTMLElement, not HTMLButtonElement: a custom trigger anchors the
    // menu on whatever wrapper it likes. Everything this ref is used for
    // — getBoundingClientRect, contains, focus — is on HTMLElement.
    const triggerRef = useRef<HTMLElement | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // A callback ref rather than the ref object itself: the default
    // trigger is a <button> and a custom one is whatever the caller
    // likes, and a callback sidesteps having to name a Ref<T> type that
    // both element kinds satisfy.
    const setTriggerNode = useCallback((node: HTMLElement | null) => {
        triggerRef.current = node;
    }, []);

    const selectedOption = options.find((o) => o.value === value);

    useEffect(() => {
        if (disabled) {
            setOpen(false);
        }
    }, [disabled]);

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
        const left = align === "right" ? rect.right - width : rect.left;

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
                triggerRef.current &&
                !triggerRef.current.contains(target) &&
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        }
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleScroll = () => setOpen(false);
        window.addEventListener("scroll", handleScroll, true);
        return () => window.removeEventListener("scroll", handleScroll, true);
    }, [open]);

    const triggerStyle: CSSProperties = {
        // `pr-7` (~1.75rem) opens room for the chevron at `right: 0.5rem`
        // — the previous native <select> jammed its arrow against the
        // right edge with no breathing room.
        paddingInline: "0.625rem 1.75rem",
        paddingBlock: "0.375rem",
        background: triggerHovered
            ? "color-mix(in srgb, var(--theme-base-content) 10%, transparent)"
            : "color-mix(in srgb, var(--theme-base-content) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
        borderRadius: "var(--theme-radius-input)",
        color: "var(--theme-base-content)",
        fontSize: "0.75rem",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition:
            "background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
        ...style,
    };

    const menuStyle: CSSProperties = {
        ...getPosition(),
        background: "var(--theme-base-surface)",
        border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
        borderRadius: "var(--theme-radius-card)",
        color: "var(--theme-base-content)",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
        maxHeight: "280px",
        overflowY: "auto",
    };

    return (
        <>
            {trigger !== undefined ? (
                trigger({
                    open,
                    toggle: () => setOpen((value) => !value),
                    close: () => setOpen(false),
                    ref: setTriggerNode,
                })
            ) : (
            <button
                ref={setTriggerNode}
                type="button"
                onClick={() => setOpen(!open)}
                onMouseEnter={() => setTriggerHovered(true)}
                onMouseLeave={() => setTriggerHovered(false)}
                className={`relative ${fullWidth ? "flex w-full" : "inline-flex"} items-center gap-1.5 ${className ?? ""}`}
                style={triggerStyle}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                {...dataAttributes}
            >
                {triggerLabel != null && (
                    <span
                        style={{
                            color: "color-mix(in srgb, var(--theme-base-content) 65%, transparent)",
                        }}
                    >
                        {triggerLabel}
                    </span>
                )}
                <span>{selectedOption?.label ?? String(value)}</span>
                <i
                    className="fa-solid fa-chevron-down absolute text-[10px] transition-transform"
                    style={{
                        right: "0.625rem",
                        top: "50%",
                        // Both functions always present — keeps the transform
                        // function-list stable across states so CSS can
                        // interpolate smoothly and the chevron stays centered.
                        transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
                        color: "color-mix(in srgb, var(--theme-base-content) 55%, transparent)",
                    }}
                    aria-hidden="true"
                />
            </button>
            )}

            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[9999] overflow-hidden"
                        style={menuStyle}
                        role="listbox"
                    >
                        {options.map((opt) => (
                            <PickerDropdownRow
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
function PickerDropdownRow<T extends string | number>({
    option,
    active,
    onSelect,
}: {
    option: PickerDropdownOption<T>;
    active: boolean;
    onSelect: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    const rowStyle: CSSProperties = {
        background: active
            ? "var(--theme-brand-primary-highlight-bg)"
            : hovered
              ? "color-mix(in srgb, var(--theme-base-content) 8%, transparent)"
              : "transparent",
        color: active
            ? "var(--theme-brand-primary-highlight-fg)"
            : "var(--theme-base-content)",
        transition:
            "background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
        fontWeight: active ? 600 : 500,
        fontSize: "0.8125rem",
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
            data-select-option={String(option.value)}
        >
            <span className="truncate">{option.label}</span>
            {active && (
                <i
                    className="fa-solid fa-check text-[10px]"
                    aria-hidden="true"
                />
            )}
        </button>
    );
}
