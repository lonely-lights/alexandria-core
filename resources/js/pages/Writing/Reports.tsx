import { usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';

import type { EntryCard } from './Sections/ReferencePanel';
import CharactersReport from './Sections/Reports/CharactersReport';
import ProgressReport from './Sections/Reports/ProgressReport';
import StructureReport from './Sections/Reports/StructureReport';

/**
 * Work reports — Stage 8g.1 (Plan 4 Task 4).
 *
 * Read-only rollups over a work: character appearances (every entry
 * the manuscript references, however it references it), the flattened
 * section structure with per-section counts, and progress aggregates.
 * Utilitarian surface — plain serif title, no hero tile; the three
 * cards carry the data.
 */

export interface CharacterReportRow extends EntryCard {
    total_mentions: number;
    sections_count: number;
    sources: string[];
    first_section: { title: string; slug: string } | null;
    last_section: { title: string; slug: string } | null;
}

export interface ActBreakdownRow {
    label: string;
    sections: number;
    words: number;
    characters: { name: string; slug: string; mentions: number }[];
    distinct_characters: number;
}

export interface StructureReportRow {
    id: number;
    depth: number;
    title: string;
    slug: string;
    label: string | null;
    status: string | null;
    beat_type: string | null;
    pov: string | null;
    word_count: number;
    target_words: number | null;
    has_content: boolean;
}

export interface ProgressReportData {
    work_word_count: number;
    work_line_count: number;
    target_words: number | null;
    target_lines: number | null;
    target_pages: number | null;
    page_estimate: number;
    per_level: { label: string | null; sections: number; words: number; average: number }[];
    recent: { date: string; words: number }[];
}

interface ReportsProps {
    project: { id: number; name: string; slug: string };
    work: {
        id: number;
        title: string;
        slug: string;
        type: string;
        format: string;
        status: string;
        word_count: number;
        line_count: number;
        target_words: number | null;
        length_plan: Record<string, unknown> | null;
    };
    characters: CharacterReportRow[];
    act_breakdown: ActBreakdownRow[];
    structure: StructureReportRow[];
    progress: ProgressReportData;
    [key: string]: unknown;
}

/* ── Theme styles ── */

const subtitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function Reports() {
    const t = useT();
    const { project, work, characters, act_breakdown, structure, progress } = usePage<ReportsProps>().props;

    // Same precedence as the workspace header strip: a word target
    // wins; a line target (poetry plans) steps in only when no word
    // target is set; otherwise just the plain count.
    let countLine: string;

    if (work.target_words !== null) {
        countLine = `${t('writing.workspace.words').replace(':count', work.word_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', work.target_words.toLocaleString())}`;
    } else if (progress.target_lines !== null) {
        countLine = `${t('writing.workspace.lines').replace(':count', work.line_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', progress.target_lines.toLocaleString())}`;
    } else {
        countLine = t('writing.workspace.words').replace(':count', work.word_count.toLocaleString());
    }

    return (
        <AppLayout title={`${t('writing.reports.title')} - ${work.title}`} immersive fabActions={null}>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: work.title, href: `/works/${project.slug}/${work.slug}` },
                    { label: t('writing.reports.title') },
                ]}
            >
                <div className="min-w-0">
                    <h1 className="font-serif text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                        {t('writing.reports.title')}
                    </h1>
                    <p className="mt-1 text-xs tabular-nums sm:text-sm" style={subtitleStyle}>
                        {countLine}
                    </p>
                </div>
            </PageHeader>

            <div className="container mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
                <CharactersReport
                    characters={characters}
                    actBreakdown={act_breakdown}
                    projectSlug={project.slug}
                    workSlug={work.slug}
                    t={t}
                />
                <StructureReport
                    structure={structure}
                    projectSlug={project.slug}
                    workSlug={work.slug}
                    t={t}
                />
                <ProgressReport progress={progress} t={t} />
            </div>
        </AppLayout>
    );
}
