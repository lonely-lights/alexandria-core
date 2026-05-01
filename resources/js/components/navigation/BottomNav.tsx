import { useState, type ReactNode } from 'react';
import type { BottomNavTab, UserMenuItem, UserMenuItemDivider } from '../../types/navigation';

function isDivider(item: UserMenuItem): item is UserMenuItemDivider {
    return 'divider' in item && item.divider === true;
}

interface BottomNavProps {
    /**
     * Tabs to render in the bar (left-to-right). Up to five tabs render at a
     * comfortable size; more will overflow horizontally — keep it tight. Any
     * tab with `featured: true` renders as a raised primary-color FAB.
     */
    tabs: BottomNavTab[];

    /**
     * Optional "More" sheet items. When provided, an extra ⋯ button renders
     * at the right edge of the bar; tapping it pops a popover anchored to
     * the button. Pass `null` (or omit) to suppress the More button.
     */
    moreMenu?: {
        /** Heading at the top of the sheet (e.g. the user's display name). */
        heading?: string;
        /** Items to render. Use `{ divider: true }` for separators. */
        items: UserMenuItem[];
    } | null;

    /**
     * Optional extra slot rendered above the More-menu items. Useful for
     * dropping in a theme picker, account avatar block, etc.
     */
    moreMenuExtras?: ReactNode;
}

/**
 * Mobile bottom navigation bar (lg-and-down). Five-tab pattern with optional
 * "More" popover. The chrome (bar layout, blur, border, FAB animation,
 * popover positioning) is core; the tab list and More-menu items are
 * consumer-supplied.
 */
export default function BottomNav({ tabs, moreMenu, moreMenuExtras }: BottomNavProps) {
    const [moreOpen, setMoreOpen] = useState(false);

    return (
        <div className="btm-nav btm-nav-sm z-40 border-t border-base-content/10 bg-base-200/70 backdrop-blur-lg lg:hidden">
            {tabs.map((tab) => renderTab(tab))}

            {moreMenu && (
                <div className="relative">
                    <button
                        onClick={() => setMoreOpen(!moreOpen)}
                        className="flex flex-col items-center text-base-content/60 hover:text-primary"
                    >
                        <i className="fa-solid fa-ellipsis" />
                        <span className="btm-nav-label text-xs">More</span>
                    </button>

                    {moreOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
                            <div className="absolute bottom-full right-0 z-40 mb-2 w-56 rounded-box bg-base-200 p-2 shadow-xl">
                                <ul className="menu">
                                    {moreMenu.heading && (
                                        <li className="menu-title">
                                            <span>{moreMenu.heading}</span>
                                        </li>
                                    )}
                                    {moreMenu.items.map((item, idx) => {
                                        if (isDivider(item)) {
                                            return <div key={`div-${idx}`} className="divider my-1" />;
                                        }
                                        return (
                                            <li key={`item-${idx}`}>
                                                <a
                                                    href={item.href}
                                                    onClick={item.onClick}
                                                    className={item.danger ? 'text-error' : undefined}
                                                >
                                                    {renderIcon(item.icon)}
                                                    {item.label}
                                                </a>
                                            </li>
                                        );
                                    })}
                                    {moreMenuExtras && (
                                        <>
                                            <div className="divider my-1" />
                                            <li>{moreMenuExtras}</li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function renderTab(tab: BottomNavTab): ReactNode {
    const handleClick = tab.onClick;

    if (tab.featured) {
        return (
            <a
                key={tab.id}
                href={tab.href}
                onClick={handleClick}
                className="-mt-4 text-primary"
                aria-label={tab.label}
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-content shadow-lg">
                    {renderIconLarge(tab.icon)}
                </div>
            </a>
        );
    }

    return (
        <a
            key={tab.id}
            href={tab.href}
            onClick={handleClick}
            className="text-base-content/60 hover:text-primary"
        >
            <span className="relative">
                {renderIcon(tab.icon)}
                {tab.badge != null && tab.badge !== '' && (
                    <span className="badge badge-primary badge-xs absolute -right-2 -top-1">
                        {tab.badge}
                    </span>
                )}
            </span>
            <span className="btm-nav-label text-xs">{tab.label}</span>
        </a>
    );
}

function renderIcon(icon: string | ReactNode | undefined): ReactNode {
    if (icon == null) return null;
    if (typeof icon === 'string') {
        const cls = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        return <i className={`${cls} fa-fw`} />;
    }
    return icon;
}

function renderIconLarge(icon: string | ReactNode | undefined): ReactNode {
    if (icon == null) return null;
    if (typeof icon === 'string') {
        const cls = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        return <i className={`${cls} text-lg`} />;
    }
    return icon;
}
