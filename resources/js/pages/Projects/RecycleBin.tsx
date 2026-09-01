import { Head, usePage, router } from '@inertiajs/react';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import ActionButton from '@alexandria/components/ui/ActionButton';
import useT from '@alexandria/hooks/useT';
import {
    projectUrl,
    recycleBinRestoreMixedUrl,
    recycleBinSectionRestoreUrl,
    recycleBinUrl,
    recycleBinWorkRestoreUrl,
} from '@alexandria/lib/urls';
import type { RecycleBinItem, RecycleBinItemType, RecycleBinProps } from '@alexandria/types/projects';

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

const typeBadgeStyles: Record<RecycleBinItemType, CSSProperties> = {
    entry: {
        background: 'var(--theme-brand-primary-500)',
        color: 'var(--theme-brand-primary-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
    work: {
        background: 'var(--theme-brand-secondary-700)',
        color: 'var(--theme-brand-secondary-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
    section: {
        background: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
        color: 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
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

/** Composite key so entries/works/sections with the same numeric id never collide in selection state. */
function itemKey(item: RecycleBinItem): string {
    return `${item.type}:${item.id}`;
}

export default function RecycleBin() {
    const t = useT();
    const { project, items } = usePage<RecycleBinProps>().props;

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'' | RecycleBinItemType>('');
    const [blueprintFilter, setBlueprintFilter] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

    const selectAllRef = useRef<HTMLInputElement>(null);

    /* Unique blueprints derived from loaded entry rows for the filter dropdown */
    const uniqueBlueprints = useMemo(() => {
        const map = new Map<string, { name: string; slug: string }>();
        items.forEach((item) => {
            if (item.blueprint?.slug) {
                map.set(item.blueprint.slug, {
                    name: item.blueprint.name ?? item.blueprint.slug,
                    slug: item.blueprint.slug,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    /* Client-side filtered view */
    const filteredItems = useMemo(() => {
        let result = items;
        const q = search.trim().toLowerCase();
        if (q) {
            result = result.filter((item) => item.name.toLowerCase().includes(q));
        }
        if (typeFilter) {
            result = result.filter((item) => item.type === typeFilter);
        }
        if (blueprintFilter) {
            result = result.filter((item) => item.blueprint?.slug === blueprintFilter);
        }
        return result;
    }, [items, search, typeFilter, blueprintFilter]);

    const allVisibleSelected =
        filteredItems.length > 0 && filteredItems.every((item) => selectedKeys.includes(itemKey(item)));

    const someVisibleSelected =
        !allVisibleSelected && filteredItems.some((item) => selectedKeys.includes(itemKey(item)));

    /* Drive the indeterminate attribute on the select-all checkbox */
    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someVisibleSelected;
        }
    }, [someVisibleSelected]);

    /* Clear selections when the active filter changes so stale keys don't linger */
    useEffect(() => {
        setSelectedKeys([]);
    }, [search, typeFilter, blueprintFilter]);

    function toggleSelectAll() {
        if (allVisibleSelected) {
            const visibleSet = new Set(filteredItems.map(itemKey));
            setSelectedKeys((prev) => prev.filter((key) => !visibleSet.has(key)));
        } else {
            const visibleKeys = filteredItems.map(itemKey);
            setSelectedKeys((prev) => [...new Set([...prev, ...visibleKeys])]);
        }
    }

    function toggleSelect(item: RecycleBinItem) {
        const key = itemKey(item);
        setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
    }

    function handleRestore(item: RecycleBinItem) {
        const url =
            item.type === 'entry'
                ? `${recycleBinUrl(project.slug)}/${item.slug}/restore`
                : item.type === 'work'
                  ? recycleBinWorkRestoreUrl(project.slug, item.slug ?? String(item.id))
                  : recycleBinSectionRestoreUrl(project.slug, item.id);

        router.post(url, {}, { preserveScroll: true });
    }

    function handleRestoreSelected() {
        const selectedSet = new Set(selectedKeys);
        const selectedItems = items.filter((item) => selectedSet.has(itemKey(item)));

        router.post(
            recycleBinRestoreMixedUrl(project.slug),
            { items: selectedItems.map((item) => ({ type: item.type, id: item.id })) },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedKeys([]),
            },
        );
    }

    const summaryLabel =
        items.length === 1
            ? t('entries.recycle_bin.summary.singular').replace(':count', '1')
            : t('entries.recycle_bin.summary.plural').replace(':count', String(items.length));

    return (
        <AppLayout>
            <Head title={`${t('nav.recycle_bin')} — ${project.name}`} />

            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: projectUrl(project.slug) },
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
                {items.length === 0 ? (
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

                            {/* Type filter */}
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as '' | RecycleBinItemType)}
                                className="rounded-md px-2.5 py-1.5 text-sm"
                                style={inputStyle}
                            >
                                <option value="">{t('entries.recycle_bin.filter.all_types')}</option>
                                <option value="entry">{t('entries.recycle_bin.type.entry')}</option>
                                <option value="work">{t('entries.recycle_bin.type.work')}</option>
                                <option value="section">{t('entries.recycle_bin.type.section')}</option>
                            </select>

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
                                    selectedKeys.length > 0
                                        ? t('entries.recycle_bin.restore_selected_count').replace(
                                              ':count',
                                              String(selectedKeys.length),
                                          )
                                        : t('entries.recycle_bin.restore_selected')
                                }
                                icon="fa-solid fa-rotate-left"
                                variant="ghost"
                                size="sm"
                                disabled={selectedKeys.length === 0}
                                onClick={handleRestoreSelected}
                            />
                        </div>

                        {/* Table card */}
                        <div className="overflow-hidden rounded-lg" style={tableCardStyle}>
                            {/* Header row */}
                            <div
                                className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
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
                                <span>{t('entries.recycle_bin.col.type')}</span>
                                <span>{t('entries.recycle_bin.col.entry')}</span>
                                <span>{t('entries.recycle_bin.col.context')}</span>
                                <span>{t('entries.recycle_bin.col.deleted')}</span>
                                <span />
                            </div>

                            {filteredItems.length === 0 ? (
                                <div
                                    className="px-4 py-6 text-center text-sm"
                                    style={fadedText}
                                >
                                    {t('entries.recycle_bin.no_results')}
                                </div>
                            ) : (
                                filteredItems.map((item) => (
                                    <div
                                        key={itemKey(item)}
                                        className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3"
                                        style={rowBorder}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedKeys.includes(itemKey(item))}
                                            onChange={() => toggleSelect(item)}
                                            aria-label={`Select ${item.name}`}
                                            className="rounded"
                                        />

                                        <span
                                            className="whitespace-nowrap px-2 py-0.5 text-xs"
                                            style={typeBadgeStyles[item.type]}
                                        >
                                            {t(`entries.recycle_bin.type.${item.type}`)}
                                        </span>

                                        <span
                                            className="truncate font-medium"
                                            style={{ color: 'var(--theme-base-content)' }}
                                        >
                                            {item.name}
                                        </span>

                                        {item.type === 'entry' ? (
                                            <span style={blueprintBadgeStyle}>
                                                {item.blueprint?.icon && (
                                                    <i
                                                        className={item.blueprint.icon}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                {item.blueprint?.name ?? '—'}
                                            </span>
                                        ) : (
                                            <span className="truncate text-sm" style={fadedText}>
                                                {item.parent ?? '—'}
                                            </span>
                                        )}

                                        <span
                                            className="whitespace-nowrap text-sm"
                                            style={fadedText}
                                        >
                                            {item.deleted_at_human}
                                        </span>

                                        <ActionButton
                                            label={t('entries.recycle_bin.restore')}
                                            icon="fa-solid fa-rotate-left"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRestore(item)}
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
