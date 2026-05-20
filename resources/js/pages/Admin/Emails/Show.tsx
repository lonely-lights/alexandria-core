import { Link, router, useForm, usePage } from '@inertiajs/react';
import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Emails → show — Stage 8e.4.D.
 *
 * Editing surface with live iframe preview. Left pane: form (per
 * editable_lang_key text input). Right pane: iframe loading
 * `/admin/emails/{slug}/preview?d[key]=value` with current draft
 * values. Width selector + light/dark toggle live above the iframe.
 *
 * Draft = unsaved form state. Iframe re-renders on debounced 250ms
 * change of any input. Save promotes draft to email_overrides rows.
 * Empty input on save = revert that key to the file-lang default.
 */
interface Field {
    key: string;
    default: string;
    override: string | null;
    updated_at: string | null;
}

interface CompatIssue {
    feature: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    clients: string[];
}

interface ShowProps {
    slug: string;
    title: string;
    description: string;
    icon: string | null;
    fields: Field[];
    previewUrl: string;
    [key: string]: unknown;
}

type Width = 'mobile' | 'tablet' | 'desktop';

const WIDTHS: Record<Width, string> = {
    mobile: '360px',
    tablet: '560px',
    desktop: '100%',
};

export default function AdminEmailsShow() {
    const t = useT();
    const props = usePage<ShowProps>().props;

    // Form holds draft values keyed by lang_key. Initial value =
    // existing override OR empty string (which means "use default").
    const initial = useMemo(() => {
        const obj: Record<string, string> = {};
        for (const f of props.fields) obj[f.key] = f.override ?? '';
        return obj;
    }, [props.fields]);

    const form = useForm<{ overrides: Record<string, string> }>({ overrides: initial });

    // Iframe URL with debounced draft sync — rebuilt 250ms after the
    // last keystroke so we don't refetch on every character.
    const [iframeUrl, setIframeUrl] = useState<string>(() => buildPreviewUrl(props.previewUrl, initial));
    const debounceRef = useRef<number | null>(null);

    useEffect(() => {
        if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
            setIframeUrl(buildPreviewUrl(props.previewUrl, form.data.overrides));
        }, 250);
        return () => {
            if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
        };
    }, [form.data.overrides, props.previewUrl]);

    const [width, setWidth] = useState<Width>('desktop');
    const [issues, setIssues] = useState<CompatIssue[]>([]);
    const [testSendInFlight, setTestSendInFlight] = useState(false);

    // Fetch compatibility report on the same debounce as the iframe
    // refresh so the warnings track the working state, not the saved
    // state.
    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(form.data.overrides)) {
            if (value === '' || value === null || value === undefined) continue;
            params.set(`d[${key}]`, value);
        }
        const qs = params.toString();
        const url = `/admin/emails/${props.slug}/compatibility${qs ? `?${qs}` : ''}`;

        const timer = window.setTimeout(() => {
            fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
                .then((r) => (r.ok ? r.json() : { issues: [] }))
                .then((data: { issues: CompatIssue[] }) => setIssues(data.issues ?? []))
                .catch(() => {
                    // swallowed — abort or network blip; previous issues stay onscreen
                });
        }, 300);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [form.data.overrides, props.slug]);

    const handleSave = (e: SyntheticEvent) => {
        e.preventDefault();
        form.put(`/admin/emails/${props.slug}`, {
            preserveScroll: true,
        });
    };

    const handleRevert = (key: string) => {
        router.delete(`/admin/emails/${props.slug}/overrides/${key}`, {
            preserveScroll: true,
        });
    };

    const handleTestSend = () => {
        setTestSendInFlight(true);
        router.post(
            `/admin/emails/${props.slug}/test-send`,
            { d: form.data.overrides },
            {
                preserveScroll: true,
                onFinish: () => setTestSendInFlight(false),
            },
        );
    };

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
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{props.title}</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{props.description}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                {/* Edit form */}
                <form onSubmit={handleSave} className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <header className="mb-4">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {t('admin.emails.editing.title')}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            {t('admin.emails.editing.subtitle')}
                        </p>
                    </header>

                    <div className="space-y-4">
                        {props.fields.map((field) => {
                            const isOverridden = field.override !== null;
                            return (
                                <div key={field.key} className="space-y-1.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <label
                                            htmlFor={`fld-${field.key}`}
                                            className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300"
                                        >
                                            {field.key}
                                        </label>
                                        {isOverridden && (
                                            <button
                                                type="button"
                                                onClick={() => handleRevert(field.key)}
                                                className="text-[10px] text-rose-600 hover:text-rose-700 hover:underline dark:text-rose-400"
                                            >
                                                {t('admin.emails.editing.field.revert')}
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        id={`fld-${field.key}`}
                                        value={form.data.overrides[field.key] ?? ''}
                                        onChange={(e) =>
                                            form.setData('overrides', {
                                                ...form.data.overrides,
                                                [field.key]: e.target.value,
                                            })
                                        }
                                        rows={field.key === 'intro' || field.key === 'fallback' ? 3 : 1}
                                        placeholder={field.default}
                                        className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                                    />
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                                        {t('admin.emails.editing.field.default_hint').replace(':value', field.default)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={handleTestSend}
                            disabled={testSendInFlight}
                            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                            <i className="fa-solid fa-paper-plane text-[10px]" aria-hidden="true" />
                            {testSendInFlight ? t('admin.emails.test_send.sending') : t('admin.emails.test_send.button')}
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                        >
                            {form.processing ? t('admin.emails.editing.saving') : t('admin.emails.editing.save')}
                        </button>
                    </div>
                </form>

                {/* Live preview iframe */}
                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
                    <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            {t('admin.emails.preview.title')}
                        </h2>
                        <WidthPicker width={width} onChange={setWidth} t={t} />
                    </header>
                    <div
                        className="flex justify-center overflow-auto p-4"
                        style={{ background: '#fafaf9', minHeight: '480px' }}
                    >
                        <iframe
                            key={iframeUrl}
                            src={iframeUrl}
                            title={t('admin.emails.preview.title')}
                            style={{
                                width: WIDTHS[width],
                                maxWidth: '100%',
                                height: '720px',
                                border: 0,
                                background: '#ffffff',
                            }}
                            // No sandbox. Email always renders light by design
                            // (the layout sets meta color-scheme: light only),
                            // so the preview here always shows what'd appear
                            // in the recipient's inbox. XSS surface mitigated
                            // upstream by Blade's e() escaping via @brandedString
                            // + the layout wraps yieldContent in {{ }}.
                        />
                    </div>
                </section>
            </div>

            {/* Compatibility section — full-width under the columns */}
            <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <header className="mb-3">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {t('admin.emails.compat.title')}
                    </h2>
                </header>
                {issues.length === 0 ? (
                    <p className="text-xs italic text-zinc-500 dark:text-zinc-400">
                        {t('admin.emails.compat.empty')}
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {issues.map((issue) => (
                            <CompatRow key={issue.feature} issue={issue} t={t} />
                        ))}
                    </ul>
                )}
            </section>
        </AdminLayout>
    );
}

function CompatRow({ issue, t }: { issue: CompatIssue; t: ReturnType<typeof useT> }) {
    const severityClasses: Record<CompatIssue['severity'], string> = {
        critical: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        info: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
    };
    return (
        <li className="flex items-start gap-3 rounded-md border border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <span className={`mt-0.5 inline-flex flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityClasses[issue.severity]}`}>
                {t(`admin.emails.compat.severity.${issue.severity}`)}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100">{issue.feature}</p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{issue.description}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {t('admin.emails.compat.affects').replace(':clients', issue.clients.join(', '))}
                </p>
            </div>
        </li>
    );
}

function WidthPicker({ width, onChange, t }: { width: Width; onChange: (w: Width) => void; t: ReturnType<typeof useT> }) {
    const opts: { value: Width; labelKey: string; icon: string }[] = [
        { value: 'mobile', labelKey: 'admin.emails.preview.width.mobile', icon: 'fa-mobile-screen' },
        { value: 'tablet', labelKey: 'admin.emails.preview.width.tablet', icon: 'fa-tablet-screen-button' },
        { value: 'desktop', labelKey: 'admin.emails.preview.width.desktop', icon: 'fa-desktop' },
    ];
    return (
        <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            {opts.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange(o.value)}
                    title={t(o.labelKey)}
                    className={`px-2 py-1 text-[11px] ${
                        width === o.value
                            ? 'rounded bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                >
                    <i className={`fa-solid ${o.icon}`} aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}

function buildPreviewUrl(base: string, drafts: Record<string, string>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(drafts)) {
        if (value === '' || value === null || value === undefined) continue;
        params.set(`d[${key}]`, value);
    }
    const qs = params.toString();
    return qs.length === 0 ? base : `${base}?${qs}`;
}
