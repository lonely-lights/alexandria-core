import { useMemo, useState, type CSSProperties } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import Input from '@alexandria/components/form/Input';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Pagination from '@alexandria/components/ui/Pagination';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { useJsonFetch } from '@alexandria/lib/fetchJson';
import useT, { type Translator } from '@alexandria/hooks/useT';

interface ArchiveItem {
    id: number;
    item_type: 'entry' | 'connection';
    status: 'archived' | 'trashed';
    name: string;
    description: string;
    icon: string;
    actioned_at: string;
    actioned_at_human: string;
    cascade_archived_by?: number | null;
    dependency_count?: number;
}

interface RestoreBlocker {
    id: number;
    name: string;
    status: 'archived' | 'trashed';
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface ArchiveTabProps {
    projectId: number;
}

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

const itemCountBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
};

const selectStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.25rem 1.75rem 0.25rem 0.625rem',
    fontSize: '0.75rem',
    height: '2rem',
    minHeight: 0,
};

const tableCardOuterStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const tableInnerStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    borderRadius: 'inherit',
    boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

// Archive table headers tint the status-error-fill so the archive
// surface reads as "destructive zone" at a glance.
const tableHeaderCellStyle: CSSProperties = {
    background: 'var(--theme-status-error-fill)',
    color: 'var(--theme-status-error-content)',
    fontWeight: 600,
};

const rowBorderDashed: CSSProperties = {
    borderBottom: '1px dashed color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const emptyIconBubbleStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: '9999px',
};

const itemIconBubbleStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
};

const typeBadgeEntryStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

const typeBadgeConnectionStyle: CSSProperties = {
    background: 'var(--theme-brand-secondary-700)',
    color: 'var(--theme-brand-secondary-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

const statusArchivedStyle: CSSProperties = {
    background: 'var(--theme-status-warning-fill)',
    color: 'var(--theme-status-warning-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

const statusTrashedStyle: CSSProperties = {
    background: 'var(--theme-status-error-fill)',
    color: 'var(--theme-status-error-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

const dependencyBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.0625rem 0.375rem',
    fontSize: '0.625rem',
    display: 'inline-flex',
    alignItems: 'center',
};

const modalIconWrapStyle = (kind: 'danger' | 'success' | 'warning'): CSSProperties => {
    const tints = {
        danger: { fill: 'color-mix(in srgb, var(--theme-status-error-fill) 25%, transparent)', stroke: 'var(--theme-status-error-stroke)' },
        success: { fill: 'color-mix(in srgb, var(--theme-status-success-fill) 25%, transparent)', stroke: 'var(--theme-status-success-stroke)' },
        warning: { fill: 'color-mix(in srgb, var(--theme-status-warning-fill) 25%, transparent)', stroke: 'var(--theme-status-warning-stroke)' },
    };
    return {
        background: tints[kind].fill,
        color: tints[kind].stroke,
        borderRadius: '9999px',
    };
};

export default function ArchiveTab({ projectId }: ArchiveTabProps) {
    const t = useT();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<ArchiveItem | null>(null);
    const [restoreBlockers, setRestoreBlockers] = useState<{ item: ArchiveItem; blockers: RestoreBlocker[] } | null>(null);
    const [restoreConfirm, setRestoreConfirm] = useState<ArchiveItem | null>(null);
    const [restoreDeps, setRestoreDeps] = useState(true);

    const url = useMemo(() => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('per_page', '25');
        if (search) params.set('search', search);
        if (typeFilter !== 'all') params.set('type', typeFilter);
        return `/api/v1/projects/${projectId}/archive?${params}`;
    }, [projectId, page, search, typeFilter]);

    const { data, loading, refetch: fetchArchive } = useJsonFetch<{
        data: ArchiveItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    }>(url);

    const items = data?.data ?? [];
    const meta: PaginationMeta | null = data ? {
        current_page: data.current_page,
        last_page: data.last_page,
        per_page: data.per_page,
        total: data.total,
        from: data.from,
        to: data.to,
    } : null;

    function handleRestore(item: ArchiveItem) {
        // Entries with dependencies get a confirm modal
        if (item.item_type === 'entry' && (item.dependency_count ?? 0) > 0) {
            setRestoreConfirm(item);
            setRestoreDeps(true);
            return;
        }

        doRestore(item, true);
    }

    function doRestore(item: ArchiveItem, restoreDependencies: boolean) {
        fetch(`/api/v1/projects/${projectId}/archive/${item.item_type}/${item.id}/restore`, {
            method: 'PUT',
            headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ restore_dependencies: restoreDependencies }),
        })
            .then(async (r) => {
                if (r.status === 409) {
                    const data = await r.json();
                    setRestoreBlockers({ item, blockers: data.blockers ?? [] });
                    return;
                }
                setRestoreConfirm(null);
                fetchArchive();
            });
    }

    function handlePermanentDelete(item: ArchiveItem) {
        fetch(`/api/v1/projects/${projectId}/archive/${item.item_type}/${item.id}`, {
            method: 'DELETE',
            headers: csrfHeaders(),
            credentials: 'same-origin',
        }).then(() => {
            setConfirmDelete(null);
            fetchArchive();
        });
    }

    function handleEmptyArchive() {
        fetch(`/api/v1/projects/${projectId}/archive`, {
            method: 'DELETE',
            headers: csrfHeaders(),
            credentials: 'same-origin',
        }).then(() => {
            setConfirmEmpty(false);
            fetchArchive();
        });
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-60">
                        <Input
                            icon="fa-solid fa-magnifying-glass"
                            size="xs"
                            defaultValue={search}
                            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                            placeholder={t('projects.archive_tab.search_placeholder')}
                        />
                    </div>
                    {meta && (
                        <span style={itemCountBadgeStyle}>
                            {meta.total === 1
                                ? t('projects.archive_tab.item_count.one').replace(':count', String(meta.total))
                                : t('projects.archive_tab.item_count.many').replace(':count', String(meta.total))}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        style={selectStyle}
                    >
                        <option value="all">{t('projects.archive_tab.filter.all')}</option>
                        <option value="entry">{t('projects.archive_tab.filter.entry')}</option>
                        <option value="connection">{t('projects.archive_tab.filter.connection')}</option>
                    </select>
                    {meta && meta.total > 0 && (
                        <ActionButton
                            icon="fa-solid fa-trash"
                            label={t('projects.archive_tab.empty_archive_btn')}
                            variant="error"
                            size="xs"
                            onClick={() => setConfirmEmpty(true)}
                        />
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="paper-board" style={tableCardOuterStyle}>
                <div className="overflow-x-auto" style={tableInnerStyle}>
                    <table className="w-full">
                        <thead>
                            <tr className="text-xs tracking-wider [&_th]:normal-case [&_th]:px-4 [&_th]:py-3">
                                <th className="first:rounded-tl-[var(--theme-radius-card)] text-left" style={tableHeaderCellStyle}>
                                    {t('projects.archive_tab.column.item')}
                                </th>
                                <th className="text-left" style={tableHeaderCellStyle}>
                                    {t('projects.archive_tab.column.type')}
                                </th>
                                <th className="text-left" style={tableHeaderCellStyle}>
                                    {t('projects.archive_tab.column.status')}
                                </th>
                                <th className="text-left" style={tableHeaderCellStyle}>
                                    {t('projects.archive_tab.column.when')}
                                </th>
                                <th className="text-right last:rounded-tr-[var(--theme-radius-card)]" style={tableHeaderCellStyle}>
                                    {t('projects.archive_tab.column.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="flex items-center justify-center py-12">
                                            <i
                                                className="fa-solid fa-circle-notch fa-spin text-lg"
                                                style={microText}
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="py-12 text-center">
                                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center" style={emptyIconBubbleStyle}>
                                                <i className="fa-solid fa-box-archive text-xl" style={microText} aria-hidden="true" />
                                            </div>
                                            <p className="font-medium" style={labelText}>
                                                {t('projects.archive_tab.empty.title')}
                                            </p>
                                            <p className="mt-1 text-sm" style={microText}>
                                                {t('projects.archive_tab.empty.subtitle')}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, i) => (
                                    <ArchiveRow
                                        key={`${item.item_type}-${item.id}`}
                                        item={item}
                                        isLast={i === items.length - 1}
                                        onRestore={() => handleRestore(item)}
                                        onDelete={() => setConfirmDelete(item)}
                                        t={t}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {meta && (
                <Pagination
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    from={meta.from}
                    to={meta.to}
                    total={meta.total}
                    onPageChange={setPage}
                />
            )}

            {/* Confirm permanent delete */}
            {confirmDelete && (
                <Modal open onClose={() => setConfirmDelete(null)}>
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center" style={modalIconWrapStyle('danger')}>
                            <i className="fa-solid fa-skull-crossbones text-xl" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-bold">{t('projects.archive_tab.delete_modal.title')}</h3>
                        <p className="mt-2 text-sm" style={bodyText}>
                            {(() => {
                                const [before, after = ''] = t('projects.archive_tab.delete_modal.body').split(':name');
                                return <>{before}<strong>{confirmDelete.name}</strong>{after}</>;
                            })()}
                        </p>
                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton icon="fa-solid fa-xmark" label={t('projects.archive_tab.delete_modal.cancel')} variant="ghost" onClick={() => setConfirmDelete(null)} />
                            <ActionButton icon="fa-solid fa-trash" label={t('projects.archive_tab.delete_modal.submit')} variant="error" onClick={() => handlePermanentDelete(confirmDelete)} />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirm empty archive */}
            {confirmEmpty && (
                <Modal open onClose={() => setConfirmEmpty(false)}>
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center" style={modalIconWrapStyle('danger')}>
                            <i className="fa-solid fa-dumpster-fire text-xl" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-bold">{t('projects.archive_tab.empty_modal.title')}</h3>
                        <p className="mt-2 text-sm" style={bodyText}>
                            {t('projects.archive_tab.empty_modal.body').replace(':count', String(meta?.total ?? 0))}
                        </p>
                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton icon="fa-solid fa-xmark" label={t('projects.archive_tab.empty_modal.cancel')} variant="ghost" onClick={() => setConfirmEmpty(false)} />
                            <ActionButton icon="fa-solid fa-dumpster-fire" label={t('projects.archive_tab.empty_modal.submit')} variant="error" onClick={handleEmptyArchive} />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Restore entry confirmation (with dependency checkbox) */}
            {restoreConfirm && (
                <Modal open onClose={() => setRestoreConfirm(null)}>
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center" style={modalIconWrapStyle('success')}>
                            <i className="fa-solid fa-rotate-left text-xl" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-bold">{t('projects.archive_tab.restore_modal.title')}</h3>
                        <p className="mt-2 text-sm" style={bodyText}>
                            {(() => {
                                const [before, after = ''] = t('projects.archive_tab.restore_modal.body').split(':name');
                                return <>{before}<strong>{restoreConfirm.name}</strong>{after}</>;
                            })()}
                        </p>
                        {(restoreConfirm.dependency_count ?? 0) > 0 && (
                            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={restoreDeps}
                                    onChange={(e) => setRestoreDeps(e.target.checked)}
                                    className="alex-checkbox"
                                />
                                <span className="text-sm" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' }}>
                                    {(restoreConfirm.dependency_count === 1
                                        ? t('projects.archive_tab.restore_modal.dep_label.one')
                                        : t('projects.archive_tab.restore_modal.dep_label.many'))
                                        .replace(':count', String(restoreConfirm.dependency_count))}
                                </span>
                            </label>
                        )}
                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton icon="fa-solid fa-xmark" label={t('projects.archive_tab.restore_modal.cancel')} variant="ghost" onClick={() => setRestoreConfirm(null)} />
                            <ActionButton icon="fa-solid fa-rotate-left" label={t('projects.archive_tab.restore_modal.submit')} variant="success" onClick={() => doRestore(restoreConfirm, restoreDeps)} />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Restore blocker modal */}
            {restoreBlockers && (
                <Modal open onClose={() => setRestoreBlockers(null)}>
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center" style={modalIconWrapStyle('warning')}>
                            <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-bold">{t('projects.archive_tab.blockers_modal.title')}</h3>
                        <p className="mt-2 text-sm" style={bodyText}>
                            {(() => {
                                const [before, after = ''] = t('projects.archive_tab.blockers_modal.body').split(':name');
                                return <>{before}<strong>{restoreBlockers.item.name}</strong>{after}</>;
                            })()}
                        </p>
                        <div className="mt-4 space-y-2">
                            {restoreBlockers.blockers.map((b) => (
                                <div key={b.id} className="flex items-center justify-center gap-2">
                                    <span className="font-medium">{b.name}</span>
                                    <span
                                        className="px-1.5 py-0.5 text-xs"
                                        style={b.status === 'archived' ? statusArchivedStyle : statusTrashedStyle}
                                    >
                                        {b.status === 'archived'
                                            ? t('projects.archive_tab.status.archived')
                                            : t('projects.archive_tab.status.trashed')}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-xs" style={fadedText}>
                            {t('projects.archive_tab.blockers_modal.footer')}
                        </p>
                        <div className="mt-6 flex justify-center">
                            <ActionButton icon="fa-solid fa-xmark" label={t('projects.archive_tab.blockers_modal.close')} variant="ghost" onClick={() => setRestoreBlockers(null)} />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/* ── Archive Row ── */

function ArchiveRow({ item, isLast, onRestore, onDelete, t }: {
    item: ArchiveItem;
    isLast: boolean;
    onRestore: () => void;
    onDelete: () => void;
    t: Translator;
}) {
    const icon = item.icon.includes(' ') ? item.icon : `fa-solid ${item.icon}`;
    const isCascade = item.cascade_archived_by != null;
    const tdBorder = isLast ? undefined : rowBorderDashed;
    const baseTdStyle: CSSProperties = { padding: '0.625rem 1rem' };

    return (
        <tr className="group">
            <td className="text-sm" style={{ ...baseTdStyle, ...tdBorder }}>
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center" style={itemIconBubbleStyle}>
                        <i className={`${icon} text-xs`} style={fadedText} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium" style={bodyText}>{item.name}</p>
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs" style={microText}>{item.description}</p>
                            {isCascade && (
                                <span style={dependencyBadgeStyle}>
                                    <i className="fa-solid fa-link mr-1 text-[8px]" aria-hidden="true" />
                                    {t('projects.archive_tab.dependency_badge')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="text-sm" style={{ ...baseTdStyle, ...tdBorder }}>
                <span
                    className="px-2 py-0.5 text-xs"
                    style={item.item_type === 'entry' ? typeBadgeEntryStyle : typeBadgeConnectionStyle}
                >
                    {item.item_type === 'entry'
                        ? t('projects.archive_tab.type.entry')
                        : t('projects.archive_tab.type.connection')}
                </span>
            </td>
            <td className="text-sm" style={{ ...baseTdStyle, ...tdBorder }}>
                <span
                    className="px-2 py-0.5 text-xs"
                    style={item.status === 'archived' ? statusArchivedStyle : statusTrashedStyle}
                >
                    {item.status === 'archived'
                        ? t('projects.archive_tab.status.archived')
                        : t('projects.archive_tab.status.trashed')}
                </span>
            </td>
            <td className="text-xs" style={{ ...baseTdStyle, ...tdBorder, ...fadedText }}>
                {item.actioned_at_human}
            </td>
            <td className="text-right" style={{ ...baseTdStyle, ...tdBorder }}>
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <ActionButton
                        icon="fa-solid fa-rotate-left"
                        label={t('projects.archive_tab.action.restore')}
                        variant="success"
                        size="xs"
                        onClick={onRestore}
                    />
                    <ActionButton
                        icon="fa-solid fa-trash"
                        label={t('projects.archive_tab.action.delete')}
                        variant="error"
                        size="xs"
                        onClick={onDelete}
                    />
                </div>
            </td>
        </tr>
    );
}
