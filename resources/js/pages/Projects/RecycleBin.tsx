import { Head, usePage, router } from '@inertiajs/react';
import { type CSSProperties } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import ActionButton from '@alexandria/components/ui/ActionButton';
import useT from '@alexandria/hooks/useT';
import type { RecycleBinProps, TrashedEntry } from '@alexandria/types/projects';

/* ── Theme styles ── */

const fadedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};
const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};
const rowBorder: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};
const blueprintBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
};

export default function RecycleBin() {
    const t = useT();
    const { project, entries } = usePage<RecycleBinProps>().props;

    function handleRestore(entry: TrashedEntry) {
        router.post(
            `/p/${project.slug}/recycle-bin/${entry.slug}/restore`,
            {},
            { preserveScroll: true },
        );
    }

    return (
        <AppLayout>
            <Head title={`${t('nav.recycle_bin')} — ${project.name}`} />

            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: t('nav.recycle_bin') },
                ]}
            >
                <div className="flex items-center gap-3">
                    <i
                        className="fa-solid fa-trash-can text-xl"
                        style={fadedText}
                        aria-hidden="true"
                    />
                    <div>
                        <h1
                            className="text-xl font-semibold"
                            style={{ color: 'var(--theme-base-content)' }}
                        >
                            {t('nav.recycle_bin')}
                        </h1>
                        <p className="mt-0.5 text-sm" style={fadedText}>
                            {project.name}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="mx-auto max-w-4xl px-4 py-8">
                {entries.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div
                        className="overflow-hidden rounded-lg"
                        style={{
                            border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                            background: 'var(--theme-base-surface)',
                        }}
                    >
                        {/* Header row */}
                        <div
                            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                            style={{ ...subtleText, ...rowBorder }}
                        >
                            <span>Entry</span>
                            <span>Blueprint</span>
                            <span>Deleted</span>
                            <span />
                        </div>

                        {entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3"
                                style={rowBorder}
                            >
                                <span
                                    className="truncate font-medium"
                                    style={{ color: 'var(--theme-base-content)' }}
                                >
                                    {entry.name}
                                </span>

                                <span style={blueprintBadgeStyle}>
                                    {entry.blueprint.icon && (
                                        <i
                                            className={entry.blueprint.icon}
                                            aria-hidden="true"
                                        />
                                    )}
                                    {entry.blueprint.name ?? '—'}
                                </span>

                                <span className="whitespace-nowrap text-sm" style={fadedText}>
                                    {entry.deleted_at_human}
                                </span>

                                <ActionButton
                                    label="Restore"
                                    icon="fa-solid fa-rotate-left"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestore(entry)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)' }}
            >
                <i
                    className="fa-solid fa-trash-can text-2xl"
                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 25%, transparent)' }}
                    aria-hidden="true"
                />
            </div>
            <p
                className="text-sm"
                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}
            >
                No deleted entries
            </p>
        </div>
    );
}
