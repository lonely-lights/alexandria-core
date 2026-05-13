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
];
