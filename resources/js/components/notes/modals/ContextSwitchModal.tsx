import { useState, useEffect, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

export type SwitchContextType = 'project' | 'blueprint' | 'entry' | 'work_section' | 'work';

export interface SwitchTarget {
    type: SwitchContextType;
    id: number;
    label: string;
    sublabel?: string | null;
    slug?: string | null;
    note_count?: number;
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

const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

const sectionBorderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.75rem',
};

const listWrapperStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
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

function ContextRow({ target, onPick, isLast }: { target: SwitchTarget; onPick: (target: SwitchTarget) => void; isLast: boolean }) {
    return (
        <button
            type="button"
            data-context-switch-row={`${target.type}-${target.id}`}
            onClick={() => onPick(target)}
            className="alex-notes-tag-row flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm"
            style={isLast ? undefined : { borderBottom: rowDivider }}
        >
            <i className={`${TYPE_ICONS[target.type]} text-xs`} style={microText} aria-hidden="true" />
            <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{target.label}</span>
                {target.sublabel && <span className="block truncate text-[10px]" style={microText}>{target.sublabel}</span>}
            </span>
            <span style={countChipStyle}>{target.note_count ?? 0}</span>
        </button>
    );
}

export default function ContextSwitchModal({ open, onClose, projectId, current, openedFrom, onSwitch }: ContextSwitchModalProps) {
    const t = useT();
    const [family, setFamily] = useState<SwitchTarget[]>([]);
    const [results, setResults] = useState<SwitchTarget[]>([]);
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
    // destinations under the new context's heading.
    useEffect(() => {
        if (open) { setQ(''); setResults([]); setFamily([]); }
    }, [open]);

    // The current context is filtered out of Related, so the pinned row is
    // the only place it appears when the drawer is still on the context it
    // opened with — always render it, equal or not. `openedFrom` is filtered
    // out for the same reason: it already has its own pinned row, and letting
    // it through would render a second row with a duplicate
    // `data-context-switch-row` value.
    const isPinnedOrCurrent = (row: SwitchTarget) =>
        (row.type === current.type && row.id === current.id)
        || (row.type === openedFrom.type && row.id === openedFrom.id);

    const relatedRows = family.filter((row) => !isPinnedOrCurrent(row));

    // Search hits get the same treatment: a query matching the pinned or
    // current context would otherwise render a second row carrying an
    // identical `data-context-switch-row` value.
    const resultRows = results.filter((row) => !isPinnedOrCurrent(row));

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
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

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Pinned: the context the drawer originally opened with */}
                    <div className="mb-4">
                        <p className="mb-1 text-xs font-semibold" style={muteText}>{t('notes.switch.opened_from')}</p>
                        <div style={pinnedRowStyle}>
                            <ContextRow target={openedFrom} onPick={onSwitch} isLast />
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
                                <div className="max-h-48 overflow-y-auto" style={listWrapperStyle}>
                                    {resultRows.map((row, idx) => (
                                        <ContextRow key={`${row.type}-${row.id}`} target={row} onPick={onSwitch} isLast={idx === resultRows.length - 1} />
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
                        <div className="max-h-64 overflow-y-auto" style={listWrapperStyle}>
                            {relatedRows.map((row, idx) => (
                                <ContextRow key={`${row.type}-${row.id}`} target={row} onPick={onSwitch} isLast={idx === relatedRows.length - 1} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
