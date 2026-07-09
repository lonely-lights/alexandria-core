import { Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import Tooltip from '@alexandria/components/ui/Tooltip';
import useT from '@alexandria/hooks/useT';

interface WorkspaceAppRailProps {
    projectSlug: string;
    workSlug: string;
    /** When provided, the notes rail item fires this callback instead of navigating to the notes dashboard. */
    onNotesClick?: () => void;
}

interface RailItem {
    key: string;
    href: string;
    icon: string;
    labelKey: string;
    isActive: (path: string) => boolean;
}

export default function WorkspaceAppRail({ projectSlug, workSlug, onNotesClick }: WorkspaceAppRailProps) {
    const t = useT();
    const { url } = usePage();
    const currentPath = url.split('?')[0] ?? url;

    const items = useMemo<RailItem[]>(
        () => [
            {
                key: 'project',
                href: `/p/${projectSlug}`,
                icon: 'fa-solid fa-globe',
                labelKey: 'writing.rail.project_home',
                isActive: (path) => path === `/p/${projectSlug}` || path.startsWith(`/p/${projectSlug}/`),
            },
            {
                key: 'writing',
                href: `/works/${projectSlug}`,
                icon: 'fa-solid fa-feather-pointed',
                labelKey: 'writing.rail.writing',
                isActive: (path) =>
                    path === `/works/${projectSlug}` ||
                    (path.startsWith(`/works/${projectSlug}/`) &&
                        path !== `/works/${projectSlug}/${workSlug}/reports`),
            },
            {
                key: 'notes',
                href: `/notes/${projectSlug}`,
                icon: 'fa-solid fa-note-sticky',
                labelKey: 'writing.rail.notes',
                isActive: (path) => path === `/notes/${projectSlug}` || path.startsWith(`/notes/${projectSlug}/`),
            },
            {
                key: 'ai',
                href: `/ai/${projectSlug}`,
                icon: 'fa-solid fa-wand-magic-sparkles',
                labelKey: 'writing.rail.ai',
                isActive: (path) => path === `/ai/${projectSlug}` || path.startsWith(`/ai/${projectSlug}/`),
            },
            {
                key: 'reports',
                href: `/works/${projectSlug}/${workSlug}/reports`,
                icon: 'fa-solid fa-chart-simple',
                labelKey: 'writing.rail.reports',
                isActive: (path) => path === `/works/${projectSlug}/${workSlug}/reports`,
            },
        ],
        [projectSlug, workSlug],
    );

    return (
        <aside
            aria-label={t('writing.rail.label')}
            className="writing-app-rail hidden shrink-0 flex-col items-center py-2 sm:flex"
            data-writing-app-rail
        >
            {items.map((item) => {
                const label = t(item.labelKey);
                const active = item.isActive(currentPath);
                const isNotesButton = item.key === 'notes' && onNotesClick !== undefined;

                return (
                    <Tooltip key={item.key} content={label} placement="left">
                        {isNotesButton ? (
                            <button
                                type="button"
                                onClick={onNotesClick}
                                aria-label={label}
                                className="writing-app-rail__link"
                                data-writing-app-rail-link={item.key}
                            >
                                <i className={item.icon} aria-hidden="true" />
                            </button>
                        ) : (
                            <Link
                                href={item.href}
                                aria-label={label}
                                aria-current={active ? 'page' : undefined}
                                className="writing-app-rail__link"
                                data-transition="slide"
                                data-writing-app-rail-link={item.key}
                            >
                                <i className={item.icon} aria-hidden="true" />
                            </Link>
                        )}
                    </Tooltip>
                );
            })}
        </aside>
    );
}
