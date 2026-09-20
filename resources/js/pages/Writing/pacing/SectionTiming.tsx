import useT from '@alexandria/hooks/useT';
import { formatDuration } from './durationValue';
import type { PacingRow, TimeAmount } from './pacingTypes';
export const timeText = (time: TimeAmount): string =>
    (time.unknownCount ? '≥' : '') + formatDuration(time.knownSeconds);
export const remainingText = (
    remaining: NonNullable<PacingRow['remaining']>,
): string =>
    (remaining.bound === 'upper' ? '≤' : '') +
    (remaining.seconds < 0 ? '−' : '') +
    formatDuration(Math.abs(remaining.seconds));
export default function SectionTiming({
    row,
    compact = false,
}: {
    row: PacingRow;
    compact?: boolean;
}) {
    const t = useT();

    return (
        <span
            data-section-timing={row.sectionId ?? row.key}
            style={{
                fontSize: '0.75rem',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: compact ? 'nowrap' : undefined,
            }}
        >
            {timeText(row.actual)}
            {!compact && (
                <>
                    {' '}
                    · {t('writing.pacing.position')} {timeText(row.startsAt)}–
                    {timeText(row.endsAt)}
                    {row.remaining && (
                        <>
                            {' '}
                            · {t('writing.pacing.remaining')}{' '}
                            {remainingText(row.remaining)}
                        </>
                    )}
                    {row.actual.unknownCount > 0 && (
                        <>
                            {' '}
                            · {row.actual.unknownCount}{' '}
                            {t('writing.pacing.untimed')}
                        </>
                    )}
                    {row.coverageIssue && (
                        <> · {t('writing.pacing.' + row.coverageIssue)}</>
                    )}
                </>
            )}
        </span>
    );
}
