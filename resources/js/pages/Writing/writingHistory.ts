import { router } from '@inertiajs/react';

let installed = false;

/**
 * Once a writing workspace has been visited, keep history restores fresh even
 * when returning from another page. This listener deliberately outlives the
 * workspace mount; Inertia replaces that mount before emitting navigate.
 */
export function enableWritingHistoryRefresh(): void {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    let restoredUrl: string | null = null;

    window.addEventListener('popstate', (event: PopStateEvent) => {
        // Capture before the cached continuous editor can rewrite the URL.
        restoredUrl = event.state?.page !== undefined ? window.location.href : null;
    });

    router.on('start', () => {
        restoredUrl = null;
    });

    router.on('navigate', (event) => {
        const url = restoredUrl;
        restoredUrl = null;
        if (url === null || event.detail.page.component !== 'Writing/Workspace') return;

        router.get(url, {}, { replace: true, preserveState: false, preserveScroll: true });
    });
}
