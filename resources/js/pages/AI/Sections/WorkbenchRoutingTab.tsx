import { useState, useMemo, useRef, useEffect, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { fetchJson, FetchJsonError } from '@alexandria/lib/fetchJson';
import useT from '@alexandria/hooks/useT';
import type { WorkbenchBlueprint, WorkbenchNotebook, RoutedNotesPage } from '@alexandria/types/workbench';

interface WorkbenchRoutingTabProps {
    projectSlug: string;
    blueprints: WorkbenchBlueprint[];
    notebooks: WorkbenchNotebook[];
    unsorted_count: number;
    pending_count: number;
}

/* ── Theme styles ── */
const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1rem',
};

const cardHoverStyle: CSSProperties = {
    borderColor: 'color-mix(in srgb, var(--theme-base-content) 18%, transparent)',
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
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.025em',
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

function descriptionPreview(text: string | null, maxLen = 120): string {
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

/* ── Review section ── */
function ReviewSection({
    projectSlug,
    blueprints,
    notebooks,
    t,
}: {
    projectSlug: string;
    blueprints: WorkbenchBlueprint[];
    notebooks: WorkbenchNotebook[];
    t: (k: string) => string;
}) {
    // Build destination tabs: blueprints with routed_count > 0, notebooks with note_count > 0
    const allTargets = useMemo(() => {
        const bpTargets = blueprints
            .filter((bp) => bp.routed_count > 0)
            .map((bp) => ({ kind: 'blueprint' as const, id: bp.id, name: bp.name, count: bp.routed_count }));
        const nbTargets = notebooks
            .filter((nb) => nb.note_count > 0)
            .map((nb) => ({ kind: 'notebook' as const, id: nb.id, name: nb.title, count: nb.note_count }));
        return [...bpTargets, ...nbTargets];
    }, [blueprints, notebooks]);

    const [activeTabIdx, setActiveTabIdx] = useState(0);
    const activeTarget = allTargets[activeTabIdx] ?? null;

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
        if (!activeTarget) return;
        setNotesLoading(true);
        fetchJson(
            `/p/${projectSlug}/ai/workbench/routed-notes?kind=${activeTarget.kind}&id=${activeTarget.id}&page=${page}`,
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
        if (activeTarget) loadNotes(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTabIdx]);

    const notes = notesPage?.data ?? [];
    const cursorNote = notes[cursorIdx] ?? null;

    async function updateFlag(noteId: number, flag: 'workbench' | null) {
        try {
            await fetchJson(`/p/${projectSlug}/ai/workbench/notes/${noteId}/review-flag`, {
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

    async function doReRoute(noteId: number, target: DestTarget) {
        setReRouteBusy(true);
        try {
            await fetchJson(`/p/${projectSlug}/ai/workbench/notes/${noteId}/re-route`, {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ to: { kind: target.kind, id: target.id } }),
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

    // Keyboard handler
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'TEXTAREA' || tag === 'INPUT') return;
            if (!cursorNote) return;

            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                void updateFlag(cursorNote.id, null).then(() => {
                    setCursorIdx((i) => Math.min(i + 1, notes.length - 1));
                });
            } else if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                void updateFlag(cursorNote.id, 'workbench').then(() => {
                    setCursorIdx((i) => Math.min(i + 1, notes.length - 1));
                });
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                setCursorIdx((i) => Math.min(i + 1, notes.length - 1));
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                setReRouteNoteId(cursorNote.id);
            }
        }

        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursorNote, notes]);

    if (allTargets.length === 0) {
        return null;
    }

    const keptCount = notes.filter((n) => localFlags[n.id] === 'kept').length;
    const flaggedCount = notes.filter((n) => localFlags[n.id] === 'flagged').length;
    const pendingCount = notes.filter((n) => !localFlags[n.id]).length;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-base font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('ai.workbench.review.heading')}
                </h2>
                {notes.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span style={countStyle}>
                            {t('ai.workbench.review.counts')
                                .replace(':kept', String(keptCount))
                                .replace(':flagged', String(flaggedCount))
                                .replace(':pending', String(pendingCount))}
                        </span>
                        <button
                            type="button"
                            className="alex-btn px-3 py-1 text-sm"
                            onClick={() => void bulkKeepAll()}
                            style={{
                                background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                borderRadius: 'var(--theme-radius-button)',
                                color: 'var(--theme-base-content)',
                            }}
                        >
                            {t('ai.workbench.review.keep_all')}
                        </button>
                    </div>
                )}
            </div>

            {/* Destination tabs */}
            <div className="flex flex-wrap gap-2">
                {allTargets.map((target, idx) => (
                    <button
                        key={`${target.kind}-${target.id}`}
                        type="button"
                        onClick={() => { setActiveTabIdx(idx); }}
                        className="alex-btn px-3 py-1 text-sm"
                        style={
                            idx === activeTabIdx
                                ? {
                                    background: 'var(--theme-brand-primary-500)',
                                    color: 'var(--theme-brand-primary-content)',
                                    borderRadius: 'var(--theme-radius-button)',
                                  }
                                : {
                                    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                    color: 'var(--theme-base-content)',
                                    borderRadius: 'var(--theme-radius-button)',
                                  }
                        }
                    >
                        {target.name}
                        <span style={{ ...countStyle, marginLeft: '0.35rem' }}>({target.count})</span>
                    </button>
                ))}
            </div>

            {/* Notes list */}
            <div className="space-y-3" ref={containerRef}>
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
                                    {isCursor && (
                                        <div className="flex items-center gap-1 text-xs" style={labelStyle}>
                                            <kbd>A</kbd> <kbd>G</kbd> <kbd>S</kbd> <kbd>R</kbd>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{
                                marginTop: '0.5rem',
                                maxHeight: '6rem',
                                overflowY: 'auto',
                                ...descStyle,
                            }}>
                                {note.text || '(empty)'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {notesPage && notesPage.last_page > 1 && (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        disabled={notesPage.current_page <= 1}
                        onClick={() => loadNotes(notesPage.current_page - 1)}
                        className="alex-btn px-3 py-1 text-sm"
                        style={{ color: 'var(--theme-base-content)', background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)', borderRadius: 'var(--theme-radius-button)' }}
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
                        className="alex-btn px-3 py-1 text-sm"
                        style={{ color: 'var(--theme-base-content)', background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)', borderRadius: 'var(--theme-radius-button)' }}
                    >
                        →
                    </button>
                </div>
            )}

            {/* Re-route modal */}
            <ReRouteModal
                open={reRouteNoteId !== null}
                targets={reRouteTargets}
                busy={reRouteBusy}
                onSelect={(target) => {
                    if (reRouteNoteId !== null) void doReRoute(reRouteNoteId, target);
                }}
                onClose={() => setReRouteNoteId(null)}
                t={t}
            />
        </section>
    );
}

export default function WorkbenchRoutingTab({
    projectSlug,
    blueprints: initialBlueprints,
    notebooks: initialNotebooks,
    unsorted_count,
    pending_count,
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

    const blueprints = initialBlueprints.map((bp) => ({
        ...bp,
        allow_ai_sorting: bpOverrides[bp.id] ?? bp.allow_ai_sorting,
    }));

    const notebooks = initialNotebooks.map((nb) => ({
        ...nb,
        allow_ai_sort: nbOverrides[nb.id] ?? nb.allow_ai_sort,
    }));

    async function toggleBlueprint(bp: WorkbenchBlueprint) {
        const next = !(bpOverrides[bp.id] ?? bp.allow_ai_sorting);
        setBpOverrides((prev) => ({ ...prev, [bp.id]: next }));
        setBusyBp((prev) => ({ ...prev, [bp.id]: true }));

        try {
            await fetchJson(`/p/${projectSlug}/ai/workbench/blueprints/${bp.slug}`, {
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
            await fetchJson(`/p/${projectSlug}/ai/workbench/notebooks/${nb.slug}`, {
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

    function openBpEdit(bp: WorkbenchBlueprint) {
        setEditingBpId(bp.id);
        setEditingNbId(null);
        setEditText(bp.description ?? '');
        setDescSaved(false);
    }

    function openNbEdit(nb: WorkbenchNotebook) {
        setEditingNbId(nb.id);
        setEditingBpId(null);
        setEditText(nb.description ?? '');
        setDescSaved(false);
    }

    function cancelEdit() {
        setEditingBpId(null);
        setEditingNbId(null);
        setEditText('');
    }

    async function saveDesc(slug: string, kind: 'blueprint' | 'notebook') {
        setSavingDesc(true);
        try {
            await fetchJson(`/p/${projectSlug}/ai/workbench/${kind === 'blueprint' ? 'blueprints' : 'notebooks'}/${slug}/description`, {
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
            const data = await fetchJson(`/p/${projectSlug}/ai/workbench/l1-prompt`) as { prompt: string; token_estimate: number };
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
        <div className="space-y-8">
            {/* Summary counts bar + prompt preview button */}
            <div className="flex items-center gap-6 flex-wrap justify-between">
                <div className="flex items-center gap-6 flex-wrap">
                    <span style={countStyle}>
                        <i className="fa-solid fa-inbox mr-1.5" aria-hidden="true" />
                        {t('ai.workbench.roster.unsorted').replace(':count', String(unsorted_count))}
                    </span>
                    <span style={countStyle}>
                        <i className="fa-solid fa-hourglass-half mr-1.5" aria-hidden="true" />
                        {t('ai.workbench.roster.pending').replace(':count', String(pending_count))}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => void openPromptPreview()}
                    className="alex-btn px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                    style={{
                        background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                        borderRadius: 'var(--theme-radius-button)',
                        color: 'var(--theme-base-content)',
                    }}
                >
                    <i className="fa-solid fa-eye text-xs" aria-hidden="true" />
                    {t('ai.workbench.prompt_preview.button')}
                </button>
            </div>

            {/* Blueprints section */}
            <section>
                <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('ai.workbench.roster.blueprints_heading')}
                </h2>

                {blueprints.length === 0 ? (
                    <p style={labelStyle}>{t('ai.workbench.roster.empty_blueprints')}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {blueprints.map((bp) => {
                            const isEditing = editingBpId === bp.id;
                            return (
                                <div
                                    key={bp.id}
                                    style={cardStyle}
                                    className="group transition-[border-color]"
                                    onMouseEnter={(e) => Object.assign((e.currentTarget as HTMLElement).style, cardHoverStyle)}
                                    onMouseLeave={(e) => Object.assign((e.currentTarget as HTMLElement).style, { borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' })}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium truncate" style={{ color: 'var(--theme-base-content)' }}>
                                                {bp.name}
                                            </p>
                                            <p style={countStyle} className="mt-0.5">
                                                {t('ai.workbench.roster.routed_count').replace(':count', String(bp.routed_count))}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <ToggleSwitch
                                                checked={bp.allow_ai_sorting}
                                                disabled={busyBp[bp.id]}
                                                label={`${t('ai.workbench.roster.toggle_label')}: ${bp.name}`}
                                                onChange={() => void toggleBlueprint(bp)}
                                            />
                                            <span style={labelStyle}>{t('ai.workbench.roster.toggle_label')}</span>
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-3 space-y-2">
                                            <textarea
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                maxLength={MAX_DESC}
                                                rows={4}
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
                                                        onClick={() => void saveDesc(bp.slug, 'blueprint')}
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
                                            onClick={() => openBpEdit(bp)}
                                            className="mt-2 w-full text-left"
                                            title={t('ai.workbench.routing_text.edit_button')}
                                        >
                                            {bp.description ? (
                                                <p style={descStyle}>{descriptionPreview(bp.description)}</p>
                                            ) : (
                                                <p className="italic" style={{ ...descStyle, opacity: 0.5 }}>
                                                    {t('ai.workbench.roster.no_description')}
                                                </p>
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Notebooks section */}
            <section>
                <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('ai.workbench.roster.notebooks_heading')}
                </h2>

                {notebooks.length === 0 ? (
                    <p style={labelStyle}>{t('ai.workbench.roster.empty_notebooks')}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {notebooks.map((nb) => {
                            const isEditing = editingNbId === nb.id;
                            return (
                                <div
                                    key={nb.id}
                                    style={cardStyle}
                                    className="group transition-[border-color]"
                                    onMouseEnter={(e) => Object.assign((e.currentTarget as HTMLElement).style, cardHoverStyle)}
                                    onMouseLeave={(e) => Object.assign((e.currentTarget as HTMLElement).style, { borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' })}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <p className="font-medium truncate" style={{ color: 'var(--theme-base-content)' }}>
                                                    {nb.title}
                                                </p>
                                                {nb.is_catch_all && (
                                                    <span style={catchAllBadgeStyle}>
                                                        {t('ai.workbench.roster.catch_all_badge')}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={countStyle} className="mt-0.5">
                                                {t('ai.workbench.roster.note_count').replace(':count', String(nb.note_count))}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <ToggleSwitch
                                                checked={nb.allow_ai_sort}
                                                disabled={busyNb[nb.id]}
                                                label={`${t('ai.workbench.roster.toggle_label')}: ${nb.title}`}
                                                onChange={() => void toggleNotebook(nb)}
                                            />
                                            <span style={labelStyle}>{t('ai.workbench.roster.toggle_label')}</span>
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-3 space-y-2">
                                            <textarea
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                maxLength={MAX_DESC}
                                                rows={4}
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
                                                        onClick={() => void saveDesc(nb.slug as string, 'notebook')}
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
                                            onClick={() => openNbEdit(nb)}
                                            className="mt-2 w-full text-left"
                                            title={t('ai.workbench.routing_text.edit_button')}
                                        >
                                            {nb.description ? (
                                                <p style={descStyle}>{descriptionPreview(nb.description)}</p>
                                            ) : (
                                                <p className="italic" style={{ ...descStyle, opacity: 0.5 }}>
                                                    {t('ai.workbench.roster.no_description')}
                                                </p>
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Review section */}
            <ReviewSection
                projectSlug={projectSlug}
                blueprints={initialBlueprints}
                notebooks={initialNotebooks}
                t={t}
            />

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
