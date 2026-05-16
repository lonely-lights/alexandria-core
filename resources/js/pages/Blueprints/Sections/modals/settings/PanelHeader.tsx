import type { ReactNode } from "react";

import { helperStyle, panelHeaderDividerStyle } from "./settingsPanelStyles";

/**
 * Shared header row rendered at the top of every settings-modal panel —
 * title + optional description + optional right-aligned action slot,
 * with the chrome divider that separates header from panel body.
 */
export default function PanelHeader({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <>
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
                <div>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-xs" style={helperStyle}>
                            {description}
                        </p>
                    )}
                </div>
                {action && <div className="flex-shrink-0">{action}</div>}
            </div>
            <div className="mx-5" style={panelHeaderDividerStyle} />
        </>
    );
}
