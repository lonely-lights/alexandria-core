import type {
    TextStatistics,
    WritingStatistics,
} from '@alexandria/editor/writingStatistics';
import useT from '@alexandria/hooks/useT';
import WritingToolDialog from '../mobile/WritingToolDialog';

const rows: Array<keyof TextStatistics> = [
    'words',
    'characters',
    'charactersWithoutSpaces',
    'paragraphs',
];

export default function WritingStatisticsDialog({
    statistics,
    onClose,
}: {
    statistics: WritingStatistics;
    onClose: () => void;
}) {
    const t = useT();

    return (
        <WritingToolDialog
            title={t('writing.statistics.title')}
            onClose={onClose}
        >
            <div className="min-h-0 space-y-4 overflow-y-auto p-4">
                <p className="text-sm">{t('writing.statistics.scope')}</p>
                <table
                    className="w-full table-fixed text-sm"
                    data-writing-statistics
                >
                    <thead>
                        <tr>
                            <th className="w-[42%] p-2 text-start">
                                <span className="sr-only">
                                    {t('writing.statistics.measure')}
                                </span>
                            </th>
                            <th
                                className="p-2 text-end text-xs font-medium"
                                scope="col"
                            >
                                {t('writing.statistics.section')}
                            </th>
                            {statistics.selection && (
                                <th
                                    className="p-2 text-end text-xs font-medium"
                                    scope="col"
                                >
                                    {t('writing.statistics.selection')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((key) => (
                            <tr
                                key={key}
                                className="border-t"
                                style={{ borderColor: 'var(--theme-base-400)' }}
                            >
                                <th
                                    className="p-2 text-start font-normal"
                                    scope="row"
                                >
                                    {t(`writing.statistics.${key}`)}
                                </th>
                                <td
                                    className="p-2 text-end tabular-nums"
                                    data-stat-section={key}
                                >
                                    {statistics.section[key].toLocaleString()}
                                </td>
                                {statistics.selection && (
                                    <td
                                        className="p-2 text-end tabular-nums"
                                        data-stat-selection={key}
                                    >
                                        {statistics.selection[
                                            key
                                        ].toLocaleString()}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-xs">{t('writing.statistics.hint')}</p>
            </div>
        </WritingToolDialog>
    );
}
