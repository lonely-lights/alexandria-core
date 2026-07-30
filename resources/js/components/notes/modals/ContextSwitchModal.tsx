import { useState, useEffect, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';
import {
    promoteRecent,
    readRecents,
    removeRecent,
    writeRecents,
    type RecentTarget,
} from '@alexandria/components/notes/modals/contextSwitchRecents';

export type SwitchContextType = 'project' | 'blueprint' | 'entry' | 'work_section' | 'work';

export interface SwitchTarget {
    type: SwitchContextType;
    id: number;
    label: string;
    sublabel?: string | null;
    slug?: string | null;
    note_count?: number;
    /**
     * Structure position, server-supplied for entry rows: 0 = root, each
     * step down the parent chain adds one. Optional on purpose — rows
     * without it render flat, exactly as they did before the tree pass.
     */
    depth?: number;
    /** Ancestor names, root first — the breadcrumb behind `depth`. */
    path?: string[];
}

interface ContextSwitchModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    current: { type: SwitchContextType; id: number; label: string };
    /**
     * Carries `slug` so returning via the pinned row restores the slug the
     * drawer opened with — `onSwitch` reads `target.slug`, and dropping it
     * here leaves slug-dependent consumers (SortingHistoryModal's blueprint
     * routing) building `/p/{project}/undefined/…` after a round trip.
     */
    openedFrom: { type: SwitchContextType; id: number; label: string; slug?: string | null };
    onSwitch: (target: SwitchTarget) => void;
}

const TYPE_ICONS: Record<SwitchContextType, string> = {
    project: 'fa-solid fa-folder',
    blueprint: 'fa-solid fa-cube',
    entry: 'fa-solid fa-file',
    work: 'fa-solid fa-feather',
    work_section: 'fa-solid fa-bookmark',
};

/** Row padding-left with no indent, in rem — matches the old `px-4`. */
const ROW_BASE_INDENT_REM = 1;
/** Added per depth step for tree rows. */
const ROW_INDENT_STEP_REM = 0.75;

const PATH_SEPARATOR = ' › ';

const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

const sectionBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const columnBorderStyle: CSSProperties = {
    borderColor: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.75rem',
};

/**
 * Group lists need two things at once: rounded corners that clip the
 * rows, and a working vertical scroll inside their capped height.
 *
 * The axes are split deliberately. A shorthand `overflow: hidden` here
 * beats the Tailwind `overflow-y-auto` class on the same element —
 * inline styles always win — so the lists clipped their overflow rows
 * and pushed the scroll up to the column instead of scrolling in place.
 */
const listWrapperStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    overflowX: 'hidden',
    overflowY: 'auto',
};

const countChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: '9999px',
    padding: '0.0625rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
};

const pinnedRowStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent)',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const rowDivider = '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)';

/**
 * Order entry rows as a structure instead of a flat list.
 *
 * Entry rows form a lineage (root → … → the context you're on) plus that
 * context's children, so sorting by `depth` ascending reconstructs the
 * tree top-down; the sort is stable, so siblings keep server order.
 * Non-entry rows (works, sections) stay flat and hold their side of the
 * group — before the entries if that's where the server put them, after
 * otherwise.
 *
 * When NO row carries `depth` the list is returned untouched. That's the
 * pre-server-fields path: identical markup, identical order, no jump.
 */
function orderStructureRows(rows: SwitchTarget[]): SwitchTarget[] {
    if (!rows.some((row) => typeof row.depth === 'number')) {
        return rows;
    }

    const entries = rows.filter((row) => row.type === 'entry');
    const others = rows.filter((row) => row.type !== 'entry');

    if (entries.length === 0 || others.length === 0) {
        return [...entries, ...others].sort(byDepth);
    }

    const sortedEntries = [...entries].sort(byDepth);
    const entriesLeadTheGroup = rows.findIndex((row) => row.type === 'entry')
        < rows.findIndex((row) => row.type !== 'entry');

    return entriesLeadTheGroup
        ? [...sortedEntries, ...others]
        : [...others, ...sortedEntries];
}

function byDepth(a: SwitchTarget, b: SwitchTarget): number {
    return (a.depth ?? 0) - (b.depth ?? 0);
}

function RowBody({ target, showPath }: { target: SwitchTarget; showPath?: boolean }) {
    const t = useT();

    // In search results the ancestor path replaces the blueprint name — a
    // hit reads as a place in the structure, not a loose title. Works have
    // no "where it lives" line of their own, so they name their kind
    // instead: without it they're the one row type missing subtext, which
    // reads as a rendering gap rather than a difference in kind. Purely a
    // client-side fallback — a server-sent sublabel always wins.
    const pathLabel = showPath && target.path?.length
        ? target.path.join(PATH_SEPARATOR)
        : null;

    const sublabel = pathLabel
        ?? target.sublabel
        ?? (target.type === 'work' ? t('notes.switch.type_work') : null);

    return (
        <>
            <i className={`${TYPE_ICONS[target.type]} text-xs`} style={microText} aria-hidden="true" />
            <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{target.label}</span>
                {sublabel && <span className="block truncate text-[10px]" style={microText}>{sublabel}</span>}
            </span>
        </>
    );
}

/**
 * `tree` opts a row into depth indentation. Only the Related group draws
 * the structure; search results stay flat and wear their ancestry as the
 * sublabel instead (`showPath`), because a hit list indented by depth
 * reads as a broken list rather than a tree.
 */
function ContextRow({ target, onPick, isLast, showPath, tree }: { target: SwitchTarget; onPick: (target: SwitchTarget) => void; isLast: boolean; showPath?: boolean; tree?: boolean }) {
    const indentRem = tree
        ? ROW_BASE_INDENT_REM + Math.max(0, target.depth ?? 0) * ROW_INDENT_STEP_REM
        : ROW_BASE_INDENT_REM;

    return (
        <button
            type="button"
            data-context-switch-row={`${target.type}-${target.id}`}
            onClick={() => onPick(target)}
            className="alex-notes-tag-row flex w-full items-center gap-3 py-2.5 pr-4 text-left text-sm"
            style={{
                paddingLeft: `${indentRem}rem`,
                ...(isLast ? {} : { borderBottom: rowDivider }),
            }}
        >
            <RowBody target={target} showPath={showPath} />
            <span style={countChipStyle}>{target.note_count ?? 0}</span>
        </button>
    );
}

/**
 * A recents row is two controls, not one — picking and forgetting are
 * separate actions — so the dismiss button sits BESIDE the switch button
 * rather than inside it (nested buttons are invalid HTML and swallow the
 * inner click). Recents rows carry `data-recent-row`, not
 * `data-context-switch-row`: recents legitimately repeat the pinned and
 * current contexts, and reusing the switch attribute would resolve two
 * elements for one selector under Playwright strict mode.
 */
function RecentRow({ target, onPick, onRemove, removeLabel, isLast }: { target: RecentTarget; onPick: (target: RecentTarget) => void; onRemove: (target: RecentTarget) => void; removeLabel: string; isLast: boolean }) {
    return (
        <div
            className="flex items-center"
            style={isLast ? undefined : { borderBottom: rowDivider }}
        >
            <button
                type="button"
                data-recent-row={`${target.type}-${target.id}`}
                onClick={() => onPick(target)}
                className="alex-notes-tag-row flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 pr-2 text-left text-sm"
            >
                <RowBody target={target} />
            </button>
            <button
                type="button"
                data-recent-remove={`${target.type}-${target.id}`}
                onClick={() => onRemove(target)}
                aria-label={removeLabel}
                className="alex-notes-modal-icon-btn mr-2 shrink-0"
            >
                <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
            </button>
        </div>
    );
}

export default function ContextSwitchModal({ open, onClose, projectId, current, openedFrom, onSwitch }: ContextSwitchModalProps) {
    const t = useT();
    const [family, setFamily] = useState<SwitchTarget[]>([]);
    const [results, setResults] = useState<SwitchTarget[]>([]);
    const [recents, setRecents] = useState<RecentTarget[]>([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(false);

    // One fetch per (open, debounced q) — family rides along on every
    // response, so the first fetch also fills the Related group.
    useEffect(() => {
        if (!open) return;
        setLoading(true);
        const timer = setTimeout(() => {
            const params = new URLSearchParams({
                context_type: current.type,
                context_id: String(current.id),
                ...(q.trim() ? { q: q.trim() } : {}),
            });
            fetch(`/api/v1/projects/${projectId}/note-contexts?${params}`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            })
                .then((r) => r.ok ? r.json() : { family: [], results: [] })
                .then((data: { family: SwitchTarget[]; results: SwitchTarget[] }) => {
                    setFamily(data.family ?? []);
                    setResults(data.results ?? []);
                })
                .catch(() => { setFamily([]); setResults([]); })
                .finally(() => setLoading(false));
        }, q ? 300 : 0);
        return () => clearTimeout(timer);
    }, [open, projectId, current.type, current.id, q]);

    // Reset transient state whenever the modal reopens. `family` is cleared
    // too — after a context switch it holds the PREVIOUS context's rows, and
    // leaving them up until the new fetch lands renders stale, clickable
    // destinations under the new context's heading. Recents are re-read
    // rather than cleared: another tab may have moved the list on.
    useEffect(() => {
        if (open) {
            setQ('');
            setResults([]);
            setFamily([]);
            setRecents(readRecents(projectId));
        }
    }, [open, projectId]);

    // The current context is filtered out of Related, so the pinned row is
    // the only place it appears when the drawer is still on the context it
    // opened with — always render it, equal or not. `openedFrom` is filtered
    // out for the same reason: it already has its own pinned row, and letting
    // it through would render a second row with a duplicate
    // `data-context-switch-row` value.
    const isPinnedOrCurrent = (row: SwitchTarget) =>
        (row.type === current.type && row.id === current.id)
        || (row.type === openedFrom.type && row.id === openedFrom.id);

    const relatedRows = orderStructureRows(family.filter((row) => !isPinnedOrCurrent(row)));

    // Search hits get the same treatment: a query matching the pinned or
    // current context would otherwise render a second row carrying an
    // identical `data-context-switch-row` value.
    const resultRows = results.filter((row) => !isPinnedOrCurrent(row));

    /**
     * Every pick — from Related, from search, from recents, from the pinned
     * row — funnels through here, so recording recency once covers both
     * "searched" and "navigated". Landing on the context you're already on
     * is a no-op the parent swallows, and recording it would let a stuck
     * click pump the list, so that case records nothing.
     */
    const handlePick = (target: SwitchTarget) => {
        const isNoOp = target.type === current.type && target.id === current.id;

        if (!isNoOp) {
            const next = promoteRecent(recents, target);
            setRecents(next);
            writeRecents(projectId, next);
        }

        onSwitch(target);
    };

    const handleRemoveRecent = (target: RecentTarget) => {
        const next = removeRecent(recents, target);
        setRecents(next);
        writeRecents(projectId, next);
    };

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div data-context-switch-modal className="flex max-h-[70vh] flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={sectionBorderStyle}>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-shuffle text-sm" style={{ color: 'var(--theme-brand-primary-500)' }} aria-hidden="true" />
                        <h2 className="text-base font-bold">{t('notes.switch.title')}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="alex-notes-modal-icon-btn" aria-label={t('notes.modal.tooltip.close')}>
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                    {/* Left column — where you are, where you can go */}
                    <div className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto px-5 py-4">
                        {/* Pinned: the context the drawer originally opened with */}
                        <div className="mb-4">
                            <p className="mb-1 text-xs font-semibold" style={muteText}>{t('notes.switch.opened_from')}</p>
                            <div style={pinnedRowStyle}>
                                <ContextRow target={openedFrom} onPick={handlePick} isLast />
                            </div>
                        </div>

                        {/* Search */}
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder={t('notes.switch.search')}
                            autoFocus
                            className="mb-3 h-9 w-full text-sm"
                            style={inputStyle}
                        />

                        {/* Search results (only while typing) */}
                        {q.trim() !== '' && (
                            <div className="mb-4">
                                <p className="mb-1 text-xs font-semibold" style={muteText}>{t('notes.switch.results')}</p>
                                {resultRows.length === 0 && !loading ? (
                                    <p className="text-[11px]" style={microText}>{t('notes.switch.no_results')}</p>
                                ) : (
                                    <div className="scrollbar-subtle max-h-48 overflow-y-auto" style={listWrapperStyle}>
                                        {resultRows.map((row, idx) => (
                                            <ContextRow key={`${row.type}-${row.id}`} target={row} onPick={handlePick} isLast={idx === resultRows.length - 1} showPath />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Related family */}
                        <p className="mb-1 text-xs font-semibold" style={muteText}>{t('notes.switch.related')}</p>
                        {relatedRows.length === 0 && !loading ? (
                            <p className="text-[11px]" style={microText}>{t('notes.switch.no_related')}</p>
                        ) : (
                            <div className="scrollbar-subtle max-h-64 overflow-y-auto" style={listWrapperStyle}>
                                {relatedRows.map((row, idx) => (
                                    <ContextRow key={`${row.type}-${row.id}`} target={row} onPick={handlePick} isLast={idx === relatedRows.length - 1} tree />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right column — where you've been */}
                    <div
                        data-context-switch-recents
                        className="scrollbar-subtle min-w-0 shrink-0 overflow-y-auto border-t px-5 py-4 sm:w-[42%] sm:border-l sm:border-t-0"
                        style={columnBorderStyle}
                    >
                        <p className="mb-1 text-xs font-semibold" style={muteText}>{t('notes.switch.recent')}</p>
                        {recents.length === 0 ? (
                            <p className="text-[11px]" style={microText}>{t('notes.switch.recent_empty')}</p>
                        ) : (
                            <div className="scrollbar-subtle max-h-64 overflow-y-auto" style={listWrapperStyle}>
                                {recents.map((row, idx) => (
                                    <RecentRow
                                        key={`${row.type}-${row.id}`}
                                        target={row}
                                        onPick={handlePick}
                                        onRemove={handleRemoveRecent}
                                        removeLabel={t('notes.switch.recent_remove')}
                                        isLast={idx === recents.length - 1}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
