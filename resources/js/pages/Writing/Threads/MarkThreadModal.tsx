import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import Button from '@alexandria/components/ui/Button';
import Input from '@alexandria/components/form/Input';
import Textarea from '@alexandria/components/form/Textarea';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

import type { SectionNode } from '../Workspace';
import { ancestorsOf, scopeChoiceToWire, scopeKey, type ScopeChoice } from './scopeChoice';
import { groupCardsByKind } from './cardGroups';
import {
    createMark,
    createThread,
    fetchCards,
    fetchScopeOptions,
    fetchThreads,
    PATTERN_STANCES,
    type PatternCard,
    type PatternMark,
    type PatternMarkRole,
    type PatternStance,
    type PatternThread,
    type ScopeOptions,
} from './threadApi';

/**
 * Mark-a-device dialog — Devices & Tropes Task 5 (design doc
 * 2026-08-29-devices-tropes-design.md Surfaces #2). `MarkRevisionModal`
 * is the structural pattern (one modal, a locked-vs-unlocked entry
 * point), extended to two steps because a thread carries more shape
 * than a revision does:
 *
 *  step 1 — pick or create the THREAD (which pattern, which instance,
 *           and — only for a brand new thread — the scope node it must
 *           resolve within);
 *  step 2 — pin this MARK (role + optional note + optional prose-span
 *           anchor) to the section this modal is scoped to.
 *
 * Two different "section" concepts are in play and must not be
 * conflated: the thread's SCOPE (chosen once, at creation, from
 * `sections`/`workId`/the fetched `writing.scope_options` entry +
 * ancestors) is where the thread must resolve; the MARK's section
 * (`lockedSection ?? currentSection`) is simply wherever this modal was
 * opened from — fixed, never a step-1 choice.
 *
 * Entry points:
 *  - File → "Mark device…" (`lockedSection: null`): unlocked — the mark
 *    lands on the workspace's current section.
 *  - Kanban card menu / outline row menu (`lockedSection: <row>`): the
 *    mark's section is fixed to that row; those surfaces don't carry
 *    the nested section tree, so they pass the lightweight `{id,
 *    title}` shape rather than a full `SectionNode`.
 *  - Editor selection bubble: `anchor` carries the captured prose span;
 *    the mark's section is still `currentSection` (there's only one
 *    section being edited).
 *
 * `lockedThread` skips step 1 entirely — required for Task 6's reuse
 * (marking a subsequent moment of a thread that's already selected
 * elsewhere, e.g. the threads sidebar's "add mark" action).
 *
 * Success is a toastless inline confirmation, auto-closing — same
 * idiom as MarkRevisionModal. `onMarked` fires immediately on success
 * (not after the close delay) so an already-open threads panel can
 * refresh right away.
 */

const CONFIRM_CLOSE_DELAY_MS = 1100;

/** A section-shaped scope/mark target. Kanban cards and outline rows
 *  don't hold the nested `SectionNode` tree, so this is the lightest
 *  shape that still locates ancestors in `sections`. */
export interface ThreadSectionRef {
    id: number;
    title: string;
}

export interface ThreadAnchor {
    text: string;
    offsetHint: number | null;
}

export interface MarkThreadModalProps {
    projectSlug: string;
    workId: number;
    /** Full section tree — used only to compute scope-picker ancestors. */
    sections: SectionNode[];
    /** The workspace's current section, when the modal opens unlocked. */
    currentSection: ThreadSectionRef | null;
    /** Non-null when opened from a Kanban card / outline row — fixes
     *  both the mark's section and the scope-picker's ancestor base. */
    lockedSection: ThreadSectionRef | null;
    /** Non-null skips step 1 entirely — Task 6 reuse. */
    lockedThread: PatternThread | null;
    /** Captured editor selection, when opened from the selection bubble. */
    anchor: ThreadAnchor | null;
    onClose: () => void;
    onMarked: (result: { thread: PatternThread; mark: PatternMark }) => void;
}

const mutedTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
};

const threadListStyle: CSSProperties = {
    maxHeight: '12rem',
    overflowY: 'auto',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

const threadRowStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const anchorQuoteStyle: CSSProperties = {
    borderLeft: '3px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    padding: '0.375rem 0.625rem',
    fontStyle: 'italic',
    fontSize: '0.8125rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

export default function MarkThreadModal({
    projectSlug,
    workId,
    sections,
    currentSection,
    lockedSection,
    lockedThread,
    anchor,
    onClose,
    onMarked,
}: MarkThreadModalProps) {
    const t = useT();

    // The mark's section is fixed to whichever row this modal was
    // opened from; the ribbon's unlocked entry point falls back to the
    // workspace's current section.
    const section = lockedSection ?? currentSection;
    const ancestors = section !== null ? ancestorsOf(sections, section.id) : [];

    const [selectedThread, setSelectedThread] = useState<PatternThread | null>(null);
    const thread = lockedThread ?? selectedThread;

    /* ── Step 1 data: open threads + the card library + the scope picker's
       compendium-entry branch ── */
    const [openThreads, setOpenThreads] = useState<PatternThread[] | null>(null);
    const [threadsError, setThreadsError] = useState(false);
    const [cards, setCards] = useState<PatternCard[] | null>(null);
    const [scopeOptions, setScopeOptions] = useState<ScopeOptions | null>(null);
    const [search, setSearch] = useState('');
    const [creatingNew, setCreatingNew] = useState(false);

    useEffect(() => {
        if (lockedThread !== null) {
            return;
        }

        let cancelled = false;

        fetchThreads(projectSlug, { status: 'open' }).then((result) => {
            if (cancelled) {
                return;
            }

            if (result === null) {
                setThreadsError(true);
                return;
            }

            setOpenThreads(result);
        });

        fetchCards(projectSlug).then((result) => {
            if (!cancelled && result !== null) {
                setCards(result);
            }
        });

        // The work's linked compendium entry + its ancestor chain (fix
        // round 1) — only ever needed for the new-thread scope picker,
        // but fetched eagerly here alongside cards/threads so toggling
        // "New thread…" doesn't show a loading flicker.
        fetchScopeOptions(projectSlug, workId).then((result) => {
            if (!cancelled && result !== null) {
                setScopeOptions(result);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [projectSlug, workId, lockedThread]);

    const cardsByKind = useMemo(() => groupCardsByKind(cards), [cards]);

    const filteredThreads = useMemo(() => {
        const needle = search.trim().toLowerCase();

        if (needle === '') {
            return openThreads ?? [];
        }

        return (openThreads ?? []).filter(
            (candidate) =>
                candidate.title.toLowerCase().includes(needle) ||
                candidate.card_name.toLowerCase().includes(needle),
        );
    }, [openThreads, search]);

    /* ── New-thread form state ── */
    const [newCardId, setNewCardId] = useState<number | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newStance, setNewStance] = useState<PatternStance | ''>('');
    const [scope, setScope] = useState<ScopeChoice>(() =>
        section !== null ? { type: 'section', id: section.id } : { type: 'work' },
    );
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(false);

    async function submitNewThread() {
        if (newCardId === null || newTitle.trim() === '') {
            setCreateError(true);
            return;
        }

        setCreating(true);
        setCreateError(false);

        const { scope_type, scope_id } = scopeChoiceToWire(scope, workId);
        const created = await createThread(projectSlug, {
            pattern_card_id: newCardId,
            title: newTitle.trim(),
            stance: newStance === '' ? null : newStance,
            scope_type,
            scope_id,
        });

        setCreating(false);

        if (created === null) {
            setCreateError(true);
            return;
        }

        setSelectedThread(created);
    }

    /* ── Step 2: the mark itself ── */
    const [role, setRole] = useState<PatternMarkRole>('setup');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    async function submitMark() {
        if (thread === null || section === null) {
            return;
        }

        setSubmitting(true);
        setSubmitError(false);

        const result = await createMark(projectSlug, thread.id, {
            role,
            work_section_id: section.id,
            anchor_text: anchor?.text ?? null,
            anchor_offset_hint: anchor?.offsetHint ?? null,
            note: note.trim() === '' ? null : note.trim(),
        });

        setSubmitting(false);

        if (result === null) {
            setSubmitError(true);
            return;
        }

        setConfirmed(true);
        onMarked({ thread, mark: result.mark });
        window.setTimeout(onClose, CONFIRM_CLOSE_DELAY_MS);
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader title={t('writing.threads.mark_title')} onClose={onClose} />

            {section === null ? (
                <div className="px-6 py-8 text-center text-sm" style={mutedTextStyle}>
                    {t('writing.threads.no_section')}
                </div>
            ) : confirmed ? (
                <div className="px-6 py-8 text-center text-sm font-medium">
                    {t('writing.threads.mark_confirmed')}
                </div>
            ) : thread === null ? (
                <ThreadPickerStep
                    t={t}
                    openThreads={openThreads}
                    threadsError={threadsError}
                    search={search}
                    setSearch={setSearch}
                    filteredThreads={filteredThreads}
                    onPickThread={setSelectedThread}
                    creatingNew={creatingNew}
                    setCreatingNew={setCreatingNew}
                    cardsByKind={cardsByKind}
                    newCardId={newCardId}
                    setNewCardId={setNewCardId}
                    newTitle={newTitle}
                    setNewTitle={setNewTitle}
                    newStance={newStance}
                    setNewStance={setNewStance}
                    scope={scope}
                    setScope={setScope}
                    section={section}
                    ancestors={ancestors}
                    scopeOptions={scopeOptions}
                    creating={creating}
                    createError={createError}
                    onSubmitNewThread={() => void submitNewThread()}
                    onClose={onClose}
                />
            ) : (
                <MarkStep
                    t={t}
                    thread={thread}
                    section={section}
                    anchor={anchor}
                    role={role}
                    setRole={setRole}
                    note={note}
                    setNote={setNote}
                    submitting={submitting}
                    submitError={submitError}
                    canChangeThread={lockedThread === null}
                    onChangeThread={() => setSelectedThread(null)}
                    onSubmit={() => void submitMark()}
                    onClose={onClose}
                />
            )}
        </Modal>
    );
}

/* ── Step 1: pick an existing thread, or create a new one ── */

interface ThreadPickerStepProps {
    t: ReturnType<typeof useT>;
    openThreads: PatternThread[] | null;
    threadsError: boolean;
    search: string;
    setSearch: (value: string) => void;
    filteredThreads: PatternThread[];
    onPickThread: (thread: PatternThread) => void;
    creatingNew: boolean;
    setCreatingNew: (value: boolean) => void;
    cardsByKind: [string, PatternCard[]][];
    newCardId: number | null;
    setNewCardId: (value: number | null) => void;
    newTitle: string;
    setNewTitle: (value: string) => void;
    newStance: PatternStance | '';
    setNewStance: (value: PatternStance | '') => void;
    scope: ScopeChoice;
    setScope: (value: ScopeChoice) => void;
    section: ThreadSectionRef;
    ancestors: SectionNode[];
    /** The work's linked compendium entry + its ancestor chain (fix
     *  round 1) — `null` until `writing.scope_options` resolves, or when
     *  the work has no linked entry (both render no extra options). */
    scopeOptions: ScopeOptions | null;
    creating: boolean;
    createError: boolean;
    onSubmitNewThread: () => void;
    onClose: () => void;
}

function ThreadPickerStep({
    t,
    openThreads,
    threadsError,
    search,
    setSearch,
    filteredThreads,
    onPickThread,
    creatingNew,
    setCreatingNew,
    cardsByKind,
    newCardId,
    setNewCardId,
    newTitle,
    setNewTitle,
    newStance,
    setNewStance,
    scope,
    setScope,
    section,
    ancestors,
    scopeOptions,
    creating,
    createError,
    onSubmitNewThread,
    onClose,
}: ThreadPickerStepProps) {
    // Compendium branch: the linked entry itself (nearest to the work),
    // then its ancestors nearest-first — same "nearest thing first"
    // ordering as the section ancestors above. Labels are the entry
    // names as-is, exactly like section ancestors use their title as-is.
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

    const scopeChoiceOptions: Array<{ choice: ScopeChoice; label: string }> = [
        { choice: { type: 'section', id: section.id }, label: section.title },
        ...ancestors.map((ancestor) => ({
            choice: { type: 'section' as const, id: ancestor.id },
            label: ancestor.title,
        })),
        { choice: { type: 'work' }, label: t('writing.threads.scope_this_work') },
        ...entryOptions,
    ];

    return (
        <>
            <div className="flex flex-col gap-3 px-6 py-5">
                {!creatingNew && (
                    <>
                        <span className="text-xs font-semibold" style={mutedTextStyle}>
                            {t('writing.threads.step_pick_thread')}
                        </span>

                        <Input
                            name="thread-search"
                            placeholder={t('writing.threads.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="md"
                        />

                        <div style={threadListStyle}>
                            {openThreads === null && !threadsError && (
                                <p className="px-3 py-2 text-sm" style={mutedTextStyle}>
                                    {t('writing.threads.loading_threads')}
                                </p>
                            )}
                            {threadsError && (
                                <p className="px-3 py-2 text-sm" style={errorTextStyle}>
                                    {t('writing.threads.load_error')}
                                </p>
                            )}
                            {openThreads !== null && filteredThreads.length === 0 && (
                                <p className="px-3 py-2 text-sm" style={mutedTextStyle}>
                                    {t('writing.threads.no_threads_found')}
                                </p>
                            )}
                            {filteredThreads.map((candidate) => (
                                <button
                                    key={candidate.id}
                                    type="button"
                                    style={threadRowStyle}
                                    onClick={() => onPickThread(candidate)}
                                >
                                    <span className="text-sm font-medium">{candidate.title}</span>
                                    <span className="ml-2 text-xs" style={mutedTextStyle}>
                                        {candidate.card_name}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <Button variant="ghost" type="button" onClick={() => setCreatingNew(true)}>
                            {t('writing.threads.new_thread_toggle')}
                        </Button>
                    </>
                )}

                {creatingNew && (
                    <>
                        <span className="text-xs font-semibold" style={mutedTextStyle}>
                            {t('writing.threads.new_thread_title')}
                        </span>

                        <div>
                            <span className="mb-1.5 block text-xs" style={mutedTextStyle}>
                                {t('writing.threads.card_label')}
                            </span>
                            <select
                                className="alex-select h-9 text-sm"
                                value={newCardId ?? ''}
                                onChange={(e) =>
                                    setNewCardId(e.target.value === '' ? null : Number(e.target.value))
                                }
                            >
                                <option value="">{t('writing.threads.card_placeholder')}</option>
                                {cardsByKind.map(([kind, kindCards]) => (
                                    <optgroup key={kind} label={kind}>
                                        {kindCards.map((card) => (
                                            <option key={card.id} value={card.id}>
                                                {card.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <Input
                            label={t('writing.threads.title_label')}
                            name="thread-title"
                            placeholder={t('writing.threads.title_placeholder')}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            size="md"
                        />

                        <div>
                            <span className="mb-1.5 block text-xs" style={mutedTextStyle}>
                                {t('writing.threads.stance_label')}
                            </span>
                            <select
                                className="alex-select h-9 text-sm"
                                value={newStance}
                                onChange={(e) => setNewStance(e.target.value as PatternStance | '')}
                            >
                                <option value="">{t('writing.threads.stance_none')}</option>
                                {PATTERN_STANCES.map((stance) => (
                                    <option key={stance} value={stance}>
                                        {t(`writing.threads.stance_${stance}`)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('writing.threads.scope_label')}>
                            <span className="text-xs" style={mutedTextStyle}>
                                {t('writing.threads.scope_label')}
                            </span>

                            {scopeChoiceOptions.map(({ choice, label }) => (
                                <label key={scopeKey(choice)} className="flex cursor-pointer items-center gap-3 text-sm">
                                    <input
                                        type="radio"
                                        name="mark-thread-scope"
                                        checked={scopeKey(scope) === scopeKey(choice)}
                                        onChange={() => setScope(choice)}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>

                        {createError && (
                            <p className="text-xs" style={errorTextStyle}>
                                {t('writing.threads.create_error')}
                            </p>
                        )}
                    </>
                )}
            </div>
            <ModalFooter>
                {creatingNew ? (
                    <>
                        <Button variant="ghost" type="button" onClick={() => setCreatingNew(false)}>
                            {t('writing.form.cancel')}
                        </Button>
                        <Button type="button" loading={creating} onClick={onSubmitNewThread}>
                            {t('writing.threads.create_action')}
                        </Button>
                    </>
                ) : (
                    <Button variant="ghost" type="button" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                )}
            </ModalFooter>
        </>
    );
}

/* ── Step 2: pin the mark ── */

interface MarkStepProps {
    t: ReturnType<typeof useT>;
    thread: PatternThread;
    section: ThreadSectionRef;
    anchor: ThreadAnchor | null;
    role: PatternMarkRole;
    setRole: (value: PatternMarkRole) => void;
    note: string;
    setNote: (value: string) => void;
    submitting: boolean;
    submitError: boolean;
    canChangeThread: boolean;
    onChangeThread: () => void;
    onSubmit: () => void;
    onClose: () => void;
}

const MARK_ROLES: PatternMarkRole[] = ['setup', 'develop', 'payoff'];

function MarkStep({
    t,
    thread,
    section,
    anchor,
    role,
    setRole,
    note,
    setNote,
    submitting,
    submitError,
    canChangeThread,
    onChangeThread,
    onSubmit,
    onClose,
}: MarkStepProps) {
    return (
        <form
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
        >
            <div className="flex flex-col gap-4 px-6 py-5">
                <div>
                    <span className="mb-1.5 block text-xs" style={mutedTextStyle}>
                        {t('writing.threads.step_mark')}
                    </span>
                    <p className="text-sm font-medium">
                        {thread.title}
                        <span className="ml-2 text-xs" style={mutedTextStyle}>
                            {thread.card_name}
                        </span>
                    </p>
                    <p className="text-xs" style={mutedTextStyle}>{section.title}</p>
                    {canChangeThread && (
                        <button
                            type="button"
                            className="mt-1 text-xs underline"
                            style={mutedTextStyle}
                            onClick={onChangeThread}
                        >
                            {t('writing.threads.change_thread')}
                        </button>
                    )}
                </div>

                {anchor !== null && (
                    <div>
                        <span className="mb-1.5 block text-xs" style={mutedTextStyle}>
                            {t('writing.threads.anchor_label')}
                        </span>
                        <p style={anchorQuoteStyle}>&ldquo;{anchor.text}&rdquo;</p>
                    </div>
                )}

                <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('writing.threads.role_label')}>
                    <span className="text-xs" style={mutedTextStyle}>
                        {t('writing.threads.role_label')}
                    </span>
                    {MARK_ROLES.map((candidate) => (
                        <label key={candidate} className="flex cursor-pointer items-center gap-3 text-sm">
                            <input
                                type="radio"
                                name="mark-thread-role"
                                checked={role === candidate}
                                onChange={() => setRole(candidate)}
                            />
                            {t(`writing.threads.role_${candidate}`)}
                        </label>
                    ))}
                </div>

                <Textarea
                    label={t('writing.threads.note_label')}
                    name="mark-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                />

                {submitError && (
                    <p className="text-xs" style={errorTextStyle}>
                        {t('writing.threads.mark_error')}
                    </p>
                )}
            </div>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose} type="button">
                    {t('writing.form.cancel')}
                </Button>
                <Button type="submit" loading={submitting}>
                    {t('writing.threads.mark_button')}
                </Button>
            </ModalFooter>
        </form>
    );
}
