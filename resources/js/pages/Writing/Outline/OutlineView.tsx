import {
    useEffect,
    useRef,
    useState,
    type ClipboardEvent,
    type CSSProperties,
    type KeyboardEvent,
} from 'react';

import useT from '@alexandria/hooks/useT';
import { worksBase } from '@alexandria/lib/urls';

import { beatKey, outlineReducer, type OutlineAction } from './outlineReducer';
import { parseOutlinePaste } from './parseOutlinePaste';
import useOutlineSync, { type BlockedOutlineRow } from './useOutlineSync';
import type { OutlineBeat, OutlineRow } from './outlineTypes';

/**
 * Full-pane outline editor — spec 2026-08-28 outline-mode Task 5.
 *
 * A flat, indented list of a work's sections: title + muted synopsis
 * on the row itself, beats as check-off sub-rows underneath. All
 * structural editing (Enter/Tab/Shift-Tab/Alt+Up/Alt+Down/Backspace,
 * multi-line paste) runs through the pure `outlineReducer` — this
 * component only wires DOM events to actions and renders the result.
 *
 * `onNavigate` is part of this component's public interface (it mirrors
 * Task 7's read-only `OutlineSidebar`) but the outline projection
 * (Task 2/4) doesn't carry a section `slug` yet — Task 7 adds it. Until
 * then there's nothing valid to pass, so no control here calls it; the
 * prop is accepted so `Workspace.tsx`'s wiring already type-checks
 * against the shape both views will share.
 */

export interface OutlineViewProps {
    projectSlug: string;
    workSlug: string;
    canUpdate: boolean;
    onNavigate: (slug: string) => void;
}

const paneStyle: CSSProperties = {
    height: '100%',
    overflowY: 'auto',
    padding: '1rem 1.5rem 3rem',
};

const headerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
};

const statusChipStyle: CSSProperties = {
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const conflictChipStyle: CSSProperties = {
    ...statusChipStyle,
    color: 'var(--theme-brand-secondary-500)',
    fontWeight: 600,
};

const errorChipStyle: CSSProperties = {
    ...statusChipStyle,
    color: 'var(--theme-status-error-stroke)',
    fontWeight: 600,
};

const rowStyle: CSSProperties = {
    marginBottom: '0.375rem',
};

const rowLineStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.1875rem 0.375rem',
};

const labelChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
};

const titleInputStyle: CSSProperties = {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--theme-base-content)',
    fontFamily: 'inherit',
    fontSize: '0.9375rem',
    fontWeight: 600,
    padding: '0.125rem 0',
    minWidth: '6rem',
    flex: '1 1 40%',
};

const dashStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
    flexShrink: 0,
};

const synopsisInputStyle: CSSProperties = {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    fontFamily: 'inherit',
    fontSize: '0.8125rem',
    fontStyle: 'italic',
    padding: '0.125rem 0',
    flex: '1 1 60%',
    minWidth: '4rem',
};

const iconBtnStyle: CSSProperties = {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.75rem',
    padding: '0.125rem 0.25rem',
    flexShrink: 0,
};

const blockedHintStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
    fontSize: '0.75rem',
    marginTop: '0.125rem',
};

const blockedConfirmStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.1875rem',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--theme-radius-button)',
    background: 'color-mix(in srgb, var(--theme-status-error-stroke) 10%, transparent)',
    color: 'var(--theme-status-error-stroke)',
    fontSize: '0.75rem',
};

const confirmBtnStyle: CSSProperties = {
    border: 'none',
    borderRadius: 'var(--theme-radius-button)',
    background: 'var(--theme-status-error-stroke)',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.125rem 0.5rem',
    cursor: 'pointer',
};

const keepBtnStyle: CSSProperties = {
    border: 'none',
    background: 'none',
    color: 'inherit',
    fontSize: '0.75rem',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
};

const beatsWrapStyle: CSSProperties = {
    marginTop: '0.125rem',
    marginLeft: '1.75rem',
};

const beatRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.0625rem 0',
};

function beatCheckStyle(done: boolean): CSSProperties {
    return {
        width: '0.8125rem',
        height: '0.8125rem',
        borderRadius: '999px',
        border: `1.5px solid ${done ? 'var(--theme-brand-primary-500)' : 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)'}`,
        background: done ? 'var(--theme-brand-primary-500)' : 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
    };
}

function beatTextStyle(done: boolean): CSSProperties {
    return {
        fontSize: '0.8125rem',
        color: done
            ? 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)'
            : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
        textDecoration: done ? 'line-through' : 'none',
        flex: 1,
    };
}

const emptyStateStyle: CSSProperties = {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.875rem',
};

const addFirstBtnStyle: CSSProperties = {
    marginTop: '0.75rem',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    background: 'none',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.875rem',
    fontSize: '0.8125rem',
    cursor: 'pointer',
};

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function apiHeaders(withBody = false): HeadersInit {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken(),
    };

    if (withBody) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

function blockedFor(row: OutlineRow, blocked: BlockedOutlineRow[]): BlockedOutlineRow | undefined {
    return row.sectionId === null ? undefined : blocked.find((b) => b.sectionId === row.sectionId);
}

export default function OutlineView({ projectSlug, workSlug, canUpdate }: OutlineViewProps) {
    const t = useT();
    const { rows, setRows, deleteRow, forceDelete, status, blocked, reload } = useOutlineSync({
        projectSlug,
        workSlug,
    });

    const inputRefs = useRef(new Map<string, HTMLInputElement>());
    const pendingFocusRef = useRef<string | null>(null);
    const [blockedHintKey, setBlockedHintKey] = useState<string | null>(null);

    useEffect(() => {
        if (pendingFocusRef.current === null) {
            return;
        }

        const el = inputRefs.current.get(pendingFocusRef.current);
        pendingFocusRef.current = null;
        el?.focus();
    }, [rows]);

    function flashBlockedHint(key: string) {
        setBlockedHintKey(key);
        window.setTimeout(() => {
            setBlockedHintKey((current) => (current === key ? null : current));
        }, 2500);
    }

    /** Run a reducer action, apply it, and — if it minted a brand new
     *  row (Enter, or Shift-Tab promoting a beat) — focus it once it's
     *  mounted. */
    function dispatch(action: OutlineAction) {
        const before = rows;
        const result = outlineReducer(before, action);

        if (result.blockedHint !== null) {
            flashBlockedHint(result.blockedHint);
        }

        if (result.rows !== before) {
            const beforeKeys = new Set(before.map((row) => row.key));
            const created = result.rows.find((row) => !beforeKeys.has(row.key));

            if (created !== undefined) {
                pendingFocusRef.current = created.key;
            }

            setRows(result.rows);
        }
    }

    async function toggleBeat(row: OutlineRow, beat: OutlineBeat) {
        if (row.sectionId === null) {
            dispatch({ type: 'toggle-beat', key: row.key, beatId: beat.id });
            return;
        }

        try {
            const response = await fetch(
                `${worksBase(projectSlug, workSlug)}/sections/${row.sectionId}/beats/${beat.id}`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: apiHeaders(true),
                    body: JSON.stringify({ done: !beat.done }),
                },
            );

            if (!response.ok) {
                return;
            }

            const body = (await response.json()) as { beats: OutlineBeat[] };
            setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, beats: body.beats } : r)));
        } catch {
            // Silent — the checkbox simply doesn't flip; the next click retries.
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, row: OutlineRow) {
        if (!canUpdate) {
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            dispatch({ type: 'enter', key: row.key });
            return;
        }

        if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            dispatch({ type: 'indent', key: row.key });
            return;
        }

        if (event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            dispatch({ type: 'outdent', key: row.key });
            return;
        }

        if (event.altKey && event.key === 'ArrowUp') {
            event.preventDefault();
            dispatch({ type: 'move', key: row.key, dir: 'up' });
            return;
        }

        if (event.altKey && event.key === 'ArrowDown') {
            event.preventDefault();
            dispatch({ type: 'move', key: row.key, dir: 'down' });
            return;
        }

        if (event.key === 'Backspace' && row.title === '') {
            event.preventDefault();
            deleteRow(row.key);
        }
    }

    function handleBeatKeyDown(event: KeyboardEvent<HTMLButtonElement>, row: OutlineRow, beat: OutlineBeat) {
        if (!canUpdate) {
            return;
        }

        if (event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            dispatch({ type: 'outdent', key: beatKey(row.key, beat.id) });
        }
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>, row: OutlineRow) {
        if (!canUpdate) {
            return;
        }

        const text = event.clipboardData.getData('text/plain');

        if (!text.includes('\n')) {
            // A single line pastes into the field normally.
            return;
        }

        event.preventDefault();
        dispatch({ type: 'paste', anchorKey: row.key, lines: parseOutlinePaste(text) });
    }

    function handleAddFirstRow() {
        const key = `t-${crypto.randomUUID()}`;
        setRows([
            {
                key,
                sectionId: null,
                tempId: key,
                parentKey: null,
                depth: 0,
                label: 'Act',
                title: '',
                slug: null,
                synopsis: null,
                beats: [],
            },
        ]);
        pendingFocusRef.current = key;
    }

    return (
        <div style={paneStyle} data-outline-view="">
            <div style={headerRowStyle}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('writing.outline.title')}
                </h2>
                {status === 'saving' && <span style={statusChipStyle}>{t('writing.workspace.saving')}</span>}
                {status === 'saved' && <span style={statusChipStyle}>{t('writing.workspace.saved')}</span>}
                {status === 'error' && <span style={errorChipStyle}>{t('writing.workspace.save_error')}</span>}
                {status === 'conflict' && (
                    <span style={conflictChipStyle}>{t('writing.outline.status_conflict')}</span>
                )}
            </div>

            {rows.length === 0 ? (
                <div style={emptyStateStyle}>
                    <p>{t('writing.outline.empty')}</p>
                    {canUpdate && (
                        <button type="button" style={addFirstBtnStyle} onClick={handleAddFirstRow}>
                            {t('writing.outline.add_first')}
                        </button>
                    )}
                </div>
            ) : (
                rows.map((row) => {
                    const blockedEntry = blockedFor(row, blocked);

                    return (
                        <div key={row.key} style={{ ...rowStyle, paddingLeft: `${row.depth * 1.5}rem` }}>
                            <div style={rowLineStyle}>
                                {row.label !== '' && <span style={labelChipStyle}>{row.label}</span>}
                                <input
                                    ref={(el) => {
                                        if (el) {
                                            inputRefs.current.set(row.key, el);
                                        } else {
                                            inputRefs.current.delete(row.key);
                                        }
                                    }}
                                    type="text"
                                    value={row.title}
                                    disabled={!canUpdate}
                                    placeholder={t('writing.outline.title_placeholder')}
                                    style={titleInputStyle}
                                    onChange={(event) =>
                                        dispatch({
                                            type: 'edit',
                                            key: row.key,
                                            title: event.target.value,
                                            synopsis: row.synopsis,
                                        })
                                    }
                                    onKeyDown={(event) => handleKeyDown(event, row)}
                                    onPaste={(event) => handlePaste(event, row)}
                                />
                                <span style={dashStyle}>—</span>
                                <input
                                    type="text"
                                    value={row.synopsis ?? ''}
                                    disabled={!canUpdate}
                                    placeholder={t('writing.outline.synopsis_placeholder')}
                                    style={synopsisInputStyle}
                                    onChange={(event) =>
                                        dispatch({
                                            type: 'edit',
                                            key: row.key,
                                            title: row.title,
                                            synopsis: event.target.value === '' ? null : event.target.value,
                                        })
                                    }
                                    onKeyDown={(event) => handleKeyDown(event, row)}
                                />
                                {canUpdate && (
                                    <button
                                        type="button"
                                        style={iconBtnStyle}
                                        aria-label={t('writing.outline.delete_row')}
                                        onClick={() => deleteRow(row.key)}
                                    >
                                        <i className="fa-solid fa-trash" aria-hidden="true" />
                                    </button>
                                )}
                            </div>

                            {blockedHintKey === row.key && (
                                <div style={blockedHintStyle}>{t('writing.outline.beat_conversion_blocked')}</div>
                            )}

                            {blockedEntry !== undefined && (
                                <div style={blockedConfirmStyle}>
                                    <span>
                                        {t(
                                            `writing.outline.blocked_${blockedEntry.reason}`,
                                            t('writing.outline.blocked_generic'),
                                        )}
                                    </span>
                                    <button
                                        type="button"
                                        style={confirmBtnStyle}
                                        onClick={() => forceDelete(row.key)}
                                    >
                                        {t('writing.outline.force_delete')}
                                    </button>
                                    <button type="button" style={keepBtnStyle} onClick={() => reload()}>
                                        {t('writing.outline.keep_row')}
                                    </button>
                                </div>
                            )}

                            {row.beats.length > 0 && (
                                <div style={beatsWrapStyle}>
                                    {row.beats.map((beat) => (
                                        <div key={beat.id} style={beatRowStyle}>
                                            <button
                                                type="button"
                                                role="checkbox"
                                                aria-checked={beat.done}
                                                aria-label={beat.text}
                                                disabled={!canUpdate}
                                                style={beatCheckStyle(beat.done)}
                                                onClick={() => toggleBeat(row, beat)}
                                                onKeyDown={(event) => handleBeatKeyDown(event, row, beat)}
                                            />
                                            <span style={beatTextStyle(beat.done)}>{beat.text}</span>
                                            {canUpdate && (
                                                <button
                                                    type="button"
                                                    style={iconBtnStyle}
                                                    aria-label={t('writing.outline.delete_beat')}
                                                    onClick={() =>
                                                        dispatch({
                                                            type: 'delete',
                                                            key: beatKey(row.key, beat.id),
                                                        })
                                                    }
                                                >
                                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
