import { useState, useMemo, useRef, useEffect, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { fetchJson, FetchJsonError } from '@alexandria/lib/fetchJson';
import useT from '@alexandria/hooks/useT';
import WorkbenchKeyLegend from './WorkbenchKeyLegend';
import type { WorkbenchBlueprint, WorkbenchNotebook, RoutedNotesPage } from '@alexandria/types/workbench';

interface WorkbenchRoutingTabProps {
    projectSlug: string;
    blueprints: WorkbenchBlueprint[];
    notebooks: WorkbenchNotebook[];
    unsorted_count: number;
    pending_count: number;
}

/** A roster entry — blueprint or notebook, normalised for the rail + detail pane. */
type RosterKind = 'blueprint' | 'notebook';

interface RosterEntry {
    kind: RosterKind;
    id: number;
    slug: string;
    name: string;
    allowSort: boolean;
    description: string | null;
    count: number;
    isCatchAll: boolean;
}

type Selected = { kind: RosterKind; id: number } | null;

/* ── Theme styles ── */

const railHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
};

const labelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.75rem',
};

const descStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    fontSize: '0.8125rem',
    lineHeight: '1.4',
};

const countStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    fontSize: '0.75rem',
};

const catchAllBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.0625rem 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    letterSpacing: '0.025em',
    flexShrink: 0,
};

const toggleTrackOn: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    borderRadius: '9999px',
    width: '2.25rem',
    height: '1.25rem',
    position: 'relative',
    transition: 'background var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    cursor: 'pointer',
    flexShrink: 0,
};

const toggleTrackOff: CSSProperties = {
    ...toggleTrackOn,
    background: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const toggleThumb: CSSProperties = {
    position: 'absolute',
    top: '0.1875rem',
    width: '0.875rem',
    height: '0.875rem',
    background: 'white',
    borderRadius: '9999px',
    transition: 'left var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const railRowStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
};

const railRowSelectedStyle: CSSProperties = {
    ...railRowStyle,
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    boxShadow: 'inset 3px 0 0 var(--theme-brand-primary-500)',
};

const reviewCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '0.875rem 1rem',
    transition: 'border-color 0.1s',
};

const reviewCardActiveStyle: CSSProperties = {
    ...reviewCardStyle,
    border: '2px solid var(--theme-brand-primary-500)',
};

const monoStyle: CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '0.8125rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
};

const actionBarStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
};

const secondaryBtn: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const paneBorderColor = 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)';

const MAX_DESC = 2000;

function ToggleSwitch({
    checked,
    disabled,
    label,
    onChange,
}: {
    checked: boolean;
    disabled: boolean;
    label: string;
    onChange: () => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            style={checked ? toggleTrackOn : toggleTrackOff}
        >
            <span style={{ ...toggleThumb, left: checked ? '1.1875rem' : '0.1875rem' }} />
        </button>
    );
}

function descriptionPreview(text: string | null, maxLen = 160): string {
    if (!text) return '';
    return text.length > maxLen ? `${text.slice(0, maxLen).trim()}…` : text;
}

/* ── Prompt preview modal ── */
function PromptPreviewModal({
    open,
    prompt,
    tokenEstimate,
    loading,
    onClose,
    t,
}: {
    open: boolean;
    prompt: string;
    tokenEstimate: number;
    loading: boolean;
    onClose: () => void;
    t: (k: string) => string;
}) {
    const [copied, setCopied] = useState(false);

    if (!open) return null;

    function handleCopy() {
        void navigator.clipboard.writeText(prompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    background: 'var(--theme-base-100)',
                    borderRadius: 'var(--theme-radius-card)',
                    padding: '1.5rem',
                    maxWidth: '56rem',
                    width: '100%',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
            >
                <div className="flex items-center justify-between gap-4">
                    <h2 className="font-semibold text-base" style={{ color: 'var(--theme-base-content)' }}>
                        {t('ai.workbench.prompt_preview.modal_title')}
                    </h2>
                    <div className="flex items-center gap-2">
                        {tokenEstimate > 0 && (
                            <span style={countStyle}>
                                {t('ai.workbench.prompt_preview.token_estimate').replace(':count', String(tokenEstimate))}
                            </span>
                        )}
                        <button
                            type="button"
                            className="alex-btn px-3 py-1 text-sm"
                            onClick={handleCopy}
                            style={{
                                background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                borderRadius: 'var(--theme-radius-button)',
                                color: 'var(--theme-base-content)',
                            }}
                        >
                            {copied ? t('ai.workbench.prompt_preview.copied') : t('ai.workbench.prompt_preview.copy_button')}
                        </button>
                        <button
                            type="button"
                            className="alex-btn px-2 py-1 text-sm"
                            onClick={onClose}
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}
                            aria-label="Close"
                        >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
                    {loading ? (
                        <p style={labelStyle}>{t('ai.workbench.prompt_preview.loading')}</p>
                    ) : (
                        <pre style={monoStyle}>{prompt}</pre>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Re-route picker modal ── */
type DestTarget = { kind: 'blueprint'; id: number; name: string } | { kind: 'notebook'; id: number; name: string };

function ReRouteModal({
    open,
    targets,
    busy,
    onSelect,
    onClose,
    t,
}: {
    open: boolean;
    targets: DestTarget[];
    busy: boolean;
    onSelect: (target: DestTarget) => void;
    onClose: () => void;
    t: (k: string) => string;
}) {
    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    background: 'var(--theme-base-100)',
                    borderRadius: 'var(--theme-radius-card)',
                    padding: '1.5rem',
                    maxWidth: '28rem',
                    width: '100%',
                    maxHeight: '70vh',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
            >
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-base" style={{ color: 'var(--theme-base-content)' }}>
                        {t('ai.workbench.review.reroute_modal_title')}
                    </h2>
                    <button type="button" onClick={onClose} style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}>
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </div>
                <div style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {targets.map((target) => (
                        <button
                            key={`${target.kind}-${target.id}`}
                            type="button"
                            disabled={busy}
                            onClick={() => onSelect(target)}
                            className="w-full text-left px-3 py-2 text-sm"
                            style={{
                                background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                                borderRadius: 'var(--theme-radius-button)',
                                color: 'var(--theme-base-content)',
                                border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                            }}
                        >
                            <span style={{ ...labelStyle, marginRight: '0.5rem' }}>
                                {target.kind === 'notebook' ? '📓' : '📋'}
                            </span>
                            {target.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Rail row ── */
function RosterRow({
    entry,
    isSelected,
    busy,
    countLabel,
    toggleLabel,
    catchAllLabel,
    onSelect,
    onToggle,
}: {
    entry: RosterEntry;
    isSelected: boolean;
    busy: boolean;
    countLabel: string;
    toggleLabel: string;
    catchAllLabel: string;
    onSelect: () => void;
    onToggle: () => void;
}) {
    return (
        <div
            className="alex-row flex items-center gap-2 px-3 py-2"
            data-selected={isSelected}
            style={isSelected ? railRowSelectedStyle : railRowStyle}
        >
            <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
                <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium" style={{ color: 'var(--theme-base-content)' }}>
                        {entry.name}
                    </span>
                    {entry.isCatchAll && <span style={catchAllBadgeStyle}>{catchAllLabel}</span>}
                </span>
                <span className="block" style={countStyle}>{countLabel}</span>
            </button>
            <ToggleSwitch
                checked={entry.allowSort}
                disabled={busy}
                label={`${toggleLabel}: ${entry.name}`}
                onChange={onToggle}
            />
        </div>
    );
}

/* ── Target review (rail-selection driven note review) ── */
function TargetReview({
    projectSlug,
    target,
    blueprints,
    notebooks,
    t,
}: {
    projectSlug: string;
    target: RosterEntry;
    blueprints: WorkbenchBlueprint[];
    notebooks: WorkbenchNotebook[];
    t: (k: string) => string;
}) {
    const [notesPage, setNotesPage] = useState<RoutedNotesPage | null>(null);
    const [notesLoading, setNotesLoading] = useState(false);
    const [cursorIdx, setCursorIdx] = useState(0);

    // Local review state (client-only for keeps/flags during session)
    const [localFlags, setLocalFlags] = useState<Record<number, 'kept' | 'flagged' | null>>({});

    // Re-route modal
    const [reRouteNoteId, setReRouteNoteId] = useState<number | null>(null);
    const [reRouteBusy, setReRouteBusy] = useState(false);

    const reRouteTargets: DestTarget[] = useMemo(() => {
        const bpTargets = blueprints.map((bp) => ({ kind: 'blueprint' as const, id: bp.id, name: bp.name }));
        const nbTargets = notebooks.map((nb) => ({ kind: 'notebook' as const, id: nb.id, name: nb.title }));
        return [...bpTargets, ...nbTargets];
    }, [blueprints, notebooks]);

    const containerRef = useRef<HTMLDivElement>(null);

    function loadNotes(page = 1) {
        setNotesLoading(true);
        fetchJson(
            `/ai/${projectSlug}/workbench/routed-notes?kind=${target.kind}&id=${target.id}&page=${page}`,
        )
            .then((data) => {
                setNotesPage(data as RoutedNotesPage);
                setCursorIdx(0);
                setLocalFlags({});
            })
            .catch(() => {})
            .finally(() => setNotesLoading(false));
    }

    useEffect(() => {
        loadNotes(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target.kind, target.id]);

    const notes = notesPage?.data ?? [];
    const cursorNote = notes[cursorIdx] ?? null;
    const cursorBodyRef = useRef<HTMLDivElement | null>(null);

    async function updateFlag(noteId: number, flag: 'workbench' | null) {
        try {
            await fetchJson(`/ai/${projectSlug}/workbench/notes/${noteId}/review-flag`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ flag }),
            });
            setLocalFlags((prev) => ({
                ...prev,
                [noteId]: flag === 'workbench' ? 'flagged' : 'kept',
            }));
        } catch {
            // no-op
        }
    }

    async function doReRoute(noteId: number, dest: DestTarget) {
        setReRouteBusy(true);
        try {
            await fetchJson(`/ai/${projectSlug}/workbench/notes/${noteId}/re-route`, {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ to: { kind: dest.kind, id: dest.id } }),
            });
            setReRouteNoteId(null);
            loadNotes(notesPage?.current_page ?? 1);
        } catch {
            // no-op
        } finally {
            setReRouteBusy(false);
        }
    }

    async function bulkKeepAll() {
        const unacted = notes.filter((n) => !localFlags[n.id]);
        for (const note of unacted) {
            await updateFlag(note.id, null);
        }
    }

    // Verdict actions — shared by the keyboard shortcuts and the clickable
    // legend buttons (owner: the bare A/G/S/R letters read as inert chrome).
    function keepCursor() {
        if (!cursorNote) return;
        void updateFlag(cursorNote.id, null).then(() => {
            setCursorIdx((i) => Math.min(i + 1, notes.length - 1));
        });
    }

    function flagCursor() {
        if (!cursorNote) return;
        void updateFlag(cursorNote.id, 'workbench').then(() => {
            setCursorIdx((i) => Math.min(i + 1, notes.length - 1));
        });
    }

    function skipCursor() {
        if (!cursorNote) return;
        // Skip also DE-SELECTS (owner): any existing verdict on the item is
        // cleared back to pending before the cursor advances.
        if (localFlags[cursorNote.id]) {
            const noteId = cursorNote.id;
            void fetchJson(`/ai/${projectSlug}/workbench/notes/${noteId}/review-flag`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ flag: null }),
            }).then(() => {
                setLocalFlags((prev) => {
                    const next = { ...prev };
                    delete next[noteId];
                    return next;
                });
            }).catch(() => {
                // no-op — verdict simply stays until retried
            });
        }
        setCursorIdx((i) => Math.min(i + 1, notes.length - 1));
    }

    function rerouteCursor() {
        if (!cursorNote) return;
        setReRouteNoteId(cursorNote.id);
    }

    // Keyboard handler
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'TEXTAREA' || tag === 'INPUT') return;
            if (!cursorNote) return;

            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                keepCursor();
            } else if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                flagCursor();
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                skipCursor();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                rerouteCursor();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const delta = e.key === 'ArrowDown' ? 1 : -1;
                if (e.shiftKey) {
                    // Shift+arrows scroll INSIDE the active note's overflow.
                    cursorBodyRef.current?.scrollBy({ top: delta * 96, behavior: 'smooth' });
                } else {
                    setCursorIdx((i) => Math.max(0, Math.min(i + delta, notes.length - 1)));
                }
            }
        }

        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursorNote, notes]);

    const keptCount = notes.filter((n) => localFlags[n.id] === 'kept').length;
    const flaggedCount = notes.filter((n) => localFlags[n.id] === 'flagged').length;
    const pendingCount = notes.filter((n) => !localFlags[n.id]).length;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" ref={containerRef}>
                {notesLoading && (
                    <p style={labelStyle}>{t('ai.workbench.review.loading')}</p>
                )}
                {!notesLoading && notes.length === 0 && (
                    <p style={labelStyle}>{t('ai.workbench.review.empty')}</p>
                )}
                {!notesLoading && notes.map((note, idx) => {
                    const flag = localFlags[note.id];
                    const isCursor = idx === cursorIdx;
                    return (
                        <div
                            key={note.id}
                            ref={isCursor ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                            style={isCursor ? reviewCardActiveStyle : reviewCardStyle}
                            onClick={() => setCursorIdx(idx)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate" style={{ color: 'var(--theme-base-content)' }}>
                                        {note.title || 'Untitled'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {flag === 'kept' && (
                                        <span style={{ ...catchAllBadgeStyle, background: 'color-mix(in srgb, var(--theme-brand-success, #22c55e) 15%, transparent)', color: 'var(--theme-brand-success, #16a34a)' }}>
                                            {t('ai.workbench.review.kept_badge')}
                                        </span>
                                    )}
                                    {flag === 'flagged' && (
                                        <span style={{ ...catchAllBadgeStyle, background: 'color-mix(in srgb, var(--theme-brand-warning, #f59e0b) 15%, transparent)', color: 'var(--theme-brand-warning, #b45309)' }}>
                                            {t('ai.workbench.review.flagged_badge')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div
                                ref={isCursor ? cursorBodyRef : undefined}
                                style={{
                                    marginTop: '0.5rem',
                                    maxHeight: '6rem',
                                    overflowY: 'auto',
                                    ...descStyle,
                                }}
                            >
                                {note.text || '(empty)'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Slim sticky action bar — counts, pagination, keyboard legend, keep-all */}
            {notes.length > 0 && (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-2.5" style={actionBarStyle}>
                    <div className="flex flex-wrap items-center gap-3">
                        <span style={countStyle}>
                            {t('ai.workbench.review.counts')
                                .replace(':kept', String(keptCount))
                                .replace(':flagged', String(flaggedCount))
                                .replace(':pending', String(pendingCount))}
                        </span>
                        {notesPage && notesPage.last_page > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={notesPage.current_page <= 1}
                                    onClick={() => loadNotes(notesPage.current_page - 1)}
                                    className="alex-btn px-2 py-0.5 text-xs"
                                    style={secondaryBtn}
                                >
                                    ←
                                </button>
                                <span style={labelStyle}>
                                    {t('ai.workbench.review.pagination')
                                        .replace(':current', String(notesPage.current_page))
                                        .replace(':last', String(notesPage.last_page))}
                                </span>
                                <button
                                    type="button"
                                    disabled={notesPage.current_page >= notesPage.last_page}
                                    onClick={() => loadNotes(notesPage.current_page + 1)}
                                    className="alex-btn px-2 py-0.5 text-xs"
                                    style={secondaryBtn}
                                >
                                    →
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {notes.length > 0 && (
                            <WorkbenchKeyLegend
                                pairs={[
                                    { key: 'A', label: t('ai.workbench.review.key_a'), onPress: keepCursor },
                                    { key: 'G', label: t('ai.workbench.review.key_g'), onPress: flagCursor },
                                    { key: 'S', label: t('ai.workbench.review.key_s'), onPress: skipCursor },
                                    { key: 'R', label: t('ai.workbench.review.key_r'), onPress: rerouteCursor },
                                    { key: '↑↓', label: t('ai.workbench.review.key_nav') },
                                    { key: '⇧↑↓', label: t('ai.workbench.review.key_scroll') },
                                ]}
                            />
                        )}
                        <button
                            type="button"
                            className="alex-btn px-3 py-1 text-sm"
                            onClick={() => void bulkKeepAll()}
                            style={secondaryBtn}
                        >
                            {t('ai.workbench.review.keep_all')}
                        </button>
                    </div>
                </div>
            )}

            {/* Re-route modal */}
            <ReRouteModal
                open={reRouteNoteId !== null}
                targets={reRouteTargets}
                busy={reRouteBusy}
                onSelect={(dest) => {
                    if (reRouteNoteId !== null) void doReRoute(reRouteNoteId, dest);
                }}
                onClose={() => setReRouteNoteId(null)}
                t={t}
            />
        </div>
    );
}

export default function WorkbenchRoutingTab({
    projectSlug,
    blueprints: initialBlueprints,
    notebooks: initialNotebooks,
}: WorkbenchRoutingTabProps) {
    const t = useT();

    // Optimistic overrides: map<id, toggled value> for in-flight toggles
    const [bpOverrides, setBpOverrides] = useState<Record<number, boolean>>({});
    const [nbOverrides, setNbOverrides] = useState<Record<number, boolean>>({});
    const [busyBp, setBusyBp] = useState<Record<number, boolean>>({});
    const [busyNb, setBusyNb] = useState<Record<number, boolean>>({});

    // Description edit state
    const [editingBpId, setEditingBpId] = useState<number | null>(null);
    const [editingNbId, setEditingNbId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [savingDesc, setSavingDesc] = useState(false);
    const [descSaved, setDescSaved] = useState(false);

    // Prompt preview modal
    const [promptModalOpen, setPromptModalOpen] = useState(false);
    const [promptContent, setPromptContent] = useState('');
    const [promptTokens, setPromptTokens] = useState(0);
    const [promptLoading, setPromptLoading] = useState(false);

    // Rail selection — drives the detail pane + review target.
    const [selected, setSelected] = useState<Selected>(null);

    const blueprints = initialBlueprints.map((bp) => ({
        ...bp,
        allow_ai_sorting: bpOverrides[bp.id] ?? bp.allow_ai_sorting,
    }));

    const notebooks = initialNotebooks.map((nb) => ({
        ...nb,
        allow_ai_sort: nbOverrides[nb.id] ?? nb.allow_ai_sort,
    }));

    const rosterBlueprints: RosterEntry[] = blueprints.map((bp) => ({
        kind: 'blueprint',
        id: bp.id,
        slug: bp.slug,
        name: bp.name,
        allowSort: bp.allow_ai_sorting,
        description: bp.description,
        count: bp.routed_count,
        isCatchAll: false,
    }));

    const rosterNotebooks: RosterEntry[] = notebooks.map((nb) => ({
        kind: 'notebook',
        id: nb.id,
        slug: nb.slug,
        name: nb.title,
        allowSort: nb.allow_ai_sort,
        description: nb.description,
        count: nb.note_count,
        isCatchAll: nb.is_catch_all,
    }));

    // Default the rail selection to the first entry with routed notes
    // (closest to the old "first destination tab" default), falling
    // back to the very first roster entry so the detail pane isn't
    // empty as soon as there's anything to route.
    useEffect(() => {
        if (selected !== null) return;
        const withNotes = [...rosterBlueprints, ...rosterNotebooks].find((e) => e.count > 0);
        const fallback = rosterBlueprints[0] ?? rosterNotebooks[0];
        const initial = withNotes ?? fallback;
        if (initial) setSelected({ kind: initial.kind, id: initial.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rosterBlueprints.length, rosterNotebooks.length]);

    const selectedEntry: RosterEntry | null =
        selected === null
            ? null
            : [...rosterBlueprints, ...rosterNotebooks].find(
                  (e) => e.kind === selected.kind && e.id === selected.id,
              ) ?? null;

    const isEditing = selectedEntry !== null && (
        (selectedEntry.kind === 'blueprint' && editingBpId === selectedEntry.id) ||
        (selectedEntry.kind === 'notebook' && editingNbId === selectedEntry.id)
    );

    async function toggleBlueprint(bp: WorkbenchBlueprint) {
        const next = !(bpOverrides[bp.id] ?? bp.allow_ai_sorting);
        setBpOverrides((prev) => ({ ...prev, [bp.id]: next }));
        setBusyBp((prev) => ({ ...prev, [bp.id]: true }));

        try {
            await fetchJson(`/ai/${projectSlug}/workbench/blueprints/${bp.slug}`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ allow_ai_sorting: next }),
            });
            router.reload({ only: ['blueprints', 'notebooks', 'unsorted_count', 'pending_count'] });
        } catch (err) {
            setBpOverrides((prev) => { const copy = { ...prev }; delete copy[bp.id]; return copy; });
            if (err instanceof FetchJsonError) console.error('Toggle blueprint failed:', err.status);
        } finally {
            setBusyBp((prev) => { const copy = { ...prev }; delete copy[bp.id]; return copy; });
        }
    }

    async function toggleNotebook(nb: WorkbenchNotebook) {
        const next = !(nbOverrides[nb.id] ?? nb.allow_ai_sort);
        setNbOverrides((prev) => ({ ...prev, [nb.id]: next }));
        setBusyNb((prev) => ({ ...prev, [nb.id]: true }));

        try {
            await fetchJson(`/ai/${projectSlug}/workbench/notebooks/${nb.slug}`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ allow_ai_sort: next }),
            });
            router.reload({ only: ['blueprints', 'notebooks', 'unsorted_count', 'pending_count'] });
        } catch (err) {
            setNbOverrides((prev) => { const copy = { ...prev }; delete copy[nb.id]; return copy; });
            if (err instanceof FetchJsonError) console.error('Toggle notebook failed:', err.status);
        } finally {
            setBusyNb((prev) => { const copy = { ...prev }; delete copy[nb.id]; return copy; });
        }
    }

    function openEdit(entry: RosterEntry) {
        if (entry.kind === 'blueprint') {
            setEditingBpId(entry.id);
            setEditingNbId(null);
        } else {
            setEditingNbId(entry.id);
            setEditingBpId(null);
        }
        setEditText(entry.description ?? '');
        setDescSaved(false);
    }

    function cancelEdit() {
        setEditingBpId(null);
        setEditingNbId(null);
        setEditText('');
    }

    async function saveDesc(slug: string, kind: RosterKind) {
        setSavingDesc(true);
        try {
            await fetchJson(`/ai/${projectSlug}/workbench/${kind === 'blueprint' ? 'blueprints' : 'notebooks'}/${slug}/description`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ description: editText || null }),
            });
            setDescSaved(true);
            router.reload({ only: ['blueprints', 'notebooks', 'unsorted_count', 'pending_count'] });
            setTimeout(() => {
                setEditingBpId(null);
                setEditingNbId(null);
                setDescSaved(false);
            }, 800);
        } catch {
            // show nothing; user can retry
        } finally {
            setSavingDesc(false);
        }
    }

    async function openPromptPreview() {
        setPromptModalOpen(true);
        setPromptLoading(true);
        try {
            const data = await fetchJson(`/ai/${projectSlug}/workbench/l1-prompt`) as { prompt: string; token_estimate: number };
            setPromptContent(data.prompt);
            setPromptTokens(data.token_estimate);
        } catch {
            setPromptContent('Failed to load prompt.');
            setPromptTokens(0);
        } finally {
            setPromptLoading(false);
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
            {/* ─── Rail ─── */}
            <div
                className="flex max-h-[45vh] min-h-0 shrink-0 flex-col lg:max-h-none lg:w-[340px] lg:border-r"
                style={{ borderColor: paneBorderColor }}
            >
                <div
                    className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
                    style={{ borderColor: paneBorderColor }}
                >
                    <span style={railHeadingStyle}>{t('ai.workbench.tab.routing')}</span>
                    <button
                        type="button"
                        onClick={() => void openPromptPreview()}
                        className="alex-btn inline-flex items-center gap-1.5 px-2 py-1 text-xs"
                        style={secondaryBtn}
                    >
                        <i className="fa-solid fa-eye text-[10px]" aria-hidden="true" />
                        {t('ai.workbench.prompt_preview.button')}
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="px-3 pt-2">
                        <span style={railHeadingStyle}>{t('ai.workbench.roster.blueprints_heading')}</span>
                    </div>
                    {rosterBlueprints.length === 0 ? (
                        <p className="px-3 py-2" style={labelStyle}>{t('ai.workbench.roster.empty_blueprints')}</p>
                    ) : (
                        rosterBlueprints.map((entry) => (
                            <RosterRow
                                key={`blueprint-${entry.id}`}
                                entry={entry}
                                isSelected={selected?.kind === 'blueprint' && selected.id === entry.id}
                                busy={!!busyBp[entry.id]}
                                countLabel={t('ai.workbench.roster.routed_count').replace(':count', String(entry.count))}
                                toggleLabel={t('ai.workbench.roster.toggle_label')}
                                catchAllLabel={t('ai.workbench.roster.catch_all_badge')}
                                onSelect={() => setSelected({ kind: 'blueprint', id: entry.id })}
                                onToggle={() => void toggleBlueprint(blueprints.find((bp) => bp.id === entry.id)!)}
                            />
                        ))
                    )}

                    <div className="px-3 pt-3">
                        <span style={railHeadingStyle}>{t('ai.workbench.roster.notebooks_heading')}</span>
                    </div>
                    {rosterNotebooks.length === 0 ? (
                        <p className="px-3 py-2" style={labelStyle}>{t('ai.workbench.roster.empty_notebooks')}</p>
                    ) : (
                        rosterNotebooks.map((entry) => (
                            <RosterRow
                                key={`notebook-${entry.id}`}
                                entry={entry}
                                isSelected={selected?.kind === 'notebook' && selected.id === entry.id}
                                busy={!!busyNb[entry.id]}
                                countLabel={t('ai.workbench.roster.note_count').replace(':count', String(entry.count))}
                                toggleLabel={t('ai.workbench.roster.toggle_label')}
                                catchAllLabel={t('ai.workbench.roster.catch_all_badge')}
                                onSelect={() => setSelected({ kind: 'notebook', id: entry.id })}
                                onToggle={() => void toggleNotebook(notebooks.find((nb) => nb.id === entry.id)!)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* ─── Detail pane ─── */}
            <div className="flex min-h-0 flex-1 flex-col">
                {selectedEntry === null ? (
                    <div className="flex flex-1 items-center justify-center p-6 text-center">
                        <p style={labelStyle}>{t('ai.workbench.roster.select_prompt')}</p>
                    </div>
                ) : (
                    <>
                        <div className="shrink-0 space-y-2 border-b p-4" style={{ borderColor: paneBorderColor }}>
                            <div className="flex items-center gap-2">
                                <h2 className="truncate text-base font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                                    {selectedEntry.name}
                                </h2>
                                {selectedEntry.isCatchAll && (
                                    <span style={catchAllBadgeStyle}>{t('ai.workbench.roster.catch_all_badge')}</span>
                                )}
                            </div>
                            <p style={countStyle}>
                                {selectedEntry.kind === 'blueprint'
                                    ? t('ai.workbench.roster.routed_count').replace(':count', String(selectedEntry.count))
                                    : t('ai.workbench.roster.note_count').replace(':count', String(selectedEntry.count))}
                            </p>

                            {isEditing ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        maxLength={MAX_DESC}
                                        rows={3}
                                        className="w-full text-sm resize-none"
                                        style={{
                                            background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                                            border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
                                            borderRadius: 'var(--theme-radius-button)',
                                            padding: '0.5rem',
                                            color: 'var(--theme-base-content)',
                                            outline: 'none',
                                        }}
                                        autoFocus
                                        placeholder={t('ai.workbench.roster.no_description')}
                                    />
                                    <div className="flex items-center justify-between gap-2">
                                        <span style={labelStyle}>
                                            {t('ai.workbench.routing_text.char_count')
                                                .replace(':count', String(editText.length))
                                                .replace(':max', String(MAX_DESC))}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                disabled={savingDesc}
                                                className="alex-btn px-2 py-1 text-xs"
                                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}
                                            >
                                                {t('ai.workbench.routing_text.cancel_button')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void saveDesc(selectedEntry.slug, selectedEntry.kind)}
                                                disabled={savingDesc}
                                                className="alex-btn px-3 py-1 text-xs"
                                                style={{
                                                    background: 'var(--theme-brand-primary-500)',
                                                    color: 'var(--theme-brand-primary-content)',
                                                    borderRadius: 'var(--theme-radius-button)',
                                                }}
                                            >
                                                {descSaved ? t('ai.workbench.routing_text.saved_indicator') : t('ai.workbench.routing_text.save_button')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openEdit(selectedEntry)}
                                    className="w-full text-left"
                                    title={t('ai.workbench.routing_text.edit_button')}
                                >
                                    {selectedEntry.description ? (
                                        <p style={descStyle}>{descriptionPreview(selectedEntry.description)}</p>
                                    ) : (
                                        <p className="italic" style={{ ...descStyle, opacity: 0.5 }}>
                                            {t('ai.workbench.roster.no_description')}
                                        </p>
                                    )}
                                </button>
                            )}
                        </div>

                        <TargetReview
                            projectSlug={projectSlug}
                            target={selectedEntry}
                            blueprints={initialBlueprints}
                            notebooks={initialNotebooks}
                            t={t}
                        />
                    </>
                )}
            </div>

            {/* Prompt preview modal */}
            <PromptPreviewModal
                open={promptModalOpen}
                prompt={promptContent}
                tokenEstimate={promptTokens}
                loading={promptLoading}
                onClose={() => setPromptModalOpen(false)}
                t={t}
            />
        </div>
    );
}
