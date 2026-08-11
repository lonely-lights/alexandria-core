import { usePage } from '@inertiajs/react';
import { useEffect, useState, type CSSProperties } from 'react';

import AppLayout from '../layouts/AppLayout';
import PickerDropdown from '@alexandria/components/ui/PickerDropdown';
import Tooltip from '@alexandria/components/ui/Tooltip';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import useT from '@alexandria/hooks/useT';
import { notesUrl, pageUrl, projectUrl } from '@alexandria/lib/urls';

type ProjectViewMode = 'grid' | 'rows' | 'table';
const PROJECT_VIEW_STORAGE_KEY = 'dashboard:project-view';

type RecentFilter = 'both' | 'entries' | 'notes';
const RECENT_FILTER_STORAGE_KEY = 'dashboard:recent-filter';
const RECENT_LIMIT_STORAGE_KEY = 'dashboard:recent-limit';
const RECENT_LIMIT_OPTIONS = [5, 10, 15, 25] as const;
type RecentLimit = (typeof RECENT_LIMIT_OPTIONS)[number];
const DEFAULT_RECENT_LIMIT: RecentLimit = 10;

interface DashboardProject {
    id: number;
    name: string;
    slug: string;
    logline: string | null;
    entries_count: number;
    blueprints_count: number;
    members_count: number;
    page_image_url: string | null;
    banner_url: string | null;
    last_activity: string | null;
    last_activity_timestamp: number | null;
}

interface RecentEntry {
    id: number;
    name: string;
    slug: string;
    summary: string | null;
    blueprint_name: string | null;
    blueprint_icon: string | null;
    project_name: string | null;
    project_slug: string | null;
    updated_at: string | null;
    updated_at_ts: number | null;
}

interface RecentNote {
    id: number;
    title: string;
    preview: string | null;
    project_name: string | null;
    project_slug: string | null;
    updated_at: string | null;
    updated_at_ts: number | null;
}

// Discriminated union used to interleave entries + notes in the
// combined "Both" view — the `_kind` tag lets the row renderer pick
// the right icon, subtitle, and click target without prop-juggling.
type RecentRow =
    | { _kind: 'entry'; item: RecentEntry }
    | { _kind: 'note'; item: RecentNote };

interface DashboardStats {
    projects: number;
    entries: number;
    blueprints: number;
}

interface DashboardGreeting {
    name: string;
}

interface DashboardProps {
    projects: DashboardProject[];
    recentEntries: RecentEntry[];
    recentNotes: RecentNote[];
    stats: DashboardStats;
    greeting: DashboardGreeting;
    [key: string]: unknown;
}

/**
 * Returns a translation key suffix for the time-of-day greeting prefix.
 * Resolved by the caller against the `dashboard.greeting.*` lang bag so
 * the rendered copy ("Good morning", "Good afternoon", etc.) localises
 * with the rest of the page.
 */
function greetingKeyForHour(hour: number): string {
    if (hour < 5) return 'late_night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
}

const subtleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };
const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const strokeBorder: CSSProperties = { borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)' };
const surfaceTinted: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

export default function Dashboard() {
    const { projects, recentEntries, recentNotes, stats, greeting } = usePage<DashboardProps>().props;
    const t = useT();

    // Default to 'rows' — grid view is temporarily hidden (see ViewToggle
    // for the why). The effectiveViewMode below also coerces a persisted
    // 'grid' preference to 'rows' so returning users don't see an empty
    // section when the toggle no longer offers that option.
    const [viewMode, setViewMode] = useState<ProjectViewMode>('rows');
    const [recentFilter, setRecentFilter] = useState<RecentFilter>('both');
    const [recentLimit, setRecentLimit] = useState<RecentLimit>(DEFAULT_RECENT_LIMIT);
    const [greetingKey, setGreetingKey] = useState<string>(() => greetingKeyForHour(new Date().getHours()));

    // View-mode fallbacks. Two cases where we render Rows instead of
    // what's in state:
    //   - Mobile + persisted 'table'  → 'rows' (table doesn't fit at
    //     phone widths; 5 columns force horizontal scroll).
    //   - Any size + persisted 'grid' → 'rows' (grid view is hidden
    //     from the toggle while it's being reworked; ProjectCard +
    //     branch logic remain in the file for the eventual return).
    // We DON'T overwrite localStorage in either case, so the original
    // preference returns the moment the gate flips back open.
    const isMobileDashboard = useMediaQuery('(max-width: 1023px)');
    // Explicit IIFE return type widens back to `ProjectViewMode` —
    // without it, TS narrows the union to `'rows' | 'table'` because
    // none of the branches actually return `'grid'`, which then makes
    // the `=== 'grid'` branch below read as a TS2367 dead comparison.
    // We need that branch alive for when grid view comes back.
    const effectiveViewMode = ((): ProjectViewMode => {
        if (viewMode === 'grid') return 'rows';
        if (isMobileDashboard && viewMode === 'table') return 'rows';
        return viewMode;
    })();

    // Refresh the greeting every minute so it updates if the user crosses a
    // time-of-day boundary while sitting on the dashboard.
    useEffect(() => {
        const id = window.setInterval(() => {
            setGreetingKey(greetingKeyForHour(new Date().getHours()));
        }, 60_000);
        return () => window.clearInterval(id);
    }, []);

    // Load persisted view-mode preference.
    useEffect(() => {
        try {
            const stored = localStorage.getItem(PROJECT_VIEW_STORAGE_KEY);
            if (stored === 'grid' || stored === 'rows' || stored === 'table') {
                setViewMode(stored);
            }
        } catch { /* storage unavailable */ }
    }, []);

    function changeViewMode(mode: ProjectViewMode) {
        setViewMode(mode);
        try { localStorage.setItem(PROJECT_VIEW_STORAGE_KEY, mode); } catch { /* noop */ }
    }

    // Hydrate recent-section preferences from localStorage. Two
    // independent knobs: which kinds to show, and how many to cap at.
    useEffect(() => {
        try {
            const filter = localStorage.getItem(RECENT_FILTER_STORAGE_KEY);
            if (filter === 'both' || filter === 'entries' || filter === 'notes') {
                setRecentFilter(filter);
            }
            const limitRaw = localStorage.getItem(RECENT_LIMIT_STORAGE_KEY);
            const limitNum = limitRaw != null ? Number.parseInt(limitRaw, 10) : NaN;
            if (RECENT_LIMIT_OPTIONS.includes(limitNum as RecentLimit)) {
                setRecentLimit(limitNum as RecentLimit);
            }
        } catch { /* storage unavailable */ }
    }, []);

    function changeRecentFilter(filter: RecentFilter) {
        setRecentFilter(filter);
        try { localStorage.setItem(RECENT_FILTER_STORAGE_KEY, filter); } catch { /* noop */ }
    }

    function changeRecentLimit(limit: RecentLimit) {
        setRecentLimit(limit);
        try { localStorage.setItem(RECENT_LIMIT_STORAGE_KEY, String(limit)); } catch { /* noop */ }
    }

    // Derive the actual rows to render. `entries` and `notes` are
    // already sorted desc by updated_at server-side; for `both` we
    // merge + re-sort by `updated_at_ts` so the interleave reflects
    // true recency rather than e.g. all entries first / all notes after.
    const recentRows: RecentRow[] = (() => {
        const entriesRows: RecentRow[] = recentEntries.map((e) => ({ _kind: 'entry', item: e }));
        const notesRows: RecentRow[] = recentNotes.map((n) => ({ _kind: 'note', item: n }));
        if (recentFilter === 'entries') return entriesRows.slice(0, recentLimit);
        if (recentFilter === 'notes') return notesRows.slice(0, recentLimit);
        return [...entriesRows, ...notesRows]
            .sort((a, b) => (b.item.updated_at_ts ?? 0) - (a.item.updated_at_ts ?? 0))
            .slice(0, recentLimit);
    })();

    const projectsSection = (
        <section className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                    <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
                        {t('dashboard.section.projects')}
                    </h2>
                    <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                            background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                            color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                        }}
                    >
                        {projects.length}{' '}
                        {projects.length === 1
                            ? t('dashboard.section.project_singular')
                            : t('dashboard.section.project_plural')}
                    </span>
                </div>
                <ViewToggle current={effectiveViewMode} onChange={changeViewMode} t={t} hideTable={isMobileDashboard} />
            </div>

            {projects.length === 0 ? (
                <EmptyState
                    icon="fa-folder-open"
                    title={t('dashboard.empty.projects.title')}
                    description={t('dashboard.empty.projects.description')}
                />
            ) : effectiveViewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} t={t} />
                    ))}
                </div>
            ) : effectiveViewMode === 'rows' ? (
                <div className="space-y-3">
                    {projects.map((project) => (
                        <ProjectRow key={project.id} project={project} t={t} />
                    ))}
                </div>
            ) : (
                <ProjectTable projects={projects} t={t} />
            )}
        </section>
    );

    const recentSection = (
        <section>
            {/* Heading + controls share a flex row. Three-pill filter sits
                left of the heading on mobile (wrap), to the right on
                desktop. Count picker hugs the far right. */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
                    {t('dashboard.section.recent')}
                </h2>
                <div className="flex items-center gap-3">
                    <RecentFilterToggle
                        value={recentFilter}
                        onChange={changeRecentFilter}
                        t={t}
                    />
                    <RecentLimitPicker
                        value={recentLimit}
                        onChange={changeRecentLimit}
                        t={t}
                    />
                </div>
            </div>
            {recentRows.length > 0 ? (
                <div
                    className="overflow-hidden border"
                    style={{
                        background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                    }}
                >
                    {recentRows.map((row, index) => {
                        const isLast = index === recentRows.length - 1;
                        return row._kind === 'entry' ? (
                            <RecentEntryRow
                                key={`entry-${row.item.id}`}
                                entry={row.item}
                                isLast={isLast}
                            />
                        ) : (
                            <RecentNoteRow
                                key={`note-${row.item.id}`}
                                note={row.item}
                                isLast={isLast}
                                t={t}
                            />
                        );
                    })}
                </div>
            ) : (
                <div
                    className="border p-8 text-center"
                    style={{
                        background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                    }}
                >
                    <p className="text-sm" style={fadedText}>
                        {t('dashboard.empty.recent.text')}
                    </p>
                </div>
            )}
        </section>
    );

    return (
        <AppLayout title={t('dashboard.page.title')}>
            <div className="container mx-auto max-w-7xl px-4 py-8 lg:py-12">
                {/* Greeting header */}
                <header className="mb-6 sm:mb-10">
                    <div
                        className="text-[11px] font-semibold uppercase tracking-[.25em] mb-2"
                        style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 80%, transparent)' }}
                    >
                        {t(`dashboard.greeting.${greetingKey}`)}
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl font-bold leading-tight sm:leading-none tracking-tight">
                        {greeting.name}.
                    </h1>
                    <p className="mt-2 text-sm sm:mt-3 sm:text-base" style={subtleText}>
                        {t('dashboard.page.tagline')}
                    </p>
                </header>

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-5 mb-6 sm:mb-10">
                    <StatTile label={t('dashboard.stat.projects')} value={stats.projects} icon="fa-folder-tree" accent="var(--theme-brand-primary-500)" />
                    <StatTile label={t('dashboard.stat.entries')} value={stats.entries} icon="fa-file-lines" accent="var(--theme-brand-secondary-500)" />
                    <StatTile label={t('dashboard.stat.blueprints')} value={stats.blueprints} icon="fa-cubes" accent="var(--theme-brand-accent-500)" />
                </div>

                {/* Two-column layout is consistent across view modes — only the
                    INTERNAL rendering of the Projects column changes. */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)] gap-8">
                    {projectsSection}
                    <aside className="min-w-0 space-y-8">
                        {recentSection}
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}

/* ─────────────────── sub-components ─────────────────── */

function StatTile({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
    return (
        <div
            className="border p-3 sm:p-5"
            style={{
                background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
                borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                borderRadius: 'var(--theme-radius-card)',
            }}
        >
            {/* Mobile compresses the wide letter-spacing on the label so
                "BLUEPRINTS" fits without clipping at ~106px tile width;
                desktop keeps the airier .25em tracking. */}
            <div className="flex items-center gap-1.5 mb-2 sm:gap-2 sm:mb-3">
                <i className={`fa-solid ${icon} text-xs sm:text-sm`} style={{ color: accent }} aria-hidden="true" />
                <div
                    className="text-[9px] font-semibold uppercase tracking-wider sm:text-[11px] sm:tracking-[.25em] truncate"
                    style={fadedText}
                >
                    {label}
                </div>
            </div>
            <div className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight">{value}</div>
        </div>
    );
}

function ProjectCard({ project, t }: { project: DashboardProject; t: (k: string) => string }) {
    return (
        <a href={projectUrl(project.slug)} className="alex-dash-card group block overflow-hidden">
            {/* Banner band — sized to the shorter side of the golden
                ratio against the content body below (φ ≈ 1.618), so the
                card reads as "small banner, larger content" instead of
                a half-and-half split. Mobile: h-14 / 56px paired with
                ~110px content. Desktop: h-16 / 64px paired with ~130px
                content. The stat-chip pill sits absolutely-positioned
                + vertically centered in this band so it reads as a
                "snapshot" badge floating over the banner image. */}
            <div className="relative">
                {project.banner_url ? (
                    <div
                        className="alex-dash-banner-img h-14 w-full bg-cover bg-center sm:h-16"
                        style={{ backgroundImage: `url(${project.banner_url})` }}
                    />
                ) : (
                    <div
                        className="h-14 w-full sm:h-16"
                        style={{
                            background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 10%, transparent), color-mix(in srgb, var(--theme-brand-accent-500) 20%, transparent))',
                        }}
                    />
                )}

                {/* Stat pill — single dark backdrop wrapping all three
                    chips. Translucent black + a backdrop blur keeps
                    the banner image visible behind while guaranteeing
                    contrast on any banner colour. Vertically centered
                    in the banner band (`top-1/2 -translate-y-1/2`) so
                    the pill rides the optical middle regardless of
                    band height. */}
                <div
                    className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-2.5 px-3 py-1 backdrop-blur-sm"
                    style={{
                        background: 'rgba(0, 0, 0, 0.55)',
                        borderRadius: 'var(--theme-radius-badge, 9999px)',
                    }}
                >
                    <StatChip icon="fa-file-lines" value={project.entries_count} label={t('dashboard.stat.entries')} accent="var(--theme-brand-primary-500)" onDark />
                    <StatChip icon="fa-cubes" value={project.blueprints_count} label={t('dashboard.stat.blueprints')} accent="var(--theme-brand-secondary-500)" onDark />
                    <StatChip icon="fa-users" value={project.members_count} label={t('dashboard.stat.members')} accent="var(--theme-brand-accent-500)" onDark />
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start gap-4">
                    {/* Floating thumbnail — bumped from h-16 (64px) to
                        h-[4.5rem] (72px). The -mt-12 negative margin is
                        unchanged, so the thumbnail still pokes the same
                        ~28px up into the banner — only the visible
                        portion below the banner grows. */}
                    {project.page_image_url ? (
                        <img
                            src={project.page_image_url}
                            alt={project.name}
                            className="-mt-12 h-[4.5rem] w-[4.5rem] flex-shrink-0 object-cover"
                            style={{
                                borderRadius: 'var(--theme-radius-card)',
                                border: '4px solid var(--theme-base-surface)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                            }}
                        />
                    ) : (
                        <div
                            className="-mt-12 flex h-[4.5rem] w-[4.5rem] flex-shrink-0 items-center justify-center"
                            style={{
                                borderRadius: 'var(--theme-radius-card)',
                                border: '4px solid var(--theme-base-surface)',
                                background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                            }}
                        >
                            <i
                                className="fa-solid fa-globe text-2xl"
                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                                aria-hidden="true"
                            />
                        </div>
                    )}
                    <div className="min-w-0 flex-1 pt-1">
                        <h3 className="alex-dash-card-title font-serif text-xl font-bold leading-tight tracking-tight truncate">
                            {project.name}
                        </h3>
                    </div>
                </div>

                {project.logline && (
                    <p className="mt-3 text-sm line-clamp-2 leading-relaxed" style={subtleText}>
                        {project.logline}
                    </p>
                )}
            </div>
        </a>
    );
}

function RecentEntryRow({ entry, isLast }: { entry: RecentEntry; isLast: boolean }) {
    const iconClass = entry.blueprint_icon
        ? (entry.blueprint_icon.includes(' ') ? entry.blueprint_icon : `fa-solid ${entry.blueprint_icon}`)
        : 'fa-solid fa-file';

    return (
        <a
            href={pageUrl(
                entry.project_slug,
                entry.blueprint_name?.toLowerCase() ?? '',
                entry.slug,
            )}
            className="alex-dash-recent-row flex items-center gap-3 px-4 py-3"
            style={{
                borderBottom: isLast
                    ? 'none'
                    : '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
            }}
        >
            <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center"
                style={{
                    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                    borderRadius: 'var(--theme-radius-button)',
                }}
            >
                <i className={`${iconClass} text-sm`} style={subtleText} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.name}</p>
                <p className="text-xs truncate" style={fadedText}>
                    {entry.blueprint_name} · {entry.project_name}
                </p>
            </div>
            <span className="flex-shrink-0 text-xs" style={microText}>{entry.updated_at}</span>
        </a>
    );
}

/**
 * Recent-row variant for notes. Mirrors `RecentEntryRow`'s shape so the
 * combined "Both" list reads as one visual rhythm — same icon-circle on
 * the left, same right-aligned timestamp. The icon swaps to a sticky
 * note glyph and the subtitle leads with the "Note" kind tag so the
 * eye can quickly distinguish kinds in mixed mode.
 *
 * Click target: routes to the note's primary project's notes page when
 * a project pivot exists; renders as a static row for orphan notes.
 * Deep-linking to a specific note id inside the notes drawer can come
 * later — for now, surfacing the project is enough to get the user to
 * the right place.
 */
function RecentNoteRow({
    note,
    isLast,
    t,
}: {
    note: RecentNote;
    isLast: boolean;
    t: ReturnType<typeof useT>;
}) {
    const borderStyle: CSSProperties = {
        borderBottom: isLast
            ? 'none'
            : '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    };

    const body = (
        <>
            <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center"
                style={{
                    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                    borderRadius: 'var(--theme-radius-button)',
                }}
            >
                <i className="fa-solid fa-note-sticky text-sm" style={subtleText} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                    {note.title || t('dashboard.recent.note_untitled')}
                </p>
                <p className="text-xs truncate" style={fadedText}>
                    {t('dashboard.recent.note_kind')}
                    {note.project_name ? ` · ${note.project_name}` : ''}
                </p>
            </div>
            <span className="flex-shrink-0 text-xs" style={microText}>{note.updated_at}</span>
        </>
    );

    // Orphan notes (no project link) render as a non-clickable row.
    if (!note.project_slug) {
        return (
            <div className="alex-dash-recent-row flex items-center gap-3 px-4 py-3" style={borderStyle}>
                {body}
            </div>
        );
    }

    return (
        <a
            href={notesUrl(note.project_slug)}
            className="alex-dash-recent-row flex items-center gap-3 px-4 py-3"
            style={borderStyle}
        >
            {body}
        </a>
    );
}

/**
 * Three-pill filter toggle for the Recent section. Same visual family
 * as `ViewToggle` (the project view-mode pills) but scoped to a smaller
 * set of options. Renders both/entries/notes; persists via the
 * `dashboard:recent-filter` localStorage key.
 */
function RecentFilterToggle({
    value,
    onChange,
    t,
}: {
    value: RecentFilter;
    onChange: (next: RecentFilter) => void;
    t: ReturnType<typeof useT>;
}) {
    const options: Array<{ key: RecentFilter; label: string }> = [
        { key: 'both', label: t('dashboard.recent.filter.both') },
        { key: 'entries', label: t('dashboard.recent.filter.entries') },
        { key: 'notes', label: t('dashboard.recent.filter.notes') },
    ];

    return (
        <div
            className="alex-dash-view-toggle inline-flex shrink-0 p-0.5"
            style={{ borderRadius: 'var(--theme-radius-input)' }}
            role="tablist"
            aria-label={t('dashboard.recent.filter.aria_label')}
        >
            {options.map((opt) => {
                const active = opt.key === value;
                return (
                    <button
                        key={opt.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(opt.key)}
                        className={`alex-dash-view-btn px-2.5 py-1 text-xs font-medium ${active ? 'alex-dash-view-btn--active' : ''}`}
                        style={{ borderRadius: 'var(--theme-radius-input)' }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Count selector — picks how many recent items to show. Persists via
 * the `dashboard:recent-limit` localStorage key. Delegates the trigger
 * + menu chrome to `<PickerDropdown>` so the option list inherits theme tokens
 * (the previous native `<select>` rendered its dropdown with stark
 * OS-default white/black that ignored the theme).
 */
function RecentLimitPicker({
    value,
    onChange,
    t,
}: {
    value: RecentLimit;
    onChange: (next: RecentLimit) => void;
    t: ReturnType<typeof useT>;
}) {
    return (
        <PickerDropdown<RecentLimit>
            value={value}
            options={RECENT_LIMIT_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
            onChange={onChange}
            ariaLabel={t('dashboard.recent.limit.aria_label')}
            // Menu aligns to the trigger's right edge — the trigger sits
            // at the far-right of the Recent header row, so the menu
            // would otherwise hang off the viewport on narrow screens.
            align="right"
            menuWidth={80}
        />
    );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div
            className="px-4 py-16 text-center"
            style={{
                background: 'color-mix(in srgb, var(--theme-base-content) 2%, transparent)',
                border: '2px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                borderRadius: 'var(--theme-radius-card)',
            }}
        >
            <div
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)' }}
            >
                <i
                    className={`fa-solid ${icon} text-2xl`}
                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                    aria-hidden="true"
                />
            </div>
            <h3 className="font-serif text-xl font-bold">{title}</h3>
            <p className="mt-1 text-sm" style={subtleText}>{description}</p>
        </div>
    );
}

function ViewToggle({ current, onChange, t, hideTable = false }: { current: ProjectViewMode; onChange: (m: ProjectViewMode) => void; t: (k: string) => string; hideTable?: boolean }) {
    const allButtons: Array<{ key: ProjectViewMode; icon: string; label: string }> = [
        // Grid view is intentionally omitted from the toggle for now —
        // the layout is being reworked and we want users on the rows /
        // table presentations until it's ready. ProjectCard + its
        // grid-render branch stay in the file (deliberately kept, not
        // deleted) so the visual treatment is one toggle-flip away
        // when we circle back.
        { key: 'rows', icon: 'fa-bars', label: t('dashboard.view.rows') },
        { key: 'table', icon: 'fa-table', label: t('dashboard.view.table') },
    ];
    // hideTable strips the Table button at mobile widths — it's a
    // poor fit on phones (5 columns at narrow viewport) and the
    // effectiveViewMode in Dashboard already falls back to 'rows'
    // when a stored 'table' preference hits mobile.
    const buttons = hideTable ? allButtons.filter((b) => b.key !== 'table') : allButtons;
    return (
        <div
            className="alex-dash-view-toggle inline-flex items-center rounded-full p-1"
            role="tablist"
            aria-label={t('dashboard.view.aria_label')}
        >
            {buttons.map((b) => {
                const active = current === b.key;
                return (
                    <Tooltip key={b.key} content={b.label} placement="bottom">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-label={b.label}
                            onClick={() => onChange(b.key)}
                            className="alex-dash-view-btn flex h-7 w-7 items-center justify-center rounded-full text-xs"
                        >
                            <i className={`fa-solid ${b.icon}`} aria-hidden="true" />
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}

function ProjectRow({ project, t }: { project: DashboardProject; t: (k: string) => string }) {
    // Desktop reads as a snapshot of the project page header:
    //   ┌──────────────────────────────────┐
    //   │ ┌──┐ Banner (top 1/3, full)      │
    //   ├─┤  ├────────────────────────────-┤
    //   │ └──┘ Name                        │
    //   │      Stats · Updated             │
    //   └──────────────────────────────────┘
    // Banner is a full-width strip across the top 1/3 and the image
    // sits on a floating absolute layer that overlaps the banner /
    // content boundary, so its top edge pokes up into the banner —
    // mirroring the way an avatar sits over a cover photo.
    //
    // Mobile drops the banner strip and the absolute-positioned image
    // overlay — instead the page image sits inline to the LEFT of the
    // name, single-row, like a contact list. Plain `flex` rules apply
    // and we don't need the absolute-layer dance at narrow widths.
    const projectImage = project.page_image_url ? (
        <img
            src={project.page_image_url}
            alt={project.name}
            className="h-full w-full object-cover"
            style={{
                borderRadius: 'var(--theme-radius-card)',
                border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
            }}
        />
    ) : (
        <div
            className="flex h-full w-full items-center justify-center"
            style={{
                borderRadius: 'var(--theme-radius-card)',
                border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                background: 'var(--theme-base-surface)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
            }}
        >
            <i
                className="fa-solid fa-globe text-xl sm:text-2xl"
                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                aria-hidden="true"
            />
        </div>
    );

    return (
        <a
            href={projectUrl(project.slug)}
            // Mobile: flex-row, auto height, inline image + text.
            // Desktop: flex-col with 6.5rem height (banner-on-top
            // layout). The `sm:flex-col` switches direction and the
            // `sm:h-[6.5rem]` restores the original fixed-row height
            // so banner (flex-[1]) and content (flex-[2]) divide
            // it 1:2 instead of each claiming their own size and
            // stacking to a 200px+ card.
            className="alex-dash-row group relative flex flex-row items-center overflow-hidden sm:h-[6.5rem] sm:flex-col sm:items-stretch"
        >
            {/* Banner — desktop only. On mobile we go straight to the
                inline image + name row. */}
            <div className="relative hidden overflow-hidden sm:flex sm:flex-[1]">
                {project.banner_url ? (
                    <div
                        className="alex-dash-banner-img absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${project.banner_url})` }}
                    />
                ) : (
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(to right, color-mix(in srgb, var(--theme-brand-primary-500) 22%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 14%, transparent), color-mix(in srgb, var(--theme-brand-accent-500) 22%, transparent))',
                        }}
                    />
                )}
            </div>

            {/* Content row — image inline at narrow widths (mobile);
                desktop uses the absolute-positioned overlay below for
                the avatar-on-banner pose, so the inline image hides.
                `sm:pl-28` (7rem) clears the absolute image (which ends
                at 5.5rem) and leaves ~1.5rem of breathing room between
                the image's right edge and the title. */}
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 sm:flex-[2] sm:gap-5 sm:px-5 sm:py-0 sm:pl-28">
                {/* Inline image — visible only below sm:. */}
                <div className="flex h-12 w-12 flex-shrink-0 sm:hidden">
                    {projectImage}
                </div>

                {/* Name + logline + stats */}
                <div className="flex min-w-0 flex-1 items-center gap-5">
                    <div className="min-w-0 flex-1">
                        <h3 className="alex-dash-row-title font-serif text-base font-bold leading-tight tracking-tight truncate sm:text-xl">
                            {project.name}
                        </h3>
                        {project.logline && (
                            <p className="mt-0.5 text-xs line-clamp-1 sm:mt-1 sm:text-sm" style={subtleText}>
                                {project.logline}
                            </p>
                        )}
                    </div>

                    {/* Succinct stat chips — visible at all viewport
                        widths (was previously `hidden md:flex`). Tooltip
                        on hover names what each icon represents, so the
                        cluster reads as "12 · 4 · 1" without a legend
                        crowding the row. */}
                    <div className="flex flex-shrink-0 items-center gap-2.5 sm:gap-4">
                        <StatChip icon="fa-file-lines" value={project.entries_count} label={t('dashboard.stat.entries')} accent="var(--theme-brand-primary-500)" />
                        <StatChip icon="fa-cubes" value={project.blueprints_count} label={t('dashboard.stat.blueprints')} accent="var(--theme-brand-secondary-500)" />
                        <StatChip icon="fa-users" value={project.members_count} label={t('dashboard.stat.members')} accent="var(--theme-brand-accent-500)" />
                        {project.last_activity && (
                            // `md:ml-6` puts a clear 1.5rem gap between
                            // the stats cluster and the Updated block so
                            // the two read as distinct columns rather
                            // than a single comma-separated string.
                            <div className="hidden md:ml-6 md:flex flex-col items-end leading-tight">
                                <span
                                    className="text-[11px] font-semibold uppercase tracking-wider"
                                    style={fadedText}
                                >
                                    {t('dashboard.row.updated')}
                                </span>
                                <span
                                    className="text-sm font-medium"
                                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 75%, transparent)' }}
                                >
                                    {project.last_activity}
                                </span>
                            </div>
                        )}
                    </div>

                    <i
                        className="alex-dash-row-chevron fa-solid fa-chevron-right text-xs sm:text-base"
                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Floating image — desktop only. Overlaps the banner /
                content boundary so the top edge pokes up into the
                banner like an avatar over a cover photo. `left: 1rem`
                gives the image a comfortable margin from the row's
                left edge; paired with the content's `sm:pl-28` (7rem)
                below, the title gets ~1.5rem of breathing room after
                the image's right edge. */}
            <div
                className="absolute hidden sm:flex items-center justify-center"
                style={{
                    left: '1rem',
                    top: '1rem',
                    width: '4.5rem',
                    height: '4.5rem',
                }}
            >
                {projectImage}
            </div>
        </a>
    );
}

/**
 * Compact icon + number chip. The label travels in a hover-revealed
 * Tooltip so the chip itself stays at a single readable glyph + count,
 * while still affording "what is this number?" without forcing the
 * user to bring a legend out into the layout. Used on both ProjectCard
 * (the grid view) and ProjectRow (the list view) so the stats read
 * the same across surface modes.
 */
function StatChip({
    icon,
    value,
    label,
    accent,
    onDark = false,
}: {
    icon: string;
    value: number;
    label: string;
    accent: string;
    /** Renders the number in near-white when the chip sits inside a
     *  dark pill backdrop (e.g. the grid card's banner overlay). Icon
     *  keeps its accent colour because saturated brand hues still read
     *  on a translucent black backdrop and the colour-coding is what
     *  lets the eye discriminate between entries / blueprints /
     *  members at a glance. */
    onDark?: boolean;
}) {
    return (
        <Tooltip content={label}>
            {/* No `cursor-default` here — the chip lives inside a
                clickable anchor (ProjectCard, ProjectRow) and we want
                the user to see the parent's pointer cursor while
                hovering. The tooltip still surfaces because Tooltip's
                hover detection is independent of cursor styling. */}
            <span
                className="inline-flex items-center gap-1.5 text-sm"
                style={onDark ? { color: 'rgba(255, 255, 255, 0.95)' } : fadedText}
                tabIndex={0}
            >
                <i className={`fa-solid ${icon}`} style={{ color: accent }} aria-hidden="true" />
                {value}
            </span>
        </Tooltip>
    );
}

function ProjectTable({ projects, t }: { projects: DashboardProject[]; t: (k: string) => string }) {
    const headerStyle: CSSProperties = {
        ...fadedText,
        borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    };
    // Mobile hides everything except Project + chevron — 5 columns
    // (entries/blueprints/members/updated/chevron) at 4 chars wide
    // each can't fit at 375px without the horizontal scroll the user
    // flagged. The columns return at sm+ where the row has room.
    return (
        <div
            className="border sm:overflow-x-auto"
            style={{
                ...surfaceTinted,
                background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
                borderRadius: 'var(--theme-radius-card)',
            }}
        >
            <table className="w-full text-sm">
                <thead>
                    <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)' }}>
                        <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[.2em] sm:px-4" style={headerStyle}>{t('dashboard.table.project')}</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.entries')}</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.blueprints')}</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.members')}</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[.2em]" style={headerStyle}>{t('dashboard.table.updated')}</th>
                        <th className="px-2 py-3" aria-hidden="true" />
                    </tr>
                </thead>
                <tbody>
                    {projects.map((project, index) => (
                        <tr
                            key={project.id}
                            className="alex-dash-table-row group cursor-pointer"
                            style={{
                                borderBottom: index === projects.length - 1
                                    ? 'none'
                                    : '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
                            }}
                            onClick={() => { window.location.href = projectUrl(project.slug); }}
                        >
                            <td className="px-3 py-3 sm:px-4">
                                <div className="flex items-center gap-3">
                                    {project.page_image_url ? (
                                        <img
                                            src={project.page_image_url}
                                            alt=""
                                            className="h-10 w-10 flex-shrink-0 object-cover"
                                            style={{
                                                borderRadius: 'var(--theme-radius-button)',
                                                ...strokeBorder,
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
                                            style={{
                                                borderRadius: 'var(--theme-radius-button)',
                                                border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                                                background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
                                            }}
                                        >
                                            <i
                                                className="fa-solid fa-globe text-sm"
                                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                                                aria-hidden="true"
                                            />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <a
                                            href={projectUrl(project.slug)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="alex-dash-table-title font-serif text-sm font-bold tracking-tight truncate block sm:text-base"
                                        >
                                            {project.name}
                                        </a>
                                        {project.logline && (
                                            <p className="text-xs line-clamp-1" style={fadedText}>{project.logline}</p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 text-right font-medium tabular-nums">{project.entries_count}</td>
                            <td className="hidden sm:table-cell px-4 py-3 text-right font-medium tabular-nums">{project.blueprints_count}</td>
                            <td className="hidden sm:table-cell px-4 py-3 text-right font-medium tabular-nums">{project.members_count}</td>
                            <td className="hidden sm:table-cell px-4 py-3 text-right text-xs whitespace-nowrap" style={subtleText}>
                                {project.last_activity ?? '—'}
                            </td>
                            <td className="px-2 py-3 text-right">
                                <i
                                    className="alex-dash-table-chevron fa-solid fa-chevron-right text-xs"
                                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' }}
                                    aria-hidden="true"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
