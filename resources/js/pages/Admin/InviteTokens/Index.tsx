import { router, useForm, usePage } from '@inertiajs/react';
import { type ReactNode, type SubmitEvent, useState } from 'react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Invite Tokens → index — Stage 8c.E.4.
 *
 * Lists usable + revoked/exhausted tokens with the shareable
 * /register?token=... URL for each. Create-form mints new codes;
 * row actions revoke (preserve audit) or hard-delete.
 *
 * Active when `instance_settings.open_registration` is OFF; the
 * banner at the top reminds operators which mode they're in so
 * they don't generate tokens needlessly in open mode.
 */

interface TokenRow {
    id: number;
    code: string;
    max_uses: number;
    uses_count: number;
    uses_remaining: number;
    expires_at: string | null;
    is_usable: boolean;
    is_expired: boolean;
    is_exhausted: boolean;
    notes: string | null;
    created_at: string | null;
    creator: { id: number; name: string; display_name: string | null } | null;
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Paginator<T> {
    data: T[];
    current_page: number;
    last_page: number;
    links: PaginatorLink[];
}

interface IndexProps {
    tokens: Paginator<TokenRow>;
    registerUrl: string;
    [key: string]: unknown;
}

export default function AdminInviteTokensIndex() {
    const t = useT();
    const props = usePage<IndexProps>().props;
    const [createOpen, setCreateOpen] = useState(false);

    return (
        <AdminLayout title={t('admin.invite_tokens.title')} activeKey="invite-tokens">
            <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {t('admin.invite_tokens.title')}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {t('admin.invite_tokens.subtitle')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                >
                    <i className="fa-solid fa-plus text-[10px]" aria-hidden="true" />
                    {t('admin.invite_tokens.create')}
                </button>
            </header>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-2 font-medium">{t('admin.invite_tokens.col.code')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.invite_tokens.col.uses')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.invite_tokens.col.expires')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.invite_tokens.col.status')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.invite_tokens.col.notes')}</th>
                            <th className="px-4 py-2 font-medium">{t('admin.invite_tokens.col.created')}</th>
                            <th className="px-4 py-2 font-medium">&nbsp;</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {props.tokens.data.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                                    {t('admin.invite_tokens.empty')}
                                </td>
                            </tr>
                        ) : (
                            props.tokens.data.map((row) => (
                                <TokenRowTr key={row.id} row={row} registerUrl={props.registerUrl} t={t} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {createOpen && <CreateTokenModal onClose={() => setCreateOpen(false)} />}
        </AdminLayout>
    );
}

function TokenRowTr({
    row,
    registerUrl,
    t,
}: {
    row: TokenRow;
    registerUrl: string;
    t: ReturnType<typeof useT>;
}) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${registerUrl}?token=${row.code}`;

    function copyShareUrl() {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    function revoke() {
        if (!confirm(t('admin.invite_tokens.action.revoke_confirm'))) return;
        router.post(`/admin/invite-tokens/${row.id}/revoke`, {}, { preserveScroll: true });
    }

    function destroy() {
        if (!confirm(t('admin.invite_tokens.action.delete_confirm'))) return;
        router.delete(`/admin/invite-tokens/${row.id}`, { preserveScroll: true });
    }

    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <td className="px-4 py-2">
                <button
                    type="button"
                    onClick={copyShareUrl}
                    className="group flex items-center gap-1.5 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                    title={shareUrl}
                >
                    <span>{row.code}</span>
                    <i
                        className={`fa-solid ${copied ? 'fa-check text-emerald-600' : 'fa-copy text-zinc-400 opacity-0 group-hover:opacity-100'} text-[10px] transition-opacity`}
                        aria-hidden="true"
                    />
                </button>
            </td>
            <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                {row.uses_count} / {row.max_uses}
            </td>
            <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : '—'}
            </td>
            <td className="px-4 py-2">
                {row.is_usable ? (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {t('admin.invite_tokens.status.usable')}
                    </span>
                ) : row.is_exhausted ? (
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {t('admin.invite_tokens.status.exhausted')}
                    </span>
                ) : (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {t('admin.invite_tokens.status.expired')}
                    </span>
                )}
            </td>
            <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                {row.notes ? row.notes : <span className="italic text-zinc-400 dark:text-zinc-600">—</span>}
            </td>
            <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                {row.creator && (
                    <p className="text-[10px]">{row.creator.display_name || row.creator.name}</p>
                )}
            </td>
            <td className="px-4 py-2 text-right">
                {row.is_usable && (
                    <button
                        type="button"
                        onClick={revoke}
                        className="mr-2 text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
                    >
                        {t('admin.invite_tokens.action.revoke')}
                    </button>
                )}
                <button
                    type="button"
                    onClick={destroy}
                    className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200"
                >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
            </td>
        </tr>
    );
}

function CreateTokenModal({ onClose }: { onClose: () => void }) {
    const t = useT();
    const form = useForm({
        max_uses: 1,
        expires_in_days: null as number | null,
        notes: '',
    });

    function submit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        form.post('/admin/invite-tokens', {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.invite_tokens.create')}
                </h2>
                <form onSubmit={submit} className="space-y-3">
                    <Field
                        label={t('admin.invite_tokens.field.max_uses')}
                        hint={t('admin.invite_tokens.field.max_uses_hint')}
                        error={form.errors.max_uses}
                    >
                        <input
                            type="number"
                            min={1}
                            max={1000}
                            value={form.data.max_uses}
                            onChange={(e) => form.setData('max_uses', Number(e.target.value))}
                            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                    </Field>
                    <Field
                        label={t('admin.invite_tokens.field.expires_in_days')}
                        hint={t('admin.invite_tokens.field.expires_in_days_hint')}
                        error={form.errors.expires_in_days}
                    >
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={form.data.expires_in_days ?? ''}
                            onChange={(e) =>
                                form.setData(
                                    'expires_in_days',
                                    e.target.value ? Number(e.target.value) : null,
                                )
                            }
                            placeholder={t('admin.invite_tokens.field.never_expires')}
                            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                    </Field>
                    <Field label={t('admin.invite_tokens.field.notes')} error={form.errors.notes}>
                        <textarea
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            rows={2}
                            placeholder={t('admin.invite_tokens.field.notes_placeholder')}
                            className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                    </Field>
                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                        >
                            {t('admin.invite_tokens.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({
    label,
    hint,
    error,
    children,
}: {
    label: string;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
            {hint && <p className="mb-1 text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</p>}
            {children}
            {error && <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">{error}</span>}
        </label>
    );
}
