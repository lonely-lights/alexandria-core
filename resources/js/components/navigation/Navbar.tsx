import { Link, usePage } from "@inertiajs/react";
import {
    useState,
    useEffect,
    useRef,
    type CSSProperties,
    type ReactNode,
} from "react";
import type { SharedProps } from "../../types/index";
import LogoLockup from "../brand/LogoLockup";
import AvatarWithRing from "../ui/AvatarWithRing";
import Tooltip from "../ui/Tooltip";
import ThemePicker from "../theme/ThemePicker";
import type {
    UserMenuItem,
    UserMenuItemDivider,
    UserMenuItemRow,
} from "../../types/navigation";

function isDivider(item: UserMenuItem): item is UserMenuItemDivider {
    return "divider" in item && item.divider;
}

interface NavbarProps {
    /** Toggles the Sidebar drawer. */
    onMenuToggle: () => void;

    /**
     * Optional brand label rendered next to the hamburger. Pass an empty
     * string or `null` to suppress entirely. Defaults to "Alexandria".
     *
     * For more control (logo image, two-tone wordmark, etc.) pass `brandSlot`
     * instead.
     */
    brand?: string | null;

    /** Custom brand slot. Overrides `brand` when supplied. */
    brandSlot?: ReactNode;

    /**
     * Optional search-trigger handler. When supplied, a search button
     * appears between `extraActions` and the user dropdown. Defaults to
     * dispatching the global `alexandria-core:command-palette-toggle`
     * event so palette hosts wired through `useCmdK` open without needing
     * to share state.
     */
    onSearchToggle?: () => void;

    /** Hides the search button outright. Takes priority over `onSearchToggle`. */
    showSearch?: boolean;

    /**
     * Notes drawer toggle. When supplied, a Notes button appears between
     * the search button and `extraActions`. Consumer wires this to its
     * Notes drawer state (typically AppLayout-managed). When omitted, the
     * Notes button is suppressed.
     */
    onNotesToggle?: () => void;

    /**
     * Slot for app-specific actions rendered between the search button and
     * the user dropdown — e.g. a notes-drawer toggle, a notifications bell.
     */
    extraActions?: ReactNode;

    /**
     * Items rendered in the user dropdown menu. When omitted, a default set
     * is used: Profile, Settings, Theme picker, Logout. Pass an empty array
     * to render nothing but the theme picker.
     *
     * The dropdown ALWAYS renders the embedded `<ThemePicker />` between the
     * `userMenuItems` block and the optional `userMenuFooter` slot.
     */
    userMenuItems?: UserMenuItem[];

    /**
     * Optional footer slot rendered below the theme picker (e.g. Support
     * link, API status indicator).
     */
    userMenuFooter?: ReactNode;

    /** Custom guest-mode (logged-out) action area. Defaults to Login + Register
     *  buttons pointing at /login and /register. */
    guestActions?: ReactNode;
}

/**
 * Top navigation bar with scroll-shadow chrome, hamburger toggle, search
 * button, embedded `ThemePicker`, user dropdown and guest actions.
 *
 * The chrome is core; the menu items, search behaviour, and any extra
 * action buttons are consumer-supplied via slots/props. The component
 * still pulls `auth` from Inertia's shared props so it can render the
 * user avatar without further wiring.
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

export default function Navbar({
    onMenuToggle,
    brand = "Alexandria",
    brandSlot,
    onSearchToggle,
    showSearch = true,
    onNotesToggle,
    extraActions,
    userMenuItems,
    userMenuFooter,
    guestActions,
}: NavbarProps) {
    // Default dropdown structure renders in three groups so the
    // ThemePicker (Appearance) lands between the "head" items
    // (Profile / Settings / Keyboard shortcuts) and the "tail" items
    // (Support / API / Log out). When a consumer supplies their own
    // userMenuItems we render those as a single block followed by
    // Appearance — there's no head/tail boundary we can infer.
    const useCustomMenu = userMenuItems !== undefined;
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user ?? null;

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
    const [scrolled, setScrolled] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);

        window.addEventListener("scroll", handleScroll);

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }

        if (dropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownOpen]);

    function handleSearchClick() {
        if (onSearchToggle) {
            onSearchToggle();
            return;
        }
        window.dispatchEvent(
            new CustomEvent("alexandria-core:command-palette-toggle"),
        );
    }

    return (
        <nav
            ref={(el) => {
                if (el) {
                    document.documentElement.style.setProperty(
                        "--navbar-height",
                        `${el.offsetHeight}px`,
                    );
                }
            }}
            className="fixed top-0 z-40 w-full px-2 py-0 backdrop-blur-lg transition-all duration-300 overflow-visible"
            style={{
                // Hard-cap at legacy's 72px height. Sizing the user
                // avatar bigger than 48px would otherwise stretch the
                // navbar; with the cap, the avatar can overflow below
                // for the "hanging seal" effect while chrome stays put.
                //
                // `border-b` is intentionally NOT used — border-box
                // sizing eats 1px from the content area, throwing off
                // items-center's symmetry. The bottom hairline when
                // scrolled is layered via inset box-shadow instead.
                height: "72px",
                // DaisyUI's `.navbar` class ships `min-height: 4rem`
                // (or higher in some configs). When that min-height
                // exceeds our `height: 72px`, CSS takes the larger of
                // the two — the nav renders ~80px tall while the user
                // trigger button stays 72px, leaving an 8px strip of
                // navbar bg below the button's hover highlight. Pin
                // min-height inline (highest specificity) so the nav
                // is exactly 72px and the hover fills edge-to-edge.
                minHeight: "72px",
                maxHeight: "72px",
                paddingTop: 0,
                paddingBottom: 0,
                // base-chrome is the elevated-chrome surface (preset- and
                // mode-aware). Translucency lets the page bg show through
                // for the frosted-glass feel; scrolled state firms up.
                background: scrolled
                    ? "color-mix(in srgb, var(--theme-base-chrome) 70%, transparent)"
                    : "color-mix(in srgb, var(--theme-base-chrome) 30%, transparent)",
                boxShadow: scrolled
                    ? "0 8px 16px rgba(0, 0, 0, 0.18), inset 0 -1px 0 var(--theme-base-400)"
                    : "none",
            }}
        >
            <div className="container mx-auto flex max-w-7xl items-center justify-between px-2">
                <div className="flex flex-1 items-center">
                    {/* Hamburger Menu Button */}
                    <button
                        onClick={onMenuToggle}
                        className="alex-nav-icon-btn alex-nav-icon-btn--ghost mr-2 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                        style={{
                            background: "transparent",
                            color: "var(--theme-base-content)",
                        }}
                        aria-label="Open sidebar"
                    >
                        <i className="fas fa-bars text-xl" />
                    </button>

                    {/* Brand — sits beside the hamburger at every
                        breakpoint. Defaults to the LogoLockup; consumers
                        passing brandSlot can override entirely, and a
                        custom brand string flows through as the wordmark
                        text inside the default lockup. An Inertia Link
                        (not a plain anchor) so the SPA visit keeps the
                        navbar mounted — the lockup's click-jump animation
                        plays through instead of dying to a full reload. */}
                    <Link
                        href="/"
                        className="ml-4 flex items-center"
                        style={{ color: "var(--theme-base-content)" }}
                    >
                        {brandSlot ?? (
                            brand ? (
                                <LogoLockup
                                    size="md"
                                    wordmarkText={brand}
                                    interactive
                                    // Generic hook — consumers listen for prize
                                    // rolls, analytics, whatever. Core attaches
                                    // no behavior beyond the 8f jump animation.
                                    onMarkClick={() =>
                                        window.dispatchEvent(
                                            new CustomEvent("alexandria-core:logo-mark-click"),
                                        )
                                    }
                                />
                            ) : null
                        )}
                    </Link>
                </div>

                {/* Spacer — keeps left/right groups at 33% each so the
                    absolutely-positioned mobile brand above sits in
                    front of empty middle space. Desktop's brand lives
                    in the left group beside the hamburger. */}
                <div className="flex-1" />

                {/* Right Side */}
                <div className="flex flex-1 items-center justify-end gap-3">
                    {user ? (
                        <>
                            {/* Search Button — hidden on mobile because
                                the bottom-nav surfaces a Search tab in
                                its place (same dispatch behavior). */}
                            {showSearch && (
                                <Tooltip
                                    content={`Search (${typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("mac") ? "⌘" : "Ctrl+"}K)`}
                                    placement="bottom"
                                >
                                    <button
                                        onClick={handleSearchClick}
                                        className="alex-nav-icon-btn alex-nav-icon-btn--brand hidden h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors sm:flex"
                                        style={{
                                            background:
                                                "color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)",
                                            color: "var(--theme-brand-primary-content)",
                                        }}
                                        aria-label="Search (⌘K)"
                                    >
                                        <i className="fa-light fa-magnifying-glass" />
                                    </button>
                                </Tooltip>
                            )}

                            {/* Notes Button — mirrors legacy's
                                color="secondary" on the notable button,
                                which maps to --theme-brand-secondary-*
                                in the new system. Same 60%-fill + content-
                                text shape as the Search button (which
                                uses brand-primary) so the two read as
                                a matched pair. */}
                            {onNotesToggle && (
                                <Tooltip content="Notes" placement="bottom">
                                    <button
                                        onClick={onNotesToggle}
                                        className="alex-nav-icon-btn alex-nav-icon-btn--brand-secondary flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                                        style={{
                                            background:
                                                "color-mix(in srgb, var(--theme-brand-secondary-500) 60%, transparent)",
                                            color: "var(--theme-brand-secondary-content)",
                                        }}
                                        aria-label="Notes"
                                    >
                                        {/* Same custom SVG as legacy's
                                            x-notable.button + the NotesDrawer
                                            "Add Note" trigger — folded-corner
                                            page with three bullet dots. */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 640 640"
                                            className="h-5 w-5 fill-current"
                                            aria-hidden="true"
                                        >
                                            <path d="M160 512L352 512L352 416C352 380.7 380.7 352 416 352L512 352L512 160C512 142.3 497.7 128 480 128L160 128C142.3 128 128 142.3 128 160L128 480C128 497.7 142.3 512 160 512zM384 498.7L498.7 384L416 384C398.3 384 384 398.3 384 416L384 498.7zM160 544C124.7 544 96 515.3 96 480L96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 357.5C544 374.5 537.3 390.8 525.3 402.8L402.7 525.3C390.7 537.3 374.4 544 357.4 544L160 544zM184 432C184 418.7 194.7 408 208 408C221.3 408 232 418.7 232 432C232 445.3 221.3 456 208 456C194.7 456 184 445.3 184 432zM208 232C194.7 232 184 221.3 184 208C184 194.7 194.7 184 208 184C221.3 184 232 194.7 232 208C232 221.3 221.3 232 208 232zM184 320C184 306.7 194.7 296 208 296C221.3 296 232 306.7 232 320C232 333.3 221.3 344 208 344C194.7 344 184 333.3 184 320z" />
                                        </svg>
                                    </button>
                                </Tooltip>
                            )}

                            {extraActions}

                            {/* User Button + Dropdown
                                Wrapper is pinned to 72px (= navbar height) so
                                the button beneath can fill 100% and its hover
                                BG covers the navbar edge-to-edge. Going via an
                                explicit wrapper height (rather than putting
                                72px on the button directly) bypasses a quirk
                                where the avatar's 80px overflow content can
                                push the button's effective rendered height
                                past 72px even with `height: 72px` set, leaving
                                an ~8px strip of bare navbar bg below the
                                hover highlight. */}
                            <div
                                className="relative min-w-0"
                                ref={dropdownRef}
                                style={{ height: "72px", display: "flex" }}
                            >
                                <button
                                    onClick={() =>
                                        setDropdownOpen(!dropdownOpen)
                                    }
                                    className="alex-user-trigger inline-flex min-w-0 max-w-full items-center gap-3 px-3 text-base font-medium transition-all duration-300 focus:outline-none"
                                    style={{
                                        color: "var(--theme-base-content)",
                                        // Hover highlight runs edge-to-edge in
                                        // the navbar — no rounded corners — so
                                        // the affordance reads as a full nav
                                        // column rather than a contained
                                        // button.
                                        borderRadius: 0,
                                        // Fill the wrapper exactly (which is
                                        // hard-pinned at 72px above). Going
                                        // through the wrapper means we ignore
                                        // any auto-sizing the button might do
                                        // based on its 80px avatar content.
                                        height: "100%",
                                        // Nudge the content (avatar + text)
                                        // down a few px from items-center's
                                        // pure mathematical center — visually
                                        // the chrome reads better with a
                                        // slight bias toward the bottom.
                                        paddingTop: "0.25rem",
                                    }}
                                >
                                    {/* Avatar overflows below the navbar's
                                        bottom edge for a "hanging seal" feel
                                        at the top of the page; once the user
                                        scrolls, it shrinks to fit inside the
                                        navbar (scale ≈ 0.667 → effective 48px,
                                        the original within-navbar size) and
                                        re-centers (translateY(0)). Both
                                        transforms interpolate smoothly with a
                                        single transition. */}
                                    {/* Outer wrapper owns the LAYOUT box —
                                        width transitions from 80 (unscrolled,
                                        full ring outerSize) to 60 (scrolled).
                                        Layout reflows: button gets narrower,
                                        right-side flex group shrinks under
                                        justify-end, Search/Notes icons shift
                                        right to maintain their right-anchored
                                        positioning. Inner wrapper owns the
                                        VISUAL transform — scales the actual
                                        avatar render to fit the new box.
                                        Origin top-left so the scaled content
                                        fills the outer wrapper exactly
                                        (visual top-left stays at outer
                                        top-left); translateY(0.625rem) when
                                        unscrolled handles the hanging-seal
                                        overflow below the navbar. */}
                                    <span
                                        className="shrink-0"
                                        style={{
                                            // Flex items default to
                                            // min-width/min-height: auto, which
                                            // resolves to min-content size
                                            // when overflow is visible. Our
                                            // content is AvatarWithRing's 80×80
                                            // outer (with explicit
                                            // minWidth/minHeight set on it),
                                            // so this flex item silently
                                            // floors at 80×80 and ignores the
                                            // declared `width: 60` we want
                                            // when scrolled. Forcing min-* to
                                            // 0 lets the explicit sizes
                                            // actually take effect.
                                            display: "inline-block",
                                            minWidth: 0,
                                            minHeight: 0,
                                            width: scrolled ? "60px" : "80px",
                                            height: scrolled ? "60px" : "80px",
                                            transition:
                                                "width var(--theme-motion-duration-interactive, 300ms) var(--theme-motion-easing-standard, ease), height var(--theme-motion-duration-interactive, 300ms) var(--theme-motion-easing-standard, ease)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "inline-block",
                                                transform: scrolled
                                                    ? "translateY(-0.125rem) scale(0.75)"
                                                    : "translateY(0.625rem) scale(1)",
                                                transformOrigin: "0 0",
                                                transition:
                                                    "transform var(--theme-motion-duration-interactive, 300ms) var(--theme-motion-easing-standard, ease)",
                                            }}
                                        >
                                            <AvatarWithRing
                                                src={
                                                    user.has_avatar &&
                                                    user.avatar_thumb_url
                                                        ? user.avatar_thumb_url
                                                        : null
                                                }
                                                alt={user.name ?? "User"}
                                                initials={(
                                                    user.display_name ??
                                                    user.name ??
                                                    "U"
                                                )
                                                    .charAt(0)
                                                    .toUpperCase()}
                                                size={72}
                                                ring={
                                                    user.avatar_ring_slug ??
                                                    "none"
                                                }
                                                ringSettings={
                                                    user.avatar_ring_settings as never
                                                }
                                                ringThickness={4}
                                            />
                                        </span>
                                    </span>
                                    {/* Text + chevron drop HALF the avatar's
                                        translateY (0.3125rem vs the avatar's
                                        0.625rem) when unscrolled. The full
                                        offset reads as too low relative to
                                        the navbar; zero offset reads as too
                                        high relative to the dropped avatar.
                                        Half-drop sits visually between the
                                        navbar's center and the avatar's
                                        hanging position. */}
                                    {/* Text + chevron hidden on mobile —
                                        avatar alone is enough affordance for
                                        the user trigger on small viewports
                                        and saves horizontal space for the
                                        action buttons to the left. */}
                                    <span
                                        className="hidden min-w-0 flex-col items-start leading-none sm:flex"
                                        style={{
                                            transform: scrolled
                                                ? "translateY(0)"
                                                : "translateY(0.125rem)",
                                            transition:
                                                "transform var(--theme-motion-duration-interactive, 300ms) var(--theme-motion-easing-standard, ease)",
                                        }}
                                    >
                                        <span className="truncate max-w-[180px]">
                                            {user.display_name ??
                                                user.name ??
                                                "User"}
                                        </span>
                                        {user.display_name && user.name && (
                                            <span
                                                className="truncate max-w-[180px] text-sm"
                                                style={{
                                                    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
                                                }}
                                            >
                                                @{user.name}
                                            </span>
                                        )}
                                    </span>
                                    <svg
                                        className="hidden h-5 w-5 flex-shrink-0 sm:block"
                                        style={{
                                            color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
                                            transform: scrolled
                                                ? "translateY(0)"
                                                : "translateY(0.125rem)",
                                            transition:
                                                "transform var(--theme-motion-duration-interactive, 300ms) var(--theme-motion-easing-standard, ease)",
                                        }}
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="1.5"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                                        />
                                    </svg>
                                </button>

                                {/* Dropdown Menu — offset varies by scroll
                                    state because the avatar hangs ~14px below
                                    the navbar when unscrolled (translateY +
                                    80px outer in a 72px button) and only the
                                    larger gap clears the ring's visual bottom.
                                    When scrolled, the avatar shrinks + sits
                                    inside the navbar, so the menu can hug
                                    the navbar's bottom edge. */}
                                {dropdownOpen && (
                                    <div
                                        className="absolute right-0 top-full z-50 w-56"
                                        style={{
                                            marginTop: scrolled
                                                ? "0.5rem"
                                                : "1.25rem",
                                        }}
                                    >
                                        <div
                                            className="alex-user-menu mt-1 rounded-md p-1 shadow-md"
                                            style={{
                                                background:
                                                    "var(--theme-base-surface)",
                                                color: "var(--theme-base-content)",
                                                border: "1px solid var(--theme-base-400)",
                                            }}
                                        >
                                            <ThemePicker />

                                            <MenuDivider />

                                            {useCustomMenu ? (
                                                userMenuItems!.map(
                                                    renderMenuItem,
                                                )
                                            ) : (
                                                <>
                                                    {defaultHeadItems.map(
                                                        renderMenuItem,
                                                    )}
                                                    {DEFAULT_USER_MENU_FOOTER_ITEMS.map(
                                                        renderMenuItem,
                                                    )}
                                                </>
                                            )}

                                            {userMenuFooter && (
                                                <>
                                                    <MenuDivider />
                                                    {userMenuFooter}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        (guestActions ?? <DefaultGuestActions />)
                    )}
                </div>
            </div>
        </nav>
    );
}

const guestCtaBaseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "9999px",
    textDecoration: "none",
    transition: "background var(--theme-motion-duration-fast, 150ms) ease",
};

const guestCtaRegisterStyle: CSSProperties = {
    ...guestCtaBaseStyle,
    background: "var(--theme-base-300)",
    color: "var(--theme-base-content)",
    marginRight: "0.5rem",
};

const guestCtaLoginStyle: CSSProperties = {
    ...guestCtaBaseStyle,
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
};

function DefaultGuestActions() {
    return (
        <div
            className="inline-flex items-center"
            role="group"
            aria-label="Button group"
        >
            <a
                href="/register"
                className="alex-guest-cta-register hidden md:inline-flex"
                style={guestCtaRegisterStyle}
            >
                <i className="fas fa-user-plus" />
                Register
            </a>
            <a
                href="/login"
                className="alex-guest-cta-login"
                style={guestCtaLoginStyle}
            >
                <i className="fas fa-user" />
                <span>Login</span>
            </a>
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
