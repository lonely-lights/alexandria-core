import { Head } from '@inertiajs/react';
import { type ReactNode } from 'react';

import AdminSidebar from '@alexandria/components/admin/AdminSidebar';
import { ToastProvider } from '@alexandria/components/ui/ToastProvider';

/**
 * Layout shell for the admin panel — Stage 8c.A.
 *
 * Two-column flex: persistent left sidebar (brand, nav, footer) +
 * scrollable main content. No top bar, no FAB, no notes drawer, no
 * project chrome. The intent is "operator tool with no
 * distractions."
 *
 * Stops the Stage 8b theme cascade at the /admin boundary by NOT
 * setting `data-theme-target="content"` — admin pages don't read
 * `var(--theme-*)` so the cascade has nothing to paint here.
 * Hardcoded zinc/rose palette throughout, but `dark:` variants
 * track the user's light/dark mode preference (legacy useTheme
 * sets `data-theme="tf-dark"` on <html>, and app.css adds a custom
 * Tailwind variant that fires on that attribute).
 */

interface AdminLayoutProps {
    title?: string;
    activeKey?: 'dashboard' | 'users' | 'projects' | 'permissions' | 'registration' | 'lists';
    children: ReactNode;
}

export default function AdminLayout({ title, activeKey, children }: AdminLayoutProps) {
    return (
        <>
            {title && <Head title={title} />}
            <ToastProvider>
                <div className="flex min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                    <AdminSidebar activeKey={activeKey} />
                    <main className="flex-1 overflow-x-auto px-6 py-6">
                        <div className="mx-auto max-w-6xl">{children}</div>
                    </main>
                </div>
            </ToastProvider>
        </>
    );
}
