import { useEffect, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import { worksBase } from '@alexandria/lib/urls';

import { planCollapsed } from './PlanBlock';
import type { OutlineBeat, OutlineProjection, ServerOutlineRow } from './outlineTypes';

/**
 * Read-mostly sidebar outline mode — spec 2026-08-28 outline-mode Task 7.
 *
 * The right-rail counterpart to the full-pane `OutlineView`: the same
 * section tree, indented and read-only, so a writer can keep their place
 * in the outline while the main pane shows an editor. The ONLY mutation
 * this view performs is a beat check-off (PATCH, optimistic + revert) —
 * no add/rename/reorder/delete. Clicking a row's title navigates via
 * `onNavigate(slug)`, the same callback `Navigator` and `OutlineView`
 * already use.
 *
 * Load pattern mirrors `SidebarNotesPanel`: fetch on mount, refetch
 * whenever the identifying props change (project/work/current section) —
 * a cancel-ref guards against a stale response landing after a newer
 * fetch started. There's no `editorTick`-equivalent signal available to
 * a built-in sidebar mode's props (unlike registered modes, which
 * receive it from `Workspace`'s bridge) — see the module doc in
 * `Workspace.tsx` — and it wouldn't help here anyway: `PlanBlock`'s
 * synopsis/beat edits are plain `fetch` calls that don't bump it. The
 * `currentSectionId` dependency is the practical proxy: navigating to a
 * different section is the moment this view is most likely to be stale.
 */

export interface OutlineSidebarProps {
    projectSlug: string;
    workSlug: string;
    currentSectionId: number | null;
    canUpdate: boolean;
    onNavigate: (slug: string) => void;
}

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

/** The synopsis's first line only — a compact row in a narrow rail. */
function synopsisPreview(synopsis: string | null): string | null {
    if (synopsis === null) {
        return null;
    }

    const firstLine = synopsis.split('\n')[0].trim();

    return firstLine === '' ? null : firstLine;
}

const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.75rem 0.375rem',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    flexShrink: 0,
};

const titleStyle: CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
};

const hintStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)',
};

const rowWrapStyle: CSSProperties = {
    marginBottom: '0.125rem',
};

const rowHeadStyle: CSSProperties = {
    display: 'block',
    borderRadius: 'var(--theme-radius-button)',
    cursor: 'pointer',
};

const rowHeadActiveStyle: CSSProperties = {
    ...rowHeadStyle,
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 14%, transparent)',
};

const rowTitleStyle: CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--theme-base-content)',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const rowSynopsisStyle: CSSProperties = {
    fontSize: '0.75rem',
    fontStyle: 'italic',
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const beatsWrapStyle: CSSProperties = {
    marginTop: '0.125rem',
    marginLeft: '0.375rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
};

const beatRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.0625rem 0',
};

function beatDotStyle(done: boolean, canUpdate: boolean): CSSProperties {
    return {
        width: '0.6875rem',
        height: '0.6875rem',
        borderRadius: '999px',
        border: `1.5px solid ${done ? 'var(--theme-brand-primary-500)' : 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)'}`,
        background: done ? 'var(--theme-brand-primary-500)' : 'transparent',
        cursor: canUpdate ? 'pointer' : 'default',
        flexShrink: 0,
        padding: 0,
    };
}

function beatTextStyle(done: boolean): CSSProperties {
    return {
        fontSize: '0.75rem',
        color: done
            ? 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)'
            : 'color-mix(in srgb, var(--theme-base-content) 75%, transparent)',
        textDecoration: done ? 'line-through' : 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
    };
}

const collapsedLineStyle: CSSProperties = {
    marginTop: '0.125rem',
    marginLeft: '0.375rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3125rem',
    border: 'none',
    background: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.75rem',
};

export default function OutlineSidebar({
    projectSlug,
    workSlug,
    currentSectionId,
    canUpdate,
    onNavigate,
}: OutlineSidebarProps) {
    const t = useT();
    const [rows, setRows] = useState<ServerOutlineRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<Set<number>>(new Set());

    const cancelRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        cancelRef.current();
        let cancelled = false;
        cancelRef.current = () => {
            cancelled = true;
        };

        setLoading(true);
        setFailed(false);

        fetch(`${worksBase(projectSlug, workSlug)}/outline`, {
            credentials: 'same-origin',
            headers: apiHeaders(),
        })
            .then((response) =>
                response.ok
                    ? (response.json() as Promise<OutlineProjection>)
                    : Promise.reject(new Error(`HTTP ${response.status}`)),
            )
            .then((projection) => {
                if (cancelled) {
                    return;
                }

                setRows(projection.rows);
                setFailed(false);
                setLoading(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setFailed(true);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [projectSlug, workSlug, currentSectionId]);

    async function toggleBeat(sectionId: number, beat: OutlineBeat) {
        if (!canUpdate) {
            return;
        }

        const previous = rows;

        setRows((prev) =>
            prev.map((row) =>
                row.sectionId === sectionId
                    ? { ...row, beats: row.beats.map((b) => (b.id === beat.id ? { ...b, done: !b.done } : b)) }
                    : row,
            ),
        );

        try {
            const response = await fetch(
                `${worksBase(projectSlug, workSlug)}/sections/${sectionId}/beats/${beat.id}`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: apiHeaders(true),
                    body: JSON.stringify({ done: !beat.done }),
                },
            );

            if (!response.ok) {
                setRows(previous);

                return;
            }

            const body = (await response.json()) as { beats: OutlineBeat[] };
            setRows((prev) => prev.map((row) => (row.sectionId === sectionId ? { ...row, beats: body.beats } : row)));
        } catch {
            setRows(previous);
        }
    }

    function toggleExpanded(sectionId: number) {
        setExpandedKeys((prev) => {
            const next = new Set(prev);

            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }

            return next;
        });
    }

    return (
        <div
            data-outline-sidebar=""
            style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        >
            <div style={headerStyle}>
                <span style={titleStyle}>{t('writing.outline.sidebar_label')}</span>
            </div>

            <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto px-1 py-2">
                {loading && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.outline.sidebar_loading')}
                    </p>
                )}

                {failed && (
                    <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('writing.outline.sidebar_error')}
                    </p>
                )}

                {!loading && !failed && rows.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.outline.empty')}
                    </p>
                )}

                {!loading &&
                    !failed &&
                    rows.map((row) => {
                        const synopsis = synopsisPreview(row.synopsis);
                        const isCurrent = row.sectionId === currentSectionId;
                        const expanded = expandedKeys.has(row.sectionId);
                        const collapsed = planCollapsed(row.beats) && !expanded;

                        return (
                            <div
                                key={row.sectionId}
                                style={{ ...rowWrapStyle, paddingLeft: `${row.depth * 0.875}rem` }}
                            >
                                <div
                                    role="button"
                                    tabIndex={0}
                                    aria-current={isCurrent ? 'true' : undefined}
                                    className="alex-row px-3 py-1.5"
                                    style={isCurrent ? rowHeadActiveStyle : rowHeadStyle}
                                    onClick={() => onNavigate(row.slug)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onNavigate(row.slug);
                                        }
                                    }}
                                >
                                    <span style={rowTitleStyle}>{row.title}</span>
                                    {synopsis !== null && <span style={rowSynopsisStyle}>{synopsis}</span>}
                                </div>

                                {row.beats.length > 0 &&
                                    (collapsed ? (
                                        <button
                                            type="button"
                                            data-outline-sidebar-collapsed=""
                                            onClick={() => toggleExpanded(row.sectionId)}
                                            style={collapsedLineStyle}
                                        >
                                            <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                            {t('writing.plan.done_line').replace(':count', String(row.beats.length))}
                                        </button>
                                    ) : (
                                        <div style={beatsWrapStyle}>
                                            {row.beats.map((beat) => (
                                                <div key={beat.id} style={beatRowStyle}>
                                                    <button
                                                        type="button"
                                                        role="checkbox"
                                                        aria-checked={beat.done}
                                                        aria-label={beat.text}
                                                        disabled={!canUpdate}
                                                        style={beatDotStyle(beat.done, canUpdate)}
                                                        onClick={() => toggleBeat(row.sectionId, beat)}
                                                    />
                                                    <span style={beatTextStyle(beat.done)}>{beat.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
