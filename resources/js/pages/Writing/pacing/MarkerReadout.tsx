import useT from '@alexandria/hooks/useT';
import { formatDuration } from './durationValue';
import type { MarkerTiming } from './pacingTypes';
import { timeText, remainingText } from './SectionTiming';
export default function MarkerReadout({ marker }: { marker: MarkerTiming }) {
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
            <strong>{marker.name}</strong> ·{' '}
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
