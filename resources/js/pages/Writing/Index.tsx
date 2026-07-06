import { useForm, usePage } from '@inertiajs/react';
import { useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
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

import WorkCard, { type WorkRow } from './Sections/WorkCard';
import WorkSettingsModal, { type LengthPlanOption } from './Sections/WorkSettingsModal';

/**
 * Writing dashboard → index — Stage 8g.1 (Plan 2 Task 5).
 *
 * Lists a project's works (newest-updated first, ordering comes from
 * the server) and hosts the create-work modal. Each row links into
 * the workspace at /works/{project}/{work}; create POSTs to
 * /works/{project} and the server redirects into the new workspace.
 */

interface WritingIndexProps {
    project: { id: number; name: string; slug: string };
    works: WorkRow[];
    types: string[];
    lengthPlans: LengthPlanOption[];
    can: { create: boolean };
    [key: string]: unknown;
}

/* ── Theme styles ── */

const subtitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const emptyStateStyle: CSSProperties = {
    background: 'var(--theme-surface-card)',
    border: '1px dashed var(--theme-neutral-300)',
    borderRadius: 'var(--theme-radius-card)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const groupHeaderStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function WritingIndex() {
    const t = useT();
    const { project, works, types, lengthPlans, can } = usePage<WritingIndexProps>().props;
    const [createOpen, setCreateOpen] = useState(false);
    const [settingsWork, setSettingsWork] = useState<WorkRow | null>(null);

    // Smaller hero tile on mobile so it doesn't claim a quarter of the
    // hero row alongside the heading — same breakpoint AI Hub uses.
    const isMobileWriting = useMediaQuery('(max-width: 1023px)');

    return (
        <AppLayout title={`${t('writing.index.title')} - ${project.name}`} immersive fabActions={null}>
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
                    /* Group works by franchise breadcrumb; named groups first, Standalone last */
                    (() => {
                        const groupMap = new Map<string | null, WorkRow[]>();
                        for (const work of works) {
                            const key = work.group ?? null;
                            if (!groupMap.has(key)) groupMap.set(key, []);
                            groupMap.get(key)!.push(work);
                        }
                        const groups = [...groupMap.entries()].sort(([a], [b]) => {
                            if (a === null) return 1;
                            if (b === null) return -1;
                            return a.localeCompare(b);
                        });
                        return (
                            <div className="flex flex-col gap-6">
                                {groups.map(([groupKey, groupWorks]) => (
                                    <div key={groupKey ?? '__standalone'}>
                                        <h2
                                            className="mb-2 text-xs font-semibold uppercase tracking-wide"
                                            style={groupHeaderStyle}
                                        >
                                            {groupKey ?? t('writing.dashboard.ungrouped')}
                                        </h2>
                                        <div className="flex flex-col gap-3">
                                            {groupWorks.map((work) => (
                                                <WorkCard
                                                    key={work.id}
                                                    work={work}
                                                    projectSlug={project.slug}
                                                    t={t}
                                                    // can.create as the per-work gate proxy (v1) —
                                                    // index carries no per-work abilities yet.
                                                    onSettings={can.create ? () => setSettingsWork(work) : undefined}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()
                )}
            </div>

            {createOpen && (
                <CreateWorkModal
                    projectSlug={project.slug}
                    types={types}
                    onClose={() => setCreateOpen(false)}
                />
            )}

            {settingsWork !== null && (
                <WorkSettingsModal
                    project={project}
                    work={{ ...settingsWork, length_plan: settingsWork.length_plan ?? null }}
                    types={types}
                    lengthPlans={lengthPlans}
                    onClose={() => setSettingsWork(null)}
                />
            )}
        </AppLayout>
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

    function submit() {
        // No onSuccess close — the server redirects straight into the
        // new workspace, so the modal unmounts with the page.
        form.post(`/works/${projectSlug}`);
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader title={t('writing.form.create_title')} onClose={onClose} />
            {/* noValidate: the server validates `required`; without it
                Chrome's native constraint bubble fires before submit and
                the error poppers never get a chance. */}
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
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
