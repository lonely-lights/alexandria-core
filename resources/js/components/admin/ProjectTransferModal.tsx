import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

/**
 * Project ownership transfer modal — Stage 8c.C.
 *
 * Search-as-you-type combobox against /admin/users-search.
 * Submitting POSTs to /admin/projects/{id}/transfer with the
 * selected user id. The server validates exists:users,id and
 * rejects same-owner attempts with a flash error.
 *
 * Search debounce: 200ms. Returns up to 10 results per query.
 * Current owner is filtered out client-side to avoid the obvious
 * "transfer to yourself" pick.
 */

interface UserSuggestion {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
}

interface ProjectTransferModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    currentOwnerId: number | null;
}

export default function ProjectTransferModal({
    open,
    onClose,
    projectId,
    currentOwnerId,
}: ProjectTransferModalProps) {
    const t = useT();
    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
    const [selected, setSelected] = useState<UserSuggestion | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Reset state every time the modal opens
    useEffect(() => {
        if (open) {
            setSearch('');
            setSuggestions([]);
            setSelected(null);
            setLoading(false);
        }
    }, [open]);

    // Debounced search against the JSON endpoint
    useEffect(() => {
        if (!open) return;
        const query = search.trim();
        if (query === '') {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/admin/users-search?q=${encodeURIComponent(query)}`, {
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) {
                    setSuggestions([]);
                    return;
                }
                const data = (await res.json()) as { users: UserSuggestion[] };
                setSuggestions(
                    data.users.filter((u) => u.id !== currentOwnerId),
                );
            } catch {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [search, open, currentOwnerId]);

    const submit = useCallback(() => {
        if (!selected) return;
        setSubmitting(true);
        router.post(
            `/admin/projects/${projectId}/transfer`,
            { new_owner_id: selected.id },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSubmitting(false);
                    onClose();
                },
            },
        );
    }, [selected, projectId, onClose]);

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
            <div className="p-5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.projects.transfer.title')}
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.projects.transfer.subtitle')}
                </p>

                <div className="mt-4">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {t('admin.projects.transfer.search_label')}
                    </label>
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setSelected(null);
                        }}
                        placeholder={t('admin.projects.transfer.search_placeholder')}
                        className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                        autoFocus
                    />
                </div>

                {/* Suggestions list */}
                <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-zinc-100 dark:border-zinc-800">
                    {loading ? (
                        <p className="px-3 py-4 text-center text-xs italic text-zinc-500 dark:text-zinc-400">
                            {t('admin.projects.transfer.searching')}
                        </p>
                    ) : suggestions.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                            {search.trim() === ''
                                ? t('admin.projects.transfer.type_to_search')
                                : t('admin.projects.transfer.no_matches')}
                        </p>
                    ) : (
                        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {suggestions.map((u) => {
                                const isSelected = selected?.id === u.id;
                                return (
                                    <li key={u.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelected(u)}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                                                isSelected
                                                    ? 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100'
                                                    : 'text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    {u.display_name || u.name}
                                                </p>
                                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                                    {u.email}
                                                </p>
                                            </div>
                                            {isSelected && (
                                                <i
                                                    className="fa-solid fa-check text-xs text-rose-600 dark:text-rose-400"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!selected || submitting}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-400"
                    >
                        {submitting
                            ? t('common.saving')
                            : t('admin.projects.transfer.submit')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
