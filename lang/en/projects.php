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

    // ── ActivityTab (paginated event feed + filters) ────────────────
    'activity_tab.filter.type' => 'Type',
    'activity_tab.filter.type_all' => 'All',
    'activity_tab.filter.type_entry' => 'Entries',
    'activity_tab.filter.type_blueprint' => 'Blueprints',
    'activity_tab.filter.blueprint' => 'Blueprint',
    'activity_tab.filter.event' => 'Event',
    'activity_tab.filter.user' => 'User',
    'activity_tab.filter.from' => 'From',
    'activity_tab.filter.to' => 'To',
    'activity_tab.filter.per_page' => 'Per page',
    'activity_tab.filter.all' => 'All',
    'activity_tab.filter.clear' => 'Clear',
    'activity_tab.column.subject' => 'Subject',
    'activity_tab.column.event' => 'Event',
    'activity_tab.column.description' => 'Description',
    'activity_tab.column.user' => 'User',
    'activity_tab.column.when' => 'When',
    'activity_tab.empty.title' => 'No activity found',
    'activity_tab.empty.subtitle' => 'Try adjusting your filters.',
    'activity_tab.subject.deleted' => 'Deleted',
    'activity_tab.subject.blueprint_label' => 'Blueprint',
    'activity_tab.causer.system' => 'System',

    // Event-type translations — fall through to title-cased slug if a
    // server-emitted event name isn't keyed here.
    'activity_tab.event.created' => 'Created',
    'activity_tab.event.updated' => 'Updated',
    'activity_tab.event.deleted' => 'Deleted',
    'activity_tab.event.restored' => 'Restored',
    'activity_tab.event.archived' => 'Archived',
    'activity_tab.event.unarchived' => 'Unarchived',
    'activity_tab.event.published' => 'Published',
    'activity_tab.event.unpublished' => 'Unpublished',

    // ── MembersSection (member list + invite + role-edit modals) ────
    'members.title' => 'Members',
    'members.invite' => 'Invite',
    'members.role.owner' => 'Owner',
    'members.role.editor' => 'Editor',
    'members.role.collaborator' => 'Collaborator',
    'members.role.viewer' => 'Viewer',
    'members.invite_modal.title' => 'Invite Member',
    'members.invite_modal.email_label' => 'Email',
    'members.invite_modal.email_placeholder' => 'user@example.com',
    'members.invite_modal.role_label' => 'Role',
    'members.invite_modal.cancel' => 'Cancel',
    'members.invite_modal.submit' => 'Invite',
    'members.edit_modal.title' => 'Change Role',
    'members.edit_modal.cancel' => 'Cancel',
    'members.edit_modal.submit' => 'Save',
];
