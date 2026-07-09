import { Head, usePage, router } from '@inertiajs/react';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import ActionButton from '@alexandria/components/ui/ActionButton';
import useT from '@alexandria/hooks/useT';
import type { RecycleBinProps, TrashedEntry } from '@alexandria/types/projects';

/* ── Theme token styles ── */

const fadedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const rowBorder: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const tableCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'var(--theme-base-surface)',
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

const iconBoxStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: '0.75rem',
    flexShrink: 0,
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    color: 'var(--theme-base-content)',
    outline: 'none',
};

export default function RecycleBin() {
    const t = useT();
    const { project, entries } = usePage<RecycleBinProps>().props;

    const [search, setSearch] = useState('');
    const [blueprintFilter, setBlueprintFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const selectAllRef = useRef<HTMLInputElement>(null);

    /* Unique blueprints derived from loaded entries for the filter dropdown */
    const uniqueBlueprints = useMemo(() => {
        const map = new Map<string, { name: string; slug: string }>();
        entries.forEach((e) => {
            if (e.blueprint.slug) {
                map.set(e.blueprint.slug, {
                    name: e.blueprint.name ?? e.blueprint.slug,
                    slug: e.blueprint.slug,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [entries]);

    /* Client-side filtered view */
    const filteredEntries = useMemo(() => {
        let result = entries;
        const q = search.trim().toLowerCase();
        if (q) {
            result = result.filter((e) => e.name.toLowerCase().includes(q));
        }
        if (blueprintFilter) {
            result = result.filter((e) => e.blueprint.slug === blueprintFilter);
        }
        return result;
    }, [entries, search, blueprintFilter]);

    const allVisibleSelected =
        filteredEntries.length > 0 && filteredEntries.every((e) => selectedIds.includes(e.id));

    const someVisibleSelected =
        !allVisibleSelected && filteredEntries.some((e) => selectedIds.includes(e.id));

    /* Drive the indeterminate attribute on the select-all checkbox */
    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someVisibleSelected;
        }
    }, [someVisibleSelected]);

    /* Clear selections when the active filter changes so stale ids don't linger */
    useEffect(() => {
        setSelectedIds([]);
    }, [search, blueprintFilter]);

    function toggleSelectAll() {
        if (allVisibleSelected) {
            const visibleSet = new Set(filteredEntries.map((e) => e.id));
            setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
        } else {
            const visibleIds = filteredEntries.map((e) => e.id);
            setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
        }
    }

    function toggleSelect(id: number) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    function handleRestore(entry: TrashedEntry) {
        router.post(
            `/p/${project.slug}/recycle-bin/${entry.slug}/restore`,
            {},
            { preserveScroll: true },
        );
    }

    function handleRestoreSelected() {
        router.post(
            `/p/${project.slug}/recycle-bin/restore`,
            { ids: selectedIds },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedIds([]),
            },
        );
    }

    const summaryLabel =
        entries.length === 1
            ? t('entries.recycle_bin.summary.singular', { count: 1 })
            : t('entries.recycle_bin.summary.plural', { count: entries.length });

    return (
        <AppLayout>
            <Head title={`${t('nav.recycle_bin')} — ${project.name}`} />

            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: t('nav.recycle_bin') },
                ]}
            >
                <div className="flex items-center gap-4">
                    <div
                        className="flex h-10 w-10 items-center justify-center"
                        style={iconBoxStyle}
                    >
                        <i
                            className="fa-solid fa-trash-can text-lg"
                            style={fadedText}
                            aria-hidden="true"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1
                            className="font-serif text-3xl font-bold leading-tight tracking-tight md:text-4xl"
                            style={{ color: 'var(--theme-base-content)' }}
                        >
                            {t('nav.recycle_bin')}
                        </h1>
                        <p className="mt-1 text-sm" style={fadedText}>
                            {summaryLabel}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="container mx-auto max-w-7xl px-4 py-8">
                {entries.length === 0 ? (
                    <EmptyState label={t('entries.recycle_bin.empty')} />
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            {/* Name search */}
                            <div className="relative min-w-56 flex-1">
                                <i
                                    className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                                    style={subtleText}
                                    aria-hidden="true"
                                />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('entries.recycle_bin.search_placeholder')}
                                    className="w-full rounded-md py-1.5 pl-8 pr-3 text-sm"
                                    style={inputStyle}
                                />
                            </div>

                            {/* Blueprint filter — only shown when 2+ distinct blueprints are present */}
                            {uniqueBlueprints.length > 1 && (
                                <select
                                    value={blueprintFilter}
                                    onChange={(e) => setBlueprintFilter(e.target.value)}
                                    className="rounded-md px-2.5 py-1.5 text-sm"
                                    style={inputStyle}
                                >
                                    <option value="">
                                        {t('entries.recycle_bin.filter.all_blueprints')}
                                    </option>
                                    {uniqueBlueprints.map((bp) => (
                                        <option key={bp.slug} value={bp.slug}>
                                            {bp.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Restore Selected — right-aligned, disabled until a row is checked */}
                            <ActionButton
                                label={
                                    selectedIds.length > 0
                                        ? t('entries.recycle_bin.restore_selected_count', {
                                              count: selectedIds.length,
                                          })
                                        : t('entries.recycle_bin.restore_selected')
                                }
                                icon="fa-solid fa-rotate-left"
                                variant="ghost"
                                size="sm"
                                disabled={selectedIds.length === 0}
                                onClick={handleRestoreSelected}
                            />
                        </div>

                        {/* Table card */}
                        <div className="overflow-hidden rounded-lg" style={tableCardStyle}>
                            {/* Header row */}
                            <div
                                className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                                style={{ ...subtleText, ...rowBorder }}
                            >
                                <input
                                    ref={selectAllRef}
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAll}
                                    aria-label={t('entries.recycle_bin.col.select_all')}
                                    className="rounded"
                                />
                                <span>{t('entries.recycle_bin.col.entry')}</span>
                                <span>{t('entries.recycle_bin.col.blueprint')}</span>
                                <span>{t('entries.recycle_bin.col.deleted')}</span>
                                <span />
                            </div>

                            {filteredEntries.length === 0 ? (
                                <div
                                    className="px-4 py-6 text-center text-sm"
                                    style={fadedText}
                                >
                                    {t('entries.recycle_bin.no_results')}
                                </div>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3"
                                        style={rowBorder}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(entry.id)}
                                            onChange={() => toggleSelect(entry.id)}
                                            aria-label={`Select ${entry.name}`}
                                            className="rounded"
                                        />

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

                                        <span
                                            className="whitespace-nowrap text-sm"
                                            style={fadedText}
                                        >
                                            {entry.deleted_at_human}
                                        </span>

                                        <ActionButton
                                            label={t('entries.recycle_bin.restore')}
                                            icon="fa-solid fa-rotate-left"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRestore(entry)}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                    background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
                }}
            >
                <i
                    className="fa-solid fa-trash-can text-2xl"
                    style={{
                        color: 'color-mix(in srgb, var(--theme-base-content) 25%, transparent)',
                    }}
                    aria-hidden="true"
                />
            </div>
            <p
                className="text-sm"
                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}
            >
                {label}
            </p>
        </div>
    );
}
