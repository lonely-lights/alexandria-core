import { useMemo, useRef, useState } from 'react';
import useT from '@alexandria/hooks/useT';
import type { OutlineProjection, OutlineRow } from './outlineTypes';
import type { OutlineSaveSnapshot } from './OutlineSaveQueue';
import { rowsFromProjection } from './outlinePayload';
import {
    invalidOutlineParents,
    mergeOutlineDraft,
    orderOutlineRows,
    resolveOutlineMerge,
    type OutlineMergeConflict,
} from './outlineMerge';

interface Props {
    base: OutlineSaveSnapshot;
    draft: OutlineSaveSnapshot;
    projection: OutlineProjection;
    ambiguous: boolean;
    onResolve(draft: OutlineSaveSnapshot): void;
    onDiscard(): void;
}
export default function OutlineConflictNotice(props: Props) {
    // Reset choices when the user changes the draft or the conflicting version changes.
    return (
        <ConflictEditor
            key={JSON.stringify([
                props.projection.baseVersion,
                props.draft.rows,
            ])}
            {...props}
        />
    );
}
function ConflictEditor({
    base,
    draft,
    projection,
    ambiguous,
    onResolve,
    onDiscard,
}: Props) {
    const t = useT();
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [parents, setParents] = useState<Record<string, string>>({});
    const [invalid, setInvalid] = useState<string[]>([]);
    const copyRef = useRef<HTMLTextAreaElement>(null);
    const server = useMemo(() => rowsFromProjection(projection), [projection]);
    const merge = useMemo(
        () => mergeOutlineDraft(base.rows, draft.rows, server, { ambiguous }),
        [base.rows, draft.rows, server, ambiguous],
    );
    const localText = draft.rows
        .map(
            (row) =>
                '  '.repeat(row.depth) +
                row.title +
                (row.synopsis ? ' — ' + row.synopsis : '') +
                row.beats
                    .map(
                        (beat) =>
                            '\n' +
                            '  '.repeat(row.depth + 1) +
                            (beat.done ? '[x] ' : '[ ] ') +
                            beat.text,
                    )
                    .join(''),
        )
        .join('\n');
    function display(
        conflict: OutlineMergeConflict,
        side: 'local' | 'server',
    ): string {
        const value = conflict[side];
        if (conflict.field === 'deleted')
            return value
                ? (value as OutlineRow).title
                : t('writing.outline.deleted_elsewhere');
        if (conflict.field === 'structure') {
            const shape = value as { key: string; parentKey: string | null }[];
            return shape
                .map((item) => {
                    const row = [...draft.rows, ...server].find(
                        (r) => r.key === item.key,
                    );
                    const parent = [...draft.rows, ...server].find(
                        (r) => r.key === item.parentKey,
                    );
                    return (
                        (row?.title || t('writing.outline.title_placeholder')) +
                        (parent ? ' → ' + parent.title : '')
                    );
                })
                .join('\n');
        }
        if (conflict.field === 'beats')
            return (value as OutlineRow['beats'])
                .map((b) => (b.done ? '[x] ' : '[ ] ') + b.text)
                .join('\n');
        return value === null || value === undefined
            ? t('writing.outline.empty_value')
            : String(value);
    }
    function resolve() {
        let rows = resolveOutlineMerge(merge, choices).map((row) =>
            Object.hasOwn(parents, row.key)
                ? { ...row, parentKey: parents[row.key] || null }
                : row,
        );
        const problems = invalidOutlineParents(rows);
        const ids = rows.flatMap((r) =>
            r.sectionId === null ? [] : [r.sectionId],
        );
        if (problems.length || new Set(ids).size !== ids.length) {
            setInvalid(problems.length ? problems : rows.map((r) => r.key));
            return;
        }
        rows = orderOutlineRows(rows, rows);
        const retained = new Set(ids);
        const deleted = server
            .filter((r) => !retained.has(r.sectionId!))
            .map((r) => r.sectionId!);
        onResolve({
            rows,
            deleted,
            force: draft.force.filter((id) => deleted.includes(id)),
            conversions: draft.conversions.filter((c) =>
                deleted.includes(c.sourceSectionId),
            ),
            baseVersion: projection.baseVersion,
        });
    }
    return (
        <section
            aria-label={t('writing.outline.conflict_title')}
            className="border-current/20 mb-4 rounded border p-3 text-sm"
        >
            <p role="status">{t('writing.outline.conflict_help')}</p>
            <label className="mt-2 block">
                {t('writing.outline.local_copy')}
                <textarea
                    ref={copyRef}
                    value={localText}
                    readOnly
                    rows={4}
                    className="block w-full select-text rounded border p-2"
                />
            </label>
            <button
                type="button"
                className="mr-3 underline"
                onClick={() => {
                    copyRef.current?.select();
                    void navigator.clipboard?.writeText(localText).catch(() => {
                        copyRef.current?.focus();
                        copyRef.current?.select();
                    });
                }}
            >
                {t('writing.outline.copy_local')}
            </button>
            <button
                type="button"
                className="underline"
                onClick={() => {
                    if (window.confirm(t('writing.outline.discard_confirm')))
                        onDiscard();
                }}
            >
                {t('writing.outline.reload_server')}
            </button>
            {merge.conflicts.map((conflict, index) => (
                <fieldset
                    key={index}
                    className="border-current/20 my-3 rounded border p-2"
                >
                    <legend>
                        {t('writing.outline.field_' + conflict.field)} —{' '}
                        {merge.rows.find((r) => r.key === conflict.key)
                            ?.title ?? t('writing.outline.title')}
                    </legend>
                    {conflict.field === 'created' ? (
                        <select
                            aria-label={t('writing.outline.match_saved')}
                            value={choices[String(index)] ?? ''}
                            onChange={(e) =>
                                setChoices((prev) => ({
                                    ...prev,
                                    [index]: e.target.value,
                                }))
                            }
                        >
                            <option value="">
                                {t('writing.outline.choose_resolution')}
                            </option>
                            <option value="separate">
                                {t('writing.outline.keep_separate')}
                            </option>
                            {(conflict.server as OutlineRow[]).map((row) => (
                                <option
                                    key={row.key}
                                    value={String(row.sectionId)}
                                    disabled={Object.entries(choices).some(
                                        ([key, value]) =>
                                            key !== String(index) &&
                                            value === String(row.sectionId),
                                    )}
                                >
                                    {row.title}
                                </option>
                            ))}
                        </select>
                    ) : (
                        (['local', 'server'] as const).map((side) => (
                            <label key={side} className="my-1 block">
                                <input
                                    type="radio"
                                    name={'outline-resolution-' + index}
                                    checked={choices[String(index)] === side}
                                    onChange={() =>
                                        setChoices((prev) => ({
                                            ...prev,
                                            [index]: side,
                                        }))
                                    }
                                />{' '}
                                {t(
                                    side === 'local'
                                        ? 'writing.outline.keep_local'
                                        : 'writing.outline.keep_server',
                                )}
                                <span className="ml-5 block whitespace-pre-wrap">
                                    {display(conflict, side)}
                                </span>
                            </label>
                        ))
                    )}
                </fieldset>
            ))}
            {invalid.length > 0 && (
                <p role="alert">{t('writing.outline.choose_parent')}</p>
            )}
            {invalid.map((key) => (
                <label key={key} className="block">
                    {merge.rows.find((r) => r.key === key)?.title}
                    <select
                        aria-label={t('writing.outline.choose_parent')}
                        value={parents[key] ?? ''}
                        onChange={(e) =>
                            setParents((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                            }))
                        }
                    >
                        <option value="">
                            {t('writing.outline.root_level')}
                        </option>
                        {merge.rows
                            .filter((r) => r.key !== key)
                            .map((row) => (
                                <option key={row.key} value={row.key}>
                                    {row.title}
                                </option>
                            ))}
                    </select>
                    <button
                        type="button"
                        onClick={() =>
                            setParents((prev) => ({
                                ...prev,
                                [key]: parents[key] ?? '',
                            }))
                        }
                    >
                        {t('writing.outline.use_parent')}
                    </button>
                </label>
            ))}
            <button
                type="button"
                className="mt-3 rounded border px-3 py-1"
                disabled={merge.conflicts.some((_, i) => !choices[String(i)])}
                onClick={resolve}
            >
                {t('writing.outline.retry_merge')}
            </button>
        </section>
    );
}
