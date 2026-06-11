import { Link, useForm, usePage } from '@inertiajs/react';
import { useState, type CSSProperties, type FormEvent } from 'react';

import useT, { type Translator } from '@alexandria/hooks/useT';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import Button from '@alexandria/components/ui/Button';
import IconTile from '@alexandria/components/ui/IconTile';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';
import Textarea from '@alexandria/components/form/Textarea';

/**
 * Writing dashboard → index — Stage 8g.1 (Plan 2 Task 5).
 *
 * Lists a project's works (newest-updated first, ordering comes from
 * the server) and hosts the create-work modal. Each row links into
 * the workspace at /works/{project}/{work}; create POSTs to
 * /works/{project} and the server redirects into the new workspace.
 */

interface WorkRow {
    id: number;
    title: string;
    slug: string;
    type: string;
    status: string;
    logline: string | null;
    word_count: number;
    target_words: number | null;
    sections_count: number;
    updated_at: string | null;
}

interface WritingIndexProps {
    project: { id: number; name: string; slug: string };
    works: WorkRow[];
    types: string[];
    can: { create: boolean };
    [key: string]: unknown;
}

/* ── Theme styles ── */

const subtitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const mutedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const metaText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

// Surface, border, radius, and hover shadow come from the shared
// `.alex-dash-row` class (components/dashboard.css) — :hover can't be
// expressed inline, and the class keeps the treatment consistent with
// the dashboard's project rows.
const workCardStyle: CSSProperties = {
    display: 'block',
    color: 'var(--theme-base-content)',
    padding: '1.25rem',
    textDecoration: 'none',
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

const typeLabelStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const emptyStateStyle: CSSProperties = {
    background: 'var(--theme-surface-card)',
    border: '1px dashed var(--theme-neutral-300)',
    borderRadius: 'var(--theme-radius-card)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function WritingIndex() {
    const t = useT();
    const { project, works, types, can } = usePage<WritingIndexProps>().props;
    const [createOpen, setCreateOpen] = useState(false);

    // Smaller hero tile on mobile so it doesn't claim a quarter of the
    // hero row alongside the heading — same breakpoint AI Hub uses.
    const isMobileWriting = useMediaQuery('(max-width: 1023px)');

    return (
        <AppLayout title={`${t('writing.index.title')} - ${project.name}`} immersive>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: t('writing.index.title') },
                ]}
                actions={
                    can.create ? (
                        <Button
                            icon="fa-solid fa-plus"
                            iconPosition="before"
                            onClick={() => setCreateOpen(true)}
                        >
                            {t('writing.index.create')}
                        </Button>
                    ) : undefined
                }
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <IconTile
                        icon="fa-solid fa-feather-pointed"
                        color="accent"
                        variant="solid"
                        animation="beat-fade"
                        size={isMobileWriting ? 'sm' : 'lg'}
                        animationStyle={{
                            // Slow ambient pulse, matching the Notes/AI
                            // dashboard heroes — presence, not alarm.
                            '--fa-animation-duration': '2.5s',
                            '--fa-beat-fade-opacity': '0.8',
                            '--fa-beat-fade-scale': '1.075',
                        } as CSSProperties}
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                            {t('writing.index.title')}
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm" style={subtitleStyle}>
                            {t('writing.index.intro').replace(':project', project.name)}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="container mx-auto max-w-7xl px-4 py-8">
                {works.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm italic" style={emptyStateStyle}>
                        {t('writing.index.empty')}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {works.map((work) => (
                            <WorkCard key={work.id} work={work} projectSlug={project.slug} t={t} />
                        ))}
                    </div>
                )}
            </div>

            {createOpen && (
                <CreateWorkModal
                    projectSlug={project.slug}
                    types={types}
                    onClose={() => setCreateOpen(false)}
                />
            )}
        </AppLayout>
    );
}

function WorkCard({
    work,
    projectSlug,
    t,
}: {
    work: WorkRow;
    projectSlug: string;
    t: Translator;
}) {
    const wordCount = work.target_words !== null
        ? `${t('writing.index.words').replace(':count', work.word_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', work.target_words.toLocaleString())}`
        : t('writing.index.words').replace(':count', work.word_count.toLocaleString());

    return (
        <Link
            href={`/works/${projectSlug}/${work.slug}`}
            className="alex-dash-row"
            style={workCardStyle}
        >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span style={typeLabelStyle}>{t(`writing.types.${work.type}`, work.type)}</span>
                <span style={statusChipStyle}>{t(`writing.statuses.${work.status}`, work.status)}</span>
            </div>
            <h2 className="alex-dash-row-title mt-1.5 text-lg font-bold">{work.title}</h2>
            {work.logline && (
                <p className="mt-1 text-sm" style={mutedText}>
                    {work.logline}
                </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 text-xs" style={metaText}>
                <span>{wordCount}</span>
                <span aria-hidden="true">·</span>
                <span>{t('writing.index.sections').replace(':count', work.sections_count.toLocaleString())}</span>
                {work.updated_at && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span>
                            {t('writing.index.updated').replace(
                                ':date',
                                new Date(work.updated_at).toLocaleDateString(),
                            )}
                        </span>
                    </>
                )}
            </div>
        </Link>
    );
}

function CreateWorkModal({
    projectSlug,
    types,
    onClose,
}: {
    projectSlug: string;
    types: string[];
    onClose: () => void;
}) {
    const t = useT();
    const form = useForm({
        title: '',
        type: types[0] ?? 'novel',
        logline: '',
    });

    function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // No onSuccess close — the server redirects straight into the
        // new workspace, so the modal unmounts with the page.
        form.post(`/works/${projectSlug}`);
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader title={t('writing.form.create_title')} onClose={onClose} />
            <form onSubmit={submit}>
                <div className="flex flex-col gap-4 px-6 py-5">
                    {/* Validation errors surface as poppers anchored to
                        the field (error border stays on the control, the
                        inline message is suppressed); editing the field
                        clears its error, which dismisses the popper. */}
                    <Tooltip
                        content={form.errors.title}
                        open={!!form.errors.title}
                        tone="error"
                        placement="top-end"
                    >
                        <Input
                            label={t('writing.form.title')}
                            name="title"
                            value={form.data.title}
                            onChange={(e) => {
                                form.setData('title', e.target.value);
                                if (form.errors.title) {
                                    form.clearErrors('title');
                                }
                            }}
                            error={form.errors.title}
                            hideErrorText
                            autoFocus
                            required
                            size="md"
                        />
                    </Tooltip>
                    <Tooltip
                        content={form.errors.type}
                        open={!!form.errors.type}
                        tone="error"
                        placement="right"
                    >
                        <Select
                            label={t('writing.form.type')}
                            name="type"
                            value={form.data.type}
                            onChange={(e) => {
                                form.setData('type', e.target.value);
                                if (form.errors.type) {
                                    form.clearErrors('type');
                                }
                            }}
                            error={form.errors.type}
                            hideErrorText
                            options={types.map((type) => ({
                                value: type,
                                label: t(`writing.types.${type}`, type),
                            }))}
                            size="md"
                        />
                    </Tooltip>
                    <Textarea
                        label={t('writing.form.logline')}
                        name="logline"
                        value={form.data.logline}
                        onChange={(e) => form.setData('logline', e.target.value)}
                        error={form.errors.logline}
                        hint={t('writing.form.logline_help')}
                        rows={2}
                        size="md"
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button type="submit" loading={form.processing}>
                        {t('writing.form.create')}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
