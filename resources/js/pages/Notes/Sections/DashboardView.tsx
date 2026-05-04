import { useState } from 'react';
import type { NotesDashboardStats, Note, NoteStatusFilter } from '@alexandria/types/notes-dashboard';
import { relativeDate } from '@alexandria/lib/formatDate';
import NoteModal from './NoteModal';

interface DashboardViewProps {
    projectId: number;
    stats: NotesDashboardStats;
    recentNotes: Note[];
    onNavigate: (statusFilter?: NoteStatusFilter, quickFilter?: string) => void;
    onNoteSaved: () => void;
}

/* ── Stat Card ── */

interface StatCardProps {
    label: string;
    value: number;
    paperVariant: 'yellow' | 'sage' | 'coral' | 'lavender' | 'cream';
    onClick: () => void;
}

function StatCard({ label, value, paperVariant, onClick }: StatCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`paper-card paper-card--${paperVariant} rounded-xl border border-base-300/50 bg-base-100 p-3 cursor-pointer transition-all hover:border-primary/30 hover:shadow-md text-left w-full`}
        >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/60 leading-none">
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
    colorClass: string;
    bgClass: string;
    paperVariant: 'yellow' | 'sage' | 'lavender';
    onClick: () => void;
}

function WorkflowCard({ icon, label, count, description, colorClass, bgClass, paperVariant, onClick }: WorkflowCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`paper-card paper-card--${paperVariant} rounded-xl border border-base-300/50 bg-base-100 p-4 cursor-pointer transition-all hover:border-primary/30 hover:shadow-md text-left w-full`}
        >
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${bgClass}`}>
                    <i className={`${icon} text-sm ${colorClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold leading-none">{label}</p>
                        <span className={`text-xl font-bold tabular-nums flex-shrink-0 leading-none ${colorClass}`}>
                            {count.toLocaleString()}
                        </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-tight text-base-content/50">{description}</p>
                </div>
            </div>
        </button>
    );
}

/* ── Recent Note Row ── */

function RecentNoteRow({ note, onClick }: { note: Note; onClick: () => void }) {
    const title = note.title?.trim() || 'Untitled';
    const preview = note.text?.replace(/\s+/g, ' ').trim();

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onClick(); } }}
            className="group relative flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-base-200/50"
        >
            {/* Sticky-tab indicator — slides in on hover like a highlighter
                bookmark clipped to the row. */}
            <span
                className="absolute left-0 top-0 h-full w-1 origin-top scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100"
                aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{title}</p>
                    {note.is_pinned && (
                        <i className="fa-solid fa-thumbtack text-[10px] text-primary flex-shrink-0" />
                    )}
                </div>
                <p className="mt-0.5 truncate text-xs text-base-content/50">
                    {preview || <span className="italic text-base-content/30">No content</span>}
                </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
                {note.creator?.name && (
                    <span className="hidden text-xs text-base-content/40 sm:block">
                        {note.creator.name}
                    </span>
                )}
                <span className="text-xs text-base-content/40">
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
                    <div className="paper-board rounded-2xl">
                        {/* Inner owns the bg + overflow so the pseudo
                            shadow from paper-board can render behind
                            without being covered by the background. */}
                        <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                        {/* Heading band — `paper-stripe__head` gives it the
                            theme-adaptive highlight (warm yellow on light,
                            soft white overlay on dark) shared with the
                            Notes-tab table header. */}
                        <div className="paper-stripe__head flex items-center gap-3 border-b border-base-content/5 px-5 py-4">
                            <i
                                className="fa-solid fa-paperclip flex-shrink-0 text-lg text-base-content/25"
                                style={{ transform: 'rotate(-22deg)' }}
                                aria-hidden="true"
                            />
                            <h2 className="font-serif text-2xl font-bold tracking-tight">Recent Notes</h2>
                            {recentNotes.length > 0 && (
                                <span className="badge badge-ghost badge-sm">
                                    {recentNotes.length} Most Recent
                                </span>
                            )}
                        </div>

                        {recentNotes.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-base-300/50">
                                    <i className="fa-solid fa-note-sticky text-lg text-base-content/30" />
                                </div>
                                <p className="text-sm font-medium text-base-content/50">No notes yet</p>
                            </div>
                        ) : (
                            /* `paper-stripe__body` drives per-theme zebra
                               on direct children — matches .paper-table. */
                            <div className="paper-stripe__body divide-y divide-base-content/5">
                                {recentNotes.map((note) => (
                                    <RecentNoteRow
                                        key={note.id}
                                        note={note}
                                        onClick={() => { setModalNote(note); setShowModal(true); }}
                                    />
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
                            label="Total"
                            value={stats.total}
                            paperVariant="lavender"
                            onClick={() => onNavigate('all')}
                        />
                        <StatCard
                            label="Active"
                            value={stats.active}
                            paperVariant="sage"
                            onClick={() => onNavigate('active')}
                        />
                        <StatCard
                            label="Archived"
                            value={stats.archived}
                            paperVariant="cream"
                            onClick={() => onNavigate('archived')}
                        />
                        <StatCard
                            label="Trashed"
                            value={stats.trashed}
                            paperVariant="coral"
                            onClick={() => onNavigate('trashed')}
                        />
                    </div>

                    <div className="space-y-3">
                        <WorkflowCard
                            icon="fa-solid fa-inbox"
                            label="Uncategorized"
                            count={stats.uncategorized}
                            description="Notes not yet routed to any blueprint"
                            colorClass="text-warning"
                            bgClass="bg-warning/10"
                            paperVariant="yellow"
                            onClick={() => onNavigate('active', 'uncategorized')}
                        />
                        <WorkflowCard
                            icon="fa-solid fa-route"
                            label="Pending Routing"
                            count={stats.pending_routing}
                            description="Blueprint approvals awaiting your action"
                            colorClass="text-info"
                            bgClass="bg-info/10"
                            paperVariant="sage"
                            onClick={() => onNavigate('active', 'pending_routing')}
                        />
                        <WorkflowCard
                            icon="fa-solid fa-thumbtack"
                            label="Pinned"
                            count={stats.pinned}
                            description="Your bookmarked notes"
                            colorClass="text-primary"
                            bgClass="bg-primary/10"
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
