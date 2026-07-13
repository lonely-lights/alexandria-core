import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import useT from '@alexandria/hooks/useT';
import { useVisitedTabs } from '@alexandria/hooks/useVisitedTabs';
import WorkbenchHeader, { type WorkbenchLevel } from './Sections/WorkbenchHeader';
import WorkbenchRoutingTab from './Sections/WorkbenchRoutingTab';
import WorkbenchCreationTab from './Sections/WorkbenchCreationTab';
import type { WorkbenchProps } from '@alexandria/types/workbench';

function tabFromHash(): WorkbenchLevel {
    const hash = window.location.hash.slice(1) as WorkbenchLevel;
    return ['routing', 'creation'].includes(hash) ? hash : 'routing';
}

/**
 * Sorting Workbench — viewport-fit console layout (lg+): a pinned
 * single-row header (WorkbenchHeader) carries the title, the
 * Routing|Creation level tabs, and the page-level queue stats; below it
 * the active level fills the remaining viewport height via a two-pane
 * rail + detail split (see WorkbenchRoutingTab / WorkbenchCreationTab).
 * Nothing in the page itself scrolls — every list scrolls internally.
 * Below `lg` the contract relaxes: panes stack and the page scrolls
 * normally.
 *
 * Navbar clearance uses AppLayout's standard (non-immersive) `pt-20`
 * top padding on `<main>` — the same mechanism every other page relies
 * on — rather than a bespoke offset, so the viewport-fit height budget
 * (`calc(100vh - 5rem)`) is a fixed, known quantity instead of chasing
 * the `--navbar-height` custom property.
 */
export default function Workbench() {
    const t = useT();
    const props = usePage<WorkbenchProps>().props;
    const { project, blueprints, notebooks, unsorted_count, pending_count } = props;

    const [activeTab, setActiveTab] = useState<WorkbenchLevel>(tabFromHash);

    // Persist the level in the URL hash so a refresh lands where the user was.
    function changeTab(tab: WorkbenchLevel) {
        setActiveTab(tab);
        window.history.replaceState(null, '', `#${tab}`);
    }
    const visited = useVisitedTabs(activeTab);

    // fabActions off: the quick-note FAB floats over the sticky action bars (owner).
    return (
        <AppLayout title={t('ai.workbench.breadcrumb')} fabActions={null}>
            <div className="flex flex-col lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
                <WorkbenchHeader
                    t={t}
                    project={project}
                    activeTab={activeTab}
                    onTabChange={changeTab}
                    unsortedCount={unsorted_count}
                    pendingCount={pending_count}
                />

                <div className="min-h-0 flex-1">
                    {visited.has('routing') && (
                        <div hidden={activeTab !== 'routing'} className="h-full min-h-0">
                            <WorkbenchRoutingTab
                                projectSlug={project.slug}
                                blueprints={blueprints}
                                notebooks={notebooks}
                                unsorted_count={unsorted_count}
                                pending_count={pending_count}
                            />
                        </div>
                    )}
                    {visited.has('creation') && (
                        <div hidden={activeTab !== 'creation'} className="h-full min-h-0">
                            <WorkbenchCreationTab
                                projectSlug={project.slug}
                                projectId={project.id}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
