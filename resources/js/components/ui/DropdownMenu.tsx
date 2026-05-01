import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DropdownMenuItem {
    label: string;
    icon?: string;
    onClick?: () => void;
    href?: string;
    badge?: string | number;
    divider?: false;
}

interface DropdownMenuDivider {
    divider: true;
}

type DropdownMenuEntry = DropdownMenuItem | DropdownMenuDivider;

interface DropdownMenuProps {
    /** Menu items — use { divider: true } for separators */
    items: DropdownMenuEntry[];
    /** Custom trigger element — defaults to 3-dot icon button */
    trigger?: ReactNode;
    /** Alignment of the dropdown relative to the trigger */
    align?: 'left' | 'right';
}

function DropdownRow({ item, onClose }: { item: DropdownMenuItem; onClose: () => void }) {
    const [hovered, setHovered] = useState(false);

    const iconClass = item.icon
        ? (item.icon.includes(' ') ? item.icon : `fa-solid ${item.icon}`)
        : null;

    const rowClass = `flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
        hovered ? 'bg-base-content/10 text-base-content' : 'text-base-content/80'
    }`;

    const badgeClass = `ml-4 flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
        hovered ? 'bg-base-content/15 text-base-content' : 'bg-base-content/10 text-base-content/50'
    }`;

    const content = (
        <>
            {iconClass && <i className={`${iconClass} w-5 flex-shrink-0 text-center text-xs ${hovered ? 'text-base-content' : 'text-base-content/60'}`} />}
            <span className="flex-1">{item.label}</span>
            {item.badge != null && (
                <span className={badgeClass}>{item.badge}</span>
            )}
        </>
    );

    const handlers = {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
    };

    if (item.href) {
        return (
            <a href={item.href} className={rowClass} onClick={onClose} {...handlers}>
                {content}
            </a>
        );
    }

    return (
        <button
            type="button"
            onClick={() => { item.onClick?.(); onClose(); }}
            className={rowClass}
            {...handlers}
        >
            {content}
        </button>
    );
}

export default function DropdownMenu({ items, trigger, align = 'right' }: DropdownMenuProps) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    // Close on outside click
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
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    // Close on scroll (menu position would be stale)
    useEffect(() => {
        if (!open) return;
        const handleScroll = () => setOpen(false);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [open]);

    return (
        <div ref={triggerRef}>
            {/* Trigger */}
            {trigger ? (
                <span onClick={() => setOpen(!open)} className="cursor-pointer">{trigger}</span>
            ) : (
                <button
                    onClick={() => setOpen(!open)}
                    className="btn btn-ghost btn-sm btn-square rounded-xl"
                    aria-label="More options"
                >
                    <i className="fa-solid fa-ellipsis-vertical text-sm" />
                </button>
            )}

            {/* Menu — portaled to body to escape overflow containers.
                Uses base-* tokens so the panel stays theme-consistent
                (matches page chrome) instead of the bold neutral tint. */}
            {open && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[9999] w-60 overflow-hidden rounded-lg border border-base-content/10 bg-base-100 text-base-content shadow-lg"
                    style={getPosition()}
                >
                    {items.map((item, i) => {
                        if (item.divider) {
                            return <div key={i} className="h-px bg-base-content/10" />;
                        }

                        return <DropdownRow key={i} item={item} onClose={() => setOpen(false)} />;
                    })}
                </div>,
                document.body,
            )}
        </div>
    );
}
