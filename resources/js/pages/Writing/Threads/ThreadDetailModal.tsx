import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import Button from '@alexandria/components/ui/Button';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

import type { SectionNode } from '../Workspace';
import { ancestorsOf, findSectionInTree, scopeChoiceFromWire, scopeChoiceToWire, scopeKey, type ScopeChoice } from './scopeChoice';
import {
    deleteMark,
    deleteThread,
    fetchCards,
    fetchScopeOptions,
    fetchThread,
    updateThread,
    PATTERN_STANCES,
    type PatternCard,
    type PatternMarkWithSection,
    type PatternStance,
    type PatternThread,
    type PatternThreadDetail,
    type ScopeOptions,
} from './threadApi';

/**
 * Thread detail modal — Devices & Tropes Task 6 (design doc
 * 2026-08-29-devices-tropes-design.md Surface #3). Opened from a
 * ThreadsPanel row (or, later, a Kanban chip): the card's guidance
 * (collapsed by default, KanbanCard's craft-toggle idiom), the
 * thread's editable stance + scope (same choice pattern
 * MarkThreadModal's new-thread step uses, via the shared
 * scopeChoice.ts helpers), and every mark it carries in pin order
 * (fetched via `writing.threads.show` — see threadApi.ts's header
 * note on why `index` can't supply this). "Add mark" doesn't own its
 * own MarkThreadModal instance — it calls back up to Workspace, which
 * already renders one MarkThreadModal keyed by `markThreadRequest` and
 * accepts `lockedThread` for exactly this reuse.
 */

export interface ThreadDetailModalProps {
    projectSlug: string;
    workId: number;
    /** Full section tree — for the scope editor's ancestor picker. */
    sections: SectionNode[];
    threadId: number;
    canUpdate: boolean;
    /** Bumped by Workspace after a mark is added via the shared
     *  MarkThreadModal (locked to this thread) — refetches the detail. */
    refreshSignal: number;
    onRequestAddMark: (thread: PatternThread) => void;
    onClose: () => void;
    /** Fires after any edit that could change ThreadsPanel's own lists
     *  (stance/scope edit, thread delete, mark delete — any of these
     *  can move a thread between "in this scene" / "open promises" or
     *  flip its status). */
    onChanged: () => void;
}

const mutedTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
};

const fieldLabelStyle: CSSProperties = {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const guidanceToggleStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3125rem',
    border: 'none',
    background: 'none',
    padding: '0.125rem 0',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.75rem',
    fontWeight: 600,
};

function guidanceChevronStyle(open: boolean): CSSProperties {
    return {
        fontSize: '0.625rem',
        transition: 'transform 0.15s ease',
        transform: open ? 'rotate(90deg)' : 'none',
    };
}

const markRowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    padding: '0.625rem 0',
};

const markRoleChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 700,
    lineHeight: 1.6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
};

const anchorQuoteStyle: CSSProperties = {
    borderLeft: '3px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    padding: '0.375rem 0.625rem',
    fontStyle: 'italic',
    fontSize: '0.8125rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const deleteMarkBtnStyle: CSSProperties = {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.75rem',
    padding: '0.125rem',
};

export default function ThreadDetailModal({
    projectSlug,
    workId,
    sections,
    threadId,
    canUpdate,
    refreshSignal,
    onRequestAddMark,
    onClose,
    onChanged,
}: ThreadDetailModalProps) {
    const t = useT();

    const [detail, setDetail] = useState<PatternThreadDetail | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [card, setCard] = useState<PatternCard | null>(null);
    const [scopeOptions, setScopeOptions] = useState<ScopeOptions | null>(null);
    const [guidanceOpen, setGuidanceOpen] = useState(false);

    function load() {
        let cancelled = false;

        fetchThread(projectSlug, threadId).then((result) => {
            if (cancelled) {
                return;
            }

            if (result === null) {
                setLoadFailed(true);
                return;
            }

            setLoadFailed(false);
            setDetail(result);
        });

        return () => {
            cancelled = true;
        };
    }

    useEffect(load, [projectSlug, threadId, refreshSignal]);

    useEffect(() => {
        let cancelled = false;

        fetchCards(projectSlug).then((result) => {
            if (!cancelled && result !== null) {
                setCard(result.find((candidate) => candidate.id === detail?.pattern_card_id) ?? null);
            }
        });

        fetchScopeOptions(projectSlug, workId).then((result) => {
            if (!cancelled && result !== null) {
                setScopeOptions(result);
            }
        });

        return () => {
            cancelled = true;
        };
        // Re-run once the thread loads (pattern_card_id isn't known before then).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectSlug, workId, detail?.pattern_card_id]);

    /* ── Stance edit ── */
    const [stance, setStance] = useState<PatternStance | ''>('');
    const [stanceSaving, setStanceSaving] = useState(false);
    const [stanceError, setStanceError] = useState(false);

    useEffect(() => {
        setStance(detail?.stance ?? '');
    }, [detail?.id, detail?.stance]);

    async function saveThreadFields(patch: { stance?: PatternStance | null; scopeChoice?: ScopeChoice }) {
        if (detail === null) {
            return null;
        }

        const nextScope = patch.scopeChoice ?? scopeChoiceFromWire(detail.scope_type, detail.scope_id);
        const { scope_type, scope_id } = scopeChoiceToWire(nextScope, workId);

        return updateThread(projectSlug, detail.id, {
            pattern_card_id: detail.pattern_card_id,
            title: detail.title,
            stance: patch.stance !== undefined ? patch.stance : detail.stance,
            scope_type,
            scope_id,
            entry_id: detail.entry_id,
            notes: detail.notes,
        });
    }

    async function handleStanceChange(value: PatternStance | '') {
        setStance(value);
        setStanceSaving(true);
        setStanceError(false);

        const updated = await saveThreadFields({ stance: value === '' ? null : value });

        setStanceSaving(false);

        if (updated === null) {
            setStanceError(true);
            return;
        }

        setDetail((prev) => (prev === null ? prev : { ...prev, ...updated, marks: prev.marks }));
        onChanged();
    }

    /* ── Scope edit ── */
    const [scope, setScope] = useState<ScopeChoice>({ type: 'work' });
    const [scopeSaving, setScopeSaving] = useState(false);
    const [scopeError, setScopeError] = useState(false);

    useEffect(() => {
        if (detail !== null) {
            setScope(scopeChoiceFromWire(detail.scope_type, detail.scope_id));
        }
    }, [detail?.id, detail?.scope_type, detail?.scope_id]);

    async function handleScopeChange(choice: ScopeChoice) {
        setScope(choice);
        setScopeSaving(true);
        setScopeError(false);

        const updated = await saveThreadFields({ scopeChoice: choice });

        setScopeSaving(false);

        if (updated === null) {
            setScopeError(true);
            return;
        }

        setDetail((prev) => (prev === null ? prev : { ...prev, ...updated, marks: prev.marks }));
        onChanged();
    }

    const scopeChoiceOptions = useMemo(() => {
        if (detail === null) {
            return [];
        }

        const currentScopeSection =
            detail.scope_type === 'section' ? findSectionInTree(sections, detail.scope_id) : null;
        const ancestors = currentScopeSection !== null ? ancestorsOf(sections, currentScopeSection.id) : [];

        const entryOptions: Array<{ choice: ScopeChoice; label: string }> =
            scopeOptions === null || scopeOptions.entry === null
                ? []
                : [
                      { choice: { type: 'entry' as const, id: scopeOptions.entry.id }, label: scopeOptions.entry.name },
                      ...scopeOptions.entry_ancestors.map((ancestor) => ({
                          choice: { type: 'entry' as const, id: ancestor.id },
                          label: ancestor.name,
                      })),
                  ];

        const options: Array<{ choice: ScopeChoice; label: string }> = [];

        if (currentScopeSection !== null) {
            options.push({ choice: { type: 'section', id: currentScopeSection.id }, label: currentScopeSection.title });

            for (const ancestor of ancestors) {
                options.push({ choice: { type: 'section', id: ancestor.id }, label: ancestor.title });
            }
        }

        options.push({ choice: { type: 'work' }, label: t('writing.threads.scope_this_work') });
        options.push(...entryOptions);

        return options;
    }, [detail, sections, scopeOptions, t]);

    /* ── Mark delete ── */
    const [deletingMark, setDeletingMark] = useState<PatternMarkWithSection | null>(null);
    const [markDeleteBusy, setMarkDeleteBusy] = useState(false);

    async function confirmDeleteMark() {
        if (deletingMark === null) {
            return;
        }

        setMarkDeleteBusy(true);
        const ok = await deleteMark(projectSlug, deletingMark.id);
        setMarkDeleteBusy(false);

        if (ok) {
            setDeletingMark(null);
            load();
            onChanged();
        }
    }

    /* ── Thread delete ── */
    const [confirmingThreadDelete, setConfirmingThreadDelete] = useState(false);
    const [threadDeleteBusy, setThreadDeleteBusy] = useState(false);

    async function confirmDeleteThread() {
        if (detail === null) {
            return;
        }

        setThreadDeleteBusy(true);
        const ok = await deleteThread(projectSlug, detail.id);
        setThreadDeleteBusy(false);

        if (ok) {
            onChanged();
            onClose();
        }
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader
                title={
                    detail === null ? '…' : (
                        <span className="flex flex-col">
                            <span>{detail.title}</span>
                            <span className="text-xs font-normal" style={mutedTextStyle}>
                                {card?.name ?? detail.card_name}
                            </span>
                        </span>
                    )
                }
                onClose={onClose}
            />

            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-5">
                {loadFailed && (
                    <p className="text-center text-sm" style={errorTextStyle}>
                        {t('writing.threads.detail_load_error')}
                    </p>
                )}

                {detail === null && !loadFailed && (
                    <p className="text-center text-sm" style={mutedTextStyle}>
                        {t('writing.threads.detail_loading')}
                    </p>
                )}

                {detail !== null && (
                    <>
                        {card !== null && (
                            <div>
                                <button
                                    type="button"
                                    style={guidanceToggleStyle}
                                    aria-expanded={guidanceOpen}
                                    onClick={() => setGuidanceOpen((prev) => !prev)}
                                >
                                    <i
                                        className="fa-solid fa-chevron-right"
                                        style={guidanceChevronStyle(guidanceOpen)}
                                        aria-hidden="true"
                                    />
                                    {t('writing.threads.detail_guidance_toggle')}
                                </button>

                                {guidanceOpen && (
                                    <div className="mt-2 flex flex-col gap-3">
                                        <GuidanceField label={t('writing.threads.detail_definition')} value={card.definition} />
                                        <GuidanceField
                                            label={t('writing.threads.detail_craft_guidance')}
                                            value={card.craft_guidance}
                                        />
                                        <GuidanceField label={t('writing.threads.detail_pitfalls')} value={card.pitfalls} />
                                        <GuidanceField label={t('writing.threads.detail_shape')} value={card.shape} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <span style={fieldLabelStyle}>{t('writing.threads.detail_stance_label')}</span>
                            <select
                                className="alex-select mt-1 h-9 w-full text-sm"
                                value={stance}
                                disabled={!canUpdate || stanceSaving}
                                onChange={(e) => void handleStanceChange(e.target.value as PatternStance | '')}
                            >
                                <option value="">{t('writing.threads.stance_none')}</option>
                                {PATTERN_STANCES.map((candidate) => (
                                    <option key={candidate} value={candidate}>
                                        {t(`writing.threads.stance_${candidate}`)}
                                    </option>
                                ))}
                            </select>
                            {stanceError && (
                                <p className="mt-1 text-xs" style={errorTextStyle}>
                                    {t('writing.threads.detail_save_error')}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('writing.threads.detail_scope_label')}>
                            <span style={fieldLabelStyle}>{t('writing.threads.detail_scope_label')}</span>
                            {scopeChoiceOptions.map(({ choice, label }) => (
                                <label key={scopeKey(choice)} className="flex cursor-pointer items-center gap-3 text-sm">
                                    <input
                                        type="radio"
                                        name="thread-detail-scope"
                                        checked={scopeKey(scope) === scopeKey(choice)}
                                        disabled={!canUpdate || scopeSaving}
                                        onChange={() => void handleScopeChange(choice)}
                                    />
                                    {label}
                                </label>
                            ))}
                            {scopeError && (
                                <p className="text-xs" style={errorTextStyle}>
                                    {t('writing.threads.detail_save_error')}
                                </p>
                            )}
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span style={fieldLabelStyle}>{t('writing.threads.detail_marks_heading')}</span>
                                {canUpdate && (
                                    <Button
                                        variant="ghost"
                                        icon="fa-solid fa-plus"
                                        iconPosition="before"
                                        onClick={() => onRequestAddMark(detail)}
                                    >
                                        {t('writing.threads.add_mark_action')}
                                    </Button>
                                )}
                            </div>

                            {detail.marks.length === 0 ? (
                                <p className="text-sm italic" style={mutedTextStyle}>
                                    {t('writing.threads.detail_marks_empty')}
                                </p>
                            ) : (
                                <div className="flex flex-col">
                                    {detail.marks.map((mark) => (
                                        <div key={mark.id} style={markRowStyle}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-2">
                                                    <span style={markRoleChipStyle}>
                                                        {t(`writing.threads.role_${mark.role}`)}
                                                    </span>
                                                    <span className="text-sm font-medium">{mark.section_title}</span>
                                                </span>
                                                {canUpdate && (
                                                    <button
                                                        type="button"
                                                        style={deleteMarkBtnStyle}
                                                        aria-label={t('writing.threads.delete_mark_action')}
                                                        onClick={() => setDeletingMark(mark)}
                                                    >
                                                        <i className="fa-solid fa-trash" aria-hidden="true" />
                                                    </button>
                                                )}
                                            </div>
                                            {mark.anchor_text !== null && (
                                                <p style={anchorQuoteStyle}>&ldquo;{mark.anchor_text}&rdquo;</p>
                                            )}
                                            {mark.note !== null && mark.note !== '' && (
                                                <p className="text-sm" style={mutedTextStyle}>
                                                    {mark.note}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {detail !== null && canUpdate && (
                <ModalFooter>
                    <Button
                        variant="danger"
                        icon="fa-solid fa-trash"
                        onClick={() => setConfirmingThreadDelete(true)}
                    >
                        {t('writing.threads.delete_thread_action')}
                    </Button>
                </ModalFooter>
            )}

            <ConfirmModal
                open={deletingMark !== null}
                onClose={() => setDeletingMark(null)}
                onConfirm={() => void confirmDeleteMark()}
                title={t('writing.threads.delete_mark_confirm_title')}
                message={t('writing.threads.delete_mark_confirm_body')}
                confirmLabel={t('writing.threads.delete_mark_action')}
                variant="danger"
                loading={markDeleteBusy}
            />

            <ConfirmModal
                open={confirmingThreadDelete}
                onClose={() => setConfirmingThreadDelete(false)}
                onConfirm={() => void confirmDeleteThread()}
                title={t('writing.threads.delete_thread_confirm_title')}
                message={t('writing.threads.delete_thread_confirm_body')}
                confirmLabel={t('writing.threads.delete_thread_action')}
                variant="danger"
                loading={threadDeleteBusy}
            />
        </Modal>
    );
}

function GuidanceField({ label, value }: { label: string; value: string | null }) {
    if (value === null || value.trim() === '') {
        return null;
    }

    return (
        <div className="flex flex-col gap-0.5">
            <span style={fieldLabelStyle}>{label}</span>
            <p className="text-sm">{value}</p>
        </div>
    );
}
