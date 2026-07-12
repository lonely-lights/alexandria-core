import { Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import IconTile from '@alexandria/components/ui/IconTile';
import type { Translator } from '@alexandria/hooks/useT';

export type WorkbenchLevel = 'routing' | 'creation';

interface WorkbenchHeaderProps {
    t: Translator;
    project: { name: string; slug: string };
    activeTab: WorkbenchLevel;
    onTabChange: (tab: WorkbenchLevel) => void;
    unsortedCount: number;
    pendingCount: number;
}

const TABS: { key: WorkbenchLevel; labelKey: string; icon: string }[] = [
    { key: 'routing', labelKey: 'ai.workbench.tab.routing', icon: 'fa-solid fa-route' },
    { key: 'creation', labelKey: 'ai.workbench.tab.creation', icon: 'fa-solid fa-wand-magic-sparkles' },
];

/* ── Theme styles ── */

const headerBarStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, var(--theme-base-page))',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const crumbLinkStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
};

const tabActiveStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const tabIdleStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const statStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
};

/**
 * Pinned, single-row Workbench header — console DNA: breadcrumb + title,
 * the Routing|Creation level tabs, and the page-level queue stats all in
 * one compact strip instead of the old two-bar PageHeader hero. Sits
 * directly under the fixed navbar (the page wrapper handles the
 * navbar-height offset); this row itself never scrolls.
 */
export default function WorkbenchHeader({
    t,
    project,
    activeTab,
    onTabChange,
    unsortedCount,
    pendingCount,
}: WorkbenchHeaderProps) {
    return (
        <header
            className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2"
            style={headerBarStyle}
        >
            <div className="flex min-w-0 items-center gap-2">
                <IconTile icon="fa-solid fa-route" color="primary" variant="solid" size="sm" />
                <div className="flex min-w-0 flex-col leading-tight">
                    <Link
                        href={`/ai/${project.slug}`}
                        className="text-[11px] hover:underline"
                        style={crumbLinkStyle}
                    >
                        <i className="fa-solid fa-chevron-left mr-1 text-[8px]" aria-hidden="true" />
                        {t('ai.dashboard.breadcrumb')}
                    </Link>
                    <h1
                        className="truncate font-serif text-base font-bold"
                        title={t('ai.workbench.heading.subtitle').replace(':project', project.name)}
                    >
                        {t('ai.workbench.heading.title')}
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className="alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                        style={activeTab === tab.key ? tabActiveStyle : tabIdleStyle}
                        aria-pressed={activeTab === tab.key}
                    >
                        <i className={`${tab.icon} text-xs`} aria-hidden="true" />
                        {t(tab.labelKey)}
                    </button>
                ))}
            </div>

            <div className="flex flex-1 items-center justify-end gap-4">
                <span style={statStyle}>
                    <i className="fa-solid fa-inbox mr-1.5" aria-hidden="true" />
                    {t('ai.workbench.roster.unsorted').replace(':count', String(unsortedCount))}
                </span>
                <span style={statStyle}>
                    <i className="fa-solid fa-hourglass-half mr-1.5" aria-hidden="true" />
                    {t('ai.workbench.roster.pending').replace(':count', String(pendingCount))}
                </span>
            </div>
        </header>
    );
}
