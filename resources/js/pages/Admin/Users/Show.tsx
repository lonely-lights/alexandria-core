import { Link, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

import UserActionDropdown from '@alexandria/components/admin/UserActionDropdown';
import UserRoleEditor from '@alexandria/components/admin/UserRoleEditor';
import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';
import type { SharedProps } from '@alexandria/types';

/**
 * Admin Users → detail — Stage 8c.B.
 *
 * Three-section detail panel:
 *   - Header strip with name + email + status + action dropdown
 *   - Profile facts (tagline, location, verification, 2FA)
 *   - Role editor (multi-select, syncAppRoles on save)
 *
 * Login history + activity log are deferred (no underlying data
 * surface yet); placeholder slot is left in the layout for when
 * those land.
 */

interface UserDetail {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
    created_at: string | null;
    email_verified_at: string | null;
    suspended_at: string | null;
    roles: string[];
    avatar_ring: string;
    tagline: string | null;
    location: string | null;
    updated_at: string | null;
    two_factor_confirmed: boolean;
}

interface RoleOption {
    name: string;
    display_name: string;
}

interface UsersShowProps {
    user: UserDetail;
    availableRoles: RoleOption[];
    [key: string]: unknown;
}

export default function AdminUsersShow() {
    const t = useT();
    const props = usePage<UsersShowProps & SharedProps>().props;
    const { user, availableRoles } = props;

    const currentUserId = (props.auth?.user?.id as number | undefined) ?? null;
    const isSelf = currentUserId === user.id;

    return (
        <AdminLayout
            title={`${user.display_name || user.name} — ${t('admin.users.title')}`}
            activeKey="users"
        >
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Link href="/admin/users" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                    {t('admin.users.title')}
                </Link>
                <i className="fa-solid fa-chevron-right text-[8px]" aria-hidden="true" />
                <span className="text-zinc-700 dark:text-zinc-300">
                    {user.display_name || user.name}
                </span>
            </nav>

            {/* Header card */}
            <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                {user.display_name || user.name}
                            </h1>
                            <StatusPill user={user} t={t} />
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            @{user.name} · {user.email}
                        </p>
                        {user.tagline && (
                            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{user.tagline}</p>
                        )}
                    </div>
                    <UserActionDropdown
                        userId={user.id}
                        isSuspended={user.suspended_at !== null}
                        isSelf={isSelf}
                    />
                </div>
            </div>

            {/* Two columns: facts + role editor */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card title={t('admin.users.detail.profile_facts')}>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                        <Fact
                            label={t('admin.users.detail.fact.location')}
                            value={user.location ?? '—'}
                        />
                        <Fact
                            label={t('admin.users.detail.fact.joined')}
                            value={user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        />
                        <Fact
                            label={t('admin.users.detail.fact.updated')}
                            value={user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '—'}
                        />
                        <Fact
                            label={t('admin.users.detail.fact.email_verified')}
                            value={
                                user.email_verified_at
                                    ? new Date(user.email_verified_at).toLocaleDateString()
                                    : t('admin.users.detail.fact.unverified')
                            }
                        />
                        <Fact
                            label={t('admin.users.detail.fact.two_factor')}
                            value={
                                user.two_factor_confirmed
                                    ? t('admin.users.detail.fact.enabled')
                                    : t('admin.users.detail.fact.disabled')
                            }
                        />
                        <Fact
                            label={t('admin.users.detail.fact.suspended')}
                            value={
                                user.suspended_at
                                    ? new Date(user.suspended_at).toLocaleDateString()
                                    : '—'
                            }
                        />
                    </dl>
                </Card>

                <Card title={t('admin.users.detail.roles')}>
                    <UserRoleEditor
                        userId={user.id}
                        initialRoles={user.roles}
                        availableRoles={availableRoles}
                    />
                </Card>
            </div>
        </AdminLayout>
    );
}

function StatusPill({
    user,
    t,
}: {
    user: UserDetail;
    t: ReturnType<typeof useT>;
}) {
    if (user.suspended_at) {
        return (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {t('admin.users.status.suspended')}
            </span>
        );
    }
    if (user.email_verified_at) {
        return (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {t('admin.users.status.active')}
            </span>
        );
    }
    return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {t('admin.users.status.unverified')}
        </span>
    );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <header className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            </header>
            <div className="p-4">{children}</div>
        </div>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <>
            <dt className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {label}
            </dt>
            <dd className="col-span-2 text-sm text-zinc-900 dark:text-zinc-100">{value}</dd>
        </>
    );
}
