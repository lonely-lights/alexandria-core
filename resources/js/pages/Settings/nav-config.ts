import type { Translator } from '@alexandria/hooks/useT';

/**
 * Settings nav structure, shared between the desktop rail nav (in
 * `<SettingsBody>`) and the mobile drilldown (`<MobileNav>`). Keep this
 * file presentation-free: it's just data that drives the active-section
 * + expanded-group state machine.
 *
 * Labels and search synonyms are translation KEYS, not English. The lang
 * source is `lang/en/settings.php` (`nav.*` for labels, `nav_terms.*` for
 * the `|`-separated synonym lists). Run the tree through `resolveNav()`
 * with the page's `useT()` translator before rendering or searching it.
 */

export interface NavItem {
    key: string;
    /**
     * Translation key for the human-facing label (`settings.nav.profile`).
     * `resolveNav` falls back to the raw value on a miss, so consumer apps
     * may still register a literal label through `extraNav`.
     */
    label: string;
    icon: string;
    color?: string;
    /**
     * Translation key whose value is a `|`-separated list of control names
     * and synonyms used by Settings search (`settings.nav_terms.pref-appearance`).
     */
    searchTermsKey?: string;
    children?: NavItem[];
}

/** A `NavItem` with its label and search terms materialized as display text. */
export interface ResolvedNavItem {
    key: string;
    label: string;
    icon: string;
    color?: string;
    /** Human-facing control names and synonyms used by Settings search. */
    searchTerms: string[];
    children?: ResolvedNavItem[];
}

export interface SettingsSearchResult {
    group: ResolvedNavItem;
    item: ResolvedNavItem;
    matchingTerms: string[];
}

const SEARCH_TERMS_SEPARATOR = '|';

export const ALL_NAV: NavItem[] = [
    {
        key: 'profile', label: 'settings.nav.profile', icon: 'fa-user', color: 'primary',
        children: [
            { key: 'identity', label: 'settings.nav.identity', icon: 'fa-user-circle', searchTermsKey: 'settings.nav_terms.identity' },
            { key: 'about', label: 'settings.nav.about', icon: 'fa-feather', searchTermsKey: 'settings.nav_terms.about' },
            { key: 'details', label: 'settings.nav.details', icon: 'fa-circle-info', searchTermsKey: 'settings.nav_terms.details' },
            { key: 'links', label: 'settings.nav.links', icon: 'fa-link', searchTermsKey: 'settings.nav_terms.links' },
            { key: 'account', label: 'settings.nav.account', icon: 'fa-user-gear', searchTermsKey: 'settings.nav_terms.account' },
            { key: 'security', label: 'settings.nav.security', icon: 'fa-key', searchTermsKey: 'settings.nav_terms.security' },
        ],
    },
    {
        key: 'preferences', label: 'settings.nav.preferences', icon: 'fa-sliders',
        children: [
            { key: 'pref-appearance', label: 'settings.nav.pref-appearance', icon: 'fa-palette', searchTermsKey: 'settings.nav_terms.pref-appearance' },
            { key: 'pref-behavior', label: 'settings.nav.pref-behavior', icon: 'fa-computer-mouse', searchTermsKey: 'settings.nav_terms.pref-behavior' },
            { key: 'pref-workspace', label: 'settings.nav.pref-workspace', icon: 'fa-pen-ruler', searchTermsKey: 'settings.nav_terms.pref-workspace' },
            { key: 'pref-language', label: 'settings.nav.pref-language', icon: 'fa-globe', searchTermsKey: 'settings.nav_terms.pref-language' },
            { key: 'pref-notifications', label: 'settings.nav.pref-notifications', icon: 'fa-bell', searchTermsKey: 'settings.nav_terms.pref-notifications' },
        ],
    },
    {
        key: 'privacy', label: 'settings.nav.privacy', icon: 'fa-shield-halved',
        children: [
            { key: 'privacy-visibility', label: 'settings.nav.privacy-visibility', icon: 'fa-eye', searchTermsKey: 'settings.nav_terms.privacy-visibility' },
            { key: 'privacy-settings', label: 'settings.nav.privacy-settings', icon: 'fa-lock', searchTermsKey: 'settings.nav_terms.privacy-settings' },
            { key: 'privacy-lists', label: 'settings.nav.privacy-lists', icon: 'fa-users-rectangle', searchTermsKey: 'settings.nav_terms.privacy-lists' },
        ],
    },
    {
        key: 'tools', label: 'settings.nav.tools', icon: 'fa-toolbox',
        children: [
            { key: 'tools-editor', label: 'settings.nav.tools-editor', icon: 'fa-pen-to-square', searchTermsKey: 'settings.nav_terms.tools-editor' },
            { key: 'tools-shortcuts', label: 'settings.nav.tools-shortcuts', icon: 'fa-keyboard', searchTermsKey: 'settings.nav_terms.tools-shortcuts' },
            { key: 'tools-integrations', label: 'settings.nav.tools-integrations', icon: 'fa-plug', searchTermsKey: 'settings.nav_terms.tools-integrations' },
        ],
    },
    {
        key: 'ai', label: 'settings.nav.ai', icon: 'fa-microchip',
        children: [
            { key: 'ai-connection', label: 'settings.nav.ai-connection', icon: 'fa-plug', searchTermsKey: 'settings.nav_terms.ai-connection' },
            { key: 'ai-models', label: 'settings.nav.ai-models', icon: 'fa-cubes', searchTermsKey: 'settings.nav_terms.ai-models' },
            { key: 'ai-usage', label: 'settings.nav.ai-usage', icon: 'fa-chart-pie', searchTermsKey: 'settings.nav_terms.ai-usage' },
            { key: 'ai-preferences', label: 'settings.nav.ai-preferences', icon: 'fa-sliders', searchTermsKey: 'settings.nav_terms.ai-preferences' },
        ],
    },
    {
        key: 'accessibility', label: 'settings.nav.accessibility', icon: 'fa-universal-access',
        children: [
            { key: 'a11y-visual', label: 'settings.nav.a11y-visual', icon: 'fa-eye', searchTermsKey: 'settings.nav_terms.a11y-visual' },
            { key: 'a11y-motion', label: 'settings.nav.a11y-motion', icon: 'fa-wand-magic-sparkles', searchTermsKey: 'settings.nav_terms.a11y-motion' },
            { key: 'a11y-assistive', label: 'settings.nav.a11y-assistive', icon: 'fa-universal-access', searchTermsKey: 'settings.nav_terms.a11y-assistive' },
        ],
    },
];

/**
 * Materialize one nav item's display text. `t(key, key)` means a literal
 * (untranslated) label registered by a consumer app passes straight
 * through; a missing `searchTermsKey` yields no search terms.
 */
export function resolveNavItem(item: NavItem, t: Translator): ResolvedNavItem {
    const terms = item.searchTermsKey ? t(item.searchTermsKey, '') : '';

    return {
        key: item.key,
        label: t(item.label, item.label),
        icon: item.icon,
        color: item.color,
        searchTerms: terms
            .split(SEARCH_TERMS_SEPARATOR)
            .map((term) => term.trim())
            .filter((term) => term.length > 0),
        children: item.children?.map((child) => resolveNavItem(child, t)),
    };
}

/** Resolve a whole nav tree (built-ins plus any consumer-app extras). */
export function resolveNav(nav: NavItem[], t: Translator): ResolvedNavItem[] {
    return nav.map((item) => resolveNavItem(item, t));
}

function normalizeSearchValue(value: string): string {
    return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Search at section granularity. A control name such as "Font Size"
 * resolves to its owning Appearance section so selecting the result
 * opens the complete editable card rather than an isolated toggle.
 */
export function searchSettings(nav: ResolvedNavItem[], query: string): SettingsSearchResult[] {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return [];

    const tokens = normalizedQuery.split(' ');
    const results: SettingsSearchResult[] = [];

    for (const group of nav) {
        for (const item of group.children ?? []) {
            const values = [group.label, item.label, ...item.searchTerms];
            const haystack = normalizeSearchValue(values.join(' '));

            if (!tokens.every((token) => haystack.includes(token))) continue;

            results.push({
                group,
                item,
                matchingTerms: item.searchTerms.filter((term) => {
                    const normalizedTerm = normalizeSearchValue(term);
                    return tokens.every((token) => normalizedTerm.includes(token));
                }),
            });
        }
    }

    return results;
}
