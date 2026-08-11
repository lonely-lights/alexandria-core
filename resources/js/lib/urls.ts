/**
 * Config-aware project-scoped URL builders.
 *
 * Every project surface lives under `/p/{project-slug}/…`, and the literal
 * word for each surface is host-configurable (`config/urls.php` →
 * `urls.segments`). The host app hands that map to `configureUrls()` once at
 * boot from the Inertia `urls` share; every builder below reads the current
 * map, so renaming `pages` → `wiki` server-side moves the frontend with it.
 *
 * Deliberately dependency-free — no Inertia import. The HOST passes the prop
 * in, which keeps the module trivially unit-testable and usable from
 * non-React code (fetch helpers, plain event handlers).
 */

export interface UrlSegments {
    pages: string;
    images: string;
    ai: string;
    notes: string;
    writing: string;
    works: string;
    capture: string;
}

/**
 * Mirrors the defaults in the host's `config/urls.php` — each segment
 * defaults to its own key, so an unconfigured host still builds valid URLs.
 */
const DEFAULT_SEGMENTS: UrlSegments = {
    pages: 'pages',
    images: 'images',
    ai: 'ai',
    notes: 'notes',
    writing: 'writing',
    works: 'works',
    capture: 'capture',
};

let segments: UrlSegments = { ...DEFAULT_SEGMENTS };

/**
 * Install the host's segment words. Always resets to the defaults first, so
 * a partial map keeps untouched keys at their default and calling it with no
 * argument restores a pristine state (used by tests).
 */
export function configureUrls(next?: Partial<UrlSegments>): void {
    segments = { ...DEFAULT_SEGMENTS, ...next };
}

/** Slugs arrive from the server or from user data — always escape them. */
function slug(value: string | number): string {
    return encodeURIComponent(String(value));
}

export function projectUrl(project: string): string {
    return `/p/${slug(project)}`;
}

/** `/p/x/pages/{blueprint}` — with `entry`, the entry show page. */
export function pageUrl(
    project: string,
    blueprint: string,
    entry?: string,
): string {
    const base = `${projectUrl(project)}/${segments.pages}/${slug(blueprint)}`;

    return entry === undefined ? base : `${base}/${slug(entry)}`;
}

/** `/p/x/pages/create` — the blueprint builder. */
export function newBlueprintUrl(project: string): string {
    return `${projectUrl(project)}/${segments.pages}/create`;
}

/** `/p/x/pages/{blueprint}/create` — the entry composer. */
export function newEntryUrl(project: string, blueprint: string): string {
    return `${pageUrl(project, blueprint)}/create`;
}

export function entryEditUrl(
    project: string,
    blueprint: string,
    entry: string,
): string {
    return `${pageUrl(project, blueprint, entry)}/edit`;
}

export function imagesUrl(project: string): string {
    return `${projectUrl(project)}/${segments.images}`;
}

/** `/p/x/images/new` — the image builder. */
export function newImageUrl(project: string): string {
    return `${imagesUrl(project)}/new`;
}

/** `/p/x/ai` — base for the workbench's API sub-paths. */
export function aiBase(project: string): string {
    return `${projectUrl(project)}/${segments.ai}`;
}

/** `/p/x/ai[/{tab}]` — the AI dashboard, optionally on a named tab. */
export function aiUrl(
    project: string,
    tab?: 'queue' | 'batches' | 'usage' | 'models',
): string {
    const base = aiBase(project);

    return tab === undefined ? base : `${base}/${tab}`;
}

export function workbenchUrl(project: string): string {
    return `${aiBase(project)}/workbench`;
}

/** `/p/x/notes` — also the base for `/list`, `/stats` and `/bulk`. */
export function notesUrl(project: string): string {
    return `${projectUrl(project)}/${segments.notes}`;
}

export function writingUrl(project: string): string {
    return `${projectUrl(project)}/${segments.writing}`;
}

/** `/p/x/works[/{work}]` — base for sections/panel/pins/comments/reports. */
export function worksBase(project: string, work?: string): string {
    const base = `${projectUrl(project)}/${segments.works}`;

    return work === undefined ? base : `${base}/${slug(work)}`;
}

/** `/p/x/works/{work}[/{section}]` — the writing workspace. */
export function workUrl(
    project: string,
    work: string,
    section?: string | number,
): string {
    const base = worksBase(project, work);

    return section === undefined ? base : `${base}/${slug(section)}`;
}

export function captureUrl(project: string): string {
    return `${projectUrl(project)}/${segments.capture}`;
}

/** Fixed segment — not host-configurable. */
export function recycleBinUrl(project: string): string {
    return `${projectUrl(project)}/recycle-bin`;
}

/** Fixed segment — not host-configurable. */
export function projectSearchUrl(project: string): string {
    return `${projectUrl(project)}/search`;
}
