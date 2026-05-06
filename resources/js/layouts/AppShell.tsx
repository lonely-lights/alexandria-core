/**
 * AppShell — the new logged-in chrome. Replaces AppLayout once every
 * page is migrated; for now both coexist (legacy pages use AppLayout,
 * new pages use AppShell).
 *
 * Composition:
 *
 *     <ThemeProvider theme={chromeTheme}>           ← :root chrome scope
 *         <Sidebar />                                  reads chrome vars
 *         <div className="flex-1">
 *             <Navbar />                               reads chrome vars
 *             <ContentScope theme={contentTheme}>   ← <main> content scope
 *                 {children}                           descendants see content vars
 *             </ContentScope>
 *         </div>
 *     </ThemeProvider>
 *
 * Chrome / content split lets the per-entry / per-blueprint theme
 * override land on the page body without disturbing the surrounding
 * navbar + sidebar. Stage 7b wires the actual override values; today
 * both resolve to the default preset.
 *
 * Slots:
 *   - sidebarHeader / sidebarFooter / sidebarItems: Sidebar config
 *   - navbarBrand / navbarActions: Navbar config
 *   - children: page content (rendered inside ContentScope)
 */

import { Head } from '@inertiajs/react';
import {
    ContentScope,
    ThemeProvider,
    defaultPreset,
    resolveChromeTheme,
    resolveContentTheme,
} from '@/theming';
import type { ReactNode } from 'react';

import Navbar, { type NavbarProps } from '../components/shell/Navbar';
import Sidebar, { type SidebarProps } from '../components/shell/Sidebar';

export interface AppShellProps {
    /** <Head> page title. */
    title?: string;

    /** Sidebar slots (forwarded to <Sidebar />). */
    sidebar?: SidebarProps;

    /** Navbar slots (forwarded to <Navbar />). */
    navbar?: NavbarProps;

    /** Page content. Rendered inside <ContentScope as="main">. */
    children: ReactNode;
}

export default function AppShell({
    title,
    sidebar = {},
    navbar = {},
    children,
}: AppShellProps) {
    // Stage 3 wires the architecture; Stage 7b feeds it real user / project
    // overrides. For now both scopes resolve to the default preset light
    // mode — chrome and content look identical.
    const chrome = resolveChromeTheme({
        theme: defaultPreset,
        modePreference: 'system',
        osDarkMode: false,
    });
    const content = resolveContentTheme({
        theme: defaultPreset,
        modePreference: 'system',
        osDarkMode: false,
    });

    return (
        <ThemeProvider theme={chrome}>
            {title && <Head title={title} />}

            <div
                className="alex-shell flex min-h-screen"
                style={{
                    background: 'var(--theme-surface-page)',
                    color: 'var(--theme-surface-on-page)',
                    fontFamily: 'var(--theme-typography-body-family)',
                }}
            >
                <Sidebar {...sidebar} />

                <div className="flex flex-1 flex-col min-w-0">
                    <Navbar {...navbar} />

                    <ContentScope
                        theme={content}
                        as="main"
                        className="flex-1 overflow-y-auto"
                    >
                        {children}
                    </ContentScope>
                </div>
            </div>
        </ThemeProvider>
    );
}
