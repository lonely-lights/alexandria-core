import { Head } from '@inertiajs/react';
import { useState, useEffect, type ReactNode } from 'react';
import Navbar from '../components/navigation/Navbar';
import Sidebar from '../components/navigation/Sidebar';
import BottomNav from '../components/navigation/BottomNav';
import { ToastProvider } from '../components/ui/ToastProvider';
import { ThemeProvider } from '../hooks/useTheme';
import type { BottomNavTab, UserMenuItem } from '../types/navigation';

interface AppLayoutProps {
    /** The page content. */
    children: ReactNode;

    /** Optional `<title>`. */
    title?: string;

    /** Hide the top navbar entirely (e.g. for full-bleed marketing pages). */
    navbar?: boolean;

    /** Drop the default `pt-20` top padding on `<main>` (e.g. for hero
     *  layouts that want to bleed under the navbar). */
    immersive?: boolean;

    // ────────────────────────────────────────────────────────────────────
    // Sidebar slots
    // ────────────────────────────────────────────────────────────────────

    /** Body content rendered inside the slide-in sidebar. Typically the
     *  consumer app's project navigation, blueprint links, etc. */
    sidebarBody?: ReactNode;

    /** Optional logo slot for the sidebar header. */
    sidebarLogo?: ReactNode;

    /** Brand label next to the sidebar logo. Defaults to "Alexandria". */
    sidebarBrand?: string | null;

    /** Footer link target for the sidebar user-info row. Defaults
     *  to "/account". Pass `null` to hide the footer. */
    sidebarUserLink?: string | null;

    // ────────────────────────────────────────────────────────────────────
    // Navbar slots
    // ────────────────────────────────────────────────────────────────────

    /** Brand label rendered in the top navbar. Defaults to "Alexandria". */
    navbarBrand?: string | null;

    /** Brand slot rendered in the top navbar — overrides `navbarBrand`. */
    navbarBrandSlot?: ReactNode;

    /** Items rendered in the navbar's user-dropdown menu. */
    userMenuItems?: UserMenuItem[];

    /** Footer slot in the user dropdown (below the theme picker). */
    userMenuFooter?: ReactNode;

    /** Extra action buttons rendered in the navbar (e.g. notes-drawer
     *  toggle, notifications bell). */
    extraNavbarActions?: ReactNode;

    /** Custom guest-mode actions for the navbar (overrides default
     *  Login + Register buttons). */
    navbarGuestActions?: ReactNode;

    /** Search-toggle handler for the navbar's search button. When omitted,
     *  the button dispatches `alexandria-core:command-palette-toggle`. Pass
     *  `null` to hide the search button. */
    onSearchToggle?: (() => void) | null;

    // ────────────────────────────────────────────────────────────────────
    // Bottom-nav slots
    // ────────────────────────────────────────────────────────────────────

    /** Tabs for the mobile bottom nav. Pass an empty array (or omit) to
     *  suppress the bottom nav entirely. */
    bottomNavTabs?: BottomNavTab[];

    /** Optional "More" sheet on the bottom nav. */
    bottomNavMore?: {
        heading?: string;
        items: UserMenuItem[];
    } | null;

    /** Extra slot rendered above the bottom-nav More-menu items. */
    bottomNavMoreExtras?: ReactNode;

    // ────────────────────────────────────────────────────────────────────
    // Extras
    // ────────────────────────────────────────────────────────────────────

    /** Slot rendered after the `<main>` element — typical hosts: a
     *  CommandPalette, an app-specific notes drawer, page-transition
     *  overlay, etc. */
    extras?: ReactNode;
}

/**
 * Structural app shell: ThemeProvider + ToastProvider wrap, top Navbar,
 * slide-in Sidebar, `<main>` content area, mobile BottomNav, and an
 * `extras` slot for app-level overlays (CommandPalette, notes drawer,
 * page-transition splash, etc.).
 *
 * The shell is generic; everything domain-specific is consumer-supplied
 * via slots — sidebar body, bottom-nav tabs, user-menu items, extra
 * navbar actions. App-coupled behaviours from the legacy AppLayout (the
 * Notes-drawer auto-open via `alexandria:open_note` session storage,
 * the project/blueprint-aware notes toggle) are intentionally NOT lifted —
 * the consumer app reimplements those in its own wrapping layout if it
 * still needs them.
 */
export default function AppLayout({
    children,
    title,
    navbar = true,
    immersive = false,

    sidebarBody,
    sidebarLogo,
    sidebarBrand = 'Alexandria',
    sidebarUserLink = '/account',

    navbarBrand = 'Alexandria',
    navbarBrandSlot,
    userMenuItems,
    userMenuFooter,
    extraNavbarActions,
    navbarGuestActions,
    onSearchToggle,

    bottomNavTabs,
    bottomNavMore,
    bottomNavMoreExtras,

    extras,
}: AppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);

        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const showBottomNav = !!bottomNavTabs && bottomNavTabs.length > 0;
    const showSearch = onSearchToggle !== null;

    return (
        <ThemeProvider>
            <ToastProvider>
                {title && <Head title={title} />}

                <Sidebar
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    brand={sidebarBrand}
                    logoSlot={sidebarLogo}
                    body={sidebarBody}
                    userMenuLink={sidebarUserLink}
                />

                {navbar && (
                    <Navbar
                        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                        brand={navbarBrand}
                        brandSlot={navbarBrandSlot}
                        onSearchToggle={onSearchToggle ?? undefined}
                        showSearch={showSearch}
                        extraActions={extraNavbarActions}
                        userMenuItems={userMenuItems}
                        userMenuFooter={userMenuFooter}
                        guestActions={navbarGuestActions}
                    />
                )}

                <main className={immersive ? '' : 'pt-20'}>{children}</main>

                {showBottomNav && (
                    <BottomNav
                        tabs={bottomNavTabs}
                        moreMenu={bottomNavMore}
                        moreMenuExtras={bottomNavMoreExtras}
                    />
                )}

                {extras}
            </ToastProvider>
        </ThemeProvider>
    );
}
