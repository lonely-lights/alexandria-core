import { router } from '@inertiajs/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import Button from '@alexandria/components/ui/Button';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import useT, { type Translator } from '@alexandria/hooks/useT';

import type { CurrentSection } from '../Workspace';
import {
    fetchSectionHistory,
    fetchVersion,
    restoreVersion,
    type HistoryBufferRow,
    type HistoryRevisionRow,
    type SectionHistory,
    type VersionDetail,
} from './revisionApi';

/**
 * History sidebar mode — Stage 9 (design doc 2026-08-29-revisions-design.md
 * Surfaces #3), the fifth built-in right-rail mode alongside Linked
 * items/Notes/Comments/Outline. For the current section: three groups —
 * "Revisions of this scene" (own scope), "Captured by larger revisions"
 * (ancestor/work scopes, each row naming its scope), "Recent saves" (the
 * unnumbered safety buffer). Any row opens a read-only view modal with a
 * Restore action.
 *
 * Load/refetch pattern mirrors OutlineSidebar: fetch on mount, refetch on
 * `currentSection` change via a cancel-ref guard. `refreshSignal` is an
 * extra dependency the Workspace bumps after a mark-revision succeeds
 * elsewhere (e.g. the File-menu dialog) while this panel is already open.
 */

export interface HistoryPanelProps {
    projectSlug: string;
    workSlug: string;
    currentSection: CurrentSection | null;
    canUpdate: boolean;
    refreshSignal: number;
}

/** The row clicked into the view modal — enough to render its header before the payload arrives. */
interface SelectedRow {
    versionId: number;
    title: string;
    subtitle: string | null;
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

const groupHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
};

const countChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    whiteSpace: 'nowrap',
};

const rowClass = 'alex-row flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm';
const rowStyle: CSSProperties = { borderRadius: 'var(--theme-radius-button)' };

const rowSubtitleStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const fieldLabelStyle: CSSProperties = {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

function formatWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function revisionTitle(row: HistoryRevisionRow, t: Translator): string {
    return row.label && row.label.trim() !== ''
        ? row.label
        : t('writing.revisions.rev_number').replace(':number', String(row.number));
}

function GroupHeading({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
            <span className="min-w-0 truncate" style={groupHeadingStyle}>{label}</span>
            <span style={countChipStyle}>{count}</span>
        </div>
    );
}

function RevisionRowButton({
    row,
    subtitle,
    onOpen,
    t,
}: {
    row: HistoryRevisionRow;
    subtitle: string | null;
    onOpen: (selected: SelectedRow) => void;
    t: Translator;
}) {
    return (
        <button
            type="button"
            className={rowClass}
            style={rowStyle}
            onClick={() => onOpen({ versionId: row.version_id, title: revisionTitle(row, t), subtitle })}
        >
            <span className="w-full truncate font-medium">{revisionTitle(row, t)}</span>
            <span className="flex w-full items-center justify-between gap-2">
                {subtitle !== null ? (
                    <span className="min-w-0 truncate" style={rowSubtitleStyle}>{subtitle}</span>
                ) : (
                    <span />
                )}
                <span style={rowSubtitleStyle}>{formatWhen(row.created_at)}</span>
            </span>
        </button>
    );
}

function BufferRowButton({
    row,
    onOpen,
    t,
}: {
    row: HistoryBufferRow;
    onOpen: (selected: SelectedRow) => void;
    t: Translator;
}) {
    const title = t('writing.revisions.recent_save');

    return (
        <button
            type="button"
            className={rowClass}
            style={rowStyle}
            onClick={() => onOpen({ versionId: row.version_id, title, subtitle: null })}
        >
            <span className="w-full truncate font-medium">{title}</span>
            <span className="flex w-full items-center justify-between gap-2">
                <span style={rowSubtitleStyle}>
                    {t('writing.workspace.words').replace(':count', row.word_count.toLocaleString())}
                </span>
                <span style={rowSubtitleStyle}>{formatWhen(row.created_at)}</span>
            </span>
        </button>
    );
}

/** Plan fields listed in the view modal when the payload carries them. */
function PlanField({ label, value }: { label: string; value: string | null | undefined }) {
    if (value === null || value === undefined || value.trim() === '') {
        return null;
    }

    return (
        <div className="flex flex-col gap-0.5">
            <span style={fieldLabelStyle}>{label}</span>
            <p className="text-sm">{value}</p>
        </div>
    );
}

export default function HistoryPanel({
    projectSlug,
    workSlug,
    currentSection,
    canUpdate,
    refreshSignal,
}: HistoryPanelProps) {
    const t = useT();
    const [history, setHistory] = useState<SectionHistory | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    const [selected, setSelected] = useState<SelectedRow | null>(null);
    const [detail, setDetail] = useState<VersionDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailFailed, setDetailFailed] = useState(false);

    const [confirmingRestore, setConfirmingRestore] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [restoreFailed, setRestoreFailed] = useState(false);

    const cancelRef = useRef<() => void>(() => undefined);
    const sectionId = currentSection?.id ?? null;

    function loadHistory() {
        cancelRef.current();
        let cancelled = false;
        cancelRef.current = () => {
            cancelled = true;
        };

        if (sectionId === null) {
            setHistory(null);
            setLoading(false);
            setFailed(false);

            return;
        }

        setLoading(true);
        setFailed(false);

        fetchSectionHistory(projectSlug, workSlug, sectionId).then((result) => {
            if (cancelled) {
                return;
            }

            if (result === null) {
                setFailed(true);
                setLoading(false);

                return;
            }

            setHistory(result);
            setLoading(false);
        });
    }

    useEffect(() => {
        loadHistory();

        return () => cancelRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectSlug, workSlug, sectionId, refreshSignal]);

    function openRow(row: SelectedRow) {
        setSelected(row);
        setDetail(null);
        setDetailFailed(false);
        setDetailLoading(true);

        fetchVersion(projectSlug, workSlug, row.versionId).then((result) => {
            if (result === null) {
                setDetailFailed(true);
                setDetailLoading(false);

                return;
            }

            setDetail(result);
            setDetailLoading(false);
        });
    }

    function closeView() {
        setSelected(null);
        setDetail(null);
        setDetailFailed(false);
        setConfirmingRestore(false);
        setRestoreFailed(false);
    }

    async function confirmRestore() {
        if (selected === null) {
            return;
        }

        setRestoring(true);
        setRestoreFailed(false);

        const result = await restoreVersion(projectSlug, workSlug, selected.versionId);

        setRestoring(false);

        if (result === null) {
            setRestoreFailed(true);

            return;
        }

        setConfirmingRestore(false);
        closeView();
        loadHistory();
        router.reload({ only: ['currentSection', 'sections'] });
    }

    const own = history?.own ?? [];
    const inherited = history?.inherited ?? [];
    const buffer = history?.buffer ?? [];

    return (
        <div
            data-history-panel=""
            style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        >
            <div style={headerStyle}>
                <span style={titleStyle}>{t('writing.revisions.sidebar_label')}</span>
            </div>

            <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto px-1 py-2">
                {sectionId === null && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.revisions.no_section')}
                    </p>
                )}

                {sectionId !== null && loading && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.revisions.loading')}
                    </p>
                )}

                {sectionId !== null && failed && (
                    <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('writing.revisions.load_error')}
                    </p>
                )}

                {sectionId !== null && !loading && !failed && (
                    <>
                        <GroupHeading label={t('writing.revisions.group_own')} count={own.length} />
                        {own.length === 0 ? (
                            <p className="px-3 pb-1 text-xs" style={hintStyle}>{t('writing.revisions.own_empty')}</p>
                        ) : (
                            own.map((row) => (
                                <RevisionRowButton key={row.version_id} row={row} subtitle={null} onOpen={openRow} t={t} />
                            ))
                        )}

                        <GroupHeading label={t('writing.revisions.group_inherited')} count={inherited.length} />
                        {inherited.length === 0 ? (
                            <p className="px-3 pb-1 text-xs" style={hintStyle}>{t('writing.revisions.inherited_empty')}</p>
                        ) : (
                            inherited.map((row) => (
                                <RevisionRowButton
                                    key={row.version_id}
                                    row={row}
                                    subtitle={row.scopeTitle ?? t('writing.revisions.scope_entire_work')}
                                    onOpen={openRow}
                                    t={t}
                                />
                            ))
                        )}

                        <GroupHeading label={t('writing.revisions.group_buffer')} count={buffer.length} />
                        {buffer.length === 0 ? (
                            <p className="px-3 pb-1 text-xs" style={hintStyle}>{t('writing.revisions.buffer_empty')}</p>
                        ) : (
                            buffer.map((row) => (
                                <BufferRowButton key={row.version_id} row={row} onOpen={openRow} t={t} />
                            ))
                        )}
                    </>
                )}
            </div>

            {selected !== null && (
                <Modal open onClose={closeView} maxWidth="max-w-2xl">
                    <ModalHeader
                        title={
                            <span className="flex flex-col">
                                <span>{selected.title}</span>
                                {selected.subtitle !== null && (
                                    <span className="text-xs font-normal" style={rowSubtitleStyle}>{selected.subtitle}</span>
                                )}
                            </span>
                        }
                        onClose={closeView}
                    />

                    <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-6 py-5">
                        {detailLoading && (
                            <p className="text-center text-xs" style={hintStyle}>{t('writing.revisions.loading')}</p>
                        )}

                        {detailFailed && (
                            <p className="text-center text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                                {t('writing.revisions.load_error')}
                            </p>
                        )}

                        {detail !== null && (
                            <>
                                <PlanField label={t('writing.revisions.field_synopsis')} value={detail.payload.synopsis} />

                                {detail.payload.beats !== null && detail.payload.beats !== undefined && detail.payload.beats.length > 0 && (
                                    <div className="flex flex-col gap-0.5">
                                        <span style={fieldLabelStyle}>{t('writing.revisions.field_beats')}</span>
                                        <ul className="list-disc pl-4 text-sm">
                                            {detail.payload.beats.map((beat) => (
                                                <li key={beat.id}>{beat.text}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <PlanField label={t('writing.revisions.field_goal')} value={detail.payload.goal} />
                                <PlanField label={t('writing.revisions.field_conflict')} value={detail.payload.conflict} />
                                <PlanField label={t('writing.revisions.field_stakes')} value={detail.payload.stakes} />
                                <PlanField label={t('writing.revisions.field_mood')} value={detail.payload.mood} />
                                <PlanField label={t('writing.revisions.field_tone')} value={detail.payload.tone} />

                                <div className="flex flex-col gap-0.5">
                                    <span style={fieldLabelStyle}>{t('writing.revisions.field_content')}</span>
                                    <pre
                                        className="whitespace-pre-wrap text-sm"
                                        style={{ fontFamily: 'inherit' }}
                                    >
                                        {detail.payload.content ?? ''}
                                    </pre>
                                </div>
                            </>
                        )}
                    </div>

                    <div
                        className="flex items-center justify-end gap-3 px-6 py-4"
                        style={{ borderTop: '1px solid var(--theme-base-400)' }}
                    >
                        {restoreFailed && (
                            <p className="text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                                {t('writing.revisions.restore_error')}
                            </p>
                        )}
                        {canUpdate && (
                            <Button
                                variant="secondary"
                                icon="fa-solid fa-clock-rotate-left"
                                onClick={() => setConfirmingRestore(true)}
                                disabled={detail === null}
                            >
                                {t('writing.revisions.restore_action')}
                            </Button>
                        )}
                    </div>
                </Modal>
            )}

            <ConfirmModal
                open={confirmingRestore}
                onClose={() => setConfirmingRestore(false)}
                onConfirm={() => void confirmRestore()}
                title={t('writing.revisions.restore_confirm_title')}
                message={t('writing.revisions.restore_confirm_body')}
                confirmLabel={t('writing.revisions.restore_action')}
                loading={restoring}
            />
        </div>
    );
}
