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
    children?: NavItem[];
}

export const ALL_NAV: NavItem[] = [
    {
        key: 'profile', label: 'Profile', icon: 'fa-user', color: 'primary',
        children: [
            { key: 'identity', label: 'Identity', icon: 'fa-user-circle' },
            { key: 'about', label: 'About', icon: 'fa-feather' },
            { key: 'details', label: 'Details', icon: 'fa-circle-info' },
            { key: 'links', label: 'Links', icon: 'fa-link' },
            { key: 'account', label: 'Account', icon: 'fa-user-gear' },
        ],
    },
    {
        key: 'preferences', label: 'Preferences', icon: 'fa-sliders',
        children: [
            { key: 'pref-appearance', label: 'Appearance', icon: 'fa-palette' },
            { key: 'pref-language', label: 'Formats', icon: 'fa-globe' },
            { key: 'pref-notifications', label: 'Notifications', icon: 'fa-bell' },
        ],
    },
    {
        key: 'privacy', label: 'Privacy', icon: 'fa-shield-halved',
        children: [
            { key: 'privacy-visibility', label: 'Visibility', icon: 'fa-eye' },
            { key: 'privacy-settings', label: 'Privacy', icon: 'fa-lock' },
            { key: 'privacy-lists', label: 'Lists', icon: 'fa-users-rectangle' },
        ],
    },
    {
        key: 'tools', label: 'Tools', icon: 'fa-toolbox',
        children: [
            { key: 'tools-editor', label: 'Editor', icon: 'fa-pen-to-square' },
            { key: 'tools-shortcuts', label: 'Shortcuts', icon: 'fa-keyboard' },
            { key: 'tools-integrations', label: 'Integrations', icon: 'fa-plug' },
        ],
    },
    {
        key: 'ai', label: 'AI', icon: 'fa-microchip',
        children: [
            { key: 'ai-connection', label: 'Connection', icon: 'fa-plug' },
            { key: 'ai-models', label: 'Models', icon: 'fa-cubes' },
            { key: 'ai-usage', label: 'Usage', icon: 'fa-chart-pie' },
            { key: 'ai-preferences', label: 'Preferences', icon: 'fa-sliders' },
        ],
    },
    {
        key: 'accessibility', label: 'Accessibility', icon: 'fa-universal-access',
        children: [
            { key: 'a11y-visual', label: 'Visual', icon: 'fa-eye' },
            { key: 'a11y-motion', label: 'Motion', icon: 'fa-wand-magic-sparkles' },
            { key: 'a11y-assistive', label: 'Assistive', icon: 'fa-universal-access' },
        ],
    },
];
