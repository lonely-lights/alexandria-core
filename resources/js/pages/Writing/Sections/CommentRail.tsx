import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import type { WritingEditorBridge } from '@alexandria/pages/Writing/ribbon/writingRibbonContext';

import {
    groupComments,
    sortByCreatedAt,
    type CommentData,
    type PositionMap,
} from './commentRailModel';
import { reanchorComments } from './reanchorComments';
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
 * Anchor persistence: durable server-side text-quote anchors;
 * reanchorComments runs on comment-list load/reload (section fetch) and
 * on editor-bridge changes (section switch / doc replacement) to restore
 * marks from anchor_text. NEVER runs on ordinary editing ticks — deleting
 * an anchor hides the comment from the rail in-session (undo restores).
 * Multi-paragraph anchors do not re-anchor in v1 (single-block text only).
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
    pendingAnchor: { from: number; to: number; text: string } | null;
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
    const [saveError, setSaveError] = useState(false);
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
    /* Runs on every editorTick so card ordering and orphan-filtering stay live. */
    /* Never calls reanchorComments here — that would resurrect just-deleted anchors. */

    useEffect(() => {
        if (!editorBridge) {
            setPositionMap({});
            return;
        }
        setPositionMap(editorBridge.getCommentPositionMap());
    }, [editorBridge, editorTick]);

    /* ── Re-anchor on load + doc replacement — never for anchors the user removed ── */
    /* Once a comment has been anchored in this doc instance, the document history   */
    /* is the only truth: deleting the anchor orphans it (undo restores it). The     */
    /* seen-set records every id observed anchored; only unseen ids re-anchor. The   */
    /* set resets when the doc is genuinely replaced (new editor instance, or the    */
    /* 'alexandria:comment-doc-replaced' event from code-view/AI-apply round-trips). */

    const seenAnchoredIdsRef = useRef<Set<number>>(new Set());
    const [docEpoch, setDocEpoch] = useState(0);

    // Key the reset on the SECTION, not the bridge object — the editors
    // recreate their imperative handle on every render, so bridge identity
    // churns per keystroke (confirmed via logging 2026-07-09) and had been
    // wiping the seen-set continuously, licensing re-anchors mid-edit.
    useEffect(() => {
        seenAnchoredIdsRef.current = new Set();
    }, [sectionId]);

    useEffect(() => {
        function handleDocReplaced() {
            seenAnchoredIdsRef.current = new Set();
            setDocEpoch((n) => n + 1);
        }
        window.addEventListener('alexandria:comment-doc-replaced', handleDocReplaced);
        return () => window.removeEventListener('alexandria:comment-doc-replaced', handleDocReplaced);
    }, []);

    useEffect(() => {
        for (const id of Object.keys(positionMap)) {
            seenAnchoredIdsRef.current.add(Number(id));
        }
    }, [positionMap]);

    useEffect(() => {
        if (!editorBridge || !canUpdate) return;
        const liveMap = editorBridge.getCommentPositionMap();
        const toReanchor = comments.filter(
            (c) => c.anchor_text && !(c.id in liveMap) && !seenAnchoredIdsRef.current.has(c.id),
        );
        if (toReanchor.length > 0) {
            reanchorComments(editorBridge, toReanchor);
            // The dispatch triggers onStateChange → editorTick bumps →
            // position-map effect above re-reads the updated map.
        }
    }, [editorBridge, comments, canUpdate, docEpoch]);

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
    /* F2: read-only viewers have no CommentMark extension; bypass orphan filter */

    const ordered = useMemo(() => {
        // When there's no editor bridge OR the user can't author marks
        // (read-only viewer), fall back to created_at order and show all
        // comments without orphan filtering — no mark = no position map.
        if (!editorBridge || !canUpdate) {
            const all = sortByCreatedAt(comments);
            return {
                active: all.filter((c) => c.resolved_at === null),
                resolved: all.filter((c) => c.resolved_at !== null),
            };
        }
        return groupComments(comments, positionMap);
    }, [comments, positionMap, editorBridge, canUpdate]);

    /* ── Add-comment save ── */

    const handleSave = useCallback(async () => {
        if (!draft.trim() || sectionId === null || saving) return;
        setSaving(true);
        setSaveError(false);
        try {
            const body: Record<string, unknown> = {
                work_section_id: sectionId,
                body: draft.trim(),
            };
            // F1: persist anchor_text + offset hint so marks survive reload.
            if (pendingAnchor) {
                body.anchor_text = pendingAnchor.text.slice(0, 2000);
                body.anchor_offset_hint = pendingAnchor.from;
            }
            const r = await fetch(
                `/works/${projectSlug}/${workSlug}/sections/comments`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: apiHeaders(true),
                    body: JSON.stringify(body),
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
            // F4: show inline error so the user knows the save failed.
            setSaveError(true);
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
            // F2: clear the highlight from the editor immediately on delete.
            // Resolved comments keep their anchors by design — only deletes remove them.
            editorBridge?.removeCommentMark(id);
        } catch {
            // Silent
        }
    }, [projectSlug, workSlug, editorBridge]);

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
                            onClick={() => { setDraft(''); setSaveError(false); onComposerDismiss(); }}
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
                    {saveError && (
                        <p style={{ ...errorStyle, padding: '0.375rem 0', textAlign: 'left' }}>
                            {t('writing.comments.error')}
                        </p>
                    )}
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
