import type { CSSProperties } from 'react';
import type { GraphColorGroup } from './types';
import { colorForGroup } from './palette';

interface GraphLegendProps {
    groups: GraphColorGroup[];
    /** Used to build the default heading "Colored by {fieldLabel}". Ignored
        when `title` is provided. */
    fieldLabel?: string;
    /** Explicit heading override (e.g. "Relationships"). Wins over fieldLabel. */
    title?: string;
    /** Friendly placeholder shown when the legend renders with zero groups
        and `alwaysShow` is true. Defaults to "No values yet." */
    emptyHint?: string;
    /** When true, render even with zero groups (shows the empty-hint).
        Otherwise the legend is hidden entirely with no groups. */
    alwaysShow?: boolean;
    /** Edge swatches use a thicker bar to mirror the rendered line; nodes
        use a circle to mirror the rendered dot. */
    swatchShape?: 'circle' | 'bar';
}

const wrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-200) 40%, transparent)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const headingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const emptyHintStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const groupLabelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
};

const groupCountStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const circleSwatchBorder = 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)';

export default function GraphLegend({
    groups,
    fieldLabel,
    title,
    emptyHint,
    alwaysShow = false,
    swatchShape = 'circle',
}: GraphLegendProps) {
    const safeGroups = groups ?? [];
    if (!alwaysShow && safeGroups.length === 0) return null;

    const heading = title ?? (fieldLabel ? `Colored by ${fieldLabel}` : 'Legend');
    const emptyText = emptyHint ?? 'No values yet.';
    const isBar = swatchShape === 'bar';

    return (
        <div className="p-3" style={wrapStyle}>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider" style={headingStyle}>
                {heading}
            </p>
            {safeGroups.length === 0 ? (
                <p className="text-xs italic" style={emptyHintStyle}>{emptyText}</p>
            ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {safeGroups.map((g) => (
                        <div key={g.key} className="flex items-center gap-2">
                            <span
                                className={isBar ? 'h-1 w-5 rounded-full' : 'h-3 w-3 rounded-full'}
                                style={{
                                    backgroundColor: colorForGroup(g.key),
                                    ...(isBar ? {} : { border: `1px solid ${circleSwatchBorder}` }),
                                }}
                            />
                            <span className="text-xs" style={groupLabelStyle}>{g.label}</span>
                            <span className="text-[10px]" style={groupCountStyle}>{g.count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
