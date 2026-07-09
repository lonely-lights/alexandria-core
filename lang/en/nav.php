<?php

declare(strict_types=1);

/*
 * Navigation chrome strings — sidebar rows, section dividers, empty
 * states. App-level (project-agnostic) labels live here so the same
 * keys back navigation from anywhere in the app.
 *
 * Surfaced React-side via the `t.nav` shared prop and accessed
 * through `useT()`: `t('nav.dashboard')`, `t('nav.notes')`, etc.
 */
return [
    // ── Top-level sidebar rows ──────────────────────────────────────
    'dashboard' => 'Dashboard',
    'admin' => 'Admin Panel',
    'writing' => 'Writing',
    'notes' => 'Notes',
    'notebooks' => 'Notebooks',
    'ai_hub' => 'AI Hub',
    'note_queue' => 'Note Queue',
    'commands' => 'Commands',
    'models' => 'Models',
    'archive' => 'Archive',
    'recycle_bin' => 'Recycle Bin',
    'list_manager' => 'List Manager',
    'structural_manager' => 'Structural Manager',
    'relationship_manager' => 'Relationship Manager',

    // ── Section dividers ────────────────────────────────────────────
    'section.ai_notes' => 'AI & Notes',
    'section.tools' => 'Tools',
    'section.projects' => 'Projects',

    // ── Empty state + CTAs ──────────────────────────────────────────
    'no_projects' => 'No projects yet',
    'create_project' => 'Create Project',
    'go_to_project' => 'Go to :project',
];
