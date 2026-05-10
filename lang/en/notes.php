<?php

declare(strict_types=1);

/*
 * Notes-page UI strings — page chrome, tab labels, action buttons,
 * dashboard view, notebooks view, modal copy, and the main notes-list
 * surface across /p/{slug}/notes.
 *
 * Surfaced React-side via the `t.notes` shared prop and accessed
 * through `useT()`: `t('notes.tab.dashboard')`,
 * `t('notes.dashboard.stat.active')`, etc.
 *
 * Sentence-style strings with values inlined use `:placeholder` syntax
 * — the React side does a single `.replace(':placeholder', value)` at
 * the call site since useT() doesn't support interpolation.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/notes.php.
 */
return [
    // ── Page chrome ──────────────────────────────────────────────────
    'page.title' => 'Notes',
    'page.heading' => 'Notes',
    'page.tagline' => 'Manage notes for :project',
    'page.breadcrumb' => 'Notes',

    // ── Action buttons + overflow menu ──────────────────────────────
    'action.new_note' => 'New Note',
    'action.new_notebook' => 'New Notebook',
    'action.more_aria' => 'More actions',
    'action.sorting_history' => 'Sorting History',
    'action.import_notes' => 'Import Notes',

    // ── Top-level tabs ──────────────────────────────────────────────
    'tab.dashboard' => 'Dashboard',
    'tab.notes' => 'Notes',
    'tab.notebooks' => 'Notebooks',

    // ── Dashboard view ──────────────────────────────────────────────
    'dashboard.recent_heading' => 'Recent Notes',
    'dashboard.most_recent_label' => 'Most Recent',
    'dashboard.empty.no_notes' => 'No notes yet',
    'dashboard.note.untitled' => 'Untitled',
    'dashboard.note.no_content' => 'No content',

    // Stat-row cards
    'dashboard.stat.total' => 'Total',
    'dashboard.stat.active' => 'Active',
    'dashboard.stat.archived' => 'Archived',
    'dashboard.stat.trashed' => 'Trashed',

    // Workflow cards
    'dashboard.workflow.uncategorized.label' => 'Uncategorized',
    'dashboard.workflow.uncategorized.description' => 'Notes not yet routed to any blueprint',
    'dashboard.workflow.pending_routing.label' => 'Pending Routing',
    'dashboard.workflow.pending_routing.description' => 'Blueprint approvals awaiting your action',
    'dashboard.workflow.pinned.label' => 'Pinned',
    'dashboard.workflow.pinned.description' => 'Your bookmarked notes',
];
