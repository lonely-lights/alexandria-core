import { Link, usePage } from '@inertiajs/react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Emails → show — Stage 8e.4.C.
 *
 * Minimal placeholder for now — displays the Mailable's metadata
 * and current overrides as a read-only summary. The full editing
 * UI (live iframe preview + width selector + light/dark toggle +
 * static compatibility check + per-key edit form) lands in 8e.4.D.
 */
interface Override {
    lang_key: string;
    content: string;
    updated_by: number | null;
    updated_at: string;
}

interface ShowProps {
    slug: string;
    title: string;
    description: string;
    icon: string | null;
    editable_lang_keys: string[];
    overrides: Override[];
    [key: string]: unknown;
}

export default function AdminEmailsShow() {
    const t = useT();
    const props = usePage<ShowProps>().props;

    const overrideByKey = new Map(props.overrides.map((o) => [o.lang_key, o]));

    return (
        <AdminLayout title={props.title} activeKey="emails">
            <Link
                href="/admin/emails"
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
                <i className="fa-solid fa-arrow-left text-[10px]" aria-hidden="true" />
                {t('admin.emails.title')}
            </Link>

            <header className="mb-6 flex items-start gap-3">
                {props.icon && (
                    <span
                        className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        aria-hidden="true"
                    >
                        <i className={`fa-solid fa-${props.icon}`} />
                    </span>
                )}
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {props.title}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{props.description}</p>
                </div>
            </header>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Editable strings
                </h2>
                <ul className="space-y-2">
                    {props.editable_lang_keys.map((key) => {
                        const override = overrideByKey.get(key);
                        return (
                            <li key={key} className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800">
                                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{key}</span>
                                {override ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                        <i className="fa-solid fa-pen-to-square text-[9px]" aria-hidden="true" />
                                        Override
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                        Default
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
                <p className="mt-4 text-xs italic text-zinc-500 dark:text-zinc-400">
                    Preview + edit form coming in the next substage (8e.4.D).
                </p>
            </section>
        </AdminLayout>
    );
}
