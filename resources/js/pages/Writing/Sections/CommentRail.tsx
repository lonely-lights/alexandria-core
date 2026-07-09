import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import type { WritingEditorBridge } from '@alexandria/pages/Writing/ribbon/writingRibbonContext';

import {
    extractPositionMap,
    groupComments,
    type CommentData,
    type PositionMap,
} from './commentRailModel';
import CommentRailList from './CommentRailList';

/**
 * Anchored comment rail — Stage 11.5 Task 3.
 *
 * Self-contained panel component: fetches comments for the current
 * section, renders them via a swappable style renderer, and handles
 * CRUD + resolve/unresolve. Receives the editor bridge so it can
 * apply marks after store and scroll to anchors on card click.
 *
 * Mounting: Workspace renders this in the right-rail aside when
 * referencePanelTab === 'comments' (Task 3 minimal wire); Task 4
 * will fold it into the multi-mode sidebar tab system.
 *
 * Known v1 limitation: comment marks are session-only (the wiki
 * serializer has no comment-mark syntax). After a page reload all
 * comments are orphaned (hidden from the ordered list). The rows
 * are retained server-side for a future re-anchoring pass.
 *
 * Preference stub: COMMENT_RAIL_STYLE is a module constant for now.
 * TODO: Stage 16 — read from `writing.comment_rail_style` user
 * preference when Style A (margin-aligned) ships and the Settings
 * toggle is added. CommentRailList is already the 'list' renderer.
 */

// Stub — only 'list' exists in v1. When Style A ships: read from
// `writing.comment_rail_style` stored preference and add the UI toggle.
const COMMENT_RAIL_STYLE = 'list' as const;

/* ── Props ── */

interface CommentRailProps {
    workSlug: string;
    projectSlug: string;
    sectionId: number | null;
    editorBridge: WritingEditorBridge | null;
    /** Bumped on every editor transaction so position maps stay fresh. */
    editorTick: number;
    currentUserId: number;
    canUpdate: boolean;
    /** Non-null when the user clicked "Add comment" with text selected. */
    pendingAnchor: { from: number; to: number } | null;
    onComposerDismiss: () => void;
    /** Set when the user clicks a comment mark in the editor. */
    highlightCommentId: number | null;
    onHighlightHandled: () => void;
}

/* ── Styles ── */

const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.625rem 0.75rem 0.5rem',
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
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    padding: '0.5rem 0.75rem 0',
    lineHeight: 1.4,
};

const composerStyle: CSSProperties = {
    padding: '0.625rem 0.75rem',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    flexShrink: 0,
};

const textareaStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    minHeight: '4rem',
    fontSize: '0.8125rem',
    padding: '0.375rem 0.5rem',
    borderRadius: 'var(--theme-radius-input)',
    border: '1px solid color-mix(in srgb, var(--theme-brand-secondary-500) 50%, transparent)',
    background: 'var(--theme-base-page)',
    color: 'var(--theme-base-content)',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
};

const composerActionsStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.375rem',
    marginTop: '0.375rem',
};

const btnSecondaryStyle: CSSProperties = {
    fontSize: '0.75rem',
    padding: '0.25rem 0.625rem',
    borderRadius: 'var(--theme-radius-button)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const btnPrimaryStyle: CSSProperties = {
    ...btnSecondaryStyle,
    background: 'var(--theme-brand-secondary-500)',
    color: '#fff',
    fontWeight: 600,
};

const bodyStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '0.5rem 0.75rem',
};

const errorStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: 'var(--theme-status-error-stroke)',
    padding: '0.75rem',
    textAlign: 'center',
};

const loadingStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    padding: '0.75rem',
    textAlign: 'center',
};

const noSectionStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    padding: '2rem 0.75rem',
    textAlign: 'center',
};

/* ── Fetch helper ── */

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function apiHeaders(withBody = false): HeadersInit {
    const h: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken(),
    };
    if (withBody) h['Content-Type'] = 'application/json';
    return h;
}

/* ── Component ── */

export default function CommentRail({
    workSlug,
    projectSlug,
    sectionId,
    editorBridge,
    editorTick,
    currentUserId,
    canUpdate,
    pendingAnchor,
    onComposerDismiss,
    highlightCommentId,
    onHighlightHandled,
}: CommentRailProps) {
    const t = useT();
    const [comments, setComments] = useState<CommentData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [positionMap, setPositionMap] = useState<PositionMap>({});

    /* ── Fetch comments when section changes ── */

    useEffect(() => {
        if (sectionId === null) {
            setComments([]);
            setLoading(false);
            setError(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(false);

        fetch(`/works/${projectSlug}/${workSlug}/sections/${sectionId}/comments`, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json() as Promise<{ comments: CommentData[] }>;
            })
            .then((payload) => {
                if (!cancelled) {
                    setComments(payload.comments ?? []);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError(true);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [projectSlug, workSlug, sectionId]);

    /* ── Rebuild position map on every editor transaction ── */

    useEffect(() => {
        if (!editorBridge) {
            setPositionMap({});
            return;
        }
        setPositionMap(editorBridge.getCommentPositionMap());
        // editorTick is the dependency that changes on every transaction
    }, [editorBridge, editorTick]);

    /* ── Scroll to + flash when highlightCommentId changes ── */

    const highlightHandledRef = useRef(onHighlightHandled);
    highlightHandledRef.current = onHighlightHandled;

    useEffect(() => {
        if (highlightCommentId === null) return;
        editorBridge?.scrollToCommentMark(highlightCommentId);
        // Scroll the rail card into view
        const card = document.querySelector(`[data-comment-card="${highlightCommentId}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Clear highlight signal after card flash has shown
        const timer = setTimeout(() => highlightHandledRef.current(), 900);
        return () => clearTimeout(timer);
    }, [editorBridge, highlightCommentId]);

    /* ── Derived ordered list ── */

    const ordered = useMemo(
        () => groupComments(comments, positionMap),
        [comments, positionMap],
    );

    /* ── Add-comment save ── */

    const handleSave = useCallback(async () => {
        if (!draft.trim() || sectionId === null || saving) return;
        setSaving(true);
        try {
            const r = await fetch(
                `/works/${projectSlug}/${workSlug}/sections/comments`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: apiHeaders(true),
                    body: JSON.stringify({ work_section_id: sectionId, body: draft.trim() }),
                },
            );
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const comment = (await r.json()) as CommentData;
            setComments((prev) => [...prev, comment]);
            // Apply the mark in the editor now that we have the comment id
            if (pendingAnchor) {
                editorBridge?.applyCommentMark(pendingAnchor.from, pendingAnchor.to, comment.id);
            }
            setDraft('');
            onComposerDismiss();
        } catch {
            // Leave composer open so user can retry
        } finally {
            setSaving(false);
        }
    }, [draft, sectionId, saving, projectSlug, workSlug, pendingAnchor, editorBridge, onComposerDismiss]);

    /* ── CRUD callbacks ── */

    const handleResolve = useCallback(async (id: number) => {
        try {
            const r = await fetch(
                `/works/${projectSlug}/${workSlug}/sections/comments/${id}/resolve`,
                { method: 'POST', credentials: 'same-origin', headers: apiHeaders() },
            );
            if (!r.ok) return;
            const updated = (await r.json()) as CommentData;
            setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
        } catch {
            // Silent — server retains state
        }
    }, [projectSlug, workSlug]);

    const handleUnresolve = useCallback(async (id: number) => {
        try {
            const r = await fetch(
                `/works/${projectSlug}/${workSlug}/sections/comments/${id}/unresolve`,
                { method: 'POST', credentials: 'same-origin', headers: apiHeaders() },
            );
            if (!r.ok) return;
            const updated = (await r.json()) as CommentData;
            setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
        } catch {
            // Silent
        }
    }, [projectSlug, workSlug]);

    const handleEdit = useCallback(async (id: number, body: string) => {
        try {
            const r = await fetch(
                `/works/${projectSlug}/${workSlug}/sections/comments/${id}`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: apiHeaders(true),
                    body: JSON.stringify({ body }),
                },
            );
            if (!r.ok) return;
            const updated = (await r.json()) as CommentData;
            setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
        } catch {
            // Silent
        }
    }, [projectSlug, workSlug]);

    const handleDelete = useCallback(async (id: number) => {
        try {
            const r = await fetch(
                `/works/${projectSlug}/${workSlug}/sections/comments/${id}`,
                { method: 'DELETE', credentials: 'same-origin', headers: apiHeaders() },
            );
            if (!r.ok) return;
            setComments((prev) => prev.filter((c) => c.id !== id));
        } catch {
            // Silent
        }
    }, [projectSlug, workSlug]);

    const handleAnchorClick = useCallback((id: number) => {
        editorBridge?.scrollToCommentMark(id);
    }, [editorBridge]);

    /* ── Rail style dispatch (only 'list' in v1) ── */
    // COMMENT_RAIL_STYLE is read here so the seam is obvious for Task 4's
    // Settings UI wiring. Currently always 'list'.
    const railStyle = COMMENT_RAIL_STYLE;

    /* ── Render ── */

    return (
        <div
            data-comment-rail
            style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        >
            {/* Header */}
            <div style={headerStyle}>
                <span style={titleStyle}>{t('writing.comments.title')}</span>
            </div>

            {/* Add-comment composer (shown when user clicked the floating button) */}
            {pendingAnchor !== null && canUpdate && (
                <div style={composerStyle}>
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={t('writing.comments.placeholder')}
                        autoFocus
                        style={textareaStyle}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') onComposerDismiss();
                        }}
                    />
                    <div style={composerActionsStyle}>
                        <button
                            type="button"
                            style={btnSecondaryStyle}
                            onClick={() => { setDraft(''); onComposerDismiss(); }}
                            disabled={saving}
                        >
                            {t('writing.comments.cancel')}
                        </button>
                        <button
                            type="button"
                            style={btnPrimaryStyle}
                            onClick={handleSave}
                            disabled={!draft.trim() || saving}
                        >
                            {saving ? '…' : t('writing.comments.save')}
                        </button>
                    </div>
                </div>
            )}

            {/* Hint when no section */}
            {sectionId === null && (
                <p style={noSectionStyle}>{t('writing.comments.no_section')}</p>
            )}

            {/* Hint to select text (when section present, can update, no pending anchor) */}
            {sectionId !== null && canUpdate && pendingAnchor === null && (
                <p style={hintStyle}>{t('writing.comments.select_to_add')}</p>
            )}

            {/* Body — comment list */}
            {sectionId !== null && (
                <div style={bodyStyle}>
                    {loading && <p style={loadingStyle}>{t('writing.comments.loading')}</p>}
                    {error && !loading && <p style={errorStyle}>{t('writing.comments.error')}</p>}
                    {!loading && !error && railStyle === 'list' && (
                        <CommentRailList
                            active={ordered.active}
                            resolved={ordered.resolved}
                            currentUserId={currentUserId}
                            canUpdate={canUpdate}
                            highlightCommentId={highlightCommentId}
                            callbacks={{
                                onResolve: handleResolve,
                                onUnresolve: handleUnresolve,
                                onEdit: handleEdit,
                                onDelete: handleDelete,
                                onAnchorClick: handleAnchorClick,
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
