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
    const swatchClass = swatchShape === 'bar'
        ? 'h-1 w-5 rounded-full'
        : 'h-3 w-3 rounded-full border border-base-content/20';

    return (
        <div className="rounded-xl border border-base-content/10 bg-base-200/40 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-base-content/50">
                {heading}
            </p>
            {safeGroups.length === 0 ? (
                <p className="text-xs italic text-base-content/40">{emptyText}</p>
            ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {safeGroups.map((g) => (
                        <div key={g.key} className="flex items-center gap-2">
                            <span
                                className={swatchClass}
                                style={{ backgroundColor: colorForGroup(g.key) }}
                            />
                            <span className="text-xs text-base-content/80">{g.label}</span>
                            <span className="text-[10px] text-base-content/40">{g.count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
