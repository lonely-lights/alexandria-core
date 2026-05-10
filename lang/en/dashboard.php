<?php

declare(strict_types=1);

/*
 * Dashboard page strings — greetings, section headers, view-toggle
 * labels, stat tiles, empty states, and table headers on /dashboard.
 *
 * Surfaced React-side via the `t.dashboard` shared prop and accessed
 * through `useT()`: `t('dashboard.greeting.morning')`,
 * `t('dashboard.section.projects')`, etc.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/dashboard.php.
 */
return [
    // ── Page chrome ──────────────────────────────────────────────────
    'page.title' => 'Dashboard',
    'page.tagline' => 'Your worldbuilding at a glance.',

    // ── Time-of-day greeting prefix ─────────────────────────────────
    'greeting.late_night' => 'Late night',
    'greeting.morning' => 'Good morning',
    'greeting.afternoon' => 'Good afternoon',
    'greeting.evening' => 'Good evening',
    'greeting.night' => 'Good night',

    // ── Quick-action tiles ──────────────────────────────────────────
    'quick.profile' => 'Profile',
    'quick.ai_suggestions' => 'AI suggestions',
    'quick.appearance' => 'Appearance',

    // ── Stats strip ─────────────────────────────────────────────────
    'stat.projects' => 'Projects',
    'stat.entries' => 'Entries',
    'stat.blueprints' => 'Blueprints',

    // ── Section headers ─────────────────────────────────────────────
    'section.projects' => 'Projects',
    'section.recent' => 'Recent',
    'section.world_singular' => 'world',
    'section.world_plural' => 'worlds',

    // ── Empty states ────────────────────────────────────────────────
    'empty.projects.title' => 'No projects yet',
    'empty.projects.description' => 'Create your first project to start building your world.',
    'empty.recent.text' => 'No recent activity',

    // ── View toggle ─────────────────────────────────────────────────
    'view.aria_label' => 'Project view mode',
    'view.grid' => 'Grid',
    'view.rows' => 'Rows',
    'view.table' => 'Table',

    // ── Project row stats ───────────────────────────────────────────
    'row.entries' => 'entries',
    'row.blueprints' => 'blueprints',
    'row.members' => 'members',
    'row.updated' => 'Updated',

    // ── Table column headers ────────────────────────────────────────
    'table.project' => 'Project',
    'table.entries' => 'Entries',
    'table.blueprints' => 'Blueprints',
    'table.members' => 'Members',
    'table.updated' => 'Updated',
];
