import useT from '@alexandria/hooks/useT';
import { formatDuration } from './durationValue';
import type { MarkerTiming } from './pacingTypes';
import { timeText, remainingText } from './SectionTiming';
export default function MarkerReadout({
    marker,
    sectionTitle,
    onPlace,
}: {
    marker: MarkerTiming;
    sectionTitle?: string;
    onPlace?: () => void;
}) {
    const t = useT();

    return (
        <div
            data-pacing-marker={marker.name}
            style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.6rem',
                borderLeft: '2px solid var(--theme-brand-primary-500)',
                margin: '0.4rem 0',
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {onPlace ? (
                <button
                    type="button"
                    className="font-semibold underline decoration-dotted underline-offset-4"
                    onClick={onPlace}
                    aria-label={
                        t('writing.pacing.place_marker') + ' — ' + marker.name
                    }
                >
                    {marker.name}
                    <i
                        className="fa-solid fa-location-dot ml-2"
                        aria-hidden="true"
                    />
                </button>
            ) : (
                <strong>{marker.name}</strong>
            )}
            {sectionTitle && <> · {sectionTitle}</>} ·{' '}
            {t('writing.pacing.' + marker.anchorEdge)} ·{' '}
            {t(
                'writing.pacing.' +
                    (marker.anchorUnavailable ? 'unavailable' : marker.status),
            )}
            {marker.gapSeconds !== null && marker.gapSeconds !== 0 && (
                <> ({formatDuration(Math.abs(marker.gapSeconds))})</>
            )}
            {marker.landing && (
                <>
                    {' '}
                    · {t('writing.pacing.landing')} {timeText(marker.landing)}
                </>
            )}
            {marker.targetSeconds !== null && (
                <>
                    {' '}
                    · {t('writing.pacing.target')}{' '}
                    {formatDuration(marker.targetSeconds)}
                </>
            )}
            {marker.beforeInContainer && (
                <>
                    {' '}
                    · {t('writing.pacing.before')}{' '}
                    {timeText(marker.beforeInContainer)}
                </>
            )}
            {marker.afterInContainer && (
                <>
                    {' '}
                    · {t('writing.pacing.after')}{' '}
                    {timeText(marker.afterInContainer)}
                </>
            )}
            {marker.remainingContainerBudget && (
                <>
                    {' '}
                    · {t('writing.pacing.budget_after')}{' '}
                    {remainingText(marker.remainingContainerBudget)}
                </>
            )}
        </div>
    );
}
