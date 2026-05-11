<?php

declare(strict_types=1);

/*
 * Projects-domain UI strings — project show page, tabs, stats bar,
 * settings sections (details / members / danger zone), activity feed,
 * archive flow. Backs `t.projects.*` via the shared Inertia prop.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own `lang/<locale>/projects.php`.
 */
return [
    // ── Show page chrome (Show.tsx) ─────────────────────────────────
    'show.tab.relationships' => 'Relationships',
    'show.tab.lists' => 'Lists',
    'show.tab.structures' => 'Structures',
    'show.menu.activity' => 'Activity',
    'show.menu.ai_batches' => 'AI Batches',
    'show.menu.archive' => 'Archive',
    'show.menu.settings' => 'Settings',
    'show.owned_by' => 'By:',
    'show.blueprints_heading' => ':classification Blueprints',
    'show.view_toggle.expanded' => 'Expanded view',
    'show.view_toggle.list' => 'List view',
    'show.new_blueprint' => 'New Blueprint',
    'show.show_details' => 'Show Details',
    'show.hide_details' => 'Hide Details',

    // ── StatsBar (header stats strip) ───────────────────────────────
    'stats.entry.singular' => 'Entry',
    'stats.entry.plural' => 'Entries',
    'stats.blueprint.singular' => 'Blueprint',
    'stats.blueprint.plural' => 'Blueprints',
    'stats.member.singular' => 'Member',
    'stats.member.plural' => 'Members',
    'stats.ai_this_month' => 'AI This Month',

    // ── DangerZoneSection (project deletion) ────────────────────────
    'danger_zone.title' => 'Delete Project',
    'danger_zone.subtitle' => 'Permanently delete :project and all its entries, blueprints, and data. This action cannot be undone.',
    'danger_zone.button' => 'Delete',
    'danger_zone.modal.title' => 'Delete ":project"?',
    'danger_zone.modal.body' => 'All entries, blueprints, relationships, and AI data will be permanently lost.',
    'danger_zone.modal.confirm_instruction' => 'Type :name to confirm:',
    'danger_zone.modal.cancel' => 'Cancel',
    'danger_zone.modal.deleting' => 'Deleting…',
    'danger_zone.modal.submit' => 'Delete Project',

    // ── DashboardTab + BlueprintTable (blueprint grid/list views) ───
    'dashboard_tab.empty.title' => 'No :classification blueprints',
    'dashboard_tab.empty.subtitle' => 'Create a blueprint to get started.',
    'dashboard_tab.table.column.blueprint' => 'Blueprint',
    'dashboard_tab.table.column.entries' => 'Entries',
    'dashboard_tab.table.column.last_update' => 'Last Update',
    'dashboard_tab.table.column.open_aria' => 'Open',
    'dashboard_tab.table.dashboard_badge' => 'Dashboard',
    'dashboard_tab.table.dash' => '—',

    // ── BlueprintStatCard (expanded dashboard card) ─────────────────
    'blueprint_card.count.entry.singular' => 'entry',
    'blueprint_card.count.entry.plural' => 'entries',
    'blueprint_card.count.relationship.singular' => 'relationship',
    'blueprint_card.count.relationship.plural' => 'relationships',
    'blueprint_card.relationship.source' => 'Source',
    'blueprint_card.relationship.target' => 'Target',
    'blueprint_card.relationship.empty' => 'No relationships yet',
    'blueprint_card.relationship.deleted' => 'Deleted',
    'blueprint_card.entries.empty' => 'No entries yet',
    'blueprint_card.view_all' => 'View all',

    // ── RecentActivityFeed (used inside dashboard surfaces) ─────────
    'activity_feed.empty' => 'No recent activity',
];
