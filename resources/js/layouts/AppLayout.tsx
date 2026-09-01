import { Head, router, usePage } from "@inertiajs/react";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import Navbar from "../components/navigation/Navbar";
import Sidebar from "../components/navigation/Sidebar";
import BottomNav from "../components/navigation/BottomNav";
import CommandPalette from "../components/search/CommandPalette";
import NotesDrawer, { openNotesDrawer } from "../components/notes/NotesDrawer";
import type { NotesContext } from "../components/notes/NotesDrawer";
import { aiBase, notesUrl, pagesBase, writingUrl } from "../lib/urls";
import { ToastProvider } from "../components/ui/ToastProvider";
import Fab from "../components/ui/Fab";
import Modal from "../components/ui/Modal";
import SettingsDrawer from "../pages/Settings/SettingsDrawer";
import {
    preloadSettings,
    getSettingsSlots,
} from "../pages/Settings/settingsCache";
import { ALL_NAV, resolveNav } from "../pages/Settings/nav-config";
import { globalSearch } from "../pages/Settings/paletteSearch";
import useT from "../hooks/useT";
import type { BottomNavTab, UserMenuItem } from "../types/navigation";
import type { SharedProps } from "../types/index";

/** Event the bottom-nav Settings tab dispatches to open the drawer.
 *  Any caller can `window.dispatchEvent(new CustomEvent(...))` to open
 *  it from outside the React tree. */
export const SETTINGS_DRAWER_TOGGLE_EVENT =
    "alexandria-core:settings-drawer-toggle";

export interface SettingsDrawerToggleDetail {
    /** Optional section deep link. Omit to open the drawer's root list. */
    section?: string;
}

/** Toggles the slide-in Sidebar from outside the React tree — the
 *  same drawer the navbar hamburger opens. Navbar-less surfaces (the
 *  writing workspace's merged ribbon header) dispatch this from their
 *  own trigger (the logo mark) so the sidebar stays reachable. */
export const SIDEBAR_TOGGLE_EVENT = "alexandria-core:sidebar-toggle";

/** Fired after the drawer's slide-down animation completes. The
 *  /settings page listens for this to `router.back()` when the user
 *  closes the drawer (so they don't land on an empty /settings shell). */
export const SETTINGS_DRAWER_CLOSED_EVENT =
    "alexandria-core:settings-drawer-closed";

/**
 * One action surfaced by the global add-new FAB. The FAB is
 * project-scoped: it only renders when there's a `currentProject` in
 * shared props, and the actions implicitly target that project
 * (matching the sidebar's scope). Override the default set per-page
 * via the `fabActions` prop.
 */
interface FabAction {
    label: string;
    description: string;
    icon: string;
    onClick: () => void;
}

/**
 * Default mobile bottom-nav tab set. Five-slot layout: Dashboard +
 * Search + Notes + Profile + Settings. Profile lands on `/profile`
 * (identity-themed); Settings lands on `/settings` (clinical). Both
 * routes resolve to the same `<SettingsBody>` for now — visual
 * specialisation between them lands in a later step.
 *
 * Notes is preferred as an inline drawer toggle (same behaviour as the
 * top-nav Notes button) — pass `onNotesClick` and the slot becomes an
 * action that opens the drawer scoped to the current page context
 * (entry / blueprint / project). Without `onNotesClick` (no current
 * project, or routes where the drawer would be redundant) the slot
 * falls back to the URL link.
 *
 * Search is an action-only tab (href: '#') that dispatches the same
 * `alexandria-core:command-palette-toggle` event as the navbar's
 * search button. On mobile the navbar drops its search button (no
 * room next to the avatar), so this slot becomes the only entry
 * point to the palette. A Projects tab used to live here but it
 * pointed at /dashboard — same destination as the Dashboard slot
 * next to it, so the slot was redundant.
 */
function buildDefaultBottomNavTabs(
    currentProjectSlug: string | undefined,
    onNotesClick?: () => void,
): BottomNavTab[] {
    const notesHref = currentProjectSlug
        ? notesUrl(currentProjectSlug)
        : "/dashboard";

    // The bottom tab NAVIGATES to the notes dashboard (owner ruling,
    // 2026-08-26) — the drawer stays the navbar Notes button's job.
    // onNotesClick is deliberately unused here now; kept in the signature
    // for the callers that still pass it.
    void onNotesClick;

    const notesTab: BottomNavTab = {
        id: "notes",
        label: "Notes",
        href: notesHref,
        icon: "fa-solid fa-note-sticky",
    };

    // Order (owner, 2026-08-26): Notes leads — capture is the phone's
    // primary job — Search anchors the middle, Settings closes.
    return [
        notesTab,
        {
            id: "dashboard",
            label: "Dashboard",
            href: "/dashboard",
            icon: "fa-solid fa-house",
        },
        {
            id: "search",
            label: "Search",
            href: "#",
            icon: "fa-solid fa-magnifying-glass",
            onClick: (event) => {
                event.preventDefault();
                window.dispatchEvent(
                    new CustomEvent("alexandria-core:command-palette-toggle"),
                );
            },
        },
        {
            id: "writing",
            label: "Writing",
            href: "/writing",
            icon: "fa-solid fa-feather",
        },
        // No Profile slot (owner ruling, phone walkthrough 2026-08-26):
        // the navbar avatar already reaches it, and five tabs breathe —
        // six pushed the end slots into the screen's curved corners.
        {
            // Settings on mobile is a drawer, not a route — dispatching
            // the toggle event opens the globally-mounted SettingsDrawer
            // over whatever page the user is on. Avoids the /settings
            // page-load latency on every tap; underlying page state
            // (scroll, open modals, draft notes) survives.
            id: "settings",
            label: "Settings",
            href: "#",
            icon: "fa-solid fa-gear",
            onClick: (event) => {
                event.preventDefault();
                window.dispatchEvent(
                    new CustomEvent(SETTINGS_DRAWER_TOGGLE_EVENT),
                );
            },
        },
    ];
}

// The default FAB action set is built INSIDE the component (see
// resolvedFabActions): the handlers need the live page context —
// buildNotesContext() for the drawer scope, currentProject for the
// navigation targets — which a module-level const could never reach.
// That reach problem is why these shipped as silent TODOs from Stage 7
// until the first phone walkthrough found the dead menu (2026-08-26).

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
     *  to "/settings". Pass `null` to hide the footer. */
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

    /** Notes-toggle handler for the navbar's notes button. When omitted
     *  AND a `currentProject` is in shared props, AppLayout auto-wires
     *  the button to its built-in NotesDrawer state. Pass an explicit
     *  function to override, or `null` to suppress the button entirely
     *  even on project pages. */
    onNotesToggle?: (() => void) | null;

    // ────────────────────────────────────────────────────────────────────
    // Bottom-nav slots
    // ────────────────────────────────────────────────────────────────────

    /** Override the default 5-tab bottom nav (Dashboard / Projects /
     *  Notes / Profile / Settings). Pass an array to replace the
     *  defaults, or `null` to hide the bottom nav entirely. The
     *  default set only renders when there's an authenticated user —
     *  anonymous pages (auth, dev sandbox unless logged in) never see
     *  it. */
    bottomNavTabs?: BottomNavTab[] | null;

    // ────────────────────────────────────────────────────────────────────
    // Floating action button
    // ────────────────────────────────────────────────────────────────────

    /** Override the default add-new FAB actions (4 stub cards: New
     *  note / Free writing / New entry / New project). Pass `null` to
     *  hide the FAB entirely. The FAB only renders when there's an
     *  authenticated user — anonymous pages (auth, dev sandbox unless
     *  logged in) never see it. */
    fabActions?: FabAction[] | null;

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
    sidebarBrand = "Alexandria",
    sidebarUserLink = "/settings",

    navbarBrand = "Alexandria",
    navbarBrandSlot,
    userMenuItems,
    userMenuFooter,
    extraNavbarActions,
    navbarGuestActions,
    onSearchToggle,
    onNotesToggle,

    bottomNavTabs,

    fabActions,

    extras,
}: AppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [addNewOpen, setAddNewOpen] = useState(false);
    const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
    const [settingsDrawerInitialSection, setSettingsDrawerInitialSection] =
        useState<string | null>(null);
    const pageProps = usePage<SharedProps>().props;
    const { currentProject, auth } = pageProps;
    const user = auth?.user ?? null;
    const url = usePage().url;
    const t = useT();

    // Persist the most recently seen `currentProject` so routes that
    // don't carry a project context (the /dashboard landing, /profile,
    // /settings) can still resolve a "default to the active notes"
    // target for the bottom-nav Notes button. localStorage keeps it
    // alive across sessions so a returning user on /dashboard still
    // gets a sensible drawer scope.
    const LAST_PROJECT_KEY = "alexandria:last-project";
    useEffect(() => {
        if (!currentProject) return;
        try {
            localStorage.setItem(
                LAST_PROJECT_KEY,
                JSON.stringify({
                    id: currentProject.id,
                    slug: currentProject.slug,
                    name: currentProject.name,
                }),
            );
        } catch {
            // localStorage disabled / quota — silently skip.
        }
    }, [currentProject?.id, currentProject?.slug, currentProject?.name]);

    function loadLastProject(): {
        id: number;
        slug: string;
        name: string;
    } | null {
        try {
            const raw = localStorage.getItem(LAST_PROJECT_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (
                typeof parsed?.id === "number" &&
                typeof parsed?.slug === "string" &&
                typeof parsed?.name === "string"
            ) {
                return parsed;
            }
        } catch {
            // ignore
        }
        return null;
    }

    // Resolve which actions the FAB modal renders. Consumer override
    // wins; otherwise fall back to the three-stub default. `null`
    // suppresses the FAB entirely. The FAB is project-scoped — it only
    // renders when there's a `currentProject` in shared props, so the
    // actions inside the modal always have an implicit project target
    // (matching the sidebar's scope). On routes without a project
    // (dashboard, settings, profile, etc.) the FAB stays hidden.
    // Default actions target the live context: New note opens the drawer
    // scoped exactly like the notes toggle; the other two navigate into
    // the current project's real surfaces. buildNotesContext is declared
    // below — function declarations hoist, and these closures only run
    // on click, long after mount.
    const defaultFabActions: FabAction[] = [
        {
            label: "New note",
            description: "Capture an idea — the AI will sort it later.",
            icon: "fa-solid fa-note-sticky",
            onClick: () => {
                const ctx = buildNotesContext();
                if (ctx) openNotesDrawer(ctx);
            },
        },
        {
            label: "Free writing",
            description: "Open a blank page and write without structure.",
            icon: "fa-solid fa-pen-nib",
            onClick: () => {
                if (currentProject)
                    router.visit(writingUrl(currentProject.slug));
            },
        },
        {
            label: "New entry",
            description: "Create a character, location, event, or anything.",
            icon: "fa-solid fa-circle-plus",
            onClick: () => {
                // blueprints.create — the blueprint picker that leads into
                // entry creation for the picked type.
                if (currentProject)
                    router.visit(`${pagesBase(currentProject.slug)}/create`);
            },
        },
    ];

    const resolvedFabActions: FabAction[] | null =
        fabActions === null ? null : (fabActions ?? defaultFabActions);
    const showFab = !!user && resolvedFabActions !== null && !!currentProject;

    // Inertia ships the page's bound blueprint/entry as shared props on
    // the show routes so the drawer can scope its notes list to that
    // notable. Without these, /p/{project}/{blueprint} pages would still
    // see all project notes — exact bug we hit before this lift.
    const pageBlueprint = (pageProps as Record<string, unknown>).blueprint as
        { id: number; name: string; slug: string } | undefined;
    const pageEntry = (pageProps as Record<string, unknown>).entry as
        { id: number; name: string; slug: string } | undefined;

    function buildNotesContext(
        extra: Partial<NotesContext> = {},
    ): NotesContext | null {
        if (!currentProject) return null;
        const base = {
            projectId: currentProject.id,
            projectSlug: currentProject.slug,
            ...extra,
        };
        if (pageEntry?.id) {
            return {
                ...base,
                contextType: "entry",
                contextId: pageEntry.id,
                contextLabel: pageEntry.name,
                contextSlug: pageEntry.slug,
            } as NotesContext;
        }
        if (pageBlueprint?.id) {
            return {
                ...base,
                contextType: "blueprint",
                contextId: pageBlueprint.id,
                contextLabel: pageBlueprint.name,
                contextSlug: pageBlueprint.slug,
            } as NotesContext;
        }
        return {
            ...base,
            contextType: "project",
            contextId: currentProject.id,
            contextLabel: currentProject.name,
            contextSlug: currentProject.slug,
        } as NotesContext;
    }

    // Every project surface now lives under the project umbrella, so
    // the dedicated Notes and AI pages can no longer be told apart by
    // a top-level prefix — compare against the built surface roots for
    // the current project instead.
    const notesRoot = currentProject ? notesUrl(currentProject.slug) : null;
    const aiRoot = currentProject ? aiBase(currentProject.slug) : null;
    const isNotesOrAiPage =
        (notesRoot !== null && url.startsWith(notesRoot)) ||
        (aiRoot !== null && url.startsWith(aiRoot));

    // Auto-wire the navbar's Notes button only on project-scoped routes
    // (/p/{slug}/...). On the dedicated Notes or AI surfaces, the
    // drawer would be redundant — the page itself IS the notes / AI
    // experience — so suppress the navbar toggle there. Default handler
    // dispatches the global `alexandria:open-notes` event that
    // NotesDrawer listens for — drawer state lives entirely inside the
    // drawer, so the layout only has to fire the open signal with the
    // current project context. Consumer can override with an explicit
    // function, or pass null to suppress the button entirely.
    const isProjectScope = url.startsWith("/p/") && !isNotesOrAiPage;
    const resolvedNotesToggle =
        onNotesToggle === null
            ? undefined
            : (onNotesToggle ??
              (currentProject && isProjectScope
                  ? () => {
                        const ctx = buildNotesContext();
                        if (ctx) openNotesDrawer(ctx);
                    }
                  : undefined));

    // Auto-open the notes drawer when arriving via Sorting History.
    // The chip stashes the note id in sessionStorage before navigating;
    // we drain it once the destination page has its blueprint/entry
    // shared props in hand so the drawer scopes to the right notable
    // and pre-selects the note row.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = sessionStorage.getItem("alexandria:open_note");
        if (!stored || !currentProject?.id) return;
        sessionStorage.removeItem("alexandria:open_note");
        const noteId = parseInt(stored, 10);
        if (Number.isNaN(noteId)) return;
        const t = setTimeout(() => {
            const ctx = buildNotesContext({
                preSelectNoteId: noteId,
                skipAnimation: true,
            });
            if (ctx) openNotesDrawer(ctx);
        }, 100);
        return () => clearTimeout(t);
    }, [currentProject?.id, pageBlueprint?.id, pageEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSidebarOpen(false);
            }
        };
        // Functional update — the listener binds once, so reading
        // `sidebarOpen` directly would close over the initial value.
        const toggleSidebar = () => setSidebarOpen((open) => !open);

        document.addEventListener("keydown", handleEscape);
        window.addEventListener(SIDEBAR_TOGGLE_EVENT, toggleSidebar);

        return () => {
            document.removeEventListener("keydown", handleEscape);
            window.removeEventListener(SIDEBAR_TOGGLE_EVENT, toggleSidebar);
        };
    }, []);

    // Listen for the global command-palette-toggle event so the navbar
    // search button (which dispatches it) opens the palette regardless
    // of where it lives in the tree. Cmd+K binding is also handled here
    // for the same reason.
    useEffect(() => {
        const open = () => setPaletteOpen(true);
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setPaletteOpen(true);
            }
        };

        window.addEventListener("alexandria-core:command-palette-toggle", open);
        window.addEventListener("keydown", handleKey);

        return () => {
            window.removeEventListener(
                "alexandria-core:command-palette-toggle",
                open,
            );
            window.removeEventListener("keydown", handleKey);
        };
    }, []);

    // Settings drawer wiring. Bottom-nav Settings tap dispatches the
    // toggle event; any other caller (e.g., a "Quick Settings" button
    // we might add later) can do the same. Preload the payload in idle
    // time once the user is authed so the drawer renders with cached
    // data the first time it opens — no perceptible "loading" state.
    useEffect(() => {
        function openDrawer(event: Event) {
            const detail = (event as CustomEvent<SettingsDrawerToggleDetail>)
                .detail;
            setSettingsDrawerInitialSection(detail?.section ?? null);
            setSettingsDrawerOpen(true);
        }
        window.addEventListener(SETTINGS_DRAWER_TOGGLE_EVENT, openDrawer);
        return () =>
            window.removeEventListener(
                SETTINGS_DRAWER_TOGGLE_EVENT,
                openDrawer,
            );
    }, []);

    useEffect(() => {
        if (!user) return;
        // `requestIdleCallback` lets the browser run the fetch when it
        // has spare cycles (after first paint, after any in-flight
        // navigations settle). Falls back to a short setTimeout in
        // browsers that don't expose it — Safari pre-17 mostly.
        type IdleRequest = (cb: () => void) => number;
        const idle =
            (window as unknown as { requestIdleCallback?: IdleRequest })
                .requestIdleCallback ??
            ((cb: () => void) => window.setTimeout(cb, 150));
        const handle = idle(() => {
            void preloadSettings().catch(() => {
                // Cache module already logs failures; nothing else to
                // do here — drawer retries on next open.
            });
        });
        return () => {
            type CancelIdle = (handle: number) => void;
            const cancel =
                (window as unknown as { cancelIdleCallback?: CancelIdle })
                    .cancelIdleCallback ?? window.clearTimeout;
            cancel(handle);
        };
    }, [user]);

    // Bottom-nav Notes handler — open the drawer scoped to the current
    // page context. We gate on the non-redundant routes only: on the
    // project's notes or AI surface the drawer would duplicate the page
    // itself (see `isNotesOrAiPage` above), so the Notes tab falls back
    // to its URL behaviour there. Anywhere else (entry / blueprint /
    // project Show, or /dashboard, /profile, /settings with no
    // currentProject), we open the drawer — using the persisted
    // last-viewed project as the "active notes" fallback when nothing
    // on the page provides one.
    const bottomNavNotesClick = !isNotesOrAiPage
        ? () => {
              // Priority 1: live context from the current page
              // (entry → blueprint → project).
              const live = buildNotesContext();
              if (live) {
                  openNotesDrawer(live);
                  return;
              }
              // Priority 2: last-viewed project from localStorage —
              // gives /dashboard etc. a meaningful "active notes" target.
              const last = loadLastProject();
              if (last) {
                  openNotesDrawer({
                      projectId: last.id,
                      projectSlug: last.slug,
                      contextType: "project",
                      contextId: last.id,
                      contextLabel: last.name,
                      contextSlug: last.slug,
                  });
              }
              // No project context at all (first-time user on
              // /dashboard) — silently no-op; the URL fallback in
              // buildDefaultBottomNavTabs takes the click instead.
          }
        : undefined;

    // Resolve which bottom-nav tabs render. Same precedence as the FAB:
    //   - explicit `null`     → suppress the bottom nav
    //   - explicit array      → use as-is
    //   - undefined + auth    → fall back to the default 5-slot set
    //   - undefined + anon    → suppress (no auth → no bottom nav)
    const resolvedBottomNavTabs: BottomNavTab[] | null =
        bottomNavTabs === null
            ? null
            : (bottomNavTabs ??
              (user
                  ? buildDefaultBottomNavTabs(
                        currentProject?.slug,
                        bottomNavNotesClick,
                    )
                  : null));
    const showBottomNav =
        !!resolvedBottomNavTabs && resolvedBottomNavTabs.length > 0;
    const showSearch = onSearchToggle !== null;
    const commandPaletteSearch = useMemo(
        () =>
            globalSearch(
                currentProject?.slug,
                resolveNav(
                    [...ALL_NAV, ...(getSettingsSlots().extraNav ?? [])],
                    t,
                ),
                t("settings.search.group"),
            ),
        [currentProject?.slug, t],
    );

    return (
        <ToastProvider>
            {title && <Head title={title} />}

            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                brand={sidebarBrand}
                // No `?? <Logo />` fallback here: an undefined slot lets
                // Sidebar render its own default (LogoLockup mark + brand
                // wordmark); a bare-mark fallback suppresses the wordmark.
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
                    onNotesToggle={resolvedNotesToggle}
                    extraActions={extraNavbarActions}
                    userMenuItems={userMenuItems}
                    userMenuFooter={userMenuFooter}
                    guestActions={navbarGuestActions}
                />
            )}

            <main
                data-theme-target="content"
                className={[
                    immersive ? "" : "pt-20",
                    // pb-[calc(5rem+env(safe-area-inset-bottom))] gives the
                    // bottom nav full clearance on iPhones with a home
                    // indicator (the nav's own min-height + safe-area
                    // padding can grow to ~98px there; a flat pb-20 leaves
                    // the last ~18px of content tucked under the nav).
                    // lg:pb-0 keeps desktop unchanged.
                    showBottomNav
                        ? "pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"
                        : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                {children}
            </main>

            {showBottomNav && <BottomNav tabs={resolvedBottomNavTabs!} />}

            {/* The navbar palette is account-global. Its local Settings
                index works on every authenticated route; when a current
                project exists, project results join the same grouped
                result set. */}
            {user && (
                <CommandPalette
                    open={paletteOpen}
                    onClose={() => setPaletteOpen(false)}
                    onSearch={commandPaletteSearch}
                />
            )}

            {/* NotesDrawer manages its own state through the global
                `alexandria:open-notes` event. Mount whenever a user is
                authed — the drawer returns null until openNotesDrawer()
                fires, so there's no rendering cost. We dropped the
                `currentProject && isProjectScope` gate so the bottom-nav
                Notes button can open the drawer from /dashboard /
                /profile / /settings using the persisted last-project
                fallback in bottomNavNotesClick. The /notes/{slug} and
                /ai/{slug} surfaces already suppress the toggle through
                isNotesOrAiPage, so they can't accidentally double-stack
                a drawer over themselves. */}
            {user && <NotesDrawer />}

            {/* Global mobile settings drawer. Mounted for every authed
                user; the inner component is `lg:hidden` so it's invisible
                on desktop where the navbar's Settings link still takes
                users to the /settings page with the two-column body.
                Data flows through the module-level cache in
                settingsCache.ts — preloaded in idle time above, fetched
                on first open otherwise. */}
            {user &&
                (() => {
                    const slots = getSettingsSlots();
                    return (
                        <SettingsDrawer
                            open={settingsDrawerOpen}
                            initialSection={settingsDrawerInitialSection}
                            onClose={() => {
                                setSettingsDrawerOpen(false);
                                setSettingsDrawerInitialSection(null);
                                window.dispatchEvent(
                                    new CustomEvent(
                                        SETTINGS_DRAWER_CLOSED_EVENT,
                                    ),
                                );
                            }}
                            accountManagementSlot={slots.accountManagementSlot}
                            applyViewPreferences={slots.applyViewPreferences}
                        />
                    );
                })()}

            {/* Global add-new FAB. Authenticated only (see `showFab`
                above). Opens a small modal with the resolved action
                cards; consumers override the default 4-card set via
                the `fabActions` prop or pass `null` to hide. */}
            {showFab && (
                <>
                    <Fab label="Add new" onClick={() => setAddNewOpen(true)} />
                    <Modal
                        open={addNewOpen}
                        onClose={() => setAddNewOpen(false)}
                        maxWidth="max-w-md"
                    >
                        {/* Header just surfaces the project scope — the
                            action labels below (New note / Free writing /
                            New entry) already read as "add" verbs, so a
                            standalone "Add new" title is redundant. */}
                        <div
                            className="flex items-center justify-between px-6 py-4"
                            style={{
                                borderBottom: "1px solid var(--theme-base-400)",
                            }}
                        >
                            <h3
                                className="flex items-center gap-2 text-base font-semibold"
                                style={{
                                    fontFamily:
                                        "var(--theme-typography-heading-family)",
                                }}
                            >
                                <span
                                    style={{
                                        color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
                                    }}
                                >
                                    Add to:
                                </span>
                                <span
                                    style={{
                                        color: "var(--theme-base-content)",
                                    }}
                                >
                                    {currentProject!.name}
                                </span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setAddNewOpen(false)}
                                aria-label="Close"
                                className="alex-modal-close inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                                style={{ color: "var(--theme-base-content)" }}
                            >
                                <i
                                    className="fa-solid fa-xmark"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                        <ul className="m-0 flex list-none flex-col p-0">
                            {resolvedFabActions!.map((action, idx) => (
                                <li key={action.label}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            action.onClick();
                                            setAddNewOpen(false);
                                        }}
                                        className="alex-add-new-card flex w-full items-start gap-3 px-6 py-4 text-left transition-colors"
                                        style={{
                                            color: "var(--theme-base-content)",
                                            borderBottom:
                                                idx ===
                                                resolvedFabActions!.length - 1
                                                    ? "none"
                                                    : "1px solid var(--theme-base-400)",
                                        }}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                            style={{
                                                background:
                                                    "var(--theme-brand-primary-highlight-bg)",
                                                color: "var(--theme-brand-primary-highlight-fg)",
                                            }}
                                        >
                                            <i className={action.icon} />
                                        </span>
                                        <span className="flex flex-col">
                                            <span className="text-sm font-semibold">
                                                {action.label}
                                            </span>
                                            <span
                                                className="text-xs"
                                                style={{
                                                    color: "color-mix(in srgb, var(--theme-base-content) 65%, transparent)",
                                                }}
                                            >
                                                {action.description}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Modal>
                </>
            )}

            {extras}
        </ToastProvider>
    );
}
