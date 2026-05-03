import { useState, useEffect, useCallback } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import Input from '@alexandria/components/form/Input';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Pagination from '@alexandria/components/ui/Pagination';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

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

export default function ArchiveTab({ projectId }: ArchiveTabProps) {
    const [items, setItems] = useState<ArchiveItem[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<ArchiveItem | null>(null);
    const [restoreBlockers, setRestoreBlockers] = useState<{ item: ArchiveItem; blockers: RestoreBlocker[] } | null>(null);
    const [restoreConfirm, setRestoreConfirm] = useState<ArchiveItem | null>(null);
    const [restoreDeps, setRestoreDeps] = useState(true);

    const fetchArchive = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('per_page', '25');
        if (search) params.set('search', search);
        if (typeFilter !== 'all') params.set('type', typeFilter);

        fetch(`/api/v1/projects/${projectId}/archive?${params}`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                setItems(data.data ?? []);
                setMeta({
                    current_page: data.current_page,
                    last_page: data.last_page,
                    per_page: data.per_page,
                    total: data.total,
                    from: data.from,
                    to: data.to,
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId, page, search, typeFilter]);

    useEffect(() => { fetchArchive(); }, [fetchArchive]);

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

    const typeBadge = (type: string) => type === 'entry' ? 'badge-primary' : 'badge-accent';

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
                            placeholder="Search archive..."
                        />
                    </div>
                    {meta && (
                        <span className="badge badge-ghost px-2 py-1.5 text-xs">
                            {meta.total} {meta.total === 1 ? 'item' : 'items'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        className="select select-bordered h-8 min-h-0 rounded-xl text-xs"
                    >
                        <option value="all">All Types</option>
                        <option value="entry">Entries</option>
                        <option value="connection">Connections</option>
                    </select>
                    {meta && meta.total > 0 && (
                        <ActionButton
                            icon="fa-solid fa-trash"
                            label="Empty Archive"
                            variant="error"
                            size="xs"
                            onClick={() => setConfirmEmpty(true)}
                        />
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="paper-board rounded-2xl border border-base-300/50">
                <div className="overflow-x-auto bg-base-100 shadow-sm" style={{ borderRadius: 'inherit' }}>
                <table className="table w-full">
                    <thead>
                        <tr className="text-xs tracking-wider [&_th]:normal-case">
                            <th className="bg-error font-semibold text-error-content first:rounded-tl-2xl">Item</th>
                            <th className="bg-error font-semibold text-error-content">Type</th>
                            <th className="bg-error font-semibold text-error-content">Status</th>
                            <th className="bg-error font-semibold text-error-content">When</th>
                            <th className="bg-error font-semibold text-error-content text-right last:rounded-tr-2xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="border-b-0">
                                    <div className="flex items-center justify-center py-12">
                                        <span className="loading loading-spinner loading-md text-base-content/30" />
                                    </div>
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="border-b-0">
                                    <div className="py-12 text-center">
                                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-base-300">
                                            <i className="fa-solid fa-box-archive text-xl text-base-content/30" />
                                        </div>
                                        <p className="font-medium text-base-content/50">Archive is empty</p>
                                        <p className="mt-1 text-sm text-base-content/30">Archived items will appear here.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            items.map((item, i) => {
                                const borderClass = i < items.length - 1 ? 'border-b border-dashed border-base-content/8' : 'border-b-0';
                                const icon = item.icon.includes(' ') ? item.icon : `fa-solid ${item.icon}`;
                                const isCascade = item.cascade_archived_by != null;
                                return (
                                    <tr key={`${item.item_type}-${item.id}`} className="group transition-colors hover:bg-base-200/30">
                                        <td className={`text-sm ${borderClass}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-300/50">
                                                    <i className={`${icon} text-xs text-base-content/40`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-base-content/60">{item.name}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs text-base-content/30">{item.description}</p>
                                                        {isCascade && (
                                                            <span className="badge badge-ghost badge-xs text-[10px]">
                                                                <i className="fa-solid fa-link mr-1 text-[8px]" />
                                                                Dependency
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`text-sm ${borderClass}`}>
                                            <span className={`badge badge-sm ${typeBadge(item.item_type)}`}>
                                                {item.item_type === 'entry' ? 'Entry' : 'Connection'}
                                            </span>
                                        </td>
                                        <td className={`text-sm ${borderClass}`}>
                                            {item.status === 'archived' ? (
                                                <span className="badge badge-warning badge-sm">Archived</span>
                                            ) : (
                                                <span className="badge badge-error badge-sm">Trashed</span>
                                            )}
                                        </td>
                                        <td className={`text-xs text-base-content/40 ${borderClass}`}>
                                            {item.actioned_at_human}
                                        </td>
                                        <td className={`text-right ${borderClass}`}>
                                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <ActionButton
                                                    icon="fa-solid fa-rotate-left"
                                                    label="Restore"
                                                    variant="success"
                                                    size="xs"
                                                    onClick={() => handleRestore(item)}
                                                />
                                                <ActionButton
                                                    icon="fa-solid fa-trash"
                                                    label="Delete"
                                                    variant="error"
                                                    size="xs"
                                                    onClick={() => setConfirmDelete(item)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
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
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
                            <i className="fa-solid fa-skull-crossbones text-xl text-error" />
                        </div>
                        <h3 className="text-lg font-bold">Permanently Delete?</h3>
                        <p className="mt-2 text-sm text-base-content/60">
                            <strong>{confirmDelete.name}</strong> will be permanently deleted. This cannot be undone.
                        </p>
                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={() => setConfirmDelete(null)} />
                            <ActionButton icon="fa-solid fa-trash" label="Delete Forever" variant="error" onClick={() => handlePermanentDelete(confirmDelete)} />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirm empty archive */}
            {confirmEmpty && (
                <Modal open onClose={() => setConfirmEmpty(false)}>
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
                            <i className="fa-solid fa-dumpster-fire text-xl text-error" />
                        </div>
                        <h3 className="text-lg font-bold">Clear Archive?</h3>
                        <p className="mt-2 text-sm text-base-content/60">
                            All {meta?.total ?? 0} items will be permanently deleted. This cannot be undone.
                        </p>
                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={() => setConfirmEmpty(false)} />
                            <ActionButton icon="fa-solid fa-dumpster-fire" label="Empty Archive" variant="error" onClick={handleEmptyArchive} />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Restore entry confirmation (with dependency checkbox) */}
            {restoreConfirm && (
                <Modal open onClose={() => setRestoreConfirm(null)}>
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                            <i className="fa-solid fa-rotate-left text-xl text-success" />
                        </div>
                        <h3 className="text-lg font-bold">Restore Entry?</h3>
                        <p className="mt-2 text-sm text-base-content/60">
                            <strong>{restoreConfirm.name}</strong> will be restored to active views.
                        </p>
                        {(restoreConfirm.dependency_count ?? 0) > 0 && (
                            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={restoreDeps}
                                    onChange={(e) => setRestoreDeps(e.target.checked)}
                                    className="checkbox checkbox-success checkbox-sm"
                                />
                                <span className="text-sm text-base-content/70">
                                    Also restore {restoreConfirm.dependency_count} archived connection{restoreConfirm.dependency_count !== 1 ? 's' : ''}
                                </span>
                            </label>
                        )}
                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton icon="fa-solid fa-xmark" label="Cancel" variant="ghost" onClick={() => setRestoreConfirm(null)} />
                            <ActionButton icon="fa-solid fa-rotate-left" label="Restore" variant="success" onClick={() => doRestore(restoreConfirm, restoreDeps)} />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Restore blocker modal */}
            {restoreBlockers && (
                <Modal open onClose={() => setRestoreBlockers(null)}>
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
                            <i className="fa-solid fa-triangle-exclamation text-xl text-warning" />
                        </div>
                        <h3 className="text-lg font-bold">Cannot Restore</h3>
                        <p className="mt-2 text-sm text-base-content/60">
                            <strong>{restoreBlockers.item.name}</strong> cannot be restored because the following entries are still archived or trashed:
                        </p>
                        <div className="mt-4 space-y-2">
                            {restoreBlockers.blockers.map((b) => (
                                <div key={b.id} className="flex items-center justify-center gap-2">
                                    <span className="font-medium">{b.name}</span>
                                    <span className={`badge badge-sm ${b.status === 'archived' ? 'badge-warning' : 'badge-error'}`}>
                                        {b.status === 'archived' ? 'Archived' : 'Trashed'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-base-content/40">
                            Restore the blocked entries first, then try again.
                        </p>
                        <div className="mt-6 flex justify-center">
                            <ActionButton icon="fa-solid fa-xmark" label="Close" variant="ghost" onClick={() => setRestoreBlockers(null)} />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
