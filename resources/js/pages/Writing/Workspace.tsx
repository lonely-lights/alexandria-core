import { Link, router, usePage } from '@inertiajs/react';
import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import AppLayout from '@alexandria/layouts/AppLayout';
import Ribbon from '@alexandria/ribbon/Ribbon';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';

import AddSectionModal from './Sections/AddSectionModal';
import ManuscriptEditor, {
    PRINT_LAYOUT_STORAGE_KEY,
    readPrintLayoutPreference,
} from './Sections/ManuscriptEditor';
import Navigator from './Sections/Navigator';
import ReferencePanel, { type EntryCard } from './Sections/ReferencePanel';
import ScreenplayEditor from './Sections/ScreenplayEditor';
import WorkSettingsModal, {
    type LengthPlanOption,
    type WorkLengthPlan,
} from './Sections/WorkSettingsModal';
import type { WritingEditorBridge, WritingRibbonContext } from './ribbon/writingRibbonContext';
import { registerWritingRibbon } from './ribbon/writingRibbonTabs';

/**
 * Writing dashboard → workspace — Stage 8g.1 (ribbon-driven since
 * Ribbon Plan 2 Task 3).
 *
 * The manuscript surface: the writing ribbon (full width, under the
 * navbar — breadcrumb leading, status/progress/counts trailing) over a
 * full-height three-pane row — section Navigator (left), editor pane
 * (center), reference rail (right). The Workspace owns the ribbon
 * context: workspace state (panel, print layout, work status) plus an
 * editor bridge both editors implement; `editorTick` bumps on editor
 * selection/content changes so control states re-render. The section
 * add/delete modals live here too, shared between the ribbon's
 * Structure tab and the Navigator's hover affordances.
 *
 * The server hydrates the full section tree (titles/slugs only) plus
 * ONE section's content (currentSection); switching sections
 * partial-reloads just that prop.
 */

registerWritingRibbon();

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
        target_pages: number | null;
        page_estimate: number;
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

/** Depth-first lookup in the section tree (ribbon delete targets the current section). */
function findSectionNode(nodes: SectionNode[], id: number): SectionNode | null {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }

        const found = findSectionNode(node.children, id);

        if (found !== null) {
            return found;
        }
    }

    return null;
}

/* ── Theme styles ── */

// The fixed navbar overlays immersive pages; padding the ribbon shell
// by --navbar-height keeps its background extending behind the navbar
// while the tab row starts cleanly below it (same trick as PageHeader).
// The background matches .ribbon's bar tint so the two read as one.
const ribbonShellStyle: CSSProperties = {
    paddingTop: 'var(--navbar-height, 3.5rem)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, var(--theme-base-page))',
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
    const [printLayout, setPrintLayout] = useState(readPrintLayoutPreference);

    // Section add/delete modal triggers — shared between the ribbon's
    // Structure tab and the Navigator's hover affordances.
    const [addTarget, setAddTarget] = useState<{ parentId: number | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SectionNode | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Ribbon editor bridge — populated by whichever editor is mounted
    // (via useImperativeHandle); editorTick bumps on its state changes
    // so ribbon control predicates re-read it.
    const bridgeRef = useRef<WritingEditorBridge | null>(null);
    const [editorTick, setEditorTick] = useState(0);

    const handleEditorStateChange = useCallback(() => {
        setEditorTick((tick) => tick + 1);
    }, []);

    const togglePanel = useCallback(() => {
        setPanelOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(PANEL_OPEN_STORAGE_KEY, String(next));
            } catch {
                // Persistence is best-effort; private-mode failures are fine.
            }
            return next;
        });
    }, []);

    const togglePrintLayout = useCallback(() => {
        setPrintLayout((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(PRINT_LAYOUT_STORAGE_KEY, String(next));
            } catch {
                // Persistence is best-effort; private-mode failures are fine.
            }
            return next;
        });
    }, []);

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

    function confirmDelete() {
        if (deleteTarget === null) {
            return;
        }

        router.delete(`/works/${project.slug}/${work.slug}/sections/${deleteTarget.id}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    }

    const ribbonCtx = useMemo<WritingRibbonContext>(() => {
        const projectSlug = project.slug;
        const workSlug = work.slug;

        return {
            format: (currentSection?.format ?? work.format) === 'screenplay' ? 'screenplay' : 'prose',
            canUpdate: can.update,
            panelOpen,
            printLayout,
            hasSection: currentSection !== null,
            editorTick,
            // Lazy getter: the bridge lands via useImperativeHandle AFTER
            // this memo runs on mount, so actions/predicates must read the
            // live ref — editorTick re-runs the memo for state freshness,
            // the getter guarantees commands never see a stale null.
            get editor() {
                return bridgeRef.current;
            },
            actions: {
                togglePanel,
                togglePrintLayout,
                openSettings: () => setSettingsOpen(true),
                openReports: () => router.visit(`/works/${projectSlug}/${workSlug}/reports`),
                addSection: () => setAddTarget({ parentId: null }),
                addInside: () => {
                    if (currentSection !== null) {
                        setAddTarget({ parentId: currentSection.id });
                    }
                },
                deleteSection: () => {
                    if (currentSection === null) {
                        return;
                    }

                    const node = findSectionNode(sections, currentSection.id);

                    if (node !== null) {
                        setDeleteTarget(node);
                    }
                },
                // works.update requires title + status (logline nullable,
                // type/length_plan `sometimes`) — the minimum valid payload.
                setStatus: (value: string) =>
                    router.put(
                        `/works/${projectSlug}/${workSlug}`,
                        { title: work.title, status: value },
                        { preserveScroll: true },
                    ),
                goToIndex: () => router.visit(`/works/${projectSlug}`),
                goToDashboard: () => router.visit('/writing'),
            },
            workStatus: work.status,
        };
    }, [
        project.slug,
        work.slug,
        work.format,
        work.title,
        work.status,
        can.update,
        panelOpen,
        printLayout,
        currentSection,
        sections,
        editorTick,
        togglePanel,
        togglePrintLayout,
    ]);

    const workWords = liveWorkWords ?? work.word_count;
    const targetLines = work.length_plan?.target_lines ?? null;

    // Word target wins when several exist (words > lines > pages).
    // Line counts — and the page estimate derived from them — only
    // refresh with full prop reloads (the autosave response carries
    // word/page counts only) — accepted props-only freshness in v1.
    let countLabel: string;
    let progressRatio: number | null = null;

    if (work.target_words !== null) {
        countLabel = `${t('writing.workspace.words').replace(':count', workWords.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', work.target_words.toLocaleString())}`;
        progressRatio = work.target_words > 0 ? workWords / work.target_words : null;
    } else if (targetLines !== null) {
        countLabel = `${t('writing.workspace.lines').replace(':count', work.line_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', targetLines.toLocaleString())}`;
        progressRatio = targetLines > 0 ? work.line_count / targetLines : null;
    } else if (work.target_pages !== null) {
        countLabel = t('writing.workspace.pages_of_target')
            .replace(':count', work.page_estimate.toLocaleString())
            .replace(':target', work.target_pages.toLocaleString());
        progressRatio = work.target_pages > 0 ? work.page_estimate / work.target_pages : null;
    } else {
        countLabel = t('writing.workspace.words').replace(':count', workWords.toLocaleString());
    }

    // Ribbon tab-row slots: the back-link breadcrumb leads, the status
    // chip + progress + counts cluster trails (the old header strip's
    // two sides — the strip itself is gone, the ribbon owns the row).
    const breadcrumb = (
        <div className="flex min-w-0 items-center gap-2 self-center pr-3 text-sm">
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
        </div>
    );

    const trailingCluster = (
        <>
            <span style={statusChipStyle}>
                {t(`writing.statuses.${work.status}`, work.status)}
            </span>
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
        </>
    );

    return (
        <AppLayout title={`${work.title} - ${project.name}`} immersive>
            <div className="flex h-screen flex-col">
                {/* Writing ribbon — full width, under the navbar */}
                <div className="shrink-0" style={ribbonShellStyle}>
                    <Ribbon
                        setKey="writing"
                        context={ribbonCtx}
                        leading={breadcrumb}
                        trailing={trailingCluster}
                    />
                </div>

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
                            onRequestAdd={(parentId) => setAddTarget({ parentId })}
                            onRequestDelete={setDeleteTarget}
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
                                    chrome="none"
                                    printLayout={printLayout}
                                    bridgeRef={bridgeRef}
                                    onStateChange={handleEditorStateChange}
                                />
                            ) : (
                                <ManuscriptEditor
                                    projectId={project.id}
                                    projectSlug={project.slug}
                                    workSlug={work.slug}
                                    section={currentSection}
                                    canUpdate={can.update}
                                    onCounts={handleCounts}
                                    chrome="none"
                                    printLayout={printLayout}
                                    bridgeRef={bridgeRef}
                                    onStateChange={handleEditorStateChange}
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

            {addTarget !== null && (
                <AddSectionModal
                    projectSlug={project.slug}
                    workSlug={work.slug}
                    parentId={addTarget.parentId}
                    onClose={() => setAddTarget(null)}
                />
            )}

            <ConfirmModal
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={t('writing.workspace.delete_confirm_title')}
                message={t('writing.workspace.delete_confirm_body')}
                confirmLabel={t('writing.workspace.delete_confirm_action')}
                variant="danger"
                loading={deleting}
            />
        </AppLayout>
    );
}
