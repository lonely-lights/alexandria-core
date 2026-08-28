import { router } from '@inertiajs/react';
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';

import useT from '@alexandria/hooks/useT';
import { worksBase } from '@alexandria/lib/urls';

import type { OutlineBeat } from './outlineTypes';

/**
 * Ghost layer — outline-mode Task 6.
 *
 * A dimmed plan block (synopsis + beat checklist) that sits above a
 * section's editor: the writer's own outline surfacing back up while
 * they draft, without leaving the manuscript. Mounted by
 * `ManuscriptEditor` (focus mode) and `FlowSection` (continuous mode) —
 * both gated on the `showPlan` preference (`planPrefs.ts`) — never by
 * `ScreenplayEditor`, which shares `ManuscriptEditorProps` but doesn't
 * consume the prop.
 *
 * Authoring a synopsis or beats from scratch is OutlineView's job
 * (Task 5); this is a read-mostly companion, so it renders nothing for
 * a section with neither yet — there's no "add your first beat" empty
 * state here even when `canUpdate`.
 */

export interface PlanBlockSection {
    id: number;
    /** Required alongside `synopsis` by the works.sections.update PUT
     *  (`title` is a required field on that route) — see saveSynopsis. */
    title: string;
    synopsis: string | null;
    beats: OutlineBeat[];
}

export interface PlanBlockProps {
    section: PlanBlockSection;
    projectSlug: string;
    workSlug: string;
    canUpdate: boolean;
    /** Override how a synopsis edit is persisted. When omitted (every
     *  current caller), PlanBlock saves it itself via the section's
     *  existing update route — see the module doc for why. */
    onSynopsisEdit?: (value: string) => void;
}

/** True once every beat is checked off — the trigger for the collapsed
 *  "N beats done" line. An empty checklist never collapses: there's
 *  nothing to tuck away, and empty reads as "no beats," not "done." */
export function planCollapsed(beats: OutlineBeat[]): boolean {
    return beats.length > 0 && beats.every((beat) => beat.done);
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function apiHeaders(withBody = false): HeadersInit {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken(),
    };

    if (withBody) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

const wrapperStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderColor: 'color-mix(in srgb, var(--theme-base-content) 18%, transparent)',
};

const synopsisTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    fontSize: '0.875rem',
    fontStyle: 'italic',
    lineHeight: 1.5,
    margin: 0,
};

const synopsisTextareaStyle: CSSProperties = {
    width: '100%',
    display: 'block',
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    background: 'transparent',
    color: 'var(--theme-base-content)',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontStyle: 'italic',
    lineHeight: 1.5,
    minHeight: '3.5rem',
};

const beatsWrapStyle: CSSProperties = {
    marginTop: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
};

const beatRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
};

function beatCheckStyle(done: boolean, canUpdate: boolean): CSSProperties {
    return {
        width: '0.8125rem',
        height: '0.8125rem',
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
        fontSize: '0.8125rem',
        color: done
            ? 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)'
            : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
        textDecoration: done ? 'line-through' : 'none',
        flex: 1,
    };
}

const collapsedLineStyle: CSSProperties = {
    marginTop: '0.625rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    border: 'none',
    background: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.8125rem',
};

export default function PlanBlock({ section, projectSlug, workSlug, canUpdate, onSynopsisEdit }: PlanBlockProps) {
    const t = useT();

    const [synopsis, setSynopsis] = useState(section.synopsis ?? '');
    const [beats, setBeats] = useState<OutlineBeat[]>(section.beats);
    const [editingSynopsis, setEditingSynopsis] = useState(false);
    const [draftSynopsis, setDraftSynopsis] = useState('');
    const [expanded, setExpanded] = useState(false);

    // Resync from the server payload only on a section SWITCH, not every
    // parent re-render — the same pattern ManuscriptEditor's content
    // reset uses ([section.id]) — so our own optimistic beat/synopsis
    // edits aren't stomped by an unrelated prop refresh mid-edit.
    useEffect(() => {
        setSynopsis(section.synopsis ?? '');
        setBeats(section.beats);
        setEditingSynopsis(false);
        setExpanded(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.id]);

    if (!editingSynopsis && synopsis.trim() === '' && beats.length === 0) {
        return null;
    }

    function startEditing() {
        if (!canUpdate) {
            return;
        }

        setDraftSynopsis(synopsis);
        setEditingSynopsis(true);
    }

    function cancelEditing() {
        // Unmounting a focused textarea can still fire a native blur (and
        // hence onBlur/commitSynopsis) on the way out in some browsers.
        // Resetting the draft back to the saved value first makes that a
        // guaranteed no-op via the `value === synopsis` guard below,
        // instead of a race that could silently save a discarded edit.
        setDraftSynopsis(synopsis);
        setEditingSynopsis(false);
    }

    /**
     * The spec's ghost layer was drafted against "the outline PUT
     * carrying only that section's row," but Task 3 locked the outline
     * PUT to full-row-set semantics — sending one row would look like
     * deleting every other section. `works.sections.update` is the
     * pre-existing, lighter route: it already validates `synopsis`
     * identically and only touches keys present in the request. Spec
     * deviation, pre-approved in the task brief; recorded here as the
     * ledger entry.
     *
     * That route's validation requires `title`, so it rides along
     * unchanged (ReferencePanel.saveReference uses the same trick for
     * pov/setting fields) — `$model->update($data)` then only touches
     * title + synopsis, leaving every other section attribute alone.
     */
    function commitSynopsis() {
        const value = draftSynopsis.trim();

        setEditingSynopsis(false);

        if (value === synopsis) {
            return;
        }

        setSynopsis(value);

        if (onSynopsisEdit) {
            onSynopsisEdit(value);

            return;
        }

        router.put(
            `${worksBase(projectSlug, workSlug)}/sections/${section.id}`,
            { title: section.title, synopsis: value === '' ? null : value },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['currentSection', 'sections'],
            },
        );
    }

    function handleSynopsisKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditing();

            return;
        }

        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            (event.target as HTMLTextAreaElement).blur();
        }
    }

    async function toggleBeat(beat: OutlineBeat) {
        if (!canUpdate) {
            return;
        }

        const previous = beats;

        setBeats((prev) => prev.map((b) => (b.id === beat.id ? { ...b, done: !b.done } : b)));

        try {
            const response = await fetch(
                `${worksBase(projectSlug, workSlug)}/sections/${section.id}/beats/${beat.id}`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: apiHeaders(true),
                    body: JSON.stringify({ done: !beat.done }),
                },
            );

            if (!response.ok) {
                setBeats(previous);

                return;
            }

            const body = (await response.json()) as { beats: OutlineBeat[] };
            setBeats(body.beats);
        } catch {
            setBeats(previous);
        }
    }

    const showSynopsis = editingSynopsis || synopsis.trim() !== '' || canUpdate;
    const collapsed = planCollapsed(beats) && !expanded;

    return (
        <div
            data-plan-block=""
            className="alex-sheet-footprint mx-auto my-4 rounded-lg border border-dashed px-6 py-4"
            style={wrapperStyle}
        >
            {showSynopsis &&
                (editingSynopsis ? (
                    <textarea
                        autoFocus
                        value={draftSynopsis}
                        onChange={(event) => setDraftSynopsis(event.target.value)}
                        onBlur={commitSynopsis}
                        onKeyDown={handleSynopsisKeyDown}
                        placeholder={t('writing.plan.synopsis_placeholder')}
                        style={synopsisTextareaStyle}
                    />
                ) : (
                    <p
                        data-plan-synopsis=""
                        role={canUpdate ? 'button' : undefined}
                        tabIndex={canUpdate ? 0 : undefined}
                        onClick={startEditing}
                        onKeyDown={(event) => {
                            if (canUpdate && (event.key === 'Enter' || event.key === ' ')) {
                                event.preventDefault();
                                startEditing();
                            }
                        }}
                        style={canUpdate ? { ...synopsisTextStyle, cursor: 'text' } : synopsisTextStyle}
                    >
                        {synopsis.trim() !== '' ? synopsis : t('writing.plan.synopsis_placeholder')}
                    </p>
                ))}

            {beats.length > 0 &&
                (collapsed ? (
                    <button
                        type="button"
                        data-plan-collapsed=""
                        onClick={() => setExpanded(true)}
                        style={collapsedLineStyle}
                    >
                        <i className="fa-solid fa-circle-check" aria-hidden="true" />
                        {t('writing.plan.done_line').replace(':count', String(beats.length))}
                    </button>
                ) : (
                    <div style={beatsWrapStyle}>
                        {beats.map((beat) => (
                            <div key={beat.id} style={beatRowStyle}>
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={beat.done}
                                    aria-label={beat.text}
                                    disabled={!canUpdate}
                                    style={beatCheckStyle(beat.done, canUpdate)}
                                    onClick={() => toggleBeat(beat)}
                                />
                                <span style={beatTextStyle(beat.done)}>{beat.text}</span>
                            </div>
                        ))}
                    </div>
                ))}
        </div>
    );
}
