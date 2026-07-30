import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { openNotesDrawer } from '@alexandria/components/notes/NotesDrawer';
import useT, { type Translator } from '@alexandria/hooks/useT';
import type { Note } from '@alexandria/types/notes-dashboard';

import type { CurrentSection, SectionNode } from '../Workspace';
import type { EntryCard } from './ReferencePanel';

/**
 * Compact notes panel for the right-rail mode switcher — Stage 11.5
 * Task 4, rebuilt for notes-on-works parity.
 *
 * Section mode lists the open section's notes from the drawer's own
 * list endpoint. Whole-work mode is now a single server call — works
 * hold notes directly, so `works.panel.notes` returns the three layers
 * a manuscript reaches: notes on the work itself, one group per
 * section (Navigator tree order), and the notes living on the
 * structure entry the work is linked to.
 *
 * The linked-entry layer is READ-ONLY here: those notes belong to the
 * entry, not the manuscript, so each row links out to the entry page
 * rather than opening the drawer at a scope that could move them.
 *
 * "Open notes" opens the NotesDrawer for the visible scope — the open
 * section in section mode, the work itself in whole-work mode.
 */

/* ── Types ── */

interface WorkNotesSectionGroup {
    id: number;
    title: string;
    slug: string;
    notes: Note[];
}

/** `works.panel.notes` response — see WorkPanelController::workNotes. */
interface WorkNotesPayload {
    work: Note[];
    sections: WorkNotesSectionGroup[];
    linked_entry: { entry: EntryCard; notes: Note[] } | null;
}

interface SidebarNotesPanelProps {
    projectId: number;
    projectSlug: string;
    work: { id: number; title: string; slug: string };
    currentSection: CurrentSection | null;
    /**
     * Not read for data — the whole-work groups come from the server.
     * It stays a prop so the panel refetches when the section tree
     * changes (add/rename/delete all replace this Inertia prop).
     */
    sections: SectionNode[];
}

/* ── Fetchers ── */

async function fetchJson<T>(url: string, label: string): Promise<T> {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error(`${label} fetch failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
}

function fetchSectionNotes(projectId: number, sectionId: number): Promise<Note[]> {
    return fetchJson<Note[]>(
        `/api/v1/projects/${projectId}/notes?context_type=work_section&context_id=${sectionId}&status=active`,
        'Section notes',
    );
}

function fetchWorkNotes(projectSlug: string, workSlug: string): Promise<WorkNotesPayload> {
    return fetchJson<WorkNotesPayload>(`/works/${projectSlug}/${workSlug}/panel/notes`, 'Work notes');
}

/* ── Helpers ── */

function formatNoteDate(noteDate: string | null, createdAt: string | null): string {
    const raw = noteDate ?? createdAt;

    if (raw === null) {
        return '';
    }

    try {
        return new Date(raw).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return raw.slice(0, 10);
    }
}

function countPayloadNotes(payload: WorkNotesPayload): number {
    return payload.work.length
        + payload.sections.reduce((total, group) => total + group.notes.length, 0)
        + (payload.linked_entry?.notes.length ?? 0);
}

/* ── Styles ── */

const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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

const toggleBtnStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'var(--theme-brand-primary-500)',
    fontWeight: 500,
};

const hintStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)',
};

const mutedStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const noteDateStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.6875rem',
    flexShrink: 0,
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

const openDrawerBtnStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    fontSize: '0.75rem',
    fontWeight: 500,
};

const rowClass = 'alex-row flex w-full items-start gap-2 px-3 py-2 text-left text-sm';
const rowStyle: CSSProperties = { borderRadius: 'var(--theme-radius-button)' };

/* ── Sub-components ── */

function GroupHeading({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
            <span className="min-w-0 truncate" style={groupHeadingStyle}>{label}</span>
            <span style={countChipStyle}>{count}</span>
        </div>
    );
}

function NoteLabel({ note, t }: { note: Note; t: Translator }) {
    return (
        <>
            <span className="min-w-0 flex-1 truncate font-medium">
                {note.title || <span style={mutedStyle}>{t('writing.panel.notes_untitled')}</span>}
            </span>
            <span style={noteDateStyle}>{formatNoteDate(note.note_date, note.created_at)}</span>
        </>
    );
}

/** Editable row — opens the drawer at the scope the note actually lives in. */
function NoteRow({ note, onOpen, t }: { note: Note; onOpen: (note: Note) => void; t: Translator }) {
    return (
        <button type="button" className={rowClass} style={rowStyle} onClick={() => onOpen(note)}>
            <NoteLabel note={note} t={t} />
        </button>
    );
}

/**
 * Read-only row for the linked entry's notes — a plain link to the
 * entry page. No drawer, no edit affordances: the note belongs to the
 * entry, and the entry page is where it can be changed.
 */
function LinkedNoteRow({ note, href, entryName, t }: { note: Note; href: string; entryName: string; t: Translator }) {
    return (
        <a href={href} className={rowClass} style={rowStyle}>
            <NoteLabel note={note} t={t} />
            {/* The note title carries the link's accessible name; the
                destination is spelled out for screen readers because the
                external-link glyph alone doesn't say where it goes. */}
            <span className="sr-only">
                {t('writing.panel.notes_open_entry_aria').replace(':entry', entryName)}
            </span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" style={noteDateStyle} aria-hidden="true" />
        </a>
    );
}

/* ── Component ── */

export default function SidebarNotesPanel({
    projectId,
    projectSlug,
    work,
    currentSection,
    sections,
}: SidebarNotesPanelProps) {
    const t = useT();
    const [notes, setNotes] = useState<Note[]>([]);
    const [payload, setPayload] = useState<WorkNotesPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [wholeWork, setWholeWork] = useState(false);

    const cancelRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        cancelRef.current();
        setNotes([]);
        setPayload(null);
        setFailed(false);

        const sectionId = currentSection?.id ?? null;
        let cancelled = false;
        let request: Promise<void>;

        if (wholeWork) {
            request = fetchWorkNotes(projectSlug, work.slug).then((data) => {
                if (!cancelled) setPayload(data);
            });
        } else if (sectionId !== null) {
            request = fetchSectionNotes(projectId, sectionId).then((rows) => {
                if (!cancelled) setNotes(rows);
            });
        } else {
            // Section scope with no open section — nothing to fetch.
            setLoading(false);

            return;
        }

        cancelRef.current = () => { cancelled = true; };

        setLoading(true);

        request
            .then(() => {
                if (!cancelled) {
                    setFailed(false);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setFailed(true);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [projectId, projectSlug, work.slug, currentSection?.id, wholeWork, sections]);

    function openWorkScope(preSelectNoteId?: number) {
        openNotesDrawer({
            projectId,
            projectSlug,
            contextType: 'work',
            contextId: work.id,
            contextLabel: work.title,
            preSelectNoteId,
        });
    }

    function openSectionScope(section: { id: number; title: string }, preSelectNoteId?: number) {
        openNotesDrawer({
            projectId,
            projectSlug,
            contextType: 'work_section',
            contextId: section.id,
            contextLabel: section.title,
            preSelectNoteId,
        });
    }

    function handleOpenDrawer() {
        if (!wholeWork && currentSection !== null) {
            openSectionScope(currentSection);
            return;
        }

        openWorkScope();
    }

    const noSectionAndSectionScope = currentSection === null && !wholeWork;
    const sectionGroups = payload?.sections.filter((group) => group.notes.length > 0) ?? [];
    const linked = payload?.linked_entry ?? null;
    const payloadNoteCount = payload === null ? 0 : countPayloadNotes(payload);
    const showEmpty = !loading && !failed && !noSectionAndSectionScope && (
        wholeWork
            ? payload !== null && payloadNoteCount === 0
            : notes.length === 0
    );

    return (
        <div
            data-sidebar-notes-panel
            style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        >
            {/* Header */}
            <div style={headerStyle}>
                <span style={titleStyle}>{t('writing.panel.mode_notes')}</span>
                <button
                    type="button"
                    style={toggleBtnStyle}
                    onClick={() => setWholeWork((prev) => !prev)}
                    aria-pressed={wholeWork}
                >
                    {wholeWork
                        ? t('writing.panel.notes_this_section')
                        : t('writing.panel.notes_whole_work')}
                </button>
            </div>

            {/* Note list */}
            <div className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto px-1 py-2">
                {noSectionAndSectionScope && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.panel.notes_no_section')}
                    </p>
                )}

                {loading && !noSectionAndSectionScope && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {t('writing.panel.notes_loading')}
                    </p>
                )}

                {failed && (
                    <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('writing.panel.notes_error')}
                    </p>
                )}

                {showEmpty && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {wholeWork
                            ? t('writing.panel.notes_empty_work')
                            : t('writing.panel.notes_empty')}
                    </p>
                )}

                {/* Section scope — a flat list of the open section's notes. */}
                {!wholeWork && currentSection !== null && notes.map((note) => (
                    <NoteRow
                        key={note.id}
                        note={note}
                        t={t}
                        onOpen={(target) => openSectionScope(currentSection, target.id)}
                    />
                ))}

                {/* Whole-work scope — the three layers a manuscript reaches.
                    The work group always shows so the layer stays visible
                    (and reachable) on a manuscript with no work notes yet;
                    empty SECTION groups are dropped, since the server sends
                    the full skeleton and a long manuscript would otherwise
                    bury the populated rows under dozens of empty headings.
                    A work with nothing anywhere renders the single centered
                    empty line above instead of an all-empty skeleton. */}
                {wholeWork && payload !== null && payloadNoteCount > 0 && (
                    <>
                        <GroupHeading label={t('writing.panel.notes_work_group')} count={payload.work.length} />
                        {payload.work.length === 0 ? (
                            <p className="px-3 pb-1 text-xs" style={hintStyle}>
                                {t('writing.panel.notes_work_group_empty')}
                            </p>
                        ) : (
                            payload.work.map((note) => (
                                <NoteRow
                                    key={note.id}
                                    note={note}
                                    t={t}
                                    onOpen={(target) => openWorkScope(target.id)}
                                />
                            ))
                        )}

                        {sectionGroups.map((group) => (
                            <div key={group.id}>
                                <GroupHeading label={group.title} count={group.notes.length} />
                                {group.notes.map((note) => (
                                    <NoteRow
                                        key={note.id}
                                        note={note}
                                        t={t}
                                        onOpen={(target) => openSectionScope(group, target.id)}
                                    />
                                ))}
                            </div>
                        ))}

                        {linked !== null && linked.notes.length > 0 && (
                            <div>
                                <GroupHeading
                                    label={t('writing.panel.notes_linked_group').replace(':entry', linked.entry.name)}
                                    count={linked.notes.length}
                                />
                                <p className="px-3 pb-1 text-[10px]" style={hintStyle}>
                                    {t('writing.panel.notes_linked_hint')}
                                </p>
                                {linked.notes.map((note) => (
                                    <LinkedNoteRow
                                        key={note.id}
                                        note={note}
                                        href={linked.entry.url}
                                        entryName={linked.entry.name}
                                        t={t}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer — open full notes drawer */}
            <button
                type="button"
                className="alex-row flex w-full shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs"
                style={openDrawerBtnStyle}
                onClick={handleOpenDrawer}
            >
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true" />
                {t('writing.panel.notes_open_drawer')}
            </button>
        </div>
    );
}
