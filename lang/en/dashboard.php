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

    // ── Stats strip + project-row chip tooltips ─────────────────────
    'stat.projects' => 'Projects',
    'stat.entries' => 'Entries',
    'stat.blueprints' => 'Blueprints',
    'stat.members' => 'Members',

    // ── Section headers ─────────────────────────────────────────────
    'section.projects' => 'Projects',
    'section.recent' => 'Recent',
    'section.project_singular' => 'project',
    'section.project_plural' => 'projects',

    // ── Empty states ────────────────────────────────────────────────
    'empty.projects.title' => 'No projects yet',
    'empty.projects.description' => 'Create your first project to start building your world.',
    'empty.recent.text' => 'No recent activity',

    // ── Recent section controls ─────────────────────────────────────
    'recent.filter.aria_label' => 'Recent activity filter',
    'recent.filter.both' => 'Both',
    'recent.filter.entries' => 'Entries',
    'recent.filter.notes' => 'Notes',
    'recent.limit.label' => 'Show',
    'recent.limit.aria_label' => 'Number of recent items to show',
    'recent.note_kind' => 'Note',
    'recent.note_untitled' => 'Untitled note',

    // ── View toggle ─────────────────────────────────────────────────
    'view.aria_label' => 'Project view mode',
    'view.grid' => 'Grid',
    'view.rows' => 'Rows',
    'view.table' => 'Table',

    // ── Project row ─────────────────────────────────────────────────
    // (Stat chip labels live under `stat.*` above — shared with the
    // top stats strip + the grid-card chips so the same tooltip copy
    // appears wherever the icons render.)
    'row.updated' => 'Updated',

    // ── Table column headers ────────────────────────────────────────
    'table.project' => 'Project',
    'table.entries' => 'Entries',
    'table.blueprints' => 'Blueprints',
    'table.members' => 'Members',
    'table.updated' => 'Updated',
];
