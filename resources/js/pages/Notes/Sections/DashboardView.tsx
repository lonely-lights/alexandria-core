import { useState, type CSSProperties } from 'react';
import type { NotesDashboardStats, Note, NoteStatusFilter } from '@alexandria/types/notes-dashboard';
import { relativeDate } from '@alexandria/lib/formatDate';
import useT from '@alexandria/hooks/useT';
import NoteModal from './NoteModal';

interface DashboardViewProps {
    projectId: number;
    stats: NotesDashboardStats;
    recentNotes: Note[];
    onNavigate: (statusFilter?: NoteStatusFilter, quickFilter?: string) => void;
    onNoteSaved: () => void;
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };

/* ── Stat Card ── */

interface StatCardProps {
    label: string;
    value: number;
    paperVariant: 'yellow' | 'sage' | 'coral' | 'lavender' | 'cream';
    onClick: () => void;
}

function StatCard({ label, value, paperVariant, onClick }: StatCardProps) {
    // Label uses currentColor-derived alpha so it inherits paper-ink
    // on tf themes (high contrast against warm paper) and base-content
    // on non-tf themes (good contrast against base-surface).
    return (
        <button
            type="button"
            onClick={onClick}
            className={`alex-notes-card paper-card paper-card--${paperVariant} cursor-pointer p-3 text-left w-full`}
        >
            <p
                className="text-[10px] font-semibold uppercase tracking-wider leading-none"
                style={{ color: 'color-mix(in srgb, currentColor 65%, transparent)' }}
            >
                {label}
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none">
                {value.toLocaleString()}
            </p>
        </button>
    );
}

/* ── Workflow Card ── */

interface WorkflowCardProps {
    icon: string;
    label: string;
    count: number;
    description: string;
    /** Theme token name without `var(--theme-)` — e.g. `status-warning-stroke`. */
    accentColor: string;
    /** Theme token name without `var(--theme-)` — e.g. `status-warning-subtle`. */
    accentBg: string;
    paperVariant: 'yellow' | 'sage' | 'lavender';
    onClick: () => void;
}

function WorkflowCard({ icon, label, count, description, accentColor, accentBg, paperVariant, onClick }: WorkflowCardProps) {
    // Count + description colors derive from currentColor so they
    // inherit the surrounding text color: on tf themes paper-card
    // forces a high-contrast paper-ink (#2b1d0f-ish) on its
    // descendants, on non-tf themes they pick up --theme-base-content.
    // The semantic accent (warning/info/primary) lives on the icon's
    // background circle + glyph color, where it has its own opaque
    // surface so contrast is independent of the paper tint behind it.
    return (
        <button
            type="button"
            onClick={onClick}
            className={`alex-notes-card paper-card paper-card--${paperVariant} cursor-pointer p-4 text-left w-full`}
        >
            <div className="flex items-center gap-3">
                <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: `var(--theme-${accentBg})` }}
                >
                    <i
                        className={`${icon} text-sm`}
                        style={{ color: `var(--theme-${accentColor})` }}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold leading-none">{label}</p>
                        <span className="text-xl font-bold tabular-nums flex-shrink-0 leading-none">
                            {count.toLocaleString()}
                        </span>
                    </div>
                    <p
                        className="mt-1.5 text-xs leading-tight"
                        style={{ color: 'color-mix(in srgb, currentColor 65%, transparent)' }}
                    >
                        {description}
                    </p>
                </div>
            </div>
        </button>
    );
}

/* ── Recent Note Row ── */

function RecentNoteRow({ note, onClick, t }: { note: Note; onClick: () => void; t: (k: string) => string }) {
    const title = note.title?.trim() || t('notes.dashboard.note.untitled');
    const preview = note.text?.replace(/\s+/g, ' ').trim();

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onClick(); } }}
            className="alex-notes-recent-row group relative flex cursor-pointer items-center gap-3 px-5 py-3.5"
        >
            {/* Sticky-tab indicator — slides in on hover via the
                .alex-notes-recent-tab CSS rule, like a highlighter
                bookmark clipped to the row. */}
            <span
                className="alex-notes-recent-tab absolute left-0 top-0 h-full w-1"
                aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{title}</p>
                    {note.is_pinned && (
                        <i
                            className="fa-solid fa-thumbtack text-[10px] flex-shrink-0"
                            style={{ color: 'var(--theme-brand-primary-500)' }}
                        />
                    )}
                </div>
                <p className="mt-0.5 truncate text-xs" style={fadedText}>
                    {preview || (
                        <span
                            className="italic"
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                        >
                            {t('notes.dashboard.note.no_content')}
                        </span>
                    )}
                </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
                {note.creator?.name && (
                    <span className="hidden text-xs sm:block" style={microText}>
                        {note.creator.name}
                    </span>
                )}
                <span className="text-xs" style={microText}>
                    {relativeDate(note.updated_at ?? note.created_at ?? '')}
                </span>
            </div>
        </div>
    );
}

/* ── Dashboard View ── */

export default function DashboardView({ projectId, stats, recentNotes, onNavigate, onNoteSaved }: DashboardViewProps) {
    const [modalNote, setModalNote] = useState<Note | null>(null);
    const [showModal, setShowModal] = useState(false);
    const t = useT();

    return (
        <>
            {/* Two-column layout on desktop, stacked below lg.
                Left column (Recent Notes) : right column (filter cards) uses
                the golden ratio — 1.618 : 1 — so the stats rail is the
                narrower side. */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.618fr_1fr]">
                {/* ── Left column: Recent Notes (wide side) ──
                    min-w-0 is required: grid children default to
                    `min-width: auto` (sized to their content), so without
                    this any long note preview would blow past the
                    1.618fr constraint and wreck the ratio.

                    Skeuomorphism: the panel reads as a real clipboard
                    stack on Paper themes — paper-board offset shadow,
                    grid-paper lining, paper-clip corner accent, and a
                    sticky-tab that slides in on row hover. All motifs
                    are tf-scoped so Night Studio / legacy themes still
                    get a clean flat list. */}
                <div className="min-w-0">
                    {/* paper-board owns the offset bevel shadow on tf
                        themes (warm `--tf-tape-shadow` color-mix poking
                        out via ::before). On non-tf themes paper-board
                        doesn't paint — the panel sits flat with just the
                        1px stroke. Corner radius pulls from
                        --theme-radius-card so the panel honors the
                        active theme's roundedness. */}
                    <div
                        className="paper-board"
                        style={{
                            borderRadius: 'var(--theme-radius-card)',
                            border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                        }}
                    >
                        {/* Inner owns the bg + overflow so the pseudo
                            shadow from paper-board can render behind
                            without being covered by the background. */}
                        <div
                            className="overflow-hidden"
                            style={{
                                background: 'var(--theme-base-surface)',
                                borderRadius: 'inherit',
                            }}
                        >
                        {/* Heading band — `paper-stripe__head` gives it the
                            theme-adaptive highlight (warm yellow on light,
                            soft white overlay on dark) shared with the
                            Notes-tab table header. */}
                        <div
                            className="paper-stripe__head flex items-center gap-3 px-5 py-4"
                            style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)' }}
                        >
                            <i
                                className="fa-solid fa-paperclip flex-shrink-0 text-lg"
                                style={{
                                    transform: 'rotate(-22deg)',
                                    color: 'color-mix(in srgb, var(--theme-base-content) 25%, transparent)',
                                }}
                                aria-hidden="true"
                            />
                            <h2 className="font-serif text-2xl font-bold tracking-tight">
                                {t('notes.dashboard.recent_heading')}
                            </h2>
                            {recentNotes.length > 0 && (
                                <span
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                                    style={{
                                        background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                        color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                                    }}
                                >
                                    {recentNotes.length} {t('notes.dashboard.most_recent_label')}
                                </span>
                            )}
                        </div>

                        {recentNotes.length === 0 ? (
                            <div className="py-16 text-center">
                                <div
                                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                                    style={{ background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)' }}
                                >
                                    <i
                                        className="fa-solid fa-note-sticky text-lg"
                                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                                    />
                                </div>
                                <p className="text-sm font-medium" style={fadedText}>
                                    {t('notes.dashboard.empty.no_notes')}
                                </p>
                            </div>
                        ) : (
                            /* `paper-stripe__body` drives per-theme zebra
                               on direct children — matches .paper-table.
                               The divide-line between rows is a
                               color-mix on base-content rather than the
                               daisy `divide-base-content/5` utility so
                               it follows the active theme. */
                            <div
                                className="paper-stripe__body"
                                style={{
                                    ['--alex-notes-divide-color' as string]: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                                }}
                            >
                                {recentNotes.map((note, index) => (
                                    <div
                                        key={note.id}
                                        style={{
                                            borderTop: index === 0
                                                ? 'none'
                                                : '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                                        }}
                                    >
                                        <RecentNoteRow
                                            note={note}
                                            onClick={() => { setModalNote(note); setShowModal(true); }}
                                            t={t}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                {/* ── Right column: 7 filter shortcuts (skinny side) ──
                    No extra top padding — the first row of StatCards now
                    aligns horizontally with the Recent Notes heading band
                    on the left column. */}
                <aside className="space-y-3">
                    {/* Single-row lineup: Total → Active → Archived → Trashed
                        ordered left-to-right from "everything" to the most
                        filtered. Paper-card tints map semantically:
                          Total    — lavender (hub / overview)
                          Active   — sage     (green = in play)
                          Archived — cream    (parked, neutral warm)
                          Trashed  — coral    (warning / removed) */}
                    <div className="grid grid-cols-4 gap-2">
                        <StatCard
                            label={t('notes.dashboard.stat.total')}
                            value={stats.total}
                            paperVariant="lavender"
                            onClick={() => onNavigate('all')}
                        />
                        <StatCard
                            label={t('notes.dashboard.stat.active')}
                            value={stats.active}
                            paperVariant="sage"
                            onClick={() => onNavigate('active')}
                        />
                        <StatCard
                            label={t('notes.dashboard.stat.archived')}
                            value={stats.archived}
                            paperVariant="cream"
                            onClick={() => onNavigate('archived')}
                        />
                        <StatCard
                            label={t('notes.dashboard.stat.trashed')}
                            value={stats.trashed}
                            paperVariant="coral"
                            onClick={() => onNavigate('trashed')}
                        />
                    </div>

                    <div className="space-y-3">
                        <WorkflowCard
                            icon="fa-solid fa-inbox"
                            label={t('notes.dashboard.workflow.uncategorized.label')}
                            count={stats.uncategorized}
                            description={t('notes.dashboard.workflow.uncategorized.description')}
                            accentColor="status-warning-stroke"
                            accentBg="status-warning-subtle"
                            paperVariant="yellow"
                            onClick={() => onNavigate('active', 'uncategorized')}
                        />
                        <WorkflowCard
                            icon="fa-solid fa-route"
                            label={t('notes.dashboard.workflow.pending_routing.label')}
                            count={stats.pending_routing}
                            description={t('notes.dashboard.workflow.pending_routing.description')}
                            accentColor="status-info-stroke"
                            accentBg="status-info-subtle"
                            paperVariant="sage"
                            onClick={() => onNavigate('active', 'pending_routing')}
                        />
                        <WorkflowCard
                            icon="fa-solid fa-thumbtack"
                            label={t('notes.dashboard.workflow.pinned.label')}
                            count={stats.pinned}
                            description={t('notes.dashboard.workflow.pinned.description')}
                            accentColor="status-success-stroke"
                            accentBg="status-success-subtle"
                            paperVariant="lavender"
                            onClick={() => onNavigate('active', 'pinned')}
                        />
                    </div>
                </aside>
            </div>

            <NoteModal
                open={showModal}
                onClose={() => setShowModal(false)}
                note={modalNote}
                projectId={projectId}
                mode="view"
                onRefresh={onNoteSaved}
                onSaved={() => { setShowModal(false); onNoteSaved(); }}
            />
        </>
    );
}
