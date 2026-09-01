import { usePage } from "@inertiajs/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SharedProps } from "../../types/index";
import type { UserMenuItem } from "../../types/navigation";
import AvatarWithRing from "../ui/AvatarWithRing";
import UserMenuPanel from "./UserMenuPanel";

interface CompactUserMenuProps {
    /** Accessible name for the avatar trigger button. */
    ariaLabel: string;

    /** Avatar diameter in px (the ring adds `ringThickness × 2`). */
    size?: number;

    /** Same contract as Navbar's `userMenuItems` — defaults when omitted. */
    userMenuItems?: UserMenuItem[];

    /** Same contract as Navbar's `userMenuFooter`. */
    userMenuFooter?: ReactNode;
    /** Reports dropdown open/close so hosts can e.g. mute a wrapping Tooltip. */
    onOpenChange?: (open: boolean) => void;
}

/**
 * A compact avatar button + the shared UserMenuPanel dropdown — the
 * user-menu surface for chrome that doesn't carry the full Navbar
 * (e.g. the writing workspace's merged ribbon header). Renders null
 * for guests. Same panel contents as the navbar dropdown (ThemePicker,
 * default/custom items, admin entry), minus the 72px hanging-seal
 * choreography.
 */
export default function CompactUserMenu({
    ariaLabel,
    size = 24,
    userMenuItems,
    userMenuFooter,
    onOpenChange,
}: CompactUserMenuProps) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user ?? null;
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Hosts that wrap the trigger in a Tooltip need to suppress it while
    // the menu is open — the dropdown lives inside this same subtree, so
    // hovering it still reads as hovering the tooltip trigger (owner bug
    // report, 2026-08-31).
    useEffect(() => {
        onOpenChange?.(open);
    }, [open, onOpenChange]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    if (!user) {
        return null;
    }

    return (
        // `flex` (not a plain block) — an inline-flex button inside a
        // block div rides the text baseline, and the line box's phantom
        // descender space pushes the avatar off vertical center.
        <div className="relative flex items-center" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                className="alex-user-trigger inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none"
                style={{ color: "var(--theme-base-content)" }}
            >
                <AvatarWithRing
                    src={
                        user.has_avatar && user.avatar_thumb_url
                            ? user.avatar_thumb_url
                            : null
                    }
                    alt={user.name ?? "User"}
                    initials={(user.display_name ?? user.name ?? "U")
                        .charAt(0)
                        .toUpperCase()}
                    size={size}
                    ring={user.avatar_ring_slug ?? "none"}
                    ringSettings={user.avatar_ring_settings as never}
                    ringThickness={2}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56">
                    <UserMenuPanel
                        userMenuItems={userMenuItems}
                        userMenuFooter={userMenuFooter}
                    />
                </div>
            )}
        </div>
    );
}
