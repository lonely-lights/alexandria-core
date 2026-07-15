<?php

declare(strict_types=1);

/*
 * Entry-related UI strings — surfaces that render entry data
 * (Infobox blocks, hover-card previews, archive/stub modals, entry
 * preview chrome). Distinct from `blueprints.*` because these strings
 * are rendered around individual entries rather than blueprint
 * definitions; Stage 8 (Entries pages) will keep adding here.
 *
 * Surfaced via the `t.entries` shared Inertia prop and accessed in
 * React via the useT() hook: `t('entries.infobox.hierarchy')`.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/entries.php.
 */
return [
    // ── ArchiveEntryModal (E2) ──
    'archive.title' => 'Archive Entry?',
    'archive.body' => ':name will be archived and hidden from active views. Linked entries from other blueprints are not affected.',
    'archive.checking_dependencies' => 'Checking dependencies…',
    'archive.dependency_count.singular' => ':count dependency found',
    'archive.dependency_count.plural' => ':count dependencies found',
    'archive.cascade_label.singular' => 'Archive :count child entry with it',
    'archive.cascade_label.plural' => 'Archive :count child entries with it',
    'archive.cascade_hint' => 'If unchecked, children will appear in the Unsorted folder',
    'archive.connections_note.singular' => ':count connection will always be archived with this entry',
    'archive.connections_note.plural' => ':count connections will always be archived with this entry',
    'archive.no_dependencies' => 'No dependencies will be affected.',
    'archive.action' => 'Archive',

    // ── StubPreviewModal (E2) ──
    'stub.badge' => 'Stub',
    'stub.no_summary' => 'No summary yet.',
    'stub.not_found' => 'Not Found',
    'stub.not_found_body' => 'Could not load entry data.',

    // ── Infobox + EntryHoverCard (F1) ──
    'infobox.hierarchy' => 'Hierarchy',
    'infobox.parent' => 'Parent',
    'infobox.child.singular' => 'Child',
    'infobox.child.plural' => 'Children',
    'infobox.show_less' => 'Show less',
    'infobox.show_more' => 'Show :count more…',
    'hover_card.view_entry' => 'View entry',

    // ── MediaSection (E3b) ──
    'media.page_image.title' => 'Page Image',
    'media.page_image.subtitle' => 'Square thumbnail shown across the site.',
    'media.banner.title' => 'Banner',
    'media.banner.subtitle' => 'Wide hero image used on pages and listings (approx. 1920×400).',
    'media.banner.upload' => 'Upload Banner',
    'media.gallery.title' => 'Gallery',
    'media.gallery.empty' => 'No images — click to add',
    'media.gallery.summary.singular' => ':count image — click to manage',
    'media.gallery.summary.plural' => ':count images — click to manage',
    'media.modal.title' => 'Media',
    'media.modal.subtitle.singular' => ':count gallery image attached',
    'media.modal.subtitle.plural' => ':count gallery images attached',
    'media.modal.add_image' => 'Add Image',
    'media.upload.title' => 'Upload :type',
    'media.upload.types.page_image' => 'Page Image',
    'media.upload.types.banner' => 'Banner',
    'media.upload.types.gallery_image' => 'Gallery Image',
    'media.upload.formats' => 'JPEG, PNG, or WebP',
    'media.alt_prefix' => 'Alt: :text',
    'media.action.change' => 'Change',
    'media.confirm.remove_image' => 'Remove this image?',

    // ── Show + OverviewTab (Subsection A) ──
    'show.edit_entry' => 'Edit Entry',
    'show.entry_settings' => 'Entry Settings',
    'show.open_in_writing' => 'Open in Writing',
    'show.delete_entry' => 'Delete Entry',
    'show.delete.title' => 'Delete Entry?',
    'show.delete.message' => 'Delete ":name"? It will be removed from this project.',
    'show.delete.confirm' => 'Delete',

    // ── Entry Settings modal (Stage 8b M3) ──
    'entry_settings.title' => 'Entry Settings —',
    'entry_settings.nav.appearance' => 'Appearance',
    'entry_settings.nav.theme' => 'Theme',
    'entry_settings.theme.title' => 'Theme',
    'entry_settings.theme.description' => 'Per-entry theme overrides for the content area. Page chrome (navbar, sidebar) keeps the project\'s theme.',
    'entry_settings.theme.subtitle' => 'Choose a preset to override the blueprint\'s theme for this entry only, or leave inherited to follow the cascade.',
    'entry_settings.theme.inherit_blueprint' => 'Inherit blueprint theme',
    'entry_settings.theme.inherit_hint' => 'Reset this entry to follow the blueprint\'s theme.',
    'entry_settings.theme.inheriting_from_blueprint' => 'Inheriting the blueprint\'s :preset theme',
    'entry_settings.theme.inheriting_from_project' => 'Inheriting the project\'s :preset theme',
    'entry_settings.theme.inheriting_from_default' => 'Inheriting the default :preset theme',
    'entry_settings.theme.fine_tune.title' => 'Fine-tune tokens',
    'entry_settings.theme.fine_tune.subtitle' => 'Override individual tokens on top of the preset. Changes preview live as you edit and only persist when you save.',

    'show.tab.overview' => 'Overview',
    'show.tab.structure' => 'Structure',
    'show.tab.timeline' => 'Timeline',
    'show.tab.connections' => 'Connections',
    'show.menu.attributes' => 'Attributes',
    'show.menu.relationships' => 'Relationships',
    'show.menu.mentions' => 'Mentions',
    'show.menu.mentioned_in' => 'Mentioned In',
    'show.menu.media' => 'Media',
    'show.menu.history' => 'History',
    'show.menu.view_in_tree' => 'View in Tree',
    'show.menu.all_plural' => 'All :plural',
    'show.structure.configure' => 'Configure',
    'show.structure.heading' => 'Structure Settings',
    'show.structure.section_label' => 'Section Label',
    'show.structure.section_placeholder' => 'e.g., Adaptations, Chapters',
    'show.structure.display_mode' => 'Display Mode',
    'show.structure.mode_tree' => 'Tree',
    'show.structure.mode_list' => 'List',
    'show.structure.max_depth' => 'Max Depth',
    'show.structure.max_depth_placeholder' => 'All',
    'show.structure.all_levels' => 'All levels',
    'show.structure.levels.singular' => ':count level',
    'show.structure.levels.plural' => ':count levels',
    'show.structure.save' => 'Save',
    'show.mentions_title.mentions' => 'Entries Mentioned',
    'show.mentions_title.mentioned_in' => 'Mentioned In',
    'overview.empty.title' => 'No content yet',
    'overview.empty.subtitle' => 'Add content from the Edit page to see it here.',

    // ── Create + Edit (Subsection B) ──
    'form.create.title' => 'New :blueprint',
    'form.create.subtitle' => 'Create a new entry',
    'form.edit.title' => 'Edit :entry',
    'form.edit.breadcrumb' => 'Edit',

    // ── EntryForm (Subsection B) ──
    'form.name_placeholder' => ':blueprint name',
    'form.slug_placeholder' => 'url-slug (auto-generated from the name)',
    'form.summary_label' => 'Summary',
    'form.summary_placeholder' => 'A brief summary of this entry',
    'form.content_heading' => 'Content',
    'form.content_placeholder' => 'Write your content here… Supports [[wiki links]] and wiki markup.',
    'form.fields_heading' => 'Fields',
    'form.media_heading' => 'Media',
    'form.parent_label' => 'Parent Entry',
    'form.parent_helper' => 'Place this entry under another entry in the hierarchy. Used for structural organization like chapters, sections, or locations within locations.',
    'form.parent_none' => 'No parent',
    'form.action.create' => 'Create :blueprint',
    'form.action.save' => 'Save Changes',
    'form.boolean.yes' => 'Yes',
    'form.boolean.no' => 'No',

    // ── TemporalFieldEditor (Subsection B) ──
    'form.temporal.intensity_default' => 'Intensity',
    'form.temporal.record_count.singular' => ':count record',
    'form.temporal.record_count.plural' => ':count records',
    'form.temporal.title_placeholder' => 'Title',
    'form.temporal.end_placeholder' => 'Present',
    'form.temporal.notes_placeholder' => 'Notes…',
    'form.temporal.add' => 'Add :label',

    // ── EntryReferencePicker + Modal (Subsection B) ──
    'form.reference.no_config' => 'No reference config',
    'form.reference.placeholder' => 'Select :label…',
    'form.reference_modal.subtitle_fallback' => 'Select entries',
    'form.reference_modal.subtitle_multi_suffix' => ' — select multiple, drag to reorder',
    'form.reference_modal.selected_heading' => 'Selected (:count) — drag to reorder',
    'form.reference_modal.search_placeholder' => 'Filter or type to create…',
    'form.reference_modal.create' => 'Create',
    'form.reference_modal.no_entries' => 'No entries found',
    'form.reference_modal.selected_count' => ':count selected',
    'form.reference_modal.apply' => 'Apply',

    // ── Shared sort labels for read tabs (Subsection C) ──
    'tab.sort.default' => 'Default',
    'tab.sort.name_asc' => 'Name A → Z',
    'tab.sort.name_desc' => 'Name Z → A',

    // ── AttributesTab (Subsection C) ──
    'tab.attribute.empty' => 'No attributes set',
    'tab.attribute.heading' => 'Attributes',
    'tab.attribute.field_count.singular' => ':count field',
    'tab.attribute.field_count.plural' => ':count fields',
    'tab.attribute.record_count.singular' => ':count record',
    'tab.attribute.record_count.plural' => ':count records',
    'tab.attribute.present' => 'Present',
    'tab.attribute.sort.earliest' => 'Earliest first',
    'tab.attribute.sort.latest' => 'Latest first',
    'tab.attribute.sort.most_intense' => 'Most intense',
    'tab.attribute.sort.least_intense' => 'Least intense',

    // ── ConnectionsTab (Subsection C) ──
    'tab.connection.empty' => 'No connections',
    'tab.connection.count.singular' => ':count connection',
    'tab.connection.count.plural' => ':count connections',
    'tab.connection.sort.most' => 'Most connections',
    'tab.connection.sort.fewest' => 'Fewest connections',

    // ── RelationshipsTab (Subsection C) ──
    'tab.relationship.empty' => 'No relationships',
    'tab.relationship.count.singular' => ':count relationship',
    'tab.relationship.count.plural' => ':count relationships',
    'tab.relationship.no_results' => 'No relationships found',
    'tab.relationship.name_column' => 'Name',

    // ── MentionsTab (Subsection C) ──
    'tab.mention.empty' => 'No mentions',
    'tab.mention.count.singular' => ':count mention',
    'tab.mention.count.plural' => ':count mentions',
    'tab.mention.default_group' => 'Other',
    'tab.mention.sort.most' => 'Most mentions',
    'tab.mention.sort.fewest' => 'Fewest mentions',

    // ── TimelineTab (Subsection D) ──
    'tab.timeline.empty' => 'No timeline events',
    'tab.timeline.event_count.singular' => ':count event',
    'tab.timeline.event_count.plural' => ':count events',
    'tab.timeline.table.event' => 'Event',
    'tab.timeline.table.type' => 'Type',
    'tab.timeline.table.date' => 'Date',
    'tab.timeline.empty_cell' => '—',

    // ── HistoryTab (Subsection D) ──
    'tab.history.empty' => 'No history yet',
    'tab.history.heading' => 'Revision History',
    'tab.history.count.singular' => ':count revision',
    'tab.history.count.plural' => ':count revisions',
    'tab.history.sort.newest' => 'Newest first',
    'tab.history.sort.oldest' => 'Oldest first',
    'tab.history.field_count' => ':count fields',
    'tab.history.user_attribution' => 'by :name',
    'tab.history.summary_fallback' => 'Change',
    'tab.history.summary_multi' => 'Updated :fields',
    'tab.history.diff.before' => 'Before',
    'tab.history.diff.after' => 'After',
    'tab.history.diff.empty' => 'Empty',
    'tab.history.change_type.field_update' => 'Field Update',
    'tab.history.change_type.attribute_update' => 'Attribute Update',
    'tab.history.change_type.metadata_update' => 'Metadata Update',
    'tab.history.change_type.bulk_update' => 'Bulk Update',

    // ── Recycle Bin (Stage 11 Slice 4) ──────────────────────────────────
    'recycle_bin.col.entry' => 'Entry',
    'recycle_bin.col.blueprint' => 'Blueprint',
    'recycle_bin.col.deleted' => 'Deleted',
    'recycle_bin.col.select_all' => 'Select all',
    'recycle_bin.search_placeholder' => 'Search entries…',
    'recycle_bin.filter.all_blueprints' => 'All blueprints',
    'recycle_bin.restore' => 'Restore',
    'recycle_bin.restore_selected' => 'Restore Selected',
    'recycle_bin.restore_selected_count' => 'Restore :count selected',
    'recycle_bin.summary.singular' => ':count deleted entry',
    'recycle_bin.summary.plural' => ':count deleted entries',
    'recycle_bin.empty' => 'The bin is empty',
    'recycle_bin.no_results' => 'No entries match your filters',
];
