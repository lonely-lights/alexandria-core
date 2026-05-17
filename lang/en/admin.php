<?php

declare(strict_types=1);

/*
 * Admin panel UI strings — Stage 8c.
 *
 * Operator-facing copy. Distinct from user-facing surfaces — these
 * strings only appear under /admin/* and stay neutral / utilitarian
 * (no marketing tone).
 */

return [
    // ── Access denial ───────────────────────────────────────────────
    'access.denied' => 'You do not have administrator access.',

    // ── Navbar ──────────────────────────────────────────────────────
    'nav.badge' => 'Admin',
    'nav.dashboard' => 'Dashboard',
    'nav.users' => 'Users',
    'nav.projects' => 'Projects',
    'nav.permissions' => 'Permissions',
    'nav.registration' => 'Registration',
    'nav.back_to_app' => 'Back to app',

    // ── Dashboard ───────────────────────────────────────────────────
    'dashboard.title' => 'Admin dashboard',
    'dashboard.subtitle' => 'At-a-glance operator view of users, projects, and instance activity.',
    'dashboard.stat.users_total' => 'Total users',
    'dashboard.stat.projects_total' => 'Total projects',
    'dashboard.stat.entries_total' => 'Total entries',
    'dashboard.stat.delta.last_7_days' => '+:count in last 7 days',
    'dashboard.recent_signups.title' => 'Recent signups',
    'dashboard.recent_signups.empty' => 'No signups yet.',
    'dashboard.recent_projects.title' => 'Recent projects',
    'dashboard.recent_projects.empty' => 'No projects yet.',

    // ── Users surface (Stage 8c.B) ───────────────────────────────────
    'users.title' => 'Users',
    'users.subtitle' => ':count users registered.',
    'users.empty' => 'No users match the current filters.',
    'users.search_placeholder' => 'Search by name, display name, or email',
    'users.suspended_flash' => 'Your account has been suspended.',

    'users.col.name' => 'Name',
    'users.col.email' => 'Email',
    'users.col.roles' => 'Roles',
    'users.col.status' => 'Status',
    'users.col.joined' => 'Joined',

    'users.filter.all_roles' => 'All roles',
    'users.filter.clear' => 'Clear filters',

    'users.status.active' => 'Active',
    'users.status.unverified' => 'Unverified',
    'users.status.suspended' => 'Suspended',

    'users.pagination.range' => 'Showing :from–:to of :total',

    'users.detail.profile_facts' => 'Profile',
    'users.detail.roles' => 'App-level roles',
    'users.detail.fact.location' => 'Location',
    'users.detail.fact.joined' => 'Joined',
    'users.detail.fact.updated' => 'Updated',
    'users.detail.fact.email_verified' => 'Email verified',
    'users.detail.fact.unverified' => 'Unverified',
    'users.detail.fact.two_factor' => 'Two-factor',
    'users.detail.fact.enabled' => 'Enabled',
    'users.detail.fact.disabled' => 'Disabled',
    'users.detail.fact.suspended' => 'Suspended at',

    'users.role_editor.save' => 'Save roles',

    'users.action.suspend.label' => 'Suspend account',
    'users.action.suspend.confirm' => 'Suspend this account? They will be logged out immediately and blocked from signing back in.',
    'users.action.suspend.self_blocked' => 'You cannot suspend your own account.',
    'users.action.unsuspend.label' => 'Reactivate account',
    'users.action.force_reset.label' => 'Force password reset',
    'users.action.force_reset.confirm' => 'Send a password reset email to this user?',

    'users.flash.roles_updated' => 'Roles updated.',
    'users.flash.suspended' => 'Account suspended.',
    'users.flash.unsuspended' => 'Account reactivated.',
    'users.flash.reset_link_sent' => 'Password reset email sent.',
    'users.flash.reset_link_failed' => 'Could not send the password reset email — try again shortly.',
    'users.flash.cannot_suspend_self' => 'You cannot suspend your own account.',

    // ── Projects surface (Stage 8c.C) ────────────────────────────────
    'projects.title' => 'Projects',
    'projects.subtitle' => ':count projects across the instance.',
    'projects.empty' => 'No projects match the current filters.',
    'projects.search_placeholder' => 'Search by name, slug, or logline',
    'projects.no_owner' => 'No owner',

    'projects.col.name' => 'Project',
    'projects.col.owner' => 'Owner',
    'projects.col.entries' => 'Entries',
    'projects.col.blueprints' => 'blueprints',
    'projects.col.status' => 'Status',
    'projects.col.created' => 'Created',

    'projects.filter.all_statuses' => 'All statuses',
    'projects.filter.clear' => 'Clear filters',

    'projects.status.active' => 'Active',
    'projects.status.locked' => 'Locked',
    'projects.status.archived' => 'Archived',

    'projects.pagination.range' => 'Showing :from–:to of :total',

    'projects.detail.facts' => 'Project facts',
    'projects.detail.fact.owner' => 'Owner',
    'projects.detail.fact.created' => 'Created',
    'projects.detail.fact.updated' => 'Updated',
    'projects.detail.fact.locked' => 'Locked at',
    'projects.detail.fact.archived' => 'Archived at',

    'projects.detail.storage' => 'Storage',
    'projects.detail.stat.entries' => 'Entries',
    'projects.detail.stat.media_files' => 'Media files',
    'projects.detail.stat.storage_size' => 'Total size',

    'projects.detail.members' => 'Members',
    'projects.detail.members_empty' => 'No members beyond the owner yet.',

    'projects.action.lock.label' => 'Lock project',
    'projects.action.lock.confirm' => 'Lock this project? All writes will be denied until you unlock it.',
    'projects.action.unlock.label' => 'Unlock project',
    'projects.action.archive.label' => 'Archive project',
    'projects.action.archive.confirm' => 'Archive this project? It will be hidden from default lists but still browsable by the owner.',
    'projects.action.unarchive.label' => 'Unarchive project',
    'projects.action.transfer.label' => 'Transfer ownership',

    'projects.transfer.title' => 'Transfer ownership',
    'projects.transfer.subtitle' => 'Pick a user to become the new owner of this project.',
    'projects.transfer.search_label' => 'Search users',
    'projects.transfer.search_placeholder' => 'Type to search by name or email',
    'projects.transfer.searching' => 'Searching…',
    'projects.transfer.type_to_search' => 'Start typing to find a user.',
    'projects.transfer.no_matches' => 'No users match that search.',
    'projects.transfer.submit' => 'Transfer ownership',

    'projects.flash.locked' => 'Project locked.',
    'projects.flash.unlocked' => 'Project unlocked.',
    'projects.flash.archived' => 'Project archived.',
    'projects.flash.unarchived' => 'Project unarchived.',
    'projects.flash.transferred' => 'Ownership transferred.',
    'projects.flash.transfer_same_owner' => 'That user already owns this project.',
];
