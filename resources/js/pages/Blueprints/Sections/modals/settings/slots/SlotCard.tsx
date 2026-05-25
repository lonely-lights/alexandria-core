import { useState, type ReactNode } from "react";

import {
    chevronStyle,
    countBadgeStyle,
    emptyBadgeStyle,
    slotCardStyle,
    slotDescStyle,
    slotIconStyle,
    slotTitleStyle,
} from "./styles";
import { slotIcons } from "./types";

/**
 * Shared card chrome for every AI Sorting slot. Renders icon header +
 * primary-tinted title + description + (optional) count badge. When
 * `collapsible` is true, the header becomes a clickable disclosure
 * with a chevron and children render only when expanded.
 *
 * Used by:
 *  - TagAliasesEditor (always-open)
 *  - RecognitionSlotEditor (always-open)
 *  - CreationSlotEditor (always-open)
 *  - BoundariesSlotEditor (collapsible, default closed unless populated)
 *  - ReferenceRoleSlotEditor (collapsible, same default rule)
 *  - StructuralRulesSlotEditor (collapsible, same default rule)
 *
 * Count badge styling: when `countIsEmpty` is true the badge uses a
 * dashed border + italic muted text (the "nothing here yet" state);
 * otherwise it picks up the primary-tinted filled style. This lets
 * authors scan the panel's state without expanding every slot.
 */
export default function SlotCard({
    slotKey,
    title,
    description,
    collapsible = false,
    initiallyExpanded = true,
    countLabel,
    countIsEmpty = false,
    children,
}: {
    slotKey: keyof typeof slotIcons | string;
    title: string;
    description: string;
    collapsible?: boolean;
    initiallyExpanded?: boolean;
    countLabel?: string;
    countIsEmpty?: boolean;
    children: ReactNode;
}) {
    const [expanded, setExpanded] = useState(initiallyExpanded);
    const iconClass = slotIcons[slotKey] ?? "fa-solid fa-circle";

    const header = (
        <div className="flex items-start gap-2.5">
            <i
                className={`${iconClass} mt-0.5 text-base`}
                style={slotIconStyle}
                aria-hidden
            />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <div
                        className="text-base font-semibold leading-tight"
                        style={slotTitleStyle}
                    >
                        {title}
                    </div>
                    {countLabel !== undefined && (
                        <span
                            className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium"
                            style={countIsEmpty ? emptyBadgeStyle : countBadgeStyle}
                        >
                            {countLabel}
                        </span>
                    )}
                </div>
                <div className="mt-1 text-xs" style={slotDescStyle}>
                    {description}
                </div>
            </div>
            {collapsible && (
                <i
                    className={`fa-solid fa-chevron-${expanded ? "down" : "right"} mt-2 text-xs`}
                    style={chevronStyle}
                    aria-hidden
                />
            )}
        </div>
    );

    if (!collapsible) {
        return (
            <div className="space-y-5 p-5" style={slotCardStyle}>
                {header}
                {children}
            </div>
        );
    }

    return (
        <div className="p-5" style={slotCardStyle}>
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full text-left"
                aria-expanded={expanded}
            >
                <div className="flex-1">{header}</div>
            </button>
            {expanded && <div className="mt-4">{children}</div>}
        </div>
    );
}
