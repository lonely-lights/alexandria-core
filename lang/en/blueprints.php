<?php

declare(strict_types=1);

/*
 * Blueprints-page UI strings — page chrome, tab labels, view + structure
 * + connections surfaces across /p/{project}/{blueprint}.
 *
 * Surfaced React-side via the `t.blueprints` shared prop (registered in
 * HandleInertiaRequests::resolveSharedTranslations()) and accessed via
 * `useT()`: `t('blueprints.tab.table')`, `t('blueprints.entries.empty')`,
 * etc.
 *
 * Sentence-style strings with values inlined use `:placeholder` syntax —
 * the React side does a single `.replace(':placeholder', value)` at the
 * call site since useT() doesn't support interpolation.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/blueprints.php.
 */
return [
    // ── Page chrome (Show.tsx) ──────────────────────────────────────
    'action.new_entry' => 'New Entry',
    'action.new_connection' => 'New Connection',
    'tab.table' => 'Table',
    'tab.table_view' => 'Table View',
    'tab.connections' => 'Connections',
    'tab.settings' => 'Settings',
    'description.fallback' => ':classification blueprint',

    // ── Structure tab (StructureTab.tsx) ────────────────────────────
    'structure.field.untitled' => 'Untitled field',
    'structure.field.label' => 'Label',
    'structure.field.label_placeholder' => 'e.g. Gender, Location Type',
    'structure.field.key' => 'Field Key',
    'structure.field.key_placeholder' => 'auto_generated',
    'structure.field.type' => 'Type',
    'structure.field.help_text' => 'Help Text',
    'structure.field.help_text_placeholder' => 'Optional description',
    'structure.field.required' => 'Required field',
    'structure.field.remove' => 'Remove Field',
    'structure.entry_ref.choose_list' => 'Choose List',
    'structure.entry_ref.select_placeholder' => 'Select a list…',
    'structure.entry_ref.hint' => 'Users will select from entries in this list.',
    'structure.relationship.label' => 'Relationship Blueprint',
    'structure.relationship.select_placeholder' => 'Select a relationship type…',
    'structure.empty.title' => 'No fields defined',
    'structure.empty.subtitle' => 'Add fields to define the structure of entries using this blueprint.',
    'structure.add_field' => 'Add Field',
    'structure.field_count.singular' => ':count field',
    'structure.field_count.plural' => ':count fields',
    'structure.discard' => 'Discard',
    'structure.save' => 'Save Structure',

    // ── Entries tab (EntriesTab.tsx) ────────────────────────────────
    'entries.search_placeholder' => 'Search entries…',
    'entries.count.singular' => ':count entry',
    'entries.count.plural' => ':count entries',
    'entries.status.stub' => 'Stub',
    'entries.status.page' => 'Page',
    'entries.action.save_view' => 'Save View',
    'entries.action.columns' => 'Columns',
    'entries.empty.no_match' => 'No entries match your filters',
    'entries.empty.none' => 'No entries yet',
    'entries.empty.hint' => 'Use the "New Entry" button above to get started.',
    'entries.row.view' => 'View',
    'entries.row.edit' => 'Edit',
    'entries.row.archive' => 'Archive',
    'entries.tooltip.view_col' => 'View :label',
    'entries.tooltip.filter_col' => 'Filter :label',
    'entries.header.actions' => 'Actions',
    'entries.header.clear_filters' => 'Clear all filters',

    // ── Connections view (ConnectionsView.tsx) ──────────────────────
    'connections.search_placeholder' => 'Search connections…',
    'connections.count.singular' => ':count connection',
    'connections.count.plural' => ':count connections',
    'connections.empty.no_match' => 'No connections match your search',
    'connections.empty.none' => 'No connections yet',
    'connections.archive.title' => 'Archive Connection?',
    'connections.archive.body' => 'This will archive the connection between :parent and :child.',
    'connections.archive.helper' => 'Archived items can be restored from the trash.',
    'connections.archive.confirm' => 'Archive',
    'connections.archive.row_button' => 'Archive connection',
];
