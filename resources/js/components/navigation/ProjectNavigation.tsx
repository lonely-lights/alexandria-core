import { useState, useEffect } from 'react';
import type { ProjectSummary } from '../../types/models';

/**
 * SidebarBlueprint — the minimal blueprint shape the sidebar list
 * renders. Server attaches this to `currentProject.blueprints` for the
 * project being viewed.
 */
export interface SidebarBlueprint {
    id: number;
    name: string;
    plural_name: string;
    slug: string;
    icon: string | null;
}

/**
 * ProjectNavigation — the sidebar's per-project link stack.
 *
 * Rendered inside <Sidebar/> as the default `body` when `currentProject`
 * is present in Inertia shared props. Includes:
 *
 * - "Go to Project" CTA when the user is sidebar-browsing while not on
 *   the project page itself.
 * - Project switcher dropdown (collapses to a static label when there's
 *   only one project).
 * - One link per blueprint (icon + plural name).
 * - AI & Notes group: Notes / Notebooks / collapsible AI Hub
 *   (Note Queue / Commands / Models).
 * - Tools group: Archive (with live count badge from API), List/Tree/
 *   Relationship managers (placeholders for now).
 *
 * Pulls everything off props — no Inertia/router dependencies — so it
 * stays unit-testable and consumer apps can swap it out via Sidebar's
 * `body` slot when they need a different layout.
 */
export default function ProjectNavigation({
    project,
    projects,
    blueprints,
    isRouteProject,
}: {
    project: ProjectSummary;
    projects: ProjectSummary[];
    blueprints: SidebarBlueprint[];
    isRouteProject: boolean;
}) {
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);

    return (
        <>
            {/* Quick Jump to Project (when not on project page) */}
            {!isRouteProject && (
                <a
                    href={`/p/${project.slug}`}
                    className="btn btn-ghost btn-sm justify-start border border-dashed border-primary/30 text-primary/80 hover:bg-primary/10 hover:text-primary"
                >
                    <i className="fa-solid fa-arrow-up-right-from-square fa-fw w-5" />
                    <span>Go to Project</span>
                </a>
            )}

            {/* Project Switcher Divider */}
            <div className="divider !my-4">
                {projects.length > 1 ? (
                    <div className="relative">
                        <button
                            onClick={() => setSwitcherOpen(!switcherOpen)}
                            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/40 transition-colors hover:text-base-content/70"
                        >
                            <span>{project.name}</span>
                            <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${switcherOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {switcherOpen && (
                            <div className="absolute left-1/2 top-full z-50 mt-2 w-48 -translate-x-1/2 rounded-lg border border-base-content/10 bg-base-300 py-1 shadow-lg">
                                {projects.map((p) => (
                                    <a
                                        key={p.id}
                                        href={`/p/${p.slug}`}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-base-200 ${p.id === project.id ? 'font-medium text-primary' : 'text-base-content/70'}`}
                                    >
                                        {p.id === project.id ? (
                                            <i className="fa-solid fa-check w-4 text-primary" />
                                        ) : (
                                            <span className="w-4" />
                                        )}
                                        <span className="truncate">{p.name}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                        {project.name}
                    </span>
                )}
            </div>

            {/* Blueprint Links */}
            {blueprints.map((bp) => {
                const iconClass = bp.icon && bp.icon.includes(' ') ? bp.icon : `fa-solid ${bp.icon ?? 'fa-file'}`;

                return (
                    <a
                        key={bp.id}
                        href={`/p/${project.slug}/${bp.slug}`}
                        className="btn btn-ghost btn-sm justify-start"
                    >
                        <i className={`${iconClass} fa-fw w-5`} />
                        <span>{bp.plural_name}</span>
                    </a>
                );
            })}

            {/* AI & Notes Section */}
            <div className="divider !my-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                    AI &amp; Notes
                </span>
            </div>

            <a href={`/notes/${project.slug}`} className="btn btn-ghost btn-sm justify-start">
                <i className="fa-solid fa-note-sticky fa-fw w-5" />
                <span>Notes</span>
            </a>
            <a href={`/notes/${project.slug}#notebooks`} className="btn btn-ghost btn-sm justify-start">
                <i className="fa-solid fa-book fa-fw w-5" />
                <span>Notebooks</span>
            </a>

            {/* AI Hub */}
            <div>
                <button
                    onClick={() => setAiOpen(!aiOpen)}
                    className="btn btn-ghost btn-sm w-full justify-start"
                >
                    <i className="fa-solid fa-brain fa-fw w-5" />
                    <span className="flex-1 text-left">AI Hub</span>
                    <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${aiOpen ? 'rotate-180' : ''}`} />
                </button>
                {aiOpen && (
                    <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-base-300 pl-2">
                        <a href={`/ai/${project.slug}/queue`} className="btn btn-ghost btn-xs h-7 w-full justify-start">
                            <i className="fa-solid fa-route fa-fw w-4 text-warning" />
                            <span>Note Queue</span>
                        </a>
                        <a href={`/ai/${project.slug}/batches`} className="btn btn-ghost btn-xs h-7 w-full justify-start">
                            <i className="fa-solid fa-terminal fa-fw w-4 text-secondary" />
                            <span>Commands</span>
                        </a>
                        <a href={`/ai/${project.slug}/models`} className="btn btn-ghost btn-xs h-7 w-full justify-start">
                            <i className="fa-solid fa-microchip fa-fw w-4 text-info" />
                            <span>Models</span>
                        </a>
                    </div>
                )}
            </div>

            {/* Tools Section */}
            <div className="divider !my-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                    Tools
                </span>
            </div>

            <a
                href={`/p/${project.slug}#archive`}
                className="btn btn-ghost btn-sm justify-start"
            >
                <i className="fa-solid fa-box-archive fa-fw w-5" />
                <span className="flex-1 text-left">Archive</span>
                <ArchiveCount projectId={project.id} />
            </a>

            <a href="#" className="btn btn-ghost btn-sm justify-start">
                <i className="fa-solid fa-list fa-fw w-5" />
                <span>List Manager</span>
            </a>
            <a href="#" className="btn btn-ghost btn-sm justify-start">
                <i className="fa-solid fa-sitemap fa-fw w-5" />
                <span>Structural Manager</span>
            </a>
            <a href="#" className="btn btn-ghost btn-sm justify-start">
                <i className="fa-solid fa-people-arrows fa-fw w-5" />
                <span>Relationship Manager</span>
            </a>
        </>
    );
}

/**
 * Live archive-count badge — fetches once on mount, hides when zero
 * or unreachable. The /archive endpoint is part of VL-H so it may not
 * exist yet on the consumer; the catch silently no-ops in that case.
 */
function ArchiveCount({ projectId }: { projectId: number }) {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/archive?per_page=1`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => setCount(data.total ?? 0))
            .catch(() => { /* endpoint may not exist on the consumer yet */ });
    }, [projectId]);

    if (!count) return null;

    return <span className="badge badge-warning badge-xs">{count}</span>;
}

/**
 * Empty-state CTA shown when the user has no projects yet. Drives them
 * to the dashboard's create-project flow.
 */
export function NoProjectState() {
    return (
        <>
            <div className="divider !my-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                    Projects
                </span>
            </div>
            <div className="px-3 py-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-base-300">
                    <i className="fa-solid fa-folder-open text-lg text-base-content/30" />
                </div>
                <p className="mb-3 text-sm text-base-content/50">No projects yet</p>
                <a href="/dashboard" className="btn btn-primary btn-sm">
                    <i className="fa-solid fa-plus mr-1" />
                    Create Project
                </a>
            </div>
        </>
    );
}
