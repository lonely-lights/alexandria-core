import { Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import Tooltip from '@alexandria/components/ui/Tooltip';
import useT from '@alexandria/hooks/useT';
import { aiBase, notesUrl, projectUrl, worksBase, writingUrl } from '@alexandria/lib/urls';

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

    const items = useMemo<RailItem[]>(() => {
        const projectHome = projectUrl(projectSlug);
        const worksHome = worksBase(projectSlug);
        const notesHome = notesUrl(projectSlug);
        const aiHome = aiBase(projectSlug);
        const writingHome = writingUrl(projectSlug);
        const reportsPath = `${worksBase(projectSlug, workSlug)}/reports`;

        /** A path is "under" a base when it IS the base or a descendant of it. */
        const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

        return [
            {
                key: 'project',
                href: projectHome,
                icon: 'fa-solid fa-globe',
                labelKey: 'writing.rail.project_home',
                // Every project surface now nests under /p/{project}, so the
                // sibling rail destinations are subtracted back out — without
                // this the project item would light up alongside them.
                isActive: (path) =>
                    under(path, projectHome) &&
                    !under(path, worksHome) &&
                    !under(path, notesHome) &&
                    !under(path, aiHome) &&
                    !under(path, writingHome),
            },
            {
                key: 'writing',
                href: worksHome,
                icon: 'fa-solid fa-feather-pointed',
                labelKey: 'writing.rail.writing',
                isActive: (path) => under(path, worksHome) && path !== reportsPath,
            },
            {
                key: 'notes',
                href: notesHome,
                icon: 'fa-solid fa-note-sticky',
                labelKey: 'writing.rail.notes',
                isActive: (path) => under(path, notesHome),
            },
            {
                key: 'ai',
                href: aiHome,
                icon: 'fa-solid fa-wand-magic-sparkles',
                labelKey: 'writing.rail.ai',
                isActive: (path) => under(path, aiHome),
            },
            {
                key: 'reports',
                href: reportsPath,
                icon: 'fa-solid fa-chart-simple',
                labelKey: 'writing.rail.reports',
                isActive: (path) => path === reportsPath,
            },
        ];
    }, [projectSlug, workSlug]);

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
