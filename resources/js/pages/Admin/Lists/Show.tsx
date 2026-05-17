import { Link, router, useForm, usePage } from '@inertiajs/react';
import { type ReactNode, type SubmitEvent, useEffect, useRef, useState } from 'react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Lists → detail — Stage 8c.E.3 Phase 2.
 *
 * Tabs:
 *   - Members: paginated roster + add-member typeahead + per-row remove
 *   - Permissions: checkbox matrix against all registered permissions
 *   - Feature flags: free-form key list (add/remove)
 *   - Audit: paginated activity log
 *   - Settings: rename, scope, auto-role, delete
 *
 * All mutations PATCH/POST/DELETE through AdminListController and
 * write to invite_list_audit_logs via the service hooks. Member adds
 * use a debounced autocomplete against /admin/lists-user-search.
 */

interface ListSummary {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    scope: 'instance' | 'project';
    project_id: number | null;
    project: { id: number; name: string; slug: string } | null;
    auto_role_id: number | null;
    auto_role: { id: number; name: string; display_name: string } | null;
    created_at: string | null;
    updated_at: string | null;
}

interface MemberRow {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
    pivot: { added_by: number | null; added_at: string | null };
}

interface PermissionOption {
    id: number;
    name: string;
    package_slug: string;
}

interface AuditRow {
    id: number;
    action: string;
    meta: Record<string, unknown> | null;
    created_at: string | null;
    user: { id: number; name: string; display_name: string | null } | null;
    actor: { id: number; name: string; display_name: string | null } | null;
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
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginatorLink[];
}

interface ShowProps {
    list: ListSummary;
    members: Paginator<MemberRow>;
    permissionIds: number[];
    allPermissions: PermissionOption[];
    featureFlags: string[];
    audits: Paginator<AuditRow>;
    [key: string]: unknown;
}

type TabKey = 'members' | 'permissions' | 'feature_flags' | 'audit' | 'settings';

const TABS: { key: TabKey; labelKey: string }[] = [
    { key: 'members', labelKey: 'admin.lists.detail.section.members' },
    { key: 'permissions', labelKey: 'admin.lists.detail.section.permissions' },
    { key: 'feature_flags', labelKey: 'admin.lists.detail.section.feature_flags' },
    { key: 'audit', labelKey: 'admin.lists.detail.section.audit' },
    { key: 'settings', labelKey: 'admin.lists.detail.section.settings' },
];

export default function AdminListsShow() {
    const t = useT();
    const props = usePage<ShowProps>().props;
    const [activeTab, setActiveTab] = useState<TabKey>('members');

    return (
        <AdminLayout title={props.list.name} activeKey="lists">
            <header className="mb-6">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Link href="/admin/lists" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                        {t('admin.lists.title')}
                    </Link>
                    <span>/</span>
                    <span>{props.list.name}</span>
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {props.list.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {t(`admin.lists.scope.${props.list.scope}`)}
                    </span>
                    {props.list.project && (
                        <span>→ {props.list.project.name}</span>
                    )}
                    {props.list.auto_role && (
                        <span>{t('admin.lists.field.auto_role')}: {props.list.auto_role.display_name}</span>
                    )}
                </div>
                {props.list.description && (
                    <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                        {props.list.description}
                    </p>
                )}
            </header>

            {/* Tab bar */}
            <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800">
                <nav className="flex gap-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition ${
                                activeTab === tab.key
                                    ? 'border-rose-500 text-rose-700 dark:border-rose-400 dark:text-rose-300'
                                    : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                            }`}
                        >
                            {t(tab.labelKey)}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'members' && <MembersTab list={props.list} members={props.members} />}
            {activeTab === 'permissions' && (
                <PermissionsTab
                    list={props.list}
                    permissionIds={props.permissionIds}
                    allPermissions={props.allPermissions}
                />
            )}
            {activeTab === 'feature_flags' && <FeatureFlagsTab list={props.list} featureFlags={props.featureFlags} />}
            {activeTab === 'audit' && <AuditTab audits={props.audits} />}
            {activeTab === 'settings' && <SettingsTab list={props.list} />}
        </AdminLayout>
    );
}

// ── Members tab ─────────────────────────────────────────────────────

function MembersTab({ list, members }: { list: ListSummary; members: Paginator<MemberRow> }) {
    const t = useT();

    function removeMember(userId: number) {
        if (!confirm(t('admin.lists.members.remove_confirm'))) return;
        router.delete(`/admin/lists/${list.id}/members/${userId}`, {
            preserveScroll: true,
        });
    }

    return (
        <div>
            <AddMemberBox listId={list.id} />

            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-2 font-medium">Name</th>
                            <th className="px-4 py-2 font-medium">Email</th>
                            <th className="px-4 py-2 font-medium">{t('admin.lists.members.added_at')}</th>
                            <th className="px-4 py-2 font-medium">&nbsp;</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {members.data.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-xs italic text-zinc-400 dark:text-zinc-600">
                                    {t('admin.lists.members.empty')}
                                </td>
                            </tr>
                        ) : (
                            members.data.map((m) => (
                                <tr key={m.id}>
                                    <td className="px-4 py-2">
                                        <Link
                                            href={`/admin/users/${m.id}`}
                                            className="font-medium text-zinc-900 hover:text-rose-700 dark:text-zinc-100 dark:hover:text-rose-300"
                                        >
                                            {m.display_name || m.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{m.email}</td>
                                    <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        {m.pivot.added_at ? new Date(m.pivot.added_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button
                                            type="button"
                                            onClick={() => removeMember(m.id)}
                                            className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200"
                                        >
                                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <PaginationFooter paginator={members} only={['members']} />
        </div>
    );
}

interface SearchUser {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
}

function AddMemberBox({ listId }: { listId: number }) {
    const t = useT();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchUser[]>([]);
    const [searching, setSearching] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setSearching(true);
            try {
                const res = await fetch(
                    `/admin/lists-user-search?q=${encodeURIComponent(query)}`,
                    { signal: controller.signal, headers: { Accept: 'application/json' } },
                );
                const data = await res.json();
                setResults(data.users ?? []);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') throw err;
            } finally {
                setSearching(false);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    function addUser(userId: number) {
        router.post(
            `/admin/lists/${listId}/members`,
            { user_id: userId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setQuery('');
                    setResults([]);
                },
            },
        );
    }

    return (
        <div className="relative">
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('admin.lists.members.search_placeholder')}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {(searching || results.length > 0) && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    {searching && (
                        <p className="px-3 py-2 text-xs italic text-zinc-400 dark:text-zinc-600">Searching…</p>
                    )}
                    {results.map((u) => (
                        <button
                            key={u.id}
                            type="button"
                            onClick={() => addUser(u.id)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {u.display_name || u.name}
                            </span>
                            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{u.email}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Permissions tab ─────────────────────────────────────────────────

function PermissionsTab({
    list,
    permissionIds,
    allPermissions,
}: {
    list: ListSummary;
    permissionIds: number[];
    allPermissions: PermissionOption[];
}) {
    const t = useT();
    const [selected, setSelected] = useState<Set<number>>(new Set(permissionIds));
    const [saving, setSaving] = useState(false);

    function toggle(id: number) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    }

    function save() {
        setSaving(true);
        router.patch(
            `/admin/lists/${list.id}/permissions`,
            { permission_ids: Array.from(selected) },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    }

    if (allPermissions.length === 0) {
        return <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{t('admin.lists.permissions.empty')}</p>;
    }

    const grouped = allPermissions.reduce<Record<string, PermissionOption[]>>((acc, p) => {
        const key = p.package_slug ?? 'app';
        (acc[key] ??= []).push(p);
        return acc;
    }, {});

    return (
        <div>
            <div className="space-y-4">
                {Object.entries(grouped).map(([pkg, perms]) => (
                    <div key={pkg} className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                        <header className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                            {pkg}
                        </header>
                        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {perms.map((p) => (
                                <li key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(p.id)}
                                        onChange={() => toggle(p.id)}
                                        className="rounded border-zinc-300 text-rose-600 focus:ring-rose-400 dark:border-zinc-600 dark:bg-zinc-800"
                                    />
                                    <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{p.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-4">
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                >
                    {t('admin.lists.permissions.save')}
                </button>
            </div>
        </div>
    );
}

// ── Feature flags tab ───────────────────────────────────────────────

function FeatureFlagsTab({
    list,
    featureFlags,
}: {
    list: ListSummary;
    featureFlags: string[];
}) {
    const t = useT();
    const [keys, setKeys] = useState<string[]>(featureFlags);
    const [newKey, setNewKey] = useState('');
    const [saving, setSaving] = useState(false);

    function addKey() {
        const trimmed = newKey.trim();
        if (!trimmed || keys.includes(trimmed)) return;
        setKeys([...keys, trimmed]);
        setNewKey('');
    }

    function removeKey(key: string) {
        setKeys(keys.filter((k) => k !== key));
    }

    function save() {
        setSaving(true);
        router.patch(
            `/admin/lists/${list.id}/feature-flags`,
            { feature_keys: keys },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <div>
            <div className="mb-3 flex gap-2">
                <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addKey();
                        }
                    }}
                    placeholder={t('admin.lists.feature_flags.add_placeholder')}
                    className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                    type="button"
                    onClick={addKey}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-700 dark:text-zinc-300"
                >
                    {t('admin.lists.feature_flags.add')}
                </button>
            </div>

            {keys.length === 0 ? (
                <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                    {t('admin.lists.feature_flags.empty')}
                </p>
            ) : (
                <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                    {keys.map((k) => (
                        <li key={k} className="flex items-center justify-between px-3 py-1.5 font-mono text-sm">
                            <span className="text-zinc-700 dark:text-zinc-300">{k}</span>
                            <button
                                type="button"
                                onClick={() => removeKey(k)}
                                className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200"
                            >
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-4">
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                >
                    {t('admin.lists.feature_flags.save')}
                </button>
            </div>
        </div>
    );
}

// ── Audit tab ───────────────────────────────────────────────────────

function AuditTab({ audits }: { audits: Paginator<AuditRow> }) {
    const t = useT();

    function renderAction(a: AuditRow): string {
        const userName = a.user ? a.user.display_name || a.user.name : '—';
        const count = (a.meta?.count as number | undefined) ?? 0;
        const labelKey = `admin.lists.audit.action.${a.action}`;
        return t(labelKey)
            .replace(':user', userName)
            .replace(':count', String(count));
    }

    if (audits.data.length === 0) {
        return <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{t('admin.lists.audit.empty')}</p>;
    }

    return (
        <div>
            <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {audits.data.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
                        <div>
                            <p className="text-zinc-900 dark:text-zinc-100">{renderAction(a)}</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {a.actor ? (
                                    t('admin.lists.audit.by_actor').replace(
                                        ':actor',
                                        a.actor.display_name || a.actor.name,
                                    )
                                ) : (
                                    t('admin.lists.audit.by_system')
                                )}
                            </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                        </span>
                    </li>
                ))}
            </ul>

            <PaginationFooter paginator={audits} only={['audits']} />
        </div>
    );
}

// ── Settings tab ────────────────────────────────────────────────────

function SettingsTab({ list }: { list: ListSummary }) {
    const t = useT();
    const form = useForm({
        name: list.name,
        slug: list.slug,
        description: list.description ?? '',
        scope: list.scope,
        project_id: list.project_id,
        auto_role_id: list.auto_role_id,
    });

    function submit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        form.patch(`/admin/lists/${list.id}`, { preserveScroll: true });
    }

    function destroy() {
        if (!confirm(t('admin.lists.action.delete_confirm'))) return;
        router.delete(`/admin/lists/${list.id}`);
    }

    return (
        <div className="max-w-xl space-y-6">
            <form onSubmit={submit} className="space-y-3">
                <Field label={t('admin.lists.field.name')} error={form.errors.name}>
                    <input
                        type="text"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                </Field>
                <Field label={t('admin.lists.field.slug')} error={form.errors.slug}>
                    <input
                        type="text"
                        value={form.data.slug}
                        onChange={(e) => form.setData('slug', e.target.value)}
                        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                </Field>
                <Field label={t('admin.lists.field.description')} error={form.errors.description}>
                    <textarea
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                </Field>
                <button
                    type="submit"
                    disabled={form.processing}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                >
                    Save
                </button>
            </form>

            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
                <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    {t('admin.lists.action.delete')}
                </h3>
                <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                    {t('admin.lists.action.delete_confirm')}
                </p>
                <button
                    type="button"
                    onClick={destroy}
                    className="mt-3 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                    {t('admin.lists.action.delete')}
                </button>
            </div>
        </div>
    );
}

// ── Shared helpers ──────────────────────────────────────────────────

function PaginationFooter<T>({ paginator, only }: { paginator: Paginator<T>; only: string[] }) {
    if (paginator.last_page <= 1) return null;
    return (
        <div className="mt-3 flex items-center justify-end gap-1">
            {paginator.links.map((link, i) => {
                const label = link.label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»');
                if (link.url === null) {
                    return (
                        <span key={i} className="rounded-md px-2 py-1 text-xs text-zinc-400 dark:text-zinc-600">
                            {label}
                        </span>
                    );
                }
                if (link.active) {
                    return (
                        <span key={i} className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            {label}
                        </span>
                    );
                }
                return (
                    <Link
                        key={i}
                        href={link.url}
                        only={only}
                        preserveScroll
                        replace
                        className="rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
            {children}
            {error && <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">{error}</span>}
        </label>
    );
}
