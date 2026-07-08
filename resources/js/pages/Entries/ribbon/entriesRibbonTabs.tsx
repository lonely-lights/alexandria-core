import { registerRibbonTabs } from '@alexandria/ribbon/ribbonRegistry';
import type { RibbonTab } from '@alexandria/ribbon/types';

import type { EntriesRibbonContext } from './entriesRibbonContext';

/**
 * Entry Show page ribbon tabs (Stage 11 Slice 4, Task 3) —
 * File / View. Controls are pure data over EntriesRibbonContext;
 * Show.tsx registers them once at module scope via registerEntriesRibbon().
 *
 * Mounting strategy: `bandTabId="view"` keeps the View navigation
 * controls always visible in the icon band. The File tab opens as a
 * dropdown menu (same pattern as the writing workspace's File/View tabs
 * with the Edit band always showing). Read-only users see only View
 * (empty-tab rule hides File when all its controls are permission-gated).
 *
 * AI tab: omitted — no AI actions exist on Entries Show.
 */

type Ctx = EntriesRibbonContext;

// ── File tab — edit commands, permission-gated ─────────────────────────────

const fileTab: RibbonTab<Ctx> = {
    id: 'file',
    labelKey: 'entries.ribbon.tab_file',
    groups: [
        {
            id: 'goto',
            labelKey: 'entries.ribbon.group_goto',
            controls: [
                {
                    id: 'view-in-tree',
                    type: 'button',
                    icon: 'fa-solid fa-sitemap',
                    labelKey: 'entries.show.menu.view_in_tree',
                    visible: (ctx) => ctx.showTreeView,
                    onAction: (ctx) => ctx.actions.goToTree(),
                },
                {
                    id: 'all-entries',
                    type: 'button',
                    icon: 'fa-solid fa-list',
                    labelKey: 'entries.show.menu.all_plural',
                    labelFn: (ctx) => ctx.allEntriesLabel,
                    onAction: (ctx) => ctx.actions.goToBlueprint(),
                },
            ],
        },
        {
            id: 'actions',
            labelKey: 'entries.ribbon.group_actions',
            controls: [
                {
                    id: 'edit-entry',
                    type: 'button',
                    icon: 'fa-solid fa-pencil',
                    labelKey: 'entries.ribbon.edit_entry',
                    requires: { permission: 'entry.update' },
                    onAction: (ctx) => ctx.actions.editEntry(),
                },
                {
                    id: 'entry-settings',
                    type: 'button',
                    icon: 'fa-solid fa-palette',
                    labelKey: 'entries.ribbon.entry_settings',
                    requires: { permission: 'entry.update' },
                    onAction: (ctx) => ctx.actions.openSettings(),
                },
                {
                    id: 'delete-entry',
                    type: 'button',
                    icon: 'fa-solid fa-trash',
                    labelKey: 'entries.ribbon.delete_entry',
                    requires: { permission: 'entry.delete' },
                    onAction: (ctx) => ctx.actions.deleteEntry(),
                },
            ],
        },
    ],
};

// ── View tab — section navigation, always visible ──────────────────────────

const viewTab: RibbonTab<Ctx> = {
    id: 'view',
    labelKey: 'entries.ribbon.tab_view',
    groups: [
        {
            id: 'navigation',
            labelKey: 'entries.ribbon.group_navigation',
            controls: [
                {
                    id: 'tab-overview',
                    type: 'toggle',
                    icon: 'fa-solid fa-eye',
                    labelKey: 'entries.ribbon.tab.overview',
                    active: (ctx) => ctx.activeTab === 'overview',
                    onAction: (ctx) => ctx.actions.setTab('overview'),
                },
                {
                    id: 'tab-structure',
                    type: 'toggle',
                    icon: 'fa-solid fa-sitemap',
                    labelKey: 'entries.ribbon.tab.structure',
                    visible: (ctx) => ctx.hasChildren,
                    active: (ctx) => ctx.activeTab === 'structure',
                    onAction: (ctx) => ctx.actions.setTab('structure'),
                },
                {
                    id: 'tab-timeline',
                    type: 'toggle',
                    icon: 'fa-solid fa-timeline',
                    labelKey: 'entries.ribbon.tab.timeline',
                    visible: (ctx) => ctx.hasTimelineEvents,
                    active: (ctx) => ctx.activeTab === 'timeline',
                    onAction: (ctx) => ctx.actions.setTab('timeline'),
                },
                {
                    id: 'tab-connections',
                    type: 'toggle',
                    icon: 'fa-solid fa-share-nodes',
                    labelKey: 'entries.ribbon.tab.connections',
                    visible: (ctx) => ctx.hasConnections,
                    active: (ctx) => ctx.activeTab === 'connections',
                    onAction: (ctx) => ctx.actions.setTab('connections'),
                },
                {
                    id: 'tab-attributes',
                    type: 'toggle',
                    icon: 'fa-solid fa-list',
                    labelKey: 'entries.ribbon.tab.attributes',
                    visible: (ctx) => ctx.hasAttributes,
                    active: (ctx) => ctx.activeTab === 'attributes',
                    onAction: (ctx) => ctx.actions.setTab('attributes'),
                },
                {
                    id: 'tab-relationships',
                    type: 'toggle',
                    icon: 'fa-solid fa-diagram-project',
                    labelKey: 'entries.ribbon.tab.relationships',
                    visible: (ctx) => ctx.hasRelationships,
                    active: (ctx) => ctx.activeTab === 'relationships',
                    onAction: (ctx) => ctx.actions.setTab('relationships'),
                },
                {
                    id: 'tab-mentions',
                    type: 'toggle',
                    icon: 'fa-solid fa-at',
                    labelKey: 'entries.ribbon.tab.mentions',
                    visible: (ctx) => ctx.hasMentions,
                    active: (ctx) => ctx.activeTab === 'mentions',
                    onAction: (ctx) => ctx.actions.setTab('mentions'),
                },
                {
                    id: 'tab-mentioned-in',
                    type: 'toggle',
                    icon: 'fa-solid fa-reply',
                    labelKey: 'entries.ribbon.tab.mentioned_in',
                    visible: (ctx) => ctx.hasMentionedIn,
                    active: (ctx) => ctx.activeTab === 'mentioned_in',
                    onAction: (ctx) => ctx.actions.setTab('mentioned_in'),
                },
                {
                    id: 'tab-media',
                    type: 'toggle',
                    icon: 'fa-solid fa-images',
                    labelKey: 'entries.ribbon.tab.media',
                    active: (ctx) => ctx.activeTab === 'media',
                    onAction: (ctx) => ctx.actions.setTab('media'),
                },
                {
                    id: 'tab-history',
                    type: 'toggle',
                    icon: 'fa-solid fa-clock-rotate-left',
                    labelKey: 'entries.ribbon.tab.history',
                    visible: (ctx) => ctx.hasHistory,
                    active: (ctx) => ctx.activeTab === 'history',
                    onAction: (ctx) => ctx.actions.setTab('history'),
                },
            ],
        },
    ],
};

/** Exported raw for tests — the registry deep-merges a copy at read time. */
export const ENTRIES_TABS: RibbonTab<Ctx>[] = [fileTab, viewTab];

let registered = false;

/** Idempotent — Show.tsx calls this at module scope. */
export function registerEntriesRibbon(): void {
    if (registered) {
        return;
    }

    registered = true;
    registerRibbonTabs('entries', ENTRIES_TABS as RibbonTab<unknown>[]);
}
