import { router } from '@inertiajs/react';
import { createContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import useT from '@alexandria/hooks/useT';
import type { WritingSaveCoordinator } from './SectionSaveQueue';

export const WritingSaveContext = createContext<WritingSaveCoordinator | null>(
    null,
);

export default function WritingSaveProvider({
    coordinator,
    workPath,
    children,
}: {
    coordinator: WritingSaveCoordinator;
    workPath: string;
    children: ReactNode;
}) {
    const t = useT();
    const leaveWarning = t('writing.save.leave_warning');
    useEffect(() => {
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (!coordinator.hasUnsaved) {
                return;
            }

            void coordinator.flush();
            event.preventDefault();
            event.returnValue = '';
        };
        const pageHide = () => {
            void coordinator.flush(true);
        };
        const removeRouterGuard = router.on('before', (event) => {
            const visit = event.detail.visit;
            // In-place section/structure reloads retain this provider and its queues.
            const path = visit.url.pathname;
            const withinWork =
                path === workPath || path.startsWith(`${workPath}/`);

            if (visit.method === 'get' && visit.only.length > 0 && withinWork) {
                return;
            }

            if (coordinator.hasUnsaved) {
                void coordinator.flush();

                if (!window.confirm(leaveWarning)) {
                    event.preventDefault();
                }
            }
        });
        window.addEventListener('beforeunload', beforeUnload);
        window.addEventListener('pagehide', pageHide);

        return () => {
            removeRouterGuard();
            window.removeEventListener('beforeunload', beforeUnload);
            window.removeEventListener('pagehide', pageHide);
            void coordinator.flush();
        };
    }, [coordinator, workPath, leaveWarning]);

    return (
        <WritingSaveContext value={coordinator}>{children}</WritingSaveContext>
    );
}
