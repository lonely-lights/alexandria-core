import { router } from '@inertiajs/react';
import { useRef, useState, type ReactNode } from 'react';

import { useDropdownClose } from '@alexandria/hooks/useDropdownClose';
import { useHoverOffDismiss } from '@alexandria/hooks/useHoverOffDismiss';
import { useMenuDismissDelay } from '@alexandria/hooks/useMenuDismissDelay';
import useT from '@alexandria/hooks/useT';

/**
 * Kebab-menu of admin-project actions — Stage 8c.C.
 *
 * Surfaces (state-aware):
 *   - Lock / Unlock (toggles based on locked_at)
 *   - Archive / Unarchive (toggles based on archived_at)
 *   - Transfer ownership (opens the parent's transfer modal)
 *
 * Destructive ops confirm via window.confirm before firing.
 */

interface ProjectActionDropdownProps {
    projectId: number;
    isLocked: boolean;
    isArchived: boolean;
    onTransferClick: () => void;
}

export default function ProjectActionDropdown({
    projectId,
    isLocked,
    isArchived,
    onTransferClick,
}: ProjectActionDropdownProps) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useDropdownClose(open, setOpen, ref);

    // Hover-off auto-dismiss (menu_dismiss_delay_ms preference), armed
    // only while open; the wrapper holds both trigger and menu.
    const dismissDelayMs = useMenuDismissDelay();
    const { handlePointerEnter, handlePointerLeave } = useHoverOffDismiss({
        delayMs: open ? dismissDelayMs : null,
        onDismiss: () => setOpen(false),
    });

    function lock() {
        if (!window.confirm(t('admin.projects.action.lock.confirm'))) return;
        setOpen(false);
        router.post(`/admin/projects/${projectId}/lock`, {}, { preserveScroll: true });
    }

    function unlock() {
        setOpen(false);
        router.post(`/admin/projects/${projectId}/unlock`, {}, { preserveScroll: true });
    }

    function archive() {
        if (!window.confirm(t('admin.projects.action.archive.confirm'))) return;
        setOpen(false);
        router.post(`/admin/projects/${projectId}/archive`, {}, { preserveScroll: true });
    }

    function unarchive() {
        setOpen(false);
        router.post(`/admin/projects/${projectId}/unarchive`, {}, { preserveScroll: true });
    }

    function transfer() {
        setOpen(false);
        onTransferClick();
    }

    return (
        <div
            ref={ref}
            className="relative"
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
        >
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
                    {!isLocked ? (
                        <MenuItem onClick={lock} icon="fa-lock">
                            {t('admin.projects.action.lock.label')}
                        </MenuItem>
                    ) : (
                        <MenuItem onClick={unlock} icon="fa-lock-open">
                            {t('admin.projects.action.unlock.label')}
                        </MenuItem>
                    )}
                    {!isArchived ? (
                        <MenuItem onClick={archive} icon="fa-box-archive">
                            {t('admin.projects.action.archive.label')}
                        </MenuItem>
                    ) : (
                        <MenuItem onClick={unarchive} icon="fa-box-open">
                            {t('admin.projects.action.unarchive.label')}
                        </MenuItem>
                    )}
                    <MenuItem onClick={transfer} icon="fa-right-left">
                        {t('admin.projects.action.transfer.label')}
                    </MenuItem>
                </div>
            )}
        </div>
    );
}

function MenuItem({
    onClick,
    icon,
    children,
}: {
    onClick: () => void;
    icon: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
            <i className={`fa-solid ${icon} w-3 text-center text-[10px]`} aria-hidden="true" />
            {children}
        </button>
    );
}
