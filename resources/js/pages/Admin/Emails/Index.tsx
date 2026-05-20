import { Link, usePage } from '@inertiajs/react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Emails → index — Stage 8e.4.C.
 *
 * Read-only catalog of branded Mailables registered via
 * BrandedMailRegistry. Click a card to drill into the show page
 * (preview + edit form land in 8e.4.D).
 *
 * Server-side discovery — packages register their Mailables; this
 * page just renders what the registry returns. Future store-receipt
 * + saas-invite mails appear automatically without UI changes.
 */
interface MailRow {
    slug: string;
    title: string;
    description: string;
    icon: string | null;
    editable_lang_keys: string[];
    override_count: number;
}

interface IndexProps {
    mails: MailRow[];
    [key: string]: unknown;
}

export default function AdminEmailsIndex() {
    const t = useT();
    const props = usePage<IndexProps>().props;

    return (
        <AdminLayout title={t('admin.emails.title')} activeKey="emails">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.emails.title')}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.emails.subtitle')}
                </p>
            </header>

            {props.mails.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm italic text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
                    {t('admin.emails.empty')}
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {props.mails.map((mail) => (
                        <Link
                            key={mail.slug}
                            href={`/admin/emails/${mail.slug}`}
                            className="group block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-rose-300 hover:bg-rose-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-rose-700 dark:hover:bg-rose-950/20"
                        >
                            <div className="flex items-start gap-3">
                                {mail.icon && (
                                    <span
                                        className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                        aria-hidden="true"
                                    >
                                        <i className={`fa-solid fa-${mail.icon}`} />
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {mail.title}
                                        </h2>
                                        {mail.override_count > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                                <i className="fa-solid fa-pen-to-square text-[9px]" aria-hidden="true" />
                                                {t('admin.emails.has_overrides').replace(':count', String(mail.override_count))}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                                {t('admin.emails.no_overrides')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                        {mail.description}
                                    </p>
                                    <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                        {t('admin.emails.editable_keys').replace(':count', String(mail.editable_lang_keys.length))}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
