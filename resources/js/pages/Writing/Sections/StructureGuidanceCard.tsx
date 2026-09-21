import type { CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import OutlineSidebarGroup from '../Outline/OutlineSidebarGroup';

import type {
    StructureGuidance,
    StructureGuidanceState,
} from './structureGuidance';

/**
 * The structure-plan card: a work's beat markers and how the current
 * shape measures against them.
 *
 * Lifted out of `Navigator` (owner ruling 2026-09-16) so the card lives
 * beside the outline in the right rail rather than above the section
 * tree on the left. The Navigator is for finding your place; this is for
 * reading the plan. Purely presentational — the caller computes the
 * guidance and decides where it hangs.
 */

const itemStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

const mutedStyle: CSSProperties = {
    color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 45%, transparent))',
};

const stateStyle: Record<StructureGuidanceState, CSSProperties> = {
    complete: { color: 'var(--theme-success, var(--theme-brand-primary-500))' },
    current: { color: 'var(--theme-brand-primary-500)' },
    open: {
        color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 50%, transparent))',
    },
};

export default function StructureGuidanceCard({
    guidance,
    onPlaceMarker,
}: {
    guidance: StructureGuidance;
    onPlaceMarker?: (index: number) => void;
}) {
    const t = useT();

    return (
        <OutlineSidebarGroup
            title={t(guidance.titleKey)}
            data-writing-structure-guidance={guidance.id}
        >
            <div className="mb-2">
                <p className="text-[11px] leading-relaxed" style={mutedStyle}>
                    {t(guidance.bodyKey)}
                </p>
            </div>
            <div className="grid gap-1">
                {guidance.items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-2 px-2 py-1.5 text-[11px]"
                        data-writing-structure-guidance-item={item.id}
                        data-state={item.state}
                        style={itemStyle}
                    >
                        <i
                            className={`fa-solid ${item.icon} w-3 text-center text-[10px]`}
                            aria-hidden="true"
                            style={stateStyle[item.state]}
                        />
                        <span
                            className="min-w-0 flex-1 truncate"
                            style={mutedStyle}
                        >
                            {t(item.labelKey)}
                        </span>
                        <span
                            className="min-w-0 break-words text-right font-mono text-[10px] font-semibold tabular-nums"
                            style={stateStyle[item.state]}
                        >
                            {item.valueKey !== undefined
                                ? t(item.valueKey)
                                : item.value}
                        </span>
                        {item.markerIndex !== undefined && onPlaceMarker && (
                            <button
                                type="button"
                                className="hover:bg-current/10 shrink-0 rounded p-1"
                                data-place-structure-marker={item.markerIndex}
                                aria-label={
                                    t('writing.pacing.place_marker') +
                                    ' — ' +
                                    item.value
                                }
                                title={t('writing.pacing.place_marker')}
                                onClick={() => onPlaceMarker(item.markerIndex!)}
                            >
                                <i
                                    className="fa-solid fa-location-dot"
                                    aria-hidden="true"
                                />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </OutlineSidebarGroup>
    );
}
