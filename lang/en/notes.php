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

    // ── Notebooks view ──────────────────────────────────────────────
    'notebooks.heading' => 'Notebooks',
    'notebooks.singular' => 'notebook',
    'notebooks.plural' => 'notebooks',
    'notebooks.note_singular' => 'note',
    'notebooks.note_plural' => 'notes',
    'notebooks.filter_placeholder' => 'Filter notebooks…',
    'notebooks.empty.heading' => 'No notebooks yet',
    'notebooks.empty.hint' => 'Use "New Notebook" at the top to create your first',
    'notebooks.section.pinned' => 'Pinned',
    'notebooks.section.all' => 'All Notebooks',
    'notebooks.no_match' => 'No notebooks match ":filter"',
    'notebooks.tile.drag_aria' => 'Drag to reorder',
    'notebooks.tile.menu_aria' => 'Notebook actions',
    'notebooks.tile.menu.edit' => 'Edit',
    'notebooks.tile.menu.pin' => 'Pin',
    'notebooks.tile.menu.unpin' => 'Unpin',
    'notebooks.tile.menu.link_entries' => 'Link Entries',
    'notebooks.tile.menu.delete' => 'Delete',
    'notebooks.delete_confirm' => 'Delete ":title"? Notes in it will not be deleted.',
    'notebooks.delete_failed' => 'Failed to delete notebook.',

    // ── Notes-list view (table + filters + bulk actions) ─────────────
    'list.search_placeholder' => 'Search notes…',
    'list.untitled' => 'Untitled',
    'list.loading' => 'Loading notes…',
    'list.no_results' => 'No notes found.',
    'list.empty_cell' => '--',
    'list.system_author' => 'System',

    // Column labels
    'list.column.title' => 'Title',
    'list.column.status' => 'Status',
    'list.column.location' => 'Location',
    'list.column.notebook' => 'Notebook',
    'list.column.created_at' => 'Created',
    'list.column.author' => 'Author',
    'list.column.updated_at' => 'Updated',
    'list.column.note_date' => 'Note Date',
    'list.column.tags' => 'Tags',
    'list.column.actions' => 'Actions',

    // Filter bar tooltips + chip labels
    'list.filters.button' => 'Filters',
    'list.filters.tooltip' => 'Filters',
    'list.compact.label' => 'Compact',
    'list.compact.tooltip' => 'Compact rows (also updates your Appearance preference)',
    'list.config_columns.tooltip' => 'Configure columns',
    'list.empty_trash.label' => 'Empty Trash',
    'list.empty_trash.confirm' => 'Permanently delete all :count trashed notes?',
    'list.tooltip.pinned' => 'Pinned',

    // AI status badges
    'list.ai_status.processing' => 'Processing',
    'list.ai_status.routed' => 'Routed',
    'list.ai_status.error' => 'Error',

    // Status options (also used by chip text)
    'list.status.all' => 'All',
    'list.status.active' => 'Active',
    'list.status.archived' => 'Archived',
    'list.status.trashed' => 'Trashed',

    // Bulk actions
    'list.bulk.selected' => ':count selected',
    'list.bulk.archive' => 'Archive',
    'list.bulk.move_to_trash' => 'Move to Trash',
    'list.bulk.unarchive' => 'Unarchive',
    'list.bulk.restore' => 'Restore',
    'list.bulk.categorize' => 'Categorize',
    'list.bulk.clear_selection' => 'Clear Selection',

    // Row dropdown actions
    'list.row.pin' => 'Pin',
    'list.row.unpin' => 'Unpin',
    'list.row.generate_title' => 'Generate Title',
    'list.row.tags' => 'Tags',
    'list.row.add_to_notebook' => 'Add to Notebook',
    'list.row.categorize_ai' => 'Categorize (AI)',
    'list.row.history' => 'History',
    'list.row.link_to' => 'Link to…',
    'list.row.move_to' => 'Move to…',
    'list.row.copy_to' => 'Copy to…',
    'list.row.approve_routing' => 'Approve Routing',
    'list.row.reject_routing' => 'Reject Routing',

    // Toast feedback for AI categorization
    'list.toast.generating_commands' => 'Generating commands',
    'list.toast.routing_to_blueprints' => 'Routing to blueprints',
    'list.toast.note_processing' => 'Note processing in the background…',
    'list.toast.notes_processing' => ':count note(s) processing in the background…',
    'list.toast.categorize_failed' => 'Categorization failed',
    'list.toast.categorize_failed_desc' => 'The request could not be queued.',

    // smartDate buckets
    'list.date.just_now' => 'just now',
    'list.date.minutes_ago' => ':count m ago',
    'list.date.hours_ago' => ':count h ago',
    'list.date.days_ago' => ':count d ago',

    // Column-config modal
    'list.config_columns.title' => 'Configure Columns',
    'list.config_columns.subtitle' => 'Toggle and drag to reorder',
    'list.config_columns.active_heading' => 'Active Columns',
    'list.config_columns.available_heading' => 'Available',
    'list.config_columns.include_time' => 'Include time',

    // Filter modal
    'list.filter_modal.title' => 'Filters',
    'list.filter_modal.subtitle' => 'Narrow down your notes',
    'list.filter_modal.status_label' => 'Status',
    'list.filter_modal.quick_label' => 'Quick Filters',
    'list.filter_modal.author_label' => 'Author',
    'list.filter_modal.notebook_label' => 'Notebook',
    'list.filter_modal.all_authors' => 'All Authors',
    'list.filter_modal.all_notebooks' => 'All Notebooks',
    'list.filter_modal.one_selected' => '1 selected',
    'list.filter_modal.n_selected' => ':count selected',
    'list.filter_modal.clear_all' => 'Clear All Filters',

    // Quick filter chips inside filter modal
    'list.quick.uncategorized' => 'Uncategorized',
    'list.quick.pending' => 'Pending',
    'list.quick.pinned' => 'Pinned',

    // Author + Notebook picker modals
    'list.author_picker.title' => 'Filter by Author',
    'list.author_picker.subtitle' => 'Select one or more authors to filter by',
    'list.author_picker.empty' => 'No authors yet',
    'list.author_picker.search' => 'Search authors…',
    'list.notebook_picker.title' => 'Filter by Notebook',
    'list.notebook_picker.subtitle' => 'Select one or more notebooks to filter by',
    'list.notebook_picker.empty' => 'No notebooks yet',
    'list.notebook_picker.search' => 'Search notebooks…',
    'list.notebook_picker.prompt_name' => 'Notebook name:',

    // Filter chip fallback labels (when an item isn't in the cached list)
    'list.chip.notebook_fallback' => 'Notebook #:id',
    'list.chip.author_fallback' => 'Author #:id',

    // ── Note create/view modal ──────────────────────────────────────
    'modal.edit_title' => 'Edit Note',
    'modal.create_title' => 'New Note',
    'modal.author_prefix' => 'By',
    'modal.created_prefix' => 'Created',

    // Action button tooltips
    'modal.tooltip.pin' => 'Pin',
    'modal.tooltip.unpin' => 'Unpin',
    'modal.tooltip.generate_title' => 'Generate title',
    'modal.tooltip.close' => 'Close',

    // Header overflow menu items
    'modal.menu.tags' => 'Tags',
    'modal.menu.add_to_notebook' => 'Add to Notebook',
    'modal.menu.history' => 'History',
    'modal.menu.link_to' => 'Link to…',
    'modal.menu.move_to' => 'Move to…',
    'modal.menu.copy_to' => 'Copy to…',

    // Status / location / pinned badges
    'modal.badge.archived' => 'Archived',
    'modal.badge.active' => 'Active',
    'modal.badge.pinned' => 'Pinned',
    'modal.badge.pending' => 'pending',

    // Field labels + placeholders
    'modal.field.title' => 'Title',
    'modal.field.title_placeholder' => 'Optional title',
    'modal.field.content' => 'Content',
    'modal.field.content_placeholder' => 'Write your note here…',
    'modal.field.note_date' => 'Note Date',
    'modal.field.color' => 'Color',
    'modal.field.links' => 'Links',

    // Color picker — value:label map (value matches NOTE_COLORS const)
    'modal.color.none' => 'None',
    'modal.color.red' => 'Red',
    'modal.color.orange' => 'Orange',
    'modal.color.yellow' => 'Yellow',
    'modal.color.green' => 'Green',
    'modal.color.teal' => 'Teal',
    'modal.color.blue' => 'Blue',
    'modal.color.cerulean' => 'Cerulean',
    'modal.color.purple' => 'Purple',
    'modal.color.pink' => 'Pink',
    'modal.color.brown' => 'Brown',
    'modal.color.gray' => 'Gray',

    // Metrics row
    'modal.metric.chars' => 'chars',
    'modal.metric.words' => 'words',
    'modal.metric.updated_prefix' => 'Updated',
    'modal.metric.tag_singular' => 'tag',
    'modal.metric.tag_plural' => 'tags',
    'modal.metric.location_singular' => 'location',
    'modal.metric.location_plural' => 'locations',

    // Footer buttons
    'modal.discard' => 'Discard',
    'modal.save' => 'Save',

    // Sub-modal prompts (notebook create-from-picker)
    'modal.prompt.notebook_name' => 'Notebook name:',

    // Type labels — used as the prefix in tooltip captions on the
    // mixed badge row (e.g., "Notebook: Plot Points", "Tag: Drama")
    // so the user can disambiguate at a glance whether a pill is a
    // notebook membership, a blueprint location, or a tag.
    'modal.label.tag' => 'Tag',
    'modal.label.notebook' => 'Notebook',
    'modal.label.blueprint' => 'Blueprint',
    'modal.label.entry' => 'Entry',
    'modal.label.project' => 'Project',
    'modal.tag_remove_aria' => 'Remove tag :tag',

    // ── PromptPreviewModal (AI prompt debug viewer) ─────────────────
    'prompt_preview.title' => 'Prompt Preview',
    'prompt_preview.subtitle' => 'The full prompt that will be sent to the AI',
    'prompt_preview.tokens' => '~:count tokens',
    'prompt_preview.failed' => 'Failed to load prompt',

    // ── ImportModal ────────────────────────────────────────────────
    'import.title' => 'Import Notes',
    'import.subtitle' => 'Upload JSON files from Google Keep or other sources',
    'import.dropzone.placeholder' => 'Click to select JSON files',
    'import.dropzone.selected_singular' => ':count file selected',
    'import.dropzone.selected_plural' => ':count files selected',
    'import.progress.queued' => ':done of :total file(s) queued…',
    'import.progress.complete' => ':count file(s) queued for import',
    'import.error.batch' => 'Import failed on batch :batch: :message',
    'import.error.unknown' => 'An error occurred during import.',
    'import.cancel' => 'Cancel',
    'import.submit' => 'Import',

    // ── TagPickerModal ─────────────────────────────────────────────
    'tag_picker.title' => 'Manage Tags',
    'tag_picker.subtitle' => 'Select existing tags or create new ones',
    'tag_picker.selected_label' => 'Selected (:count)',
    'tag_picker.search_placeholder' => 'Filter or create…',
    'tag_picker.create_button' => 'Create',
    'tag_picker.empty.no_match' => 'No matching tags',
    'tag_picker.empty.no_tags' => 'No tags yet',
    'tag_picker.done' => 'Done',
];
