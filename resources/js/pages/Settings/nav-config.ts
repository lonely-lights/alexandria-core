/**
 * Settings nav structure — shared between the desktop rail nav (in
 * `<SettingsBody>`) and the mobile drilldown (`<MobileNav>`). Keep this
 * file presentation-free: it's just data that drives the active-section
 * + expanded-group state machine.
 */

export interface NavItem {
    key: string;
    label: string;
    icon: string;
    color?: string;
    /** Human-facing control names and synonyms used by Settings search. */
    searchTerms?: string[];
    children?: NavItem[];
}

export interface SettingsSearchResult {
    group: NavItem;
    item: NavItem;
    matchingTerms: string[];
}

export const ALL_NAV: NavItem[] = [
    {
        key: 'profile', label: 'Profile', icon: 'fa-user', color: 'primary',
        children: [
            { key: 'identity', label: 'Identity', icon: 'fa-user-circle', searchTerms: ['Display Name', 'Username', 'Avatar', 'Profile Picture', 'Banner', 'Pronouns'] },
            { key: 'about', label: 'About', icon: 'fa-feather', searchTerms: ['Tagline', 'Biography', 'Bio', 'Private Bio'] },
            { key: 'details', label: 'Details', icon: 'fa-circle-info', searchTerms: ['Location', 'Website', 'Birthday', 'Date of Birth'] },
            { key: 'links', label: 'Links', icon: 'fa-link', searchTerms: ['Social Links', 'Website Links', 'Support Links'] },
            { key: 'account', label: 'Account', icon: 'fa-user-gear', searchTerms: ['Email', 'Password', 'Delete Account'] },
            { key: 'security', label: 'Security', icon: 'fa-key', searchTerms: ['Two-factor Authentication', '2FA', 'Recovery Codes'] },
        ],
    },
    {
        key: 'preferences', label: 'Preferences', icon: 'fa-sliders',
        children: [
            { key: 'pref-appearance', label: 'Appearance', icon: 'fa-palette', searchTerms: ['Color Mode', 'Light Mode', 'Dark Mode', 'System Mode', 'Font Size', 'Theme', 'Theme Preset', 'Fine-tune Theme'] },
            { key: 'pref-behavior', label: 'Behavior', icon: 'fa-computer-mouse', searchTerms: ['Hover-off Auto-dismiss', 'Menu Auto-dismiss', 'Menu Dismiss Delay', 'Hover Behavior'] },
            { key: 'pref-workspace', label: 'Workspace', icon: 'fa-pen-ruler', searchTerms: ['Compact Mode', 'Dense Layout', 'Show Section Type Labels', 'Act Labels', 'Scene Labels', 'Writing Workspace'] },
            { key: 'pref-language', label: 'Formats', icon: 'fa-globe', searchTerms: ['Date Format', 'Time Format', 'First Day of Week', 'Number Format', 'Regional Formats'] },
            { key: 'pref-notifications', label: 'Notifications', icon: 'fa-bell', searchTerms: ['Email Notifications', 'Push Notifications', 'In-App Notifications', 'Mentions', 'Comments', 'Project Invites', 'Product Updates'] },
        ],
    },
    {
        key: 'privacy', label: 'Privacy', icon: 'fa-shield-halved',
        children: [
            { key: 'privacy-visibility', label: 'Visibility', icon: 'fa-eye', searchTerms: ['Field Visibility', 'Profile Visibility'] },
            { key: 'privacy-settings', label: 'Privacy', icon: 'fa-lock', searchTerms: ['Online Status', 'Activity Status', 'Project Invites'] },
            { key: 'privacy-lists', label: 'Lists', icon: 'fa-users-rectangle', searchTerms: ['Privacy Lists', 'Custom Groups', 'Access Lists'] },
        ],
    },
    {
        key: 'tools', label: 'Tools', icon: 'fa-toolbox',
        children: [
            { key: 'tools-editor', label: 'Editor', icon: 'fa-pen-to-square', searchTerms: ['Default Editor Mode', 'Auto-Save', 'Spell Check', 'Word Count', 'Reading Time', 'Note Visibility'] },
            { key: 'tools-shortcuts', label: 'Shortcuts', icon: 'fa-keyboard', searchTerms: ['Keyboard Shortcuts', 'Key Bindings', 'Hotkeys'] },
            { key: 'tools-integrations', label: 'Integrations', icon: 'fa-plug', searchTerms: ['Connected Apps', 'Google Drive', 'Dropbox', 'Notion'] },
        ],
    },
    {
        key: 'ai', label: 'AI', icon: 'fa-microchip',
        children: [
            { key: 'ai-connection', label: 'Connection', icon: 'fa-plug', searchTerms: ['API Keys', 'AI Providers', 'Bring Your Own Key'] },
            { key: 'ai-models', label: 'Models', icon: 'fa-cubes', searchTerms: ['AI Model Selection', 'Default Model'] },
            { key: 'ai-usage', label: 'Usage', icon: 'fa-chart-pie', searchTerms: ['AI Usage', 'Tokens', 'Monthly Usage'] },
            { key: 'ai-preferences', label: 'Preferences', icon: 'fa-sliders', searchTerms: ['AI Suggestions', 'Response Length', 'Auto-categorize'] },
        ],
    },
    {
        key: 'accessibility', label: 'Accessibility', icon: 'fa-universal-access',
        children: [
            { key: 'a11y-visual', label: 'Visual', icon: 'fa-eye', searchTerms: ['High Contrast', 'Focus Indicators', 'Dyslexia-Friendly Font'] },
            { key: 'a11y-motion', label: 'Motion', icon: 'fa-wand-magic-sparkles', searchTerms: ['Reduced Motion', 'Reduce Motion', 'Animations', 'Transitions'] },
            { key: 'a11y-assistive', label: 'Assistive', icon: 'fa-universal-access', searchTerms: ['Screen Reader Mode', 'Keyboard Shortcuts', 'Assistive Technology'] },
        ],
    },
];

function normalizeSearchValue(value: string): string {
    return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Search at section granularity. A control name such as "Font Size"
 * resolves to its owning Appearance section so selecting the result
 * opens the complete editable card rather than an isolated toggle.
 */
export function searchSettings(nav: NavItem[], query: string): SettingsSearchResult[] {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return [];

    const tokens = normalizedQuery.split(' ');
    const results: SettingsSearchResult[] = [];

    for (const group of nav) {
        for (const item of group.children ?? []) {
            const values = [group.label, item.label, ...(item.searchTerms ?? [])];
            const haystack = normalizeSearchValue(values.join(' '));

            if (!tokens.every((token) => haystack.includes(token))) continue;

            results.push({
                group,
                item,
                matchingTerms: (item.searchTerms ?? []).filter((term) => {
                    const normalizedTerm = normalizeSearchValue(term);
                    return tokens.every((token) => normalizedTerm.includes(token));
                }),
            });
        }
    }

    return results;
}
