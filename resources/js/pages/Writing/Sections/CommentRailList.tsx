import { useState, type CSSProperties, type MouseEvent } from 'react';

import useT from '@alexandria/hooks/useT';

import type { CommentData } from './commentRailModel';

/**
 * Style-B comment rail renderer — Stage 11.5 Task 3.
 *
 * Renders comment cards in document order. Resolved comments collapse
 * into a "Resolved (N)" disclosure group. Dispatches interaction
 * events back to CommentRail via the callbacks object.
 *
 * Registered as the 'list' style; CommentRail dispatches here after
 * reading COMMENT_RAIL_STYLE (currently a module constant stub).
 */

interface CommentRailListCallbacks {
    onResolve: (id: number) => void;
    onUnresolve: (id: number) => void;
    onEdit: (id: number, body: string) => void;
    onDelete: (id: number) => void;
    onAnchorClick: (id: number) => void;
}

interface CommentRailListProps {
    active: CommentData[];
    resolved: CommentData[];
    currentUserId: number;
    canUpdate: boolean;
    highlightCommentId: number | null;
    callbacks: CommentRailListCallbacks;
}

/* ── Styles ── */

const cardStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-card)',
    padding: '0.5rem 0.625rem',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    cursor: 'pointer',
    transition: 'background 0.1s',
};

const cardHighlightStyle: CSSProperties = {
    ...cardStyle,
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 10%, transparent)',
    borderLeft: '3px solid var(--theme-brand-secondary-500)',
    paddingLeft: '0.375rem',
};

const authorStyle: CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    flex: 1,
};

const timeStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    flexShrink: 0,
};

const bodyStyle: CSSProperties = {
    fontSize: '0.8125rem',
    lineHeight: 1.45,
    marginTop: '0.25rem',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
};

const actionRowStyle: CSSProperties = {
    display: 'flex',
    gap: '0.375rem',
    marginTop: '0.375rem',
    flexWrap: 'wrap',
};

const actionBtnStyle: CSSProperties = {
    fontSize: '0.6875rem',
    background: 'none',
    border: 'none',
    padding: '0.125rem 0.25rem',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

const deleteBtnStyle: CSSProperties = {
    ...actionBtnStyle,
    color: 'var(--theme-status-error-stroke)',
};

const groupHeadingStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    background: 'none',
    border: 'none',
    padding: '0.25rem 0',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
};

const emptyStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    textAlign: 'center',
    padding: '1.5rem 0.5rem',
};

/* ── Relative time helper ── */

function relativeTime(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

/* ── Single comment card ── */

interface CommentCardProps {
    comment: CommentData;
    currentUserId: number;
    canUpdate: boolean;
    highlighted: boolean;
    callbacks: CommentRailListCallbacks;
}

function CommentCard({ comment, currentUserId, canUpdate, highlighted, callbacks }: CommentCardProps) {
    const t = useT();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comment.body);

    const isOwn = comment.author.id === currentUserId;
    const canResolve = isOwn || canUpdate;
    const isResolved = comment.resolved_at !== null;

    function startEdit(e: MouseEvent) {
        e.stopPropagation();
        setDraft(comment.body);
        setEditing(true);
    }

    function cancelEdit(e: MouseEvent) {
        e.stopPropagation();
        setEditing(false);
        setDraft(comment.body);
    }

    function saveEdit(e: MouseEvent) {
        e.stopPropagation();
        if (!draft.trim()) return;
        callbacks.onEdit(comment.id, draft.trim());
        setEditing(false);
    }

    return (
        <div
            data-comment-card={comment.id}
            style={highlighted ? cardHighlightStyle : cardStyle}
            onClick={() => !editing && callbacks.onAnchorClick(comment.id)}
        >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                <span style={authorStyle}>{comment.author.name}</span>
                <span style={timeStyle}>{relativeTime(comment.created_at)}</span>
            </div>

            {editing ? (
                /* Edit mode */
                <div onClick={(e) => e.stopPropagation()}>
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); setDraft(comment.body); }
                        }}
                        autoFocus
                        style={{
                            display: 'block',
                            width: '100%',
                            minHeight: '4rem',
                            fontSize: '0.8125rem',
                            padding: '0.375rem 0.5rem',
                            marginTop: '0.375rem',
                            borderRadius: 'var(--theme-radius-input)',
                            border: '1px solid color-mix(in srgb, var(--theme-brand-secondary-500) 50%, transparent)',
                            background: 'var(--theme-base-page)',
                            color: 'var(--theme-base-content)',
                            resize: 'vertical',
                            outline: 'none',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', marginTop: '0.375rem' }}>
                        <button type="button" onMouseDown={cancelEdit} style={actionBtnStyle}>
                            {t('writing.comments.cancel')}
                        </button>
                        <button
                            type="button"
                            onMouseDown={saveEdit}
                            disabled={!draft.trim()}
                            style={{ ...actionBtnStyle, color: 'var(--theme-brand-secondary-500)', fontWeight: 600 }}
                        >
                            {t('writing.comments.save')}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <p style={bodyStyle}>{comment.body}</p>
                    <div style={actionRowStyle} onClick={(e) => e.stopPropagation()}>
                        {canResolve && (
                            <button
                                type="button"
                                style={actionBtnStyle}
                                onClick={() =>
                                    isResolved
                                        ? callbacks.onUnresolve(comment.id)
                                        : callbacks.onResolve(comment.id)
                                }
                            >
                                {isResolved ? t('writing.comments.unresolve') : t('writing.comments.resolve')}
                            </button>
                        )}
                        {isOwn && (
                            <>
                                <button type="button" style={actionBtnStyle} onClick={startEdit}>
                                    {t('writing.comments.edit')}
                                </button>
                                <button
                                    type="button"
                                    style={deleteBtnStyle}
                                    onClick={(e) => { e.stopPropagation(); callbacks.onDelete(comment.id); }}
                                >
                                    {t('writing.comments.delete')}
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/* ── List renderer ── */

export default function CommentRailList({
    active,
    resolved,
    currentUserId,
    canUpdate,
    highlightCommentId,
    callbacks,
}: CommentRailListProps) {
    const t = useT();
    const [resolvedOpen, setResolvedOpen] = useState(false);
    const hasAny = active.length > 0 || resolved.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Active comments */}
            {active.map((c) => (
                <CommentCard
                    key={c.id}
                    comment={c}
                    currentUserId={currentUserId}
                    canUpdate={canUpdate}
                    highlighted={highlightCommentId === c.id}
                    callbacks={callbacks}
                />
            ))}

            {/* Empty state */}
            {!hasAny && (
                <p style={emptyStyle}>{t('writing.comments.empty')}</p>
            )}

            {/* Resolved collapse group */}
            {resolved.length > 0 && (
                <div style={{ marginTop: active.length > 0 ? '0.5rem' : 0 }}>
                    <button
                        type="button"
                        style={groupHeadingStyle}
                        onClick={() => setResolvedOpen((o) => !o)}
                        aria-expanded={resolvedOpen}
                    >
                        <i
                            className={`fa-solid ${resolvedOpen ? 'fa-chevron-down' : 'fa-chevron-right'}`}
                            style={{ fontSize: '0.625rem' }}
                            aria-hidden="true"
                        />
                        {t('writing.comments.resolved_group').replace(':count', String(resolved.length))}
                    </button>

                    {resolvedOpen && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                marginTop: '0.375rem',
                                opacity: 0.75,
                            }}
                        >
                            {resolved.map((c) => (
                                <CommentCard
                                    key={c.id}
                                    comment={c}
                                    currentUserId={currentUserId}
                                    canUpdate={canUpdate}
                                    highlighted={highlightCommentId === c.id}
                                    callbacks={callbacks}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
