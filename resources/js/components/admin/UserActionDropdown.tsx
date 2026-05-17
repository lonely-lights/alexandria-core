import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';

import { useDropdownClose } from '@alexandria/hooks/useDropdownClose';
import useT from '@alexandria/hooks/useT';

/**
 * Kebab-menu of admin-user actions — Stage 8c.B.
 *
 * Surfaces:
 *   - Suspend / Unsuspend (toggles based on current state)
 *   - Force password reset (sends Fortify reset email)
 *
 * Each action confirms via window.confirm before firing — admin
 * tools deserve a moment of friction before destructive ops.
 */

interface UserActionDropdownProps {
    userId: number;
    isSuspended: boolean;
    isSelf: boolean;
}

export default function UserActionDropdown({
    userId,
    isSuspended,
    isSelf,
}: UserActionDropdownProps) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useDropdownClose(open, setOpen, ref);

    function suspend() {
        if (!window.confirm(t('admin.users.action.suspend.confirm'))) return;
        setOpen(false);
        router.post(`/admin/users/${userId}/suspend`, {}, { preserveScroll: true });
    }

    function unsuspend() {
        setOpen(false);
        router.post(`/admin/users/${userId}/unsuspend`, {}, { preserveScroll: true });
    }

    function forceReset() {
        if (!window.confirm(t('admin.users.action.force_reset.confirm'))) return;
        setOpen(false);
        router.post(`/admin/users/${userId}/force-reset`, {}, { preserveScroll: true });
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
                <i className="fa-solid fa-ellipsis-vertical text-xs" aria-hidden="true" />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 z-10 mt-1 w-56 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                >
                    {!isSuspended ? (
                        <button
                            type="button"
                            onClick={suspend}
                            disabled={isSelf}
                            role="menuitem"
                            title={isSelf ? t('admin.users.action.suspend.self_blocked') : undefined}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            <i className="fa-solid fa-ban w-3 text-center text-[10px]" aria-hidden="true" />
                            {t('admin.users.action.suspend.label')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={unsuspend}
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            <i className="fa-solid fa-circle-check w-3 text-center text-[10px]" aria-hidden="true" />
                            {t('admin.users.action.unsuspend.label')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={forceReset}
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <i className="fa-solid fa-key w-3 text-center text-[10px]" aria-hidden="true" />
                        {t('admin.users.action.force_reset.label')}
                    </button>
                </div>
            )}
        </div>
    );
}
