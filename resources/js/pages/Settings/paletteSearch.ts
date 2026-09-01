import type {
    PaletteSearchEntry,
    PaletteSearchGroup,
    PaletteSearchResults,
} from '../../types/navigation';
import { projectSearch } from '../../lib/projectSearch';
import {
    ALL_NAV,
    searchSettings,
    type NavItem,
    type ResolvedNavItem,
} from './nav-config';

const SETTINGS_SECTION_QUERY_KEY = 'section';

/**
 * Turn the shared settings index into a CommandPalette result group.
 * Results stay section-level: a match for "Font Size" opens Appearance
 * with the rest of that section still visible and editable.
 *
 * `nav` is the RESOLVED tree (see `resolveNav` in nav-config) and
 * `groupLabel` is the translated heading for the result group, normally
 * `t('settings.search.group')`.
 */
export function settingsPaletteGroup(
    query: string,
    nav: ResolvedNavItem[],
    groupLabel: string,
): PaletteSearchGroup | null {
    const entries: PaletteSearchEntry[] = searchSettings(nav, query)
        .slice(0, 8)
        .map(({ group, item, matchingTerms }) => ({
            id: `settings:${item.key}`,
            label: item.label,
            description: `${group.label} › ${item.label}${matchingTerms[0] ? ` · ${matchingTerms[0]}` : ''}`,
            href: settingsSectionHref(item.key),
        }));

    if (entries.length === 0) return null;

    return {
        label: groupLabel,
        icon: 'fa-solid fa-gear',
        entries,
    };
}

/**
 * One search callback for the global navbar palette. Settings matches are
 * local and therefore remain available on routes without a current project;
 * when a project is active, its server-backed groups are merged underneath.
 */
export function globalSearch(
    projectSlug: string | undefined,
    nav: ResolvedNavItem[],
    groupLabel: string,
): (query: string) => Promise<PaletteSearchResults> {
    const searchProject = projectSlug ? projectSearch(projectSlug) : null;

    return async (query) => {
        const settingsGroup = settingsPaletteGroup(query, nav, groupLabel);
        let projectResults: PaletteSearchResults = {
            query,
            total: 0,
            groups: [],
        };

        if (searchProject) {
            try {
                projectResults = await searchProject(query);
            } catch {
                // A project-search network failure should never hide the
                // settings results that are already available locally.
            }
        }

        const groups = [
            ...(settingsGroup ? [settingsGroup] : []),
            ...projectResults.groups,
        ];

        return {
            query,
            total:
                (settingsGroup?.entries.length ?? 0) + projectResults.total,
            groups,
        };
    };
}

export function settingsSectionHref(section: string): string {
    return `/settings?${SETTINGS_SECTION_QUERY_KEY}=${encodeURIComponent(section)}`;
}

/** The key-only shape deep-link validation needs; raw or resolved nav both fit. */
type NavKeyShape = Pick<NavItem, 'key'> & { children?: NavKeyShape[] };

/** Resolve and validate a settings-section deep link against the shared nav. */
export function settingsSectionFromUrl(
    url: string,
    nav: NavKeyShape[] = ALL_NAV,
): string | null {
    const query = url.split('?')[1]?.split('#')[0] ?? '';
    const requested = new URLSearchParams(query).get(
        SETTINGS_SECTION_QUERY_KEY,
    );

    if (!requested) return null;

    const exists = nav.some(
        (group) =>
            group.key === requested ||
            group.children?.some((item) => item.key === requested),
    );

    return exists ? requested : null;
}
