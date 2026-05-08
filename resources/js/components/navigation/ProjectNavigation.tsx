import { Link } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
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
 * ProjectNavigation — the sidebar's default body when a `currentProject`
 * is present in Inertia shared props. Painted entirely in `--theme-*`
 * tokens (no DaisyUI utilities) so the chrome flips with both preset
 * and mode. Layout, top to bottom:
 *
 *   - Dashboard link (always present — canonical "home" of the app)
 *   - "Go to Project" CTA when sidebar-browsing while NOT on the
 *     project page itself (dashed-border accent)
 *   - Project switcher: collapses to a static label when the user has
 *     a single project; pops a dropdown when there are multiple
 *   - One row per blueprint
 *   - "AI & Notes" group: Notes / Notebooks / collapsible AI Hub with
 *     Note Queue / Commands / Models sub-rows
 *   - "Tools" group: Archive (with a live count badge) + the future
 *     List / Structural / Relationship managers
 *
 * Hover/focus rules live globally in
 * `alexandria-core/resources/css/components/bottom-nav.css` keyed off
 * the `alex-sidebar-row` / `alex-go-to-project` / `alex-project-switcher`
 * class names this file applies — inline styles can't reach pseudo
 * classes.
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
        <div className="flex flex-col gap-1 p-1">
            <SidebarRow
                href="/dashboard"
                icon="fa-solid fa-house"
                label="Dashboard"
            />

            {!isRouteProject && (
                <GoToProjectCta
                    href={`/p/${project.slug}`}
                    projectName={project.name}
                />
            )}

            {projects.length > 1 ? (
                <ProjectSwitcher
                    project={project}
                    projects={projects}
                    open={switcherOpen}
                    onToggle={() => setSwitcherOpen(!switcherOpen)}
                    onClose={() => setSwitcherOpen(false)}
                />
            ) : (
                <SectionDivider>{project.name}</SectionDivider>
            )}

            {blueprints.map((bp) => {
                const iconClass =
                    bp.icon && bp.icon.includes(' ')
                        ? bp.icon
                        : `fa-solid ${bp.icon ?? 'fa-file'}`;

                return (
                    <SidebarRow
                        key={bp.id}
                        href={`/p/${project.slug}/${bp.slug}`}
                        icon={iconClass}
                        label={bp.plural_name}
                    />
                );
            })}

            <SectionDivider>AI &amp; Notes</SectionDivider>

            <SidebarRow
                href={`/notes/${project.slug}`}
                icon="fa-solid fa-note-sticky"
                label="Notes"
            />
            <SidebarRow
                href={`/notes/${project.slug}#notebooks`}
                icon="fa-solid fa-book"
                label="Notebooks"
            />

            <SidebarRow
                icon="fa-solid fa-brain"
                label="AI Hub"
                onClick={() => setAiOpen(!aiOpen)}
                trailing={
                    <i
                        className={`fa-solid fa-chevron-down text-[0.65rem] transition-transform duration-200 ${
                            aiOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                    />
                }
            />
            {aiOpen && (
                <div
                    className="ml-5 flex flex-col gap-0.5 pl-2"
                    style={{ borderLeft: '2px solid var(--theme-base-400)' }}
                >
                    <SidebarRow
                        href={`/ai/${project.slug}/queue`}
                        icon="fa-solid fa-route"
                        iconColor="var(--theme-status-warning-fill)"
                        label="Note Queue"
                        size="sm"
                    />
                    <SidebarRow
                        href={`/ai/${project.slug}/batches`}
                        icon="fa-solid fa-terminal"
                        iconColor="var(--theme-brand-secondary-500)"
                        label="Commands"
                        size="sm"
                    />
                    <SidebarRow
                        href={`/ai/${project.slug}/models`}
                        icon="fa-solid fa-microchip"
                        iconColor="var(--theme-status-info-fill)"
                        label="Models"
                        size="sm"
                    />
                </div>
            )}

            <SectionDivider>Tools</SectionDivider>

            <SidebarRow
                href={`/p/${project.slug}#archive`}
                icon="fa-solid fa-box-archive"
                label="Archive"
                trailing={<ArchiveCount projectId={project.id} />}
            />
            <SidebarRow
                href="#"
                icon="fa-solid fa-list"
                label="List Manager"
            />
            <SidebarRow
                href="#"
                icon="fa-solid fa-sitemap"
                label="Structural Manager"
            />
            <SidebarRow
                href="#"
                icon="fa-solid fa-people-arrows"
                label="Relationship Manager"
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Empty state — shown when the user has zero projects yet
// ---------------------------------------------------------------------------

/**
 * Empty-state CTA shown when the user has no projects yet. Drives them
 * to the dashboard's create-project flow. Painted with the same
 * --theme-base-* + --theme-brand-primary-* tokens as ProjectNavigation
 * so it tracks preset / mode flips.
 */
export function NoProjectState() {
    return (
        <div className="flex flex-col gap-1 p-1">
            <SidebarRow
                href="/dashboard"
                icon="fa-solid fa-house"
                label="Dashboard"
            />

            <SectionDivider>Projects</SectionDivider>

            <div className="px-3 py-4 text-center">
                <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: 'var(--theme-base-300)' }}
                >
                    <i
                        className="fa-solid fa-folder-open text-lg"
                        style={{
                            color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
                        }}
                    />
                </div>
                <p
                    className="mb-3 text-sm"
                    style={{
                        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                    }}
                >
                    No projects yet
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium no-underline transition-colors"
                    style={{
                        background: 'var(--theme-brand-primary-500)',
                        color: 'var(--theme-brand-primary-content)',
                        borderRadius: 'var(--theme-radius-button)',
                    }}
                >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    Create Project
                </Link>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sidebar primitives — kept inline because they're only meaningful in the
// project-navigation context. If a third sidebar consumer needs them, lift
// to a shared `core/components/navigation/SidebarPrimitives.tsx`.
// ---------------------------------------------------------------------------

interface SidebarRowProps {
    label: string;
    icon: string;
    /** Override the icon's colour (defaults to inherit from parent). */
    iconColor?: string;
    href?: string;
    onClick?: () => void;
    size?: 'sm' | 'md';
    trailing?: ReactNode;
}

function SidebarRow({
    label,
    icon,
    iconColor,
    href,
    onClick,
    size = 'md',
    trailing,
}: SidebarRowProps) {
    const padY = size === 'sm' ? '0.375rem' : '0.5rem';
    const fontSize = size === 'sm' ? '0.8125rem' : '0.875rem';

    const className =
        'alex-sidebar-row flex w-full items-center gap-2.5 px-3 text-left no-underline transition-colors';
    const style = {
        paddingTop: padY,
        paddingBottom: padY,
        fontSize,
        color: 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-button)',
    };
    const inner = (
        <>
            <i
                className={icon}
                aria-hidden="true"
                style={{
                    width: '1rem',
                    textAlign: 'center',
                    color: iconColor,
                }}
            />
            <span className="flex-1 truncate">{label}</span>
            {trailing}
        </>
    );

    if (href !== undefined) {
        return (
            <Link href={href} className={className} style={style}>
                {inner}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={className}
            style={style}
        >
            {inner}
        </button>
    );
}

function SectionDivider({ children }: { children: ReactNode }) {
    return (
        <div className="my-3 flex items-center gap-2 px-2">
            <div
                className="h-px flex-1"
                style={{ background: 'var(--theme-base-400)' }}
            />
            <span
                className="text-[0.65rem] font-semibold uppercase tracking-wider"
                style={{
                    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                }}
            >
                {children}
            </span>
            <div
                className="h-px flex-1"
                style={{ background: 'var(--theme-base-400)' }}
            />
        </div>
    );
}

function GoToProjectCta({
    href,
    projectName,
}: {
    href: string;
    projectName: string;
}) {
    return (
        <Link
            href={href}
            className="alex-go-to-project flex items-center gap-2.5 px-3 py-2 text-sm no-underline transition-colors"
            style={{
                border: '1px dashed color-mix(in srgb, var(--theme-brand-primary-500) 35%, transparent)',
                color: 'var(--theme-brand-primary-highlight-fg)',
                borderRadius: 'var(--theme-radius-button)',
            }}
        >
            <i
                className="fa-solid fa-arrow-up-right-from-square"
                aria-hidden="true"
                style={{ width: '1rem', textAlign: 'center' }}
            />
            <span className="flex-1 truncate">Go to {projectName}</span>
        </Link>
    );
}

function ProjectSwitcher({
    project,
    projects,
    open,
    onToggle,
    onClose,
}: {
    project: ProjectSummary;
    projects: ProjectSummary[];
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
}) {
    return (
        <div className="my-3 flex justify-center">
            <div className="relative">
                <button
                    type="button"
                    onClick={onToggle}
                    className="alex-project-switcher flex items-center gap-1.5 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider transition-colors"
                    style={{
                        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                    }}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span>{project.name}</span>
                    <i
                        className={`fa-solid fa-chevron-down text-[0.55rem] transition-transform duration-200 ${
                            open ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                    />
                </button>

                {open && (
                    <>
                        <div
                            className="fixed inset-0 z-30"
                            onClick={onClose}
                        />
                        <div
                            role="listbox"
                            className="absolute left-1/2 top-full z-40 mt-2 w-56 -translate-x-1/2 overflow-hidden shadow-lg"
                            style={{
                                background: 'var(--theme-base-surface)',
                                border: '1px solid var(--theme-base-400)',
                                borderRadius: 'var(--theme-radius-card)',
                            }}
                        >
                            {projects.map((p) => {
                                const isCurrent = p.id === project.id;
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/p/${p.slug}`}
                                        role="option"
                                        aria-selected={isCurrent}
                                        onClick={onClose}
                                        className="alex-project-switcher-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm no-underline transition-colors"
                                        style={{
                                            color: isCurrent
                                                ? 'var(--theme-brand-primary-highlight-fg)'
                                                : 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                                            fontWeight: isCurrent ? 600 : 400,
                                        }}
                                    >
                                        <i
                                            className={`fa-solid ${isCurrent ? 'fa-check' : ''} w-4 text-xs`}
                                            aria-hidden="true"
                                            style={{
                                                color: isCurrent
                                                    ? 'var(--theme-brand-primary-highlight-fg)'
                                                    : 'transparent',
                                            }}
                                        />
                                        <span className="truncate">
                                            {p.name}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Live archive count — fetches once on mount, hides on zero or unreachable.
// ---------------------------------------------------------------------------

/**
 * Live archive-count badge — fetches once on mount, hides when zero or
 * unreachable. The /archive endpoint is part of VL-H so it may not exist
 * yet on the consumer; the catch silently no-ops in that case.
 */
function ArchiveCount({ projectId }: { projectId: number }) {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/archive?per_page=1`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => setCount(data.total ?? 0))
            .catch(() => {
                /* endpoint may not exist on the consumer yet */
            });
    }, [projectId]);

    if (!count) return null;

    return (
        <span
            className="inline-flex h-4 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6rem] font-semibold"
            style={{
                background: 'var(--theme-status-warning-fill)',
                color: 'var(--theme-status-warning-content)',
            }}
        >
            {count}
        </span>
    );
}
