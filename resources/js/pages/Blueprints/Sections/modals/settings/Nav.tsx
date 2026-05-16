import type { ReactNode } from "react";

import {
    helperFainterStyle,
    navItemActiveStyle,
    navItemIdleStyle,
} from "./settingsPanelStyles";

/**
 * Single nav-sidebar item used by the blueprint settings modal.
 * Active/onClick are passed by the caller — the component stays
 * decoupled from the modal's menu-state union.
 */
export function NavItem({
    icon,
    label,
    active,
    onClick,
}: {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? "page" : undefined}
            className="alex-row flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
            style={active ? navItemActiveStyle : navItemIdleStyle}
        >
            <i className={`${icon} w-4 text-center text-xs`} />
            <span>{label}</span>
        </button>
    );
}

/** Section header wrapping a cluster of NavItems. */
export function NavGroup({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="mb-2">
            <div
                className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={helperFainterStyle}
            >
                {title}
            </div>
            {children}
        </div>
    );
}
