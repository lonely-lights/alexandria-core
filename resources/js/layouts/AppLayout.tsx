import { Head, usePage } from '@inertiajs/react';
import { useState, useEffect, type ReactNode } from 'react';
import Navbar from '../components/navigation/Navbar';
import Sidebar from '../components/navigation/Sidebar';
import BottomNav from '../components/navigation/BottomNav';
import CommandPalette from '../components/search/CommandPalette';
import NotesDrawer, { openNotesDrawer } from '../components/notes/NotesDrawer';
import type { NotesContext } from '../components/notes/NotesDrawer';
import PageTransition from '../components/ui/PageTransition';
import { projectSearch } from '../lib/projectSearch';
import { ToastProvider } from '../components/ui/ToastProvider';
import Logo from '../components/ui/Logo';
import Fab from '../components/ui/Fab';
import Modal from '../components/ui/Modal';
import type { BottomNavTab, UserMenuItem } from '../types/navigation';
import type { SharedProps } from '../types/index';

/**
 * Default actions surfaced by the global add-new FAB. Stub onClick
 * handlers for now — Stage 7g+ wires real flows (notes / free writing /
 * entry creation) into these slots. The FAB is project-scoped: it only
 * renders when there's a `currentProject` in shared props, and the
 * actions implicitly target that project (matching the sidebar's
 * scope). Override the default set per-page via the `fabActions` prop.
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
        ? `/notes/${currentProjectSlug}`
        : '/dashboard';

    const notesTab: BottomNavTab = onNotesClick
        ? {
              id: 'notes',
              label: 'Notes',
              href: '#',
              icon: 'fa-solid fa-note-sticky',
              onClick: (event) => {
                  event.preventDefault();
                  onNotesClick();
              },
          }
        : {
              id: 'notes',
              label: 'Notes',
              href: notesHref,
              icon: 'fa-solid fa-note-sticky',
          };

    return [
        {
            id: 'dashboard',
            label: 'Dashboard',
            href: '/dashboard',
            icon: 'fa-solid fa-house',
        },
        {
            id: 'search',
            label: 'Search',
            href: '#',
            icon: 'fa-solid fa-magnifying-glass',
            onClick: (event) => {
                event.preventDefault();
                window.dispatchEvent(
                    new CustomEvent('alexandria-core:command-palette-toggle'),
                );
            },
        },
        notesTab,
        {
            id: 'profile',
            label: 'Profile',
            href: '/profile',
            icon: 'fa-solid fa-user',
        },
        {
            id: 'settings',
            label: 'Settings',
            href: '/settings',
            icon: 'fa-solid fa-gear',
        },
    ];
}

const DEFAULT_FAB_ACTIONS: FabAction[] = [
    {
        label: 'New note',
        description: 'Capture an idea — the AI will sort it later.',
        icon: 'fa-solid fa-note-sticky',
        onClick: () => {
            /* TODO: wire to NotesDrawer open with empty draft, scoped to currentProject */
        },
    },
    {
        label: 'Free writing',
        description: 'Open a blank page and write without structure.',
        icon: 'fa-solid fa-pen-nib',
        onClick: () => {
            /* TODO: wire to free-writing surface (Stage 7g), scoped to currentProject */
        },
    },
    {
        label: 'New entry',
        description: 'Create a character, location, event, or anything.',
        icon: 'fa-solid fa-circle-plus',
        onClick: () => {
            /* TODO: wire to blueprint picker → entry create within currentProject */
        },
    },
];

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
    sidebarBrand = 'Alexandria',
    sidebarUserLink = '/settings',

    navbarBrand = 'Alexandria',
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
    const pageProps = usePage<SharedProps>().props;
    const { currentProject, auth } = pageProps;
    const user = auth?.user ?? null;
    const url = usePage().url;

    // Resolve which actions the FAB modal renders. Consumer override
    // wins; otherwise fall back to the three-stub default. `null`
    // suppresses the FAB entirely. The FAB is project-scoped — it only
    // renders when there's a `currentProject` in shared props, so the
    // actions inside the modal always have an implicit project target
    // (matching the sidebar's scope). On routes without a project
    // (dashboard, settings, profile, etc.) the FAB stays hidden.
    const resolvedFabActions: FabAction[] | null =
        fabActions === null ? null : (fabActions ?? DEFAULT_FAB_ACTIONS);
    const showFab = !!user && resolvedFabActions !== null && !!currentProject;

    // Inertia ships the page's bound blueprint/entry as shared props on
    // the show routes so the drawer can scope its notes list to that
    // notable. Without these, /p/{project}/{blueprint} pages would still
    // see all project notes — exact bug we hit before this lift.
    const pageBlueprint = (pageProps as Record<string, unknown>).blueprint as
        | { id: number; name: string; slug: string }
        | undefined;
    const pageEntry = (pageProps as Record<string, unknown>).entry as
        | { id: number; name: string; slug: string }
        | undefined;

    function buildNotesContext(extra: Partial<NotesContext> = {}): NotesContext | null {
        if (!currentProject) return null;
        const base = {
            projectId: currentProject.id,
            projectSlug: currentProject.slug,
            ...extra,
        };
        if (pageEntry?.id) {
            return {
                ...base,
                contextType: 'entry',
                contextId: pageEntry.id,
                contextLabel: pageEntry.name,
                contextSlug: pageEntry.slug,
            } as NotesContext;
        }
        if (pageBlueprint?.id) {
            return {
                ...base,
                contextType: 'blueprint',
                contextId: pageBlueprint.id,
                contextLabel: pageBlueprint.name,
                contextSlug: pageBlueprint.slug,
            } as NotesContext;
        }
        return {
            ...base,
            contextType: 'project',
            contextId: currentProject.id,
            contextLabel: currentProject.name,
            contextSlug: currentProject.slug,
        } as NotesContext;
    }

    // Auto-wire the navbar's Notes button only on project-scoped routes
    // (/p/{slug}/...). On the dedicated Notes (/notes/{slug}) or AI
    // (/ai/{slug}) surfaces, the drawer would be redundant — the page
    // itself IS the notes / AI experience — so suppress the navbar
    // toggle there. Default handler dispatches the global
    // `alexandria:open-notes` event that NotesDrawer listens for —
    // drawer state lives entirely inside the drawer, so the layout
    // only has to fire the open signal with the current project context.
    // Consumer can override with an explicit function, or pass null to
    // suppress the button entirely.
    const isProjectScope = url.startsWith('/p/');
    const resolvedNotesToggle = onNotesToggle === null
        ? undefined
        : onNotesToggle ?? (currentProject && isProjectScope
            ? () => {
                const ctx = buildNotesContext();
                if (ctx) openNotesDrawer(ctx);
            }
            : undefined);

    // Auto-open the notes drawer when arriving via Sorting History.
    // The chip stashes the note id in sessionStorage before navigating;
    // we drain it once the destination page has its blueprint/entry
    // shared props in hand so the drawer scopes to the right notable
    // and pre-selects the note row.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = sessionStorage.getItem('alexandria:open_note');
        if (!stored || !currentProject?.id) return;
        sessionStorage.removeItem('alexandria:open_note');
        const noteId = parseInt(stored, 10);
        if (Number.isNaN(noteId)) return;
        const t = setTimeout(() => {
            const ctx = buildNotesContext({ preSelectNoteId: noteId });
            if (ctx) openNotesDrawer(ctx);
        }, 100);
        return () => clearTimeout(t);
    }, [currentProject?.id, pageBlueprint?.id, pageEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);

        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Listen for the global command-palette-toggle event so the navbar
    // search button (which dispatches it) opens the palette regardless
    // of where it lives in the tree. Cmd+K binding is also handled here
    // for the same reason.
    useEffect(() => {
        const open = () => setPaletteOpen(true);
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen(true);
            }
        };

        window.addEventListener('alexandria-core:command-palette-toggle', open);
        window.addEventListener('keydown', handleKey);

        return () => {
            window.removeEventListener('alexandria-core:command-palette-toggle', open);
            window.removeEventListener('keydown', handleKey);
        };
    }, []);

    // Bottom-nav Notes handler — open the drawer scoped to the current
    // page context. We gate on currentProject AND non-redundant routes:
    // on `/notes/{slug}` or `/ai/{slug}` the drawer would duplicate the
    // page itself, so the Notes tab falls back to its URL behaviour
    // there. Anywhere else with a current project (entry pages,
    // blueprint pages, project Show, even /dashboard if it has a
    // currentProject shared) the drawer becomes the primary access.
    const isNotesOrAiPage =
        url.startsWith('/notes/') || url.startsWith('/ai/');
    const bottomNavNotesClick =
        currentProject && !isNotesOrAiPage
            ? () => {
                  const ctx = buildNotesContext();
                  if (ctx) openNotesDrawer(ctx);
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

    return (
        <ToastProvider>
            {title && <Head title={title} />}

            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                brand={sidebarBrand}
                logoSlot={sidebarLogo ?? <Logo size="2em" />}
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
                className={[
                    immersive ? '' : 'pt-20',
                    showBottomNav ? 'pb-20 lg:pb-0' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {children}
            </main>

            {showBottomNav && <BottomNav tabs={resolvedBottomNavTabs!} />}

            {/* Mount CommandPalette globally when there's a current
                project to search against — wires Cmd+K + the navbar
                search button to /p/{slug}/search through the
                projectSearch helper. Per-page mounts (e.g. legacy's
                Show pages) are no longer required. */}
            {currentProject && (
                <CommandPalette
                    open={paletteOpen}
                    onClose={() => setPaletteOpen(false)}
                    onSearch={projectSearch(currentProject.slug)}
                />
            )}

            {/* NotesDrawer manages its own state through the global
                `alexandria:open-notes` event. Mount only on /p/{...}
                routes so the dedicated Notes / AI dashboards aren't
                shadowed by a redundant slide-up drawer. */}
            {currentProject && isProjectScope && <NotesDrawer />}

            {/* PageTransition listens for `alexandria:transition-close`
                events and resolves the Promise returned by
                triggerPageTransition(). Without it mounted, any caller
                awaiting that helper hangs forever — the SortingHistory
                modal's blueprint/entry links are the canonical example. */}
            <PageTransition />

            {/* Global add-new FAB. Authenticated only (see `showFab`
                above). Opens a small modal with the resolved action
                cards; consumers override the default 4-card set via
                the `fabActions` prop or pass `null` to hide. */}
            {showFab && (
                <>
                    <Fab
                        label="Add new"
                        onClick={() => setAddNewOpen(true)}
                    />
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
                            style={{ borderBottom: '1px solid var(--theme-base-400)' }}
                        >
                            <h3
                                className="flex items-center gap-2 text-base font-semibold"
                                style={{
                                    fontFamily: 'var(--theme-typography-heading-family)',
                                }}
                            >
                                <span
                                    style={{
                                        color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
                                    }}
                                >
                                    Add to:
                                </span>
                                <span style={{ color: 'var(--theme-base-content)' }}>
                                    {currentProject!.name}
                                </span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setAddNewOpen(false)}
                                aria-label="Close"
                                className="alex-modal-close inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                                style={{ color: 'var(--theme-base-content)' }}
                            >
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
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
                                            color: 'var(--theme-base-content)',
                                            borderBottom:
                                                idx ===
                                                resolvedFabActions!.length - 1
                                                    ? 'none'
                                                    : '1px solid var(--theme-base-400)',
                                        }}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                            style={{
                                                background:
                                                    'var(--theme-brand-primary-highlight-bg)',
                                                color: 'var(--theme-brand-primary-highlight-fg)',
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
                                                    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
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
