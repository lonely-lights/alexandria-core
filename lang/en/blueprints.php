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

    // ── Tree view (TreeView.tsx) ────────────────────────────────────
    'tree.search_placeholder' => 'Filter tree…',
    'tree.entry_count.singular' => ':count entry',
    'tree.entry_count.plural' => ':count entries',
    'tree.expand_all' => 'Expand all',
    'tree.collapse_all' => 'Collapse all',
    'tree.rearrange' => 'Rearrange',
    'tree.exit_rearrange' => 'Exit rearrange',
    'tree.empty' => 'No entries yet',
    'tree.unsorted' => 'Unsorted',
    'tree.recently_removed' => 'Recently Removed',
    'tree.intermediate_hidden.singular' => ':count intermediate level hidden',
    'tree.intermediate_hidden.plural' => ':count intermediate levels hidden',
    'tree.add' => 'Add',
    'tree.detail.view_entry' => 'View entry page',
    'tree.detail.restore' => 'Restore to Tree',
    'tree.detail.set_child_blueprints' => 'Set Child Blueprints',
    'tree.detail.blueprint_count' => ':count Blueprints',
    'tree.detail.convert_to_entry' => 'Convert to Entry',
    'tree.detail.revert_to_folder' => 'Revert to Folder',
    'tree.detail.revert_to_stub' => 'Revert to Stub',
    'tree.detail.unlink' => 'Unlink from Tree',
    'tree.detail.archive' => 'Archive',
    'tree.detail.children' => 'Children',
    'tree.detail.children_col.name' => 'Name',
    'tree.detail.children_col.count' => 'Children',
    'tree.detail.empty_title' => 'Hierarchy View',
    'tree.detail.empty_subtitle.singular' => ':total entries across :roots root node',
    'tree.detail.empty_subtitle.plural' => ':total entries across :roots root nodes',
    'tree.detail.empty_hint' => 'Choose an entry from the tree to view its details.',

    // ── Timeline view (TimelineView.tsx) ────────────────────────────
    'timeline.intro.title' => 'Timeline View',
    'timeline.intro.body' => 'Choose a date field to position entries on a timeline. Optionally add an end date for ranges and group entries into swim lanes.',
    'timeline.intro.configure' => 'Configure Timeline',
    'timeline.count.singular' => ':count entry',
    'timeline.count.plural' => ':count entries',
    'timeline.capped' => '(max :max)',
    'timeline.hidden_range.label' => ':count outside range',
    'timeline.hidden_range.tooltip' => 'Click to adjust display range',
    'timeline.zoom_in' => 'Zoom in',
    'timeline.zoom_out' => 'Zoom out',
    'timeline.configure' => 'Configure',
    'timeline.empty.no_dated_entries' => 'No entries with date values found.',
    'timeline.lane.all_entries' => 'All Entries',
    'timeline.lane.all_events' => 'All Events',
    'timeline.lane.ungrouped' => 'Ungrouped',
    'timeline.lane.split' => 'Split',
    'timeline.lane.merge' => 'Merge',
    'timeline.lane.split_tooltip' => 'Split into lanes',
    'timeline.lane.merge_tooltip' => 'Merge all lanes',
    'timeline.lane.filter_label' => 'Lanes',
    'timeline.lane.show_lanes' => 'Show Lanes',
    'timeline.lane.all' => 'All',
    'timeline.lane.none' => 'None',

    // ── Infobox designer (InfoboxTab.tsx) ───────────────────────────
    'infobox.title' => 'Infobox Designer',
    'infobox.subtitle' => 'Configure what appears in the entry infobox sidebar.',
    'infobox.unsaved' => 'Unsaved changes',
    'infobox.add_block' => 'Add Block',
    'infobox.empty.title' => 'No blocks yet',
    'infobox.empty.hint' => 'Add blocks from the palette on the right',
    'infobox.palette.title' => 'Add Block',

    // Block types
    'infobox.block_type.header.label' => 'Header',
    'infobox.block_type.header.description' => 'Section divider label',
    'infobox.block_type.attribute.label' => 'Attribute',
    'infobox.block_type.attribute.description' => 'Display a field value',
    'infobox.block_type.relationships.label' => 'Relationships',
    'infobox.block_type.relationships.description' => 'Show related entries',
    'infobox.block_type.hierarchy.label' => 'Hierarchy',
    'infobox.block_type.hierarchy.description' => 'Parent and children',
    'infobox.block_type.mentioned_in.label' => 'Mentioned In',
    'infobox.block_type.mentioned_in.description' => 'Show works that mention this entry',

    // Block summary fallbacks
    'infobox.summary.hierarchy.both' => 'Parent & Children',
    'infobox.summary.hierarchy.parent' => 'Parent only',
    'infobox.summary.hierarchy.children' => 'Children only',

    // Shared editor controls
    'infobox.editor.limit_items' => 'Limit items',
    'infobox.editor.show_first' => 'Show first',

    // Header editor
    'infobox.editor.header.text_label' => 'Header Text',
    'infobox.editor.header.text_placeholder' => 'Section title',

    // Attribute editor
    'infobox.editor.attribute.field' => 'Field',
    'infobox.editor.attribute.field_placeholder' => 'Pick a field…',

    // Relationships editor
    'infobox.editor.relationships.blueprint' => 'Relationship Blueprint',
    'infobox.editor.relationships.blueprint_placeholder' => 'Pick a blueprint…',
    'infobox.editor.relationships.direction' => 'Direction',
    'infobox.editor.relationships.direction_both' => 'Both',
    'infobox.editor.relationships.direction_outgoing' => 'Outgoing only',
    'infobox.editor.relationships.direction_incoming' => 'Incoming only',
    'infobox.editor.relationships.header_label' => 'Header text (optional)',
    'infobox.editor.relationships.header_placeholder' => 'Auto-generated from blueprint name',
    'infobox.editor.relationships.subtitle_label' => 'Subtitle',
    'infobox.editor.relationships.subtitle_configured' => 'Subtitle configured',
    'infobox.editor.relationships.subtitle_none' => 'No subtitle',

    // Hierarchy editor
    'infobox.editor.hierarchy.direction' => 'Direction',
    'infobox.editor.hierarchy.direction_both' => 'Both parent and children',
    'infobox.editor.hierarchy.direction_parent' => 'Parent only',
    'infobox.editor.hierarchy.direction_children' => 'Children only',
    'infobox.editor.hierarchy.limit_children' => 'Limit children',

    // Mentioned-in editor
    'infobox.editor.mentioned.label' => 'Label',
    'infobox.editor.mentioned.label_placeholder' => 'First Appears',
    'infobox.editor.mentioned.targets' => 'Target blueprint slugs (comma-separated)',
    'infobox.editor.mentioned.targets_placeholder' => 'work',
    'infobox.editor.mentioned.trace_parents' => 'Trace parent chain',
    'infobox.editor.mentioned.sort_by' => 'Sort by',
    'infobox.editor.mentioned.sort_direction' => 'Direction',
    'infobox.editor.mentioned.sort_asc' => 'Ascending',
    'infobox.editor.mentioned.sort_desc' => 'Descending',
    'infobox.editor.mentioned.limit_results' => 'Limit results',

    // Subtitle builder modal
    'infobox.subtitle.title' => 'Subtitle Builder',
    'infobox.subtitle.subtitle_prefix' => 'Configure what appears below each entry in the ',
    'infobox.subtitle.subtitle_suffix' => ' section',
    'infobox.subtitle.intro_prefix' => 'Add fields from the relationship blueprint to build a subtitle line. Each field can optionally traverse into a referenced entry\'s property (e.g., ',
    'infobox.subtitle.intro_suffix' => '). The separator only appears between fields that have values — no hanging separators.',
    'infobox.subtitle.display_fields' => 'Display Fields',
    'infobox.subtitle.add_field' => 'Add Field',
    'infobox.subtitle.empty.title' => 'No fields added yet',
    'infobox.subtitle.empty.hint' => 'Click "Add Field" to build the subtitle',
    'infobox.subtitle.field_placeholder' => 'Pick a field…',
    'infobox.subtitle.linkable_tooltip' => 'Make this segment a clickable link to the entry',
    'infobox.subtitle.properties' => 'Properties to display',
    'infobox.subtitle.property_placeholder' => 'Pick a property…',
    'infobox.subtitle.format.raw' => 'Raw',
    'infobox.subtitle.format.year' => 'Year',
    'infobox.subtitle.format.date' => 'Date',
    'infobox.subtitle.options' => 'Options',
    'infobox.subtitle.separator_label' => 'Separator between fields',
    'infobox.subtitle.separator_hint' => 'Only shows between fields that both have values',
    'infobox.subtitle.wrap_label' => 'Wrap with',
    'infobox.subtitle.wrap_hint' => 'Only if any field has data',
    'infobox.subtitle.preview' => 'Preview',
    'infobox.subtitle.preview_empty' => 'No fields configured',
    'infobox.subtitle.clear_all' => 'Clear All',
    'infobox.subtitle.apply' => 'Apply',

    // ── Settings panels (modals/settings/*.tsx) ─────────────────────
    // Tree activation
    'settings.tree.title' => 'Hierarchy View',
    'settings.tree.description' => 'Render entries as a nested tree based on their parent/child relationships. Per-entry structure (children label, depth, display mode) is configured on each entry individually.',

    // Kanban
    'settings.kanban.title' => 'Kanban Board',
    'settings.kanban.description' => 'Drag entries between columns defined by a chosen field. Pick a field whose values become the board\'s columns.',
    'settings.kanban.group_field' => 'Group field',
    'settings.kanban.group_field_placeholder' => 'Pick a field…',
    'settings.kanban.group_field_hint' => 'Distinct values of this field become the board\'s columns. Entries with no value land in an "Unassigned" column.',
    'settings.kanban.no_groupable_fields' => 'No groupable fields on this blueprint. Add a text, integer, or boolean field before enabling Kanban.',
    'settings.kanban.column_sort' => 'Sort within each column',
    'settings.kanban.column_sort_hint' => 'Drag-to-reorder within a column lands in a later phase; for now, Manual follows the order entries already have from other views (table, tree, list).',
    'settings.kanban.sort.manual' => 'Manual (follows each entry\'s existing order)',
    'settings.kanban.sort.name' => 'Alphabetical by name',
    'settings.kanban.sort.updated' => 'Most recently updated first',
    'settings.kanban.sort.created' => 'Most recently created first',

    // Timeline settings (config form)
    'settings.timeline.start_date_field' => 'Start Date Field',
    'settings.timeline.start_date_placeholder' => 'Pick a date field…',
    'settings.timeline.no_date_fields' => 'No date or datetime fields found on this blueprint.',
    'settings.timeline.end_date_field' => 'End Date Field',
    'settings.timeline.end_date_suffix' => '(optional, for ranges)',
    'settings.timeline.end_date_none' => 'None (point events)',
    'settings.timeline.group_by' => 'Group By',
    'settings.timeline.group_by_suffix' => '(swim lanes)',
    'settings.timeline.group_by_none' => 'No grouping',
    'settings.timeline.orientation' => 'Orientation',
    'settings.timeline.horizontal' => 'Horizontal',
    'settings.timeline.vertical' => 'Vertical',
    'settings.timeline.default_zoom' => 'Default Zoom',
    'settings.timeline.display_window' => 'Display Window',
    'settings.timeline.display_window_suffix' => '(optional)',
    'settings.timeline.display_window_hint' => 'Pin the timeline\'s visible bounds. Leave a side blank to auto-fit to the data\'s min or max. Use negative numbers for BC years. Entries outside the window still count but won\'t render — the toolbar shows how many are hidden.',
    'settings.timeline.start_year' => 'Start Year',
    'settings.timeline.end_year' => 'End Year',
    'settings.timeline.year_auto' => 'Auto',

    // Timeline activation
    'settings.timeline_activation.title' => 'Timeline View',
    'settings.timeline_activation.description' => 'Plot entries with date/datetime fields on a continuous time axis. Configure the date field, optional end date, lanes, and display window below.',

    // Timeline sources
    'settings.timeline_sources.title' => 'Timeline Sources',
    'settings.timeline_sources.description' => 'Enable timeline blueprints to display their entries on this blueprint\'s pages. Set a reference point for elapsed time calculations.',
    'settings.timeline_sources.reference_field' => 'Reference Field',
    'settings.timeline_sources.field_placeholder' => 'Pick a field…',
    'settings.timeline_sources.reference_value' => 'Reference Value',
    'settings.timeline_sources.value_placeholder' => 'Pick a value…',
    'settings.timeline_sources.value_input_placeholder' => 'Enter value…',
    'settings.timeline_sources.elapsed_label' => 'Elapsed Column Label',
    'settings.timeline_sources.elapsed_placeholder' => 'e.g., Age, Years',

    // Graph
    'settings.graph.title' => 'Graph View',
    'settings.graph.description' => 'Save multiple named graphs (e.g. "Family Tree", "Alliances"). Viewers switch between them on the blueprint\'s page.',
    'settings.graph.new_graph' => 'New graph',
    'settings.graph.no_selection' => 'Pick a graph to edit, or create a new one.',
    'settings.graph.name' => 'Name',
    'settings.graph.slug' => 'Slug',
    'settings.graph.slug_collision' => 'Slug already used by another graph.',
    'settings.graph.edge_sources' => 'Edge sources',
    'settings.graph.no_edge_sources' => 'No relationship blueprints reference this one.',
    'settings.graph.color_by' => 'Color nodes by',
    'settings.graph.color_by_none' => 'None (single color)',
    'settings.graph.delete' => 'Delete this graph',
    'settings.graph.delete_modal.title' => 'Delete graph?',
    'settings.graph.delete_modal.body_prefix' => 'Delete ',
    'settings.graph.delete_modal.body_suffix' => '? This removes the graph from the blueprint and cannot be undone.',

    // Subtitle Builder
    'settings.subtitle.title' => 'Subtitle Builder',
    'settings.subtitle.subtitle' => 'Configure the display template for relationship entries',
    'settings.subtitle.intro' => 'Each field shows a value from the relationship metadata. Properties traverse into referenced entries. The separator only appears between fields that both have values.',
    'settings.subtitle.display_fields' => 'Display Fields',
    'settings.subtitle.add_field' => 'Add Field',
    'settings.subtitle.empty' => 'No fields added yet',
    'settings.subtitle.field_placeholder' => 'Pick a field…',
    'settings.subtitle.linkable_tooltip' => 'Make linkable',
    'settings.subtitle.properties' => 'Properties',
    'settings.subtitle.property_placeholder' => 'e.g., name or event_type.abbreviation',
    'settings.subtitle.format.raw' => 'Raw',
    'settings.subtitle.format.year' => 'Year',
    'settings.subtitle.format.date' => 'Date',
    'settings.subtitle.options' => 'Options',
    'settings.subtitle.separator' => 'Separator',
    'settings.subtitle.separator_hint' => 'Only between fields that both have values',
    'settings.subtitle.wrap' => 'Wrap',
    'settings.subtitle.clear_all' => 'Clear All',
    'settings.subtitle.apply' => 'Apply',

    // ── Tree modals (modals/tree/*.tsx) ─────────────────────────────
    // Child blueprint picker
    'tree.child_blueprints.title' => 'Child Blueprints',
    'tree.child_blueprints.search_placeholder' => 'Search blueprints…',
    'tree.child_blueprints.selected_count' => ':count selected',
    'tree.child_blueprints.none_selected' => 'None selected',

    // Stub → entry converter
    'tree.convert_stub.title' => 'Convert to Entry',
    'tree.convert_stub.choose.create.title' => 'Create New',
    'tree.convert_stub.choose.create.subtitle' => 'Create a new entry page',
    'tree.convert_stub.choose.link.title' => 'Link Existing',
    'tree.convert_stub.choose.link.subtitle' => 'Attach an existing entry',
    'tree.convert_stub.create.prompt' => 'Select a blueprint for the new entry:',
    'tree.convert_stub.create.search_placeholder' => 'Search blueprints…',
    'tree.convert_stub.create.no_matches' => 'No matches',
    'tree.convert_stub.link.label' => 'Search entries',
    'tree.convert_stub.link.placeholder' => 'Start typing to search…',
    'tree.convert_stub.link.no_results' => 'No results found',
    'tree.convert_stub.link.action' => 'Link',

    // Add-entry modal
    'tree.add_entry.title' => 'Add to :parent',
    'tree.add_entry.root_label' => 'Root',
    'tree.add_entry.tab.folder' => 'Folder',
    'tree.add_entry.tab.entry' => 'Entry',
    'tree.add_entry.tab.link' => 'Link',
    'tree.add_entry.folder.intro' => 'Create an organizational container to group items.',
    'tree.add_entry.folder.action' => 'Create Folder',
    'tree.add_entry.create.intro' => 'Create a new entry with its own detail page.',
    'tree.add_entry.create.action' => 'Create Entry',
    'tree.add_entry.field.name' => 'Name',
    'tree.add_entry.field.name_placeholder' => 'Entry name…',
    'tree.add_entry.field.summary' => 'Summary',
    'tree.add_entry.field.summary_placeholder' => 'Brief description (optional)…',
    'tree.add_entry.children_blueprints.label' => 'Children Blueprints',
    'tree.add_entry.children_blueprints.count' => ':count selected',
    'tree.add_entry.children_blueprints.filter' => 'Filter blueprints…',
    'tree.add_entry.children_blueprints.no_matches' => 'No matches',
    'tree.add_entry.link.intro' => 'Attach an existing entry from your project into this tree.',
    'tree.add_entry.link.search_scoped' => 'Search :name',
    'tree.add_entry.link.search_all' => 'Search all entries',
    'tree.add_entry.link.toggle_all' => 'Search all',

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
