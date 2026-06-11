import { Link, router, usePage } from '@inertiajs/react';
import { type CSSProperties } from 'react';

import useT, { type Translator } from '@alexandria/hooks/useT';
import AppLayout from '@alexandria/layouts/AppLayout';

import Navigator from './Sections/Navigator';

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
        word_count: number;
        target_words: number | null;
    };
    sections: SectionNode[];
    currentSection: CurrentSection | null;
    can: { update: boolean };
    [key: string]: unknown;
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
    const { project, work, sections, currentSection, can } = usePage<WorkspaceProps>().props;

    function selectSection(slug: string) {
        router.visit(`/works/${project.slug}/${work.slug}/${slug}`, {
            only: ['currentSection'],
            preserveState: true,
            preserveScroll: true,
        });
    }

    const wordCountLabel = work.target_words !== null
        ? `${t('writing.workspace.words').replace(':count', work.word_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', work.target_words.toLocaleString())}`
        : t('writing.workspace.words').replace(':count', work.word_count.toLocaleString());

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
                        <div className="shrink-0 text-xs tabular-nums" style={metaText}>
                            {wordCountLabel}
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
                        />
                    </nav>

                    {/* Editor pane */}
                    <section className="min-w-0 flex-1 overflow-y-auto">
                        <EditorPanePlaceholder section={currentSection} t={t} />
                    </section>

                    {/* Right rail */}
                    <aside
                        className="hidden w-72 shrink-0 border-l xl:block"
                        style={{ borderColor: paneBorderColor }}
                    >
                        {/* Reference panel mounts here (Plan 3) */}
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}

/**
 * Placeholder editor pane — Task 7 replaces this with the
 * ManuscriptEditor. Renders the current section's title + raw content,
 * or an empty-state prompt when no section is selected.
 */
function EditorPanePlaceholder({
    section,
    t,
}: {
    section: CurrentSection | null;
    t: Translator;
}) {
    if (section === null) {
        return (
            <div
                className="flex h-full items-center justify-center px-6 text-center text-sm italic"
                style={mutedText}
            >
                {t('writing.workspace.no_section')}
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
            <h1 className="text-2xl font-bold">{section.title}</h1>
            {section.content && (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                    {section.content}
                </pre>
            )}
        </div>
    );
}
