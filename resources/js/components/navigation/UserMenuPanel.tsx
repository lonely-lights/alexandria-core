import { usePage } from "@inertiajs/react";
import type { ReactNode } from "react";
import type { SharedProps } from "../../types/index";
import ThemePicker from "../theme/ThemePicker";
import type {
    UserMenuItem,
    UserMenuItemDivider,
    UserMenuItemRow,
} from "../../types/navigation";

function isDivider(item: UserMenuItem): item is UserMenuItemDivider {
    return "divider" in item && item.divider;
}

/**
 * The user-dropdown menu panel — extracted from Navbar (ribbon
 * transitions) so the writing workspace's merged header can reuse the
 * exact same menu surface without dragging in the navbar's 72px scroll
 * choreography. Renders the embedded ThemePicker, then either the
 * consumer-supplied `userMenuItems` or the default head/footer sets
 * (with the admin entry injected from `auth.is_admin`), then the
 * optional `userMenuFooter` slot.
 *
 * Positioning, open/close state, and the trigger button stay with the
 * host (Navbar's avatar trigger, CompactUserMenu's small avatar).
 */

/**
 * Default user-dropdown items rendered when the consumer doesn't pass
 * its own `userMenuItems`. Mirrors legacy's surface: Profile, Settings,
 * Keyboard shortcuts, divider (theme picker injects between this and
 * the footer), Support, API (disabled placeholder), Log out. Logout
 * routes to the Fortify POST endpoint via the form-submit pattern in
 * the click handler below.
 */
const DEFAULT_USER_MENU_ITEMS: UserMenuItem[] = [
    {
        label: "Profile",
        href: "/profile",
        icon: "fa-solid fa-user",
        shortcut: "⇧⌘P",
    },
    {
        label: "Settings",
        href: "/settings",
        icon: "fa-solid fa-gear",
        shortcut: "⌘S",
    },
    {
        label: "Keyboard shortcuts",
        href: "/settings",
        icon: "fa-solid fa-keyboard",
        shortcut: "⌘K",
    },
];

const DEFAULT_USER_MENU_FOOTER_ITEMS: UserMenuItem[] = [
    { divider: true },
    { label: "Support", href: "/support", icon: "fa-solid fa-life-ring" },
    {
        label: "API",
        href: "#",
        icon: "fa-solid fa-circle-nodes",
        disabled: true,
    },
    { divider: true },
    {
        label: "Log out",
        href: "/logout",
        icon: "fa-solid fa-arrow-right-from-bracket",
        shortcut: "⇧⌘Q",
        onClick: (event) => {
            event.preventDefault();
            // Submit a POST to /logout — Fortify's destroy endpoint is
            // POST-protected, so we mimic the auth form pattern by
            // synthesizing a one-shot form submit.
            const form = document.createElement("form");
            form.method = "POST";
            form.action = "/logout";
            const csrfMeta = document.querySelector<HTMLMetaElement>(
                'meta[name="csrf-token"]',
            );
            if (csrfMeta) {
                const csrf = document.createElement("input");
                csrf.type = "hidden";
                csrf.name = "_token";
                csrf.value = csrfMeta.content;
                form.appendChild(csrf);
            }
            document.body.appendChild(form);
            form.submit();
        },
    },
];

interface UserMenuPanelProps {
    /**
     * Items rendered in the user dropdown menu. When omitted, a default set
     * is used: Profile, Settings, Theme picker, Logout. Pass an empty array
     * to render nothing but the theme picker.
     *
     * The panel ALWAYS renders the embedded `<ThemePicker />` between the
     * `userMenuItems` block and the optional `userMenuFooter` slot.
     */
    userMenuItems?: UserMenuItem[];

    /**
     * Optional footer slot rendered below the theme picker (e.g. Support
     * link, API status indicator).
     */
    userMenuFooter?: ReactNode;
}

export default function UserMenuPanel({
    userMenuItems,
    userMenuFooter,
}: UserMenuPanelProps) {
    // Default dropdown structure renders in three groups so the
    // ThemePicker (Appearance) lands between the "head" items
    // (Profile / Settings / Keyboard shortcuts) and the "tail" items
    // (Support / API / Log out). When a consumer supplies their own
    // userMenuItems we render those as a single block followed by
    // Appearance — there's no head/tail boundary we can infer.
    const useCustomMenu = userMenuItems !== undefined;
    const { auth } = usePage<SharedProps>().props;

    // Admins get an "Admin Panel" entry at the top of the default
    // dropdown, separated from the personal-account items by a divider.
    // Server gates remain authoritative; this is purely UI affordance.
    const defaultHeadItems: UserMenuItem[] = auth?.is_admin
        ? [
              {
                  label: "Admin Panel",
                  href: "/admin",
                  icon: "fa-solid fa-shield-halved",
              },
              { divider: true },
              ...DEFAULT_USER_MENU_ITEMS,
          ]
        : DEFAULT_USER_MENU_ITEMS;

    return (
        <div
            className="alex-user-menu mt-1 rounded-md p-1 shadow-md"
            style={{
                background: "var(--theme-base-surface)",
                color: "var(--theme-base-content)",
                border: "1px solid var(--theme-base-400)",
            }}
        >
            <ThemePicker />

            <MenuDivider />

            {useCustomMenu ? (
                userMenuItems!.map(renderMenuItem)
            ) : (
                <>
                    {defaultHeadItems.map(renderMenuItem)}
                    {DEFAULT_USER_MENU_FOOTER_ITEMS.map(renderMenuItem)}
                </>
            )}

            {userMenuFooter && (
                <>
                    <MenuDivider />
                    {userMenuFooter}
                </>
            )}
        </div>
    );
}

function renderMenuItem(item: UserMenuItem, idx: number): ReactNode {
    if (isDivider(item)) {
        return <MenuDivider key={`div-${idx}`} />;
    }
    return renderMenuRow(item, idx);
}

function MenuDivider() {
    return (
        <div
            className="-mx-1 my-1 h-px"
            style={{
                background:
                    "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
            }}
        />
    );
}

function renderMenuRow(item: UserMenuItemRow, idx: number): ReactNode {
    const baseClass =
        "relative flex select-none items-center px-2 py-1.5 text-sm outline-none transition-colors";
    const baseStyle = { borderRadius: "var(--theme-radius-button)" };

    if (item.disabled) {
        return (
            <span
                key={`item-${idx}`}
                className={`${baseClass} cursor-default opacity-50`}
                style={baseStyle}
            >
                {renderMenuIcon(item.icon)}
                <span>{item.label}</span>
                {item.shortcut && (
                    <span className="ml-auto text-xs tracking-widest opacity-80">
                        {item.shortcut}
                    </span>
                )}
            </span>
        );
    }

    return (
        <a
            key={`item-${idx}`}
            href={item.href}
            onClick={item.onClick}
            className={`${baseClass} ${item.danger ? "alex-menu-row--danger" : ""}`}
            style={baseStyle}
        >
            {renderMenuIcon(item.icon)}
            <span>{item.label}</span>
            {item.shortcut && (
                <span className="ml-auto text-xs tracking-widest opacity-80">
                    {item.shortcut}
                </span>
            )}
        </a>
    );
}

function renderMenuIcon(icon: string | ReactNode | undefined): ReactNode {
    if (icon == null) return null;
    if (typeof icon === "string") {
        const cls = icon.includes(" ") ? icon : `fa-solid ${icon}`;
        return <i className={`${cls} mr-2 h-4 w-4`} />;
    }
    return (
        <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            {icon}
        </span>
    );
}
