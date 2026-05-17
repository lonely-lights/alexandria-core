import { router, useForm, usePage } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';

import useT from '@alexandria/hooks/useT';
import AdminLayout from '@alexandria/layouts/AdminLayout';

/**
 * Admin Registration → settings + quota policies — Stage 8c.E.1.
 *
 * Two-section page:
 *   - Top: instance settings toggles (open_registration,
 *     users_can_invite) — saves on change with debounced PATCH
 *   - Bottom: per-role quota policy table with inline edit
 *
 * 8c.E.2 wires these into ProjectMemberController for the actual
 * gate; this substage only ships the configuration surface.
 */

type QuotaMode = 'unlimited' | 'one_time' | 'scheduled';

interface RoleRef {
    id: number;
    name: string;
    display_name: string;
    rank: number;
}

interface Policy {
    id: number;
    mode: QuotaMode;
    initial_invites: number | null;
    replenish_amount: number | null;
    replenish_interval_days: number | null;
    replenish_cap: number | null;
}

interface PolicyRow {
    role: RoleRef;
    policy: Policy | null;
}

interface RegistrationProps {
    settings: { open_registration: boolean; users_can_invite: boolean };
    policyRows: PolicyRow[];
    [key: string]: unknown;
}

export default function AdminRegistration() {
    const t = useT();
    const props = usePage<RegistrationProps>().props;
    const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

    function toggleSetting(field: 'open_registration' | 'users_can_invite', value: boolean) {
        router.patch(
            '/admin/registration/settings',
            {
                ...props.settings,
                [field]: value,
            },
            { preserveScroll: true, preserveState: true },
        );
    }

    return (
        <AdminLayout title={t('admin.registration.title')} activeKey="registration">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('admin.registration.title')}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t('admin.registration.subtitle')}
                </p>
            </header>

            {/* Section 1: registration policy toggles */}
            <Card title={t('admin.registration.section.policy')} className="mb-6">
                <ToggleRow
                    label={t('admin.registration.field.open_registration')}
                    description={t('admin.registration.field.open_registration_desc')}
                    value={props.settings.open_registration}
                    onChange={(v) => toggleSetting('open_registration', v)}
                />
                <ToggleRow
                    label={t('admin.registration.field.users_can_invite')}
                    description={t('admin.registration.field.users_can_invite_desc')}
                    value={props.settings.users_can_invite}
                    onChange={(v) => toggleSetting('users_can_invite', v)}
                />
            </Card>

            {/* Section 2: per-role invite quota policies */}
            <Card title={t('admin.registration.section.quotas')}>
                <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {t('admin.registration.quota_section_help')}
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                            <tr>
                                <th className="px-3 py-2 font-medium">{t('admin.registration.col.role')}</th>
                                <th className="px-3 py-2 font-medium">{t('admin.registration.col.mode')}</th>
                                <th className="px-3 py-2 font-medium">{t('admin.registration.col.initial')}</th>
                                <th className="px-3 py-2 font-medium">{t('admin.registration.col.per_cycle')}</th>
                                <th className="px-3 py-2 font-medium">{t('admin.registration.col.cycle')}</th>
                                <th className="px-3 py-2 font-medium">{t('admin.registration.col.cap')}</th>
                                <th className="px-3 py-2 font-medium text-right">{t('admin.registration.col.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {props.policyRows.map((row) =>
                                editingRoleId === row.role.id ? (
                                    <EditPolicyRow
                                        key={row.role.id}
                                        row={row}
                                        onCancel={() => setEditingRoleId(null)}
                                        onSaved={() => setEditingRoleId(null)}
                                        t={t}
                                    />
                                ) : (
                                    <DisplayPolicyRow
                                        key={row.role.id}
                                        row={row}
                                        onEdit={() => setEditingRoleId(row.role.id)}
                                        t={t}
                                    />
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}

function ToggleRow({
    label,
    description,
    value,
    onChange,
}: {
    label: string;
    description: string;
    value: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={() => onChange(!value)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition ${
                    value
                        ? 'bg-rose-600 dark:bg-rose-500'
                        : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
            >
                <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                        value ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </div>
    );
}

function DisplayPolicyRow({
    row,
    onEdit,
    t,
}: {
    row: PolicyRow;
    onEdit: () => void;
    t: ReturnType<typeof useT>;
}) {
    const policy = row.policy;
    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <td className="px-3 py-2">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.role.display_name}</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{row.role.name}</div>
            </td>
            {policy === null ? (
                <td colSpan={5} className="px-3 py-2 text-xs italic text-zinc-400 dark:text-zinc-600">
                    {t('admin.registration.no_policy')}
                </td>
            ) : (
                <>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        <ModePill mode={policy.mode} t={t} />
                    </td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{policy.initial_invites ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{policy.replenish_amount ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        {policy.replenish_interval_days
                            ? `${policy.replenish_interval_days}d`
                            : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{policy.replenish_cap ?? '—'}</td>
                </>
            )}
            <td className="px-3 py-2 text-right">
                <button
                    type="button"
                    onClick={onEdit}
                    className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                    {t('common.edit')}
                </button>
            </td>
        </tr>
    );
}

function EditPolicyRow({
    row,
    onCancel,
    onSaved,
    t,
}: {
    row: PolicyRow;
    onCancel: () => void;
    onSaved: () => void;
    t: ReturnType<typeof useT>;
}) {
    const form = useForm({
        role_id: row.role.id,
        mode: (row.policy?.mode ?? 'one_time') as QuotaMode,
        initial_invites: row.policy?.initial_invites ?? 0,
        replenish_amount: row.policy?.replenish_amount ?? 0,
        replenish_interval_days: row.policy?.replenish_interval_days ?? 30,
        replenish_cap: row.policy?.replenish_cap ?? 0,
    });

    // Called via button onClick (no surrounding <form>), so no
    // preventDefault is needed and no event arg.
    function save() {
        form.post('/admin/registration/policies', {
            preserveScroll: true,
            onSuccess: onSaved,
        });
    }

    const showInitial = form.data.mode !== 'unlimited';
    const showSchedule = form.data.mode === 'scheduled';

    return (
        <tr className="bg-zinc-50 dark:bg-zinc-800/30">
            <td className="px-3 py-2">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.role.display_name}</div>
            </td>
            <td className="px-3 py-2">
                <select
                    value={form.data.mode}
                    onChange={(e) => form.setData('mode', e.target.value as QuotaMode)}
                    className={inputCls}
                >
                    <option value="unlimited">{t('admin.registration.mode.unlimited')}</option>
                    <option value="one_time">{t('admin.registration.mode.one_time')}</option>
                    <option value="scheduled">{t('admin.registration.mode.scheduled')}</option>
                </select>
            </td>
            <td className="px-3 py-2">
                {showInitial ? (
                    <input
                        type="number"
                        value={form.data.initial_invites}
                        min={0}
                        onChange={(e) => form.setData('initial_invites', Number(e.target.value))}
                        className={`${inputCls} w-20`}
                    />
                ) : (
                    <span className="text-xs text-zinc-400">—</span>
                )}
            </td>
            <td className="px-3 py-2">
                {showSchedule ? (
                    <input
                        type="number"
                        value={form.data.replenish_amount}
                        min={0}
                        onChange={(e) => form.setData('replenish_amount', Number(e.target.value))}
                        className={`${inputCls} w-20`}
                    />
                ) : (
                    <span className="text-xs text-zinc-400">—</span>
                )}
            </td>
            <td className="px-3 py-2">
                {showSchedule ? (
                    <input
                        type="number"
                        value={form.data.replenish_interval_days}
                        min={1}
                        onChange={(e) => form.setData('replenish_interval_days', Number(e.target.value))}
                        className={`${inputCls} w-20`}
                    />
                ) : (
                    <span className="text-xs text-zinc-400">—</span>
                )}
            </td>
            <td className="px-3 py-2">
                {showSchedule ? (
                    <input
                        type="number"
                        value={form.data.replenish_cap}
                        min={0}
                        onChange={(e) => form.setData('replenish_cap', Number(e.target.value))}
                        className={`${inputCls} w-20`}
                    />
                ) : (
                    <span className="text-xs text-zinc-400">—</span>
                )}
            </td>
            <td className="px-3 py-2 text-right">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={form.processing}
                    className="mr-2 text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                    {t('common.cancel')}
                </button>
                <button
                    type="button"
                    onClick={save}
                    disabled={form.processing}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50 dark:text-rose-400 dark:hover:text-rose-300"
                >
                    {form.processing ? t('common.saving') : t('common.save')}
                </button>
            </td>
        </tr>
    );
}

function ModePill({ mode, t }: { mode: QuotaMode; t: ReturnType<typeof useT> }) {
    const styles: Record<QuotaMode, string> = {
        unlimited: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        scheduled: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
        one_time: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    };
    return (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles[mode]}`}>
            {t(`admin.registration.mode.${mode}`)}
        </span>
    );
}

function Card({
    title,
    children,
    className,
}: {
    title: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className ?? ''}`}>
            <header className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            </header>
            <div className="p-4">{children}</div>
        </div>
    );
}

const inputCls =
    'w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
