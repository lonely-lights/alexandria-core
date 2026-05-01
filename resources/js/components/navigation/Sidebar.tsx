import { usePage } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import { Fragment, type ReactNode } from 'react';
import type { SharedProps } from '../../types/index';
import AvatarWithRing from '../ui/AvatarWithRing';

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
     * The body of the sidebar — typically a stack of navigation links keyed
     * to the consumer app's domain (project switcher, blueprint links,
     * AI hub, archive, etc.). Core renders zero opinions about what lives
     * here.
     */
    body?: ReactNode;

    /**
     * Footer link target for the user-info row. Defaults to "/account".
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
    brand = 'Alexandria',
    logoSlot,
    body,
    userMenuLink = '/account',
}: SidebarProps) {
    const { auth } = usePage<SharedProps>().props;

    return (
        <>
            {/* Backdrop */}
            <Transition show={open} as={Fragment}>
                <div
                    className="fixed inset-0 z-30 bg-black/50 transition-opacity duration-300"
                    onClick={onClose}
                />
            </Transition>

            {/* Sidebar Panel */}
            <Transition show={open} as={Fragment}>
                <aside className="fixed top-0 left-0 z-40 h-screen w-72 flex-col bg-base-200 p-3 transition-transform duration-300 data-[closed]:-translate-x-full flex">
                    {/* Header */}
                    <div className="mb-3 flex items-center justify-between">
                        <a href="/" className="flex items-center">
                            {logoSlot}
                            {brand && (
                                <span className={`text-lg font-semibold text-white ${logoSlot ? 'ml-3' : ''}`}>
                                    {brand}
                                </span>
                            )}
                        </a>
                        <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
                            <i className="fas fa-times" />
                        </button>
                    </div>

                    {/* Body */}
                    <nav className="mt-2 flex flex-1 flex-col space-y-0.5 overflow-y-auto">
                        {body}
                    </nav>

                    {/* Profile Link */}
                    {auth && userMenuLink && (
                        <>
                            <div className="divider my-1 h-px" />
                            <a
                                href={userMenuLink}
                                className="flex items-center gap-4 rounded-lg px-2 py-1.5 transition-colors hover:bg-base-300"
                            >
                                <AvatarWithRing
                                    src={auth.user.has_avatar ? auth.user.avatar_thumb_url : null}
                                    alt={auth.user.display_name ?? auth.user.name}
                                    initials={(auth.user.display_name ?? auth.user.name).charAt(0).toUpperCase()}
                                    size={32}
                                    ring={auth.user.avatar_ring_slug ?? 'none'}
                                    ringSettings={auth.user.avatar_ring_settings as never}
                                    ringThickness={4}
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium leading-tight">
                                        {auth.user.display_name ?? auth.user.name}
                                    </span>
                                    <span className="text-xs leading-tight text-base-content/60">
                                        @{auth.user.name}
                                    </span>
                                </div>
                            </a>
                        </>
                    )}
                </aside>
            </Transition>
        </>
    );
}
