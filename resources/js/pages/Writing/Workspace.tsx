import { Link, router, usePage } from '@inertiajs/react';
import { useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import AppLayout from '@alexandria/layouts/AppLayout';
import Tooltip from '@alexandria/components/ui/Tooltip';

import ManuscriptEditor from './Sections/ManuscriptEditor';
import Navigator from './Sections/Navigator';
import ReferencePanel, { type EntryCard } from './Sections/ReferencePanel';
import ScreenplayEditor from './Sections/ScreenplayEditor';
import WorkSettingsModal, {
    type LengthPlanOption,
    type WorkLengthPlan,
} from './Sections/WorkSettingsModal';

/**
 * Writing dashboard → workspace — Stage 8g.1 (Plan 2 Task 6).
 *
 * The manuscript surface: a slim work-header strip over a full-height
 * three-pane row — section Navigator (left), editor pane (center),
 * reference rail (right, Plan 3). The server hydrates the full section
 * tree (titles/slugs only) plus ONE section's content (currentSection);
 * switching sections partial-reloads just that prop.
 */

export interface SectionNode {
    id: number;
    title: string;
    slug: string;
    label: string | null;
    position: number;
    word_count: number;
    target_words: number | null;
    has_content: boolean;
    children: SectionNode[];
}

export interface CurrentSection {
    id: number;
    title: string;
    slug: string;
    label: string | null;
    parent_id: number | null;
    format: 'prose' | 'screenplay';
    status: string | null;
    synopsis: string | null;
    content: string | null;
    word_count: number;
    target_words: number | null;
    pov_entry_id: number | null;
    setting_entry_id: number | null;
}

interface WorkspaceProps {
    project: { id: number; name: string; slug: string };
    work: {
        id: number;
        title: string;
        slug: string;
        type: string;
        format: string;
        status: string;
        logline: string | null;
        word_count: number;
        line_count: number;
        target_words: number | null;
        length_plan: WorkLengthPlan | null;
    };
    sections: SectionNode[];
    currentSection: CurrentSection | null;
    pins: EntryCard[];
    types: string[];
    lengthPlans: LengthPlanOption[];
    can: { update: boolean };
    [key: string]: unknown;
}

/** Persisted reference-panel visibility (desktop only — the xl: gate still applies). */
export const PANEL_OPEN_STORAGE_KEY = 'alexandria.writing.panel_open';

function readPanelOpenPreference(): boolean {
    try {
        return localStorage.getItem(PANEL_OPEN_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

/* ── Theme styles ── */

// The fixed navbar overlays immersive pages; padding the strip by
// --navbar-height keeps its background extending behind the navbar
// while the content starts cleanly below it (same trick as PageHeader).
const headerStripStyle: CSSProperties = {
    paddingTop: 'var(--navbar-height, 3.5rem)',
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const crumbSeparatorStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const statusChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
};

const metaText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const mutedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const paneBorderColor = 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)';

export default function Workspace() {
    const t = useT();
    const { project, work, sections, currentSection, pins, types, lengthPlans, can } =
        usePage<WorkspaceProps>().props;

    // Server-confirmed counts from autosave responses overlay the
    // Inertia props until the next full prop refresh catches up.
    const [liveCounts, setLiveCounts] = useState<Record<number, number>>({});
    const [liveWorkWords, setLiveWorkWords] = useState<number | null>(null);

    // Bumped after each confirmed autosave so the reference panel
    // re-fetches the section's server-synced mentions.
    const [saveSignal, setSaveSignal] = useState(0);

    const [panelOpen, setPanelOpen] = useState(readPanelOpenPreference);
    const [settingsOpen, setSettingsOpen] = useState(false);

    function togglePanel() {
        setPanelOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(PANEL_OPEN_STORAGE_KEY, String(next));
            } catch {
                // Persistence is best-effort; private-mode failures are fine.
            }
            return next;
        });
    }

    function selectSection(slug: string) {
        router.visit(`/works/${project.slug}/${work.slug}/${slug}`, {
            only: ['currentSection'],
            preserveState: true,
            preserveScroll: true,
        });
    }

    function handleCounts(sectionId: number, words: number, workWords: number, _pages: number | null) {
        setLiveCounts((prev) => ({ ...prev, [sectionId]: words }));
        setLiveWorkWords(workWords);
        setSaveSignal((prev) => prev + 1);
    }

    const workWords = liveWorkWords ?? work.word_count;
    const targetLines = work.length_plan?.target_lines ?? null;

    // Word target wins when both exist. Line counts only refresh with
    // full prop reloads (the autosave response carries word/page counts
    // only) — accepted props-only freshness for lines in v1.
    let countLabel: string;
    let progressRatio: number | null = null;

    if (work.target_words !== null) {
        countLabel = `${t('writing.workspace.words').replace(':count', workWords.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', work.target_words.toLocaleString())}`;
        progressRatio = work.target_words > 0 ? workWords / work.target_words : null;
    } else if (targetLines !== null) {
        countLabel = `${t('writing.workspace.lines').replace(':count', work.line_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', targetLines.toLocaleString())}`;
        progressRatio = targetLines > 0 ? work.line_count / targetLines : null;
    } else {
        countLabel = t('writing.workspace.words').replace(':count', workWords.toLocaleString());
    }

    return (
        <AppLayout title={`${work.title} - ${project.name}`} immersive>
            <div className="flex h-screen flex-col">
                {/* Work-header strip */}
                <header style={headerStripStyle}>
                    <div className="flex items-center justify-between gap-3 px-4 py-2">
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                            <Link
                                href={`/works/${project.slug}`}
                                className="alex-page-header-crumb-link shrink-0"
                            >
                                {project.name}
                            </Link>
                            <i
                                className="fa-solid fa-chevron-right text-[8px]"
                                style={crumbSeparatorStyle}
                                aria-hidden="true"
                            />
                            <span className="truncate font-semibold">{work.title}</span>
                            <span style={statusChipStyle}>
                                {t(`writing.statuses.${work.status}`, work.status)}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {can.update && (
                                <Tooltip content={t('writing.settings.title')}>
                                    <button
                                        type="button"
                                        onClick={() => setSettingsOpen(true)}
                                        aria-label={t('writing.settings.title')}
                                        className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs transition-colors"
                                        style={{
                                            color: 'var(--theme-base-content)',
                                            borderRadius: 'var(--theme-radius-button)',
                                        }}
                                    >
                                        <i className="fa-solid fa-gear" aria-hidden="true" />
                                    </button>
                                </Tooltip>
                            )}
                            <button
                                type="button"
                                onClick={togglePanel}
                                aria-expanded={panelOpen}
                                aria-label={panelOpen ? t('writing.panel.collapse') : t('writing.panel.expand')}
                                title={panelOpen ? t('writing.panel.collapse') : t('writing.panel.expand')}
                                className={`alex-toolbar-btn hidden h-7 w-7 items-center justify-center text-xs transition-colors xl:inline-flex ${panelOpen ? 'alex-toolbar-btn--active' : ''}`}
                                style={{
                                    color: panelOpen
                                        ? 'var(--theme-brand-secondary-500)'
                                        : 'var(--theme-base-content)',
                                    background: panelOpen
                                        ? 'color-mix(in srgb, var(--theme-brand-secondary-500) 18%, transparent)'
                                        : 'transparent',
                                    borderRadius: 'var(--theme-radius-button)',
                                }}
                            >
                                <i
                                    className={`fa-solid ${panelOpen ? 'fa-chevron-right' : 'fa-chevron-left'}`}
                                    aria-hidden="true"
                                />
                            </button>
                            {progressRatio !== null && (
                                <div
                                    aria-hidden="true"
                                    className="h-1 w-32 overflow-hidden rounded-full"
                                    style={{
                                        background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
                                    }}
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${Math.min(100, progressRatio * 100)}%`,
                                            background: 'var(--theme-brand-primary-500)',
                                        }}
                                    />
                                </div>
                            )}
                            <div className="text-xs tabular-nums" style={metaText}>
                                {countLabel}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex min-h-0 flex-1">
                    {/* Navigator */}
                    <nav
                        className="hidden w-72 shrink-0 overflow-y-auto border-r md:block"
                        style={{ borderColor: paneBorderColor }}
                    >
                        <Navigator
                            projectSlug={project.slug}
                            workSlug={work.slug}
                            sections={sections}
                            currentSlug={currentSection?.slug ?? null}
                            canUpdate={can.update}
                            onSelect={selectSection}
                            liveCounts={liveCounts}
                        />
                    </nav>

                    {/* Editor pane — the frame itself never scrolls; the
                        editor's content wrapper inside ManuscriptEditor does */}
                    <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        {currentSection !== null ? (
                            currentSection.format === 'screenplay' ? (
                                <ScreenplayEditor
                                    key={currentSection.id}
                                    projectId={project.id}
                                    projectSlug={project.slug}
                                    workSlug={work.slug}
                                    section={currentSection}
                                    canUpdate={can.update}
                                    onCounts={handleCounts}
                                />
                            ) : (
                                <ManuscriptEditor
                                    projectId={project.id}
                                    projectSlug={project.slug}
                                    workSlug={work.slug}
                                    section={currentSection}
                                    canUpdate={can.update}
                                    onCounts={handleCounts}
                                />
                            )
                        ) : (
                            <div
                                className="flex flex-1 items-center justify-center px-6 text-center text-sm italic"
                                style={mutedText}
                            >
                                {t('writing.workspace.no_section')}
                            </div>
                        )}
                    </section>

                    {/* Right rail — reference panel (Plan 3). The xl: responsive
                        gate stays on top of the user toggle. */}
                    {panelOpen && (
                        <aside
                            className="hidden w-80 shrink-0 border-l xl:block"
                            style={{ borderColor: paneBorderColor }}
                        >
                            <ReferencePanel
                                project={project}
                                work={work}
                                currentSection={currentSection}
                                pins={pins}
                                canUpdate={can.update}
                                saveSignal={saveSignal}
                            />
                        </aside>
                    )}
                </div>
            </div>

            {settingsOpen && (
                <WorkSettingsModal
                    project={project}
                    work={work}
                    types={types}
                    lengthPlans={lengthPlans}
                    onClose={() => setSettingsOpen(false)}
                />
            )}
        </AppLayout>
    );
}
