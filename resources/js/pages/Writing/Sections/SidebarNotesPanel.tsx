import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { openNotesDrawer } from '@alexandria/components/notes/NotesDrawer';
import useT from '@alexandria/hooks/useT';

import type { CurrentSection, SectionNode } from '../Workspace';

/**
 * Compact notes panel for the right-rail mode switcher — Stage 11.5 Task 4.
 *
 * Shows the current section's notes as a compact list with a whole-work
 * toggle. Whole-work mode aggregates client-side across all section ids
 * from the sections tree (parallel fetches, deduplication by note id).
 * Work-level notes are not a distinct server concept — this is an
 * intentional client-side composition, not a new backend endpoint.
 *
 * "Open notes" opens the NotesDrawer for the current context, reusing
 * the workspace's existing notes affordance.
 */

/* ── Types ── */

interface SidebarNote {
    id: number;
    title: string;
    note_date: string | null;
    created_at: string;
    is_pinned: boolean;
    color: string | null;
}

interface SidebarNotesPanelProps {
    projectId: number;
    projectSlug: string;
    currentSection: CurrentSection | null;
    sections: SectionNode[];
}

/* ── Helpers ── */

function flattenSectionIds(nodes: SectionNode[]): number[] {
    return nodes.flatMap((n) => [n.id, ...flattenSectionIds(n.children)]);
}

async function fetchSectionNotes(projectId: number, sectionId: number): Promise<SidebarNote[]> {
    const url = `/api/v1/projects/${projectId}/notes?context_type=work_section&context_id=${sectionId}&status=active`;
    const r = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!r.ok) {
        throw new Error(`Notes fetch failed: ${r.status}`);
    }

    return r.json() as Promise<SidebarNote[]>;
}

function formatNoteDate(noteDate: string | null, createdAt: string): string {
    const raw = noteDate ?? createdAt;

    try {
        return new Date(raw).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return raw.slice(0, 10);
    }
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

const openDrawerBtnStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    fontSize: '0.75rem',
    fontWeight: 500,
};

/* ── Component ── */

export default function SidebarNotesPanel({
    projectId,
    projectSlug,
    currentSection,
    sections,
}: SidebarNotesPanelProps) {
    const t = useT();
    const [notes, setNotes] = useState<SidebarNote[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [wholeWork, setWholeWork] = useState(false);

    const cancelRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        cancelRef.current();
        setNotes([]);
        setFailed(false);

        if (currentSection === null && !wholeWork) {
            return;
        }

        const sectionIds = wholeWork
            ? flattenSectionIds(sections)
            : currentSection !== null
              ? [currentSection.id]
              : [];

        if (sectionIds.length === 0) {
            return;
        }

        let cancelled = false;
        cancelRef.current = () => { cancelled = true; };

        setLoading(true);

        Promise.all(sectionIds.map((id) => fetchSectionNotes(projectId, id)))
            .then((batches) => {
                if (cancelled) return;

                // Deduplicate by note id (a note can be attached to multiple sections).
                const seen = new Set<number>();
                const merged: SidebarNote[] = [];

                for (const batch of batches) {
                    for (const note of batch) {
                        if (!seen.has(note.id)) {
                            seen.add(note.id);
                            merged.push(note);
                        }
                    }
                }

                setNotes(merged);
                setFailed(false);
                setLoading(false);
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
    }, [projectId, currentSection?.id, wholeWork, sections]);

    function handleOpenDrawer() {
        if (currentSection !== null) {
            openNotesDrawer({
                projectId,
                projectSlug,
                contextType: 'work_section',
                contextId: currentSection.id,
                contextLabel: currentSection.title,
            });
        } else {
            openNotesDrawer({
                projectId,
                projectSlug,
                contextType: 'project',
                contextId: projectId,
                contextLabel: t('writing.panel.notes_project_scope'),
            });
        }
    }

    function handleNoteClick(note: SidebarNote) {
        const ctx = currentSection !== null && !wholeWork
            ? {
                projectId,
                projectSlug,
                contextType: 'work_section' as const,
                contextId: currentSection.id,
                contextLabel: currentSection.title,
                preSelectNoteId: note.id,
              }
            : {
                projectId,
                projectSlug,
                contextType: 'project' as const,
                contextId: projectId,
                contextLabel: t('writing.panel.notes_project_scope'),
                preSelectNoteId: note.id,
              };

        openNotesDrawer(ctx);
    }

    const showEmpty = !loading && !failed && notes.length === 0;
    const noSectionAndSectionScope = currentSection === null && !wholeWork;

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
                        : t('writing.panel.notes_all_sections')}
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

                {showEmpty && !noSectionAndSectionScope && (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {wholeWork
                            ? t('writing.panel.notes_empty_work')
                            : t('writing.panel.notes_empty')}
                    </p>
                )}

                {notes.map((note) => (
                    <button
                        key={note.id}
                        type="button"
                        className="alex-row flex w-full items-start gap-2 px-3 py-2 text-left text-sm"
                        style={{ borderRadius: 'var(--theme-radius-button)' }}
                        onClick={() => handleNoteClick(note)}
                    >
                        <span className="min-w-0 flex-1 truncate font-medium">
                            {note.title || <span style={mutedStyle}>{t('writing.panel.notes_untitled')}</span>}
                        </span>
                        <span style={noteDateStyle}>
                            {formatNoteDate(note.note_date, note.created_at)}
                        </span>
                    </button>
                ))}
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
