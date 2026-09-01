import { router } from '@inertiajs/react';
import {
    useState,
    type CSSProperties,
    type FocusEvent,
    type HTMLAttributes,
    type KeyboardEvent,
} from 'react';

import useT from '@alexandria/hooks/useT';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import { worksBase } from '@alexandria/lib/urls';

import type { KanbanCardModel } from './kanbanModel';
import type { MoodAccent } from './moodPalette';
import type { OutlineBeat, OutlineRow } from '../Outline/outlineTypes';
import type { ThreadSectionRef } from '../Threads/MarkThreadModal';
import type { PatternChip } from '../Threads/patternChips';

/**
 * KanbanCard — one scene index card, spec 2026-08-28 Kanban board (né Beat Board) Task 3.
 *
 * The front face of a Kanban board (né Beat Board) card: title/synopsis/beats mirror the
 * Outline view's row, plus a collapsed-by-default "Craft" disclosure
 * for the dormant planning fields (beat type, goal, conflict, stakes,
 * tone). Every editable field is fully controlled by `card.row` (the
 * same pattern `OutlineView` uses for its title/synopsis inputs) —
 * `onRowEdit` pushes each keystroke's optimistic patch up to the
 * board's row array, and a field's blur fires its own persistence:
 *
 * - title/synopsis/craft fields save via a single-section
 *   `works.sections.update` PUT — the exact `PlanBlock.commitSynopsis`
 *   idiom (send `title` alongside the changed field, since the route
 *   requires it), but with `only: []` since the board reads from the
 *   outline projection rather than page props.
 * - beats do NOT save from inside this component. The toggle dot
 *   calls `onBeatToggle(row, beat)` unchanged — its signature mirrors
 *   `OutlineView.toggleBeat` exactly so the board can wire the same
 *   PATCH idiom to it without this component knowing about fetch/PATCH
 *   at all. Text edits and Enter-adds-a-beat only patch the row's
 *   `beats` array through `onRowEdit`; the board's `useOutlineSync`
 *   flush is what actually persists them (via the bulk outline PUT),
 *   matching the ledgered save-layering split.
 *
 * `card.dividerTitle` is intentionally unused here — the chapter
 * divider row above a card is KanbanView's responsibility (Task 4), not
 * this component's.
 *
 * Only a persisted row (`sectionId !== null`) can save craft fields or
 * toggle beats; the board never creates sections, so every card is
 * persisted in practice, but the guards stay defensive per the ledger.
 */

export interface KanbanCardProps {
    card: KanbanCardModel;
    projectSlug: string;
    workSlug: string;
    canUpdate: boolean;
    accent: MoodAccent;
    onRowEdit: (key: string, patch: Partial<OutlineRow>) => void;
    onBeatToggle: (row: OutlineRow, beat: OutlineBeat) => void;
    onOpen: (slug: string) => void;
    /** Opens MarkThreadModal locked to this card's section (Devices &
     *  Tropes Task 5). Omitted for a not-yet-saved card (no sectionId). */
    onRequestMarkThread?: (section: ThreadSectionRef) => void;
    /** Up to 3 stance chips for threads scoped to this card's section
     *  (Devices & Tropes Task 6 — see KanbanView's fetch note). */
    chips?: PatternChip[];
    dragHandleProps: HTMLAttributes<HTMLDivElement>;
}

/** Section fields this card can save via the single-section PUT, and
 *  the snake_case key `works.sections.update` validates them under. */
const SAVE_FIELD_KEYS = {
    title: 'title',
    synopsis: 'synopsis',
    beatType: 'beat_type',
    goal: 'goal',
    conflict: 'conflict',
    stakes: 'stakes',
    tone: 'tone',
} as const;

type SaveableField = keyof typeof SAVE_FIELD_KEYS;

const cardStyle = (accent: MoodAccent): CSSProperties => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    borderRadius: 'var(--theme-radius-button)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    borderLeft: `4px solid ${accent.border}`,
    background: accent.wash,
    padding: '0.625rem 0.75rem 0.5rem',
});

const headerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    paddingRight: '1.25rem',
};

const labelChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
};

const titleInputStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--theme-base-content)',
    fontFamily: 'inherit',
    fontSize: '0.9375rem',
    fontWeight: 600,
    padding: '0.125rem 0',
};

const openBtnStyle: CSSProperties = {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.6875rem',
    padding: '0.125rem',
    lineHeight: 1,
};

const cardMenuWrapStyle: CSSProperties = {
    position: 'absolute',
    top: '0.375rem',
    right: '1.5rem',
};

const cardMenuBtnStyle: CSSProperties = {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.6875rem',
    padding: '0.125rem',
    lineHeight: 1,
};

function synopsisStyle(expanded: boolean): CSSProperties {
    return {
        width: '100%',
        display: 'block',
        border: 'none',
        outline: 'none',
        resize: expanded ? 'vertical' : 'none',
        background: 'transparent',
        color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
        fontFamily: 'inherit',
        fontSize: '0.8125rem',
        fontStyle: 'italic',
        lineHeight: 1.4,
        padding: 0,
        maxHeight: expanded ? '12rem' : '2.8rem',
        overflowY: expanded ? 'auto' : 'hidden',
        transition: 'max-height 0.15s ease',
    };
}

const beatsWrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1875rem',
};

const beatRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
};

function beatCheckStyle(done: boolean, canUpdate: boolean): CSSProperties {
    return {
        width: '0.75rem',
        height: '0.75rem',
        borderRadius: '999px',
        border: `1.5px solid ${done ? 'var(--theme-brand-primary-500)' : 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)'}`,
        background: done ? 'var(--theme-brand-primary-500)' : 'transparent',
        cursor: canUpdate ? 'pointer' : 'default',
        flexShrink: 0,
        padding: 0,
    };
}

function beatTextStyle(done: boolean): CSSProperties {
    return {
        flex: 1,
        minWidth: 0,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        font: 'inherit',
        padding: 0,
        fontSize: '0.75rem',
        color: done
            ? 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)'
            : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
        textDecoration: done ? 'line-through' : 'none',
    };
}

const craftToggleStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3125rem',
    border: 'none',
    background: 'none',
    padding: '0.125rem 0',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
};

function craftChevronStyle(open: boolean): CSSProperties {
    return {
        fontSize: '0.625rem',
        transition: 'transform 0.15s ease',
        transform: open ? 'rotate(90deg)' : 'none',
    };
}

const craftBodyStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    paddingTop: '0.125rem',
};

const beatTypeChipInputStyle: CSSProperties = {
    alignSelf: 'flex-start',
    border: 'none',
    outline: 'none',
    borderRadius: 'var(--theme-radius-badge)',
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    padding: '0.0625rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: 'inherit',
};

const craftFieldStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
};

const craftFieldLabelStyle: CSSProperties = {
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const craftTextareaStyle: CSSProperties = {
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    color: 'var(--theme-base-content)',
    fontFamily: 'inherit',
    fontSize: '0.75rem',
    lineHeight: 1.4,
    padding: '0.25rem 0.375rem',
    minHeight: '2.5rem',
};

const toneInputStyle: CSSProperties = {
    border: 'none',
    outline: 'none',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    color: 'var(--theme-base-content)',
    fontFamily: 'inherit',
    fontSize: '0.75rem',
    padding: '0.25rem 0.375rem',
};

const footerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.125rem',
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const statusBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
};

const chipRowStyle: CSSProperties = {
    display: 'flex',
    gap: '0.25rem',
};

function chipTokenStyle(chip: PatternChip): CSSProperties {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.125rem',
        height: '1.125rem',
        borderRadius: '999px',
        border: `1px solid ${chip.accent.border}`,
        background: chip.accent.wash,
        color: chip.accent.border,
        fontSize: '0.5625rem',
        fontWeight: 700,
        flexShrink: 0,
    };
}

export default function KanbanCard({
    card,
    projectSlug,
    workSlug,
    canUpdate,
    accent,
    onRowEdit,
    onBeatToggle,
    onOpen,
    onRequestMarkThread,
    chips = [],
    dragHandleProps,
}: KanbanCardProps) {
    const t = useT();
    const { row } = card;

    const [synopsisExpanded, setSynopsisExpanded] = useState(false);
    const [craftOpen, setCraftOpen] = useState(false);

    function saveField(field: SaveableField, value: string) {
        if (row.sectionId === null) {
            return;
        }

        const key = SAVE_FIELD_KEYS[field];
        const payload: Record<string, string | null> = {
            title: field === 'title' ? value : row.title,
        };

        if (field !== 'title') {
            payload[key] = value.trim() === '' ? null : value;
        }

        router.put(
            `${worksBase(projectSlug, workSlug)}/sections/${row.sectionId}`,
            payload,
            {
                preserveScroll: true,
                preserveState: true,
                only: [],
            },
        );
    }

    function handleOpen() {
        if (row.slug !== null) {
            onOpen(row.slug);
        }
    }

    function handleBeatToggleClick(beat: OutlineBeat) {
        if (!canUpdate || row.sectionId === null) {
            return;
        }

        onBeatToggle(row, beat);
    }

    function handleBeatTextChange(beat: OutlineBeat, text: string) {
        onRowEdit(row.key, {
            beats: row.beats.map((b) =>
                b.id === beat.id ? { ...b, text } : b,
            ),
        });
    }

    function handleBeatKeyDown(
        event: KeyboardEvent<HTMLInputElement>,
        beat: OutlineBeat,
    ) {
        if (!canUpdate || event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        const newBeat: OutlineBeat = {
            id: `b-${crypto.randomUUID()}`,
            text: '',
            done: false,
        };
        const index = row.beats.findIndex((b) => b.id === beat.id);
        const nextBeats = [
            ...row.beats.slice(0, index + 1),
            newBeat,
            ...row.beats.slice(index + 1),
        ];

        onRowEdit(row.key, { beats: nextBeats });
    }

    function handleTitleBlur(event: FocusEvent<HTMLInputElement>) {
        saveField('title', event.target.value);
    }

    function handleSynopsisBlur(event: FocusEvent<HTMLTextAreaElement>) {
        setSynopsisExpanded(false);
        saveField('synopsis', event.target.value);
    }

    function handleBeatTypeBlur(event: FocusEvent<HTMLInputElement>) {
        saveField('beatType', event.target.value);
    }

    function handleGoalBlur(event: FocusEvent<HTMLTextAreaElement>) {
        saveField('goal', event.target.value);
    }

    function handleConflictBlur(event: FocusEvent<HTMLTextAreaElement>) {
        saveField('conflict', event.target.value);
    }

    function handleStakesBlur(event: FocusEvent<HTMLTextAreaElement>) {
        saveField('stakes', event.target.value);
    }

    function handleToneBlur(event: FocusEvent<HTMLInputElement>) {
        saveField('tone', event.target.value);
    }

    return (
        <div
            data-board-card={row.key}
            style={cardStyle(accent)}
            {...dragHandleProps}
        >
            <button
                type="button"
                style={openBtnStyle}
                aria-label={t('writing.kanban.open_scene')}
                onClick={handleOpen}
                disabled={row.slug === null}
            >
                <i
                    className="fa-solid fa-arrow-up-right-from-square"
                    aria-hidden="true"
                />
            </button>

            {canUpdate && row.sectionId !== null && onRequestMarkThread !== undefined && (
                <span style={cardMenuWrapStyle} onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu
                        align="right"
                        density="compact"
                        menuClassName="w-48"
                        trigger={
                            <button
                                type="button"
                                style={cardMenuBtnStyle}
                                aria-label={t('writing.workspace.section_options')}
                                title={t('writing.workspace.section_options')}
                            >
                                <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />
                            </button>
                        }
                        items={[
                            {
                                label: t('writing.threads.mark_action'),
                                icon: 'fa-book-bookmark',
                                onClick: () =>
                                    onRequestMarkThread({
                                        id: row.sectionId as number,
                                        title: row.title,
                                    }),
                            },
                        ]}
                    />
                </span>
            )}

            <div style={headerRowStyle} onDoubleClick={handleOpen}>
                {row.label !== '' && (
                    <span style={labelChipStyle}>{row.label}</span>
                )}
                <input
                    type="text"
                    value={row.title}
                    disabled={!canUpdate}
                    placeholder={t('writing.kanban.title_placeholder')}
                    style={titleInputStyle}
                    onChange={(event) =>
                        onRowEdit(row.key, { title: event.target.value })
                    }
                    onBlur={handleTitleBlur}
                />
            </div>

            <textarea
                value={row.synopsis ?? ''}
                disabled={!canUpdate}
                placeholder={t('writing.kanban.synopsis_placeholder')}
                style={synopsisStyle(synopsisExpanded)}
                rows={synopsisExpanded ? 4 : 2}
                onFocus={() => setSynopsisExpanded(true)}
                onChange={(event) =>
                    onRowEdit(row.key, { synopsis: event.target.value })
                }
                onBlur={handleSynopsisBlur}
            />

            {row.beats.length > 0 && (
                <div style={beatsWrapStyle}>
                    {row.beats.map((beat) => (
                        <div key={beat.id} style={beatRowStyle}>
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={beat.done}
                                aria-label={
                                    beat.text ||
                                    t('writing.kanban.beat_placeholder')
                                }
                                disabled={!canUpdate}
                                style={beatCheckStyle(beat.done, canUpdate)}
                                onClick={() => handleBeatToggleClick(beat)}
                            />
                            <input
                                type="text"
                                value={beat.text}
                                readOnly={!canUpdate}
                                placeholder={t(
                                    'writing.kanban.beat_placeholder',
                                )}
                                aria-label={t('writing.kanban.beat_placeholder')}
                                style={beatTextStyle(beat.done)}
                                onChange={(event) =>
                                    handleBeatTextChange(
                                        beat,
                                        event.target.value,
                                    )
                                }
                                onKeyDown={(event) =>
                                    handleBeatKeyDown(event, beat)
                                }
                            />
                        </div>
                    ))}
                </div>
            )}

            <button
                type="button"
                style={craftToggleStyle}
                aria-expanded={craftOpen}
                onClick={() => setCraftOpen((prev) => !prev)}
            >
                <i
                    className="fa-solid fa-chevron-right"
                    style={craftChevronStyle(craftOpen)}
                    aria-hidden="true"
                />
                {t('writing.kanban.craft_toggle')}
            </button>

            {craftOpen && (
                <div style={craftBodyStyle}>
                    <input
                        type="text"
                        value={row.beatType ?? ''}
                        disabled={!canUpdate}
                        placeholder={t('writing.kanban.beat_type_placeholder')}
                        style={beatTypeChipInputStyle}
                        onChange={(event) =>
                            onRowEdit(row.key, { beatType: event.target.value })
                        }
                        onBlur={handleBeatTypeBlur}
                    />

                    <div style={craftFieldStyle}>
                        <span style={craftFieldLabelStyle}>
                            {t('writing.kanban.goal_label')}
                        </span>
                        <textarea
                            value={row.goal ?? ''}
                            disabled={!canUpdate}
                            style={craftTextareaStyle}
                            onChange={(event) =>
                                onRowEdit(row.key, { goal: event.target.value })
                            }
                            onBlur={handleGoalBlur}
                        />
                    </div>

                    <div style={craftFieldStyle}>
                        <span style={craftFieldLabelStyle}>
                            {t('writing.kanban.conflict_label')}
                        </span>
                        <textarea
                            value={row.conflict ?? ''}
                            disabled={!canUpdate}
                            style={craftTextareaStyle}
                            onChange={(event) =>
                                onRowEdit(row.key, {
                                    conflict: event.target.value,
                                })
                            }
                            onBlur={handleConflictBlur}
                        />
                    </div>

                    <div style={craftFieldStyle}>
                        <span style={craftFieldLabelStyle}>
                            {t('writing.kanban.stakes_label')}
                        </span>
                        <textarea
                            value={row.stakes ?? ''}
                            disabled={!canUpdate}
                            style={craftTextareaStyle}
                            onChange={(event) =>
                                onRowEdit(row.key, {
                                    stakes: event.target.value,
                                })
                            }
                            onBlur={handleStakesBlur}
                        />
                    </div>

                    <input
                        type="text"
                        value={row.tone ?? ''}
                        disabled={!canUpdate}
                        placeholder={t('writing.kanban.tone_placeholder')}
                        style={toneInputStyle}
                        onChange={(event) =>
                            onRowEdit(row.key, { tone: event.target.value })
                        }
                        onBlur={handleToneBlur}
                    />
                </div>
            )}

            <div style={footerRowStyle}>
                <span>
                    {t('writing.workspace.words').replace(
                        ':count',
                        (row.wordCount ?? 0).toLocaleString(),
                    )}
                </span>
                <span className="flex items-center gap-1.5">
                    {chips.length > 0 && (
                        <span style={chipRowStyle}>
                            {chips.map((chip) => (
                                <span key={chip.id} title={chip.title} style={chipTokenStyle(chip)}>
                                    {chip.label}
                                </span>
                            ))}
                        </span>
                    )}
                    {row.status !== null &&
                        row.status !== undefined &&
                        row.status !== '' && (
                            <span style={statusBadgeStyle}>
                                {t(`writing.statuses.${row.status}`, row.status)}
                            </span>
                        )}
                </span>
            </div>
        </div>
    );
}
