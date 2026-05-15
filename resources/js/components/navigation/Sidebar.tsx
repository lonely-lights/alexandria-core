import { usePage } from "@inertiajs/react";
import { Transition } from "@headlessui/react";
import { Fragment, type ReactNode } from "react";
import type { SharedProps } from "../../types/index";
import AvatarWithRing from "../ui/AvatarWithRing";
import ProjectNavigation, {
    NoProjectState,
    type SidebarBlueprint,
} from "./ProjectNavigation";
import type { ProjectSummary } from "../../types/models";

interface SidebarProps {
    /** Open / closed state — controlled by the consumer (typically AppLayout). */
    open: boolean;
    /** Called when the user closes the drawer (backdrop click, Esc, X button). */
    onClose: () => void;

    /**
     * Optional brand label rendered next to the logo. Pass `null` to suppress.
     * Defaults to "Alexandria".
     */
    brand?: string | null;

    /**
     * Optional logo slot. Core does not ship a Logo component (per FE-D), so
     * the consumer wires up their own brand mark — pass any ReactNode.
     */
    logoSlot?: ReactNode;

    /**
     * Override slot for the sidebar body. When omitted, Sidebar renders
     * a default `<ProjectNavigation />` driven by Inertia shared props
     * (`projects` + `currentProject`) — that gives consumers the legacy
     * Alexandria sidebar (project switcher, blueprint links, AI hub,
     * archive) for free. Pass a custom node to opt out.
     */
    body?: ReactNode;

    /**
     * Footer link target for the user-info row. Defaults to "/settings".
     * Pass `null` to suppress the footer entirely.
     */
    userMenuLink?: string | null;
}

/**
 * Slide-in left drawer. Outer chrome (backdrop, panel, header, scroll body,
 * user footer) is core; the body content is consumer-supplied via the `body`
 * prop. Pulls `auth` from Inertia shared props for the user-info footer.
 *
 * Pair with `<Navbar onMenuToggle={...} />` and a parent `useState` to wire
 * the drawer open/close. `<AppLayout />` does this for you.
 *
 * Requires `@headlessui/react` to be installed in the consumer app — see
 * `docs/integration/frontend-setup.md`.
 */
export default function Sidebar({
    open,
    onClose,
    brand = "Alexandria",
    logoSlot,
    body,
    userMenuLink = "/settings",
}: SidebarProps) {
    const { auth, projects, currentProject } = usePage<SharedProps>().props;
    const typedProject = currentProject as
        | (ProjectSummary & {
              is_route_project?: boolean;
              blueprints?: SidebarBlueprint[];
          })
        | null;

    // Default sidebar body: render ProjectNavigation against shared props
    // when there's a current project, the empty-state CTA when the user
    // has no projects yet, or a no-op when the consumer explicitly opted
    // out by passing `body={null}`. Consumers wanting a custom sidebar
    // pass their own `body={...}` to skip this default entirely.
    const resolvedBody: ReactNode =
        body !== undefined ? (
            body
        ) : typedProject ? (
            <ProjectNavigation
                project={typedProject}
                projects={projects ?? []}
                blueprints={typedProject.blueprints ?? []}
                isRouteProject={typedProject.is_route_project ?? true}
            />
        ) : projects && projects.length === 0 ? (
            <NoProjectState />
        ) : null;

    return (
        <>
            {/* Backdrop — sits above the navbar (z-40) so the dim covers the
                nav chrome too, sidebar then lifts above it. */}
            <Transition show={open} as={Fragment}>
                <div
                    className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-300"
                    onClick={onClose}
                />
            </Transition>

            {/* Sidebar Panel — z-50 like the backdrop; rendered after it in
                DOM so it wins the tie and floats over the navbar. */}
            <Transition show={open} as={Fragment}>
                <aside
                    className="alex-sidebar fixed top-0 left-0 z-50 h-screen w-72 flex-col p-3 transition-transform duration-300 data-[closed]:-translate-x-full flex"
                    style={{
                        background: "var(--theme-base-chrome)",
                        color: "var(--theme-base-content)",
                        borderRight: "1px solid var(--theme-base-400)",
                    }}
                >
                    {/* Header */}
                    <div className="mb-3 flex items-center justify-between">
                        <a href="/" className="flex items-center">
                            {logoSlot}
                            {brand && (
                                <span
                                    className={`text-lg font-semibold ${logoSlot ? "ml-3" : ""}`}
                                    style={{
                                        color: "var(--theme-base-content)",
                                    }}
                                >
                                    {brand}
                                </span>
                            )}
                        </a>
                        <button
                            onClick={onClose}
                            className="alex-nav-icon-btn alex-nav-icon-btn--ghost flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                            style={{
                                background: "transparent",
                                color: "var(--theme-base-content)",
                            }}
                            aria-label="Close sidebar"
                        >
                            <i className="fas fa-times" />
                        </button>
                    </div>

                    {/* Body */}
                    <nav className="mt-2 flex flex-1 flex-col space-y-0.5 overflow-y-auto">
                        {resolvedBody}
                    </nav>

                    {/* Profile Link */}
                    {auth?.user && userMenuLink && (
                        <>
                            <div
                                style={{
                                    height: "1px",
                                    marginTop: "0.25rem",
                                    marginBottom: "0.25rem",
                                    background:
                                        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                                }}
                            />
                            <a
                                href={userMenuLink}
                                className="alex-sidebar-user flex items-center gap-4 px-2 py-1.5 transition-colors"
                                style={{
                                    borderRadius: "var(--theme-radius-card)",
                                }}
                            >
                                <AvatarWithRing
                                    src={
                                        auth.user.has_avatar &&
                                        auth.user.avatar_thumb_url
                                            ? auth.user.avatar_thumb_url
                                            : null
                                    }
                                    alt={
                                        auth.user.display_name ??
                                        auth.user.name ??
                                        "User"
                                    }
                                    initials={(
                                        auth.user.display_name ??
                                        auth.user.name ??
                                        "U"
                                    )
                                        .charAt(0)
                                        .toUpperCase()}
                                    size={32}
                                    ring={auth.user.avatar_ring_slug ?? "none"}
                                    ringSettings={
                                        auth.user.avatar_ring_settings as never
                                    }
                                    ringThickness={4}
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium leading-tight">
                                        {auth.user.display_name ??
                                            auth.user.name ??
                                            "User"}
                                    </span>
                                    {auth.user.display_name &&
                                        auth.user.name && (
                                            <span
                                                className="text-xs leading-tight"
                                                style={{
                                                    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
                                                }}
                                            >
                                                @{auth.user.name}
                                            </span>
                                        )}
                                </div>
                            </a>
                        </>
                    )}
                </aside>
            </Transition>
        </>
    );
}
