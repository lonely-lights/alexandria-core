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
];
