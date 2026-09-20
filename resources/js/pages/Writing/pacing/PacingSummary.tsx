import useT from '@alexandria/hooks/useT';
import { formatDuration } from './durationValue';
import type { PacingResult } from './pacingTypes';
import { timeText, remainingText } from './SectionTiming';
export default function PacingSummary({
    totals,
    empty,
}: {
    totals: PacingResult['totals'];
    empty: boolean;
}) {
    const t = useT();

    return (
        <div
            data-pacing-summary
            style={{
                fontSize: '0.8125rem',
                padding: '0.5rem 0',
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {t('writing.pacing.running_time')}:{' '}
            {empty ? '—' : timeText(totals.actual)}
            {totals.actual.unknownCount > 0 && (
                <>
                    {' '}
                    · {totals.actual.unknownCount} {t('writing.pacing.untimed')}
                </>
            )}
            {totals.targetRuntimeSeconds !== null && (
                <>
                    {' '}
                    · {t('writing.pacing.target')}:{' '}
                    {formatDuration(totals.targetRuntimeSeconds)}
                </>
            )}
            {totals.remaining && (
                <>
                    {' '}
                    · {t('writing.pacing.remaining')}:{' '}
                    {remainingText(totals.remaining)}
                </>
            )}
        </div>
    );
}
