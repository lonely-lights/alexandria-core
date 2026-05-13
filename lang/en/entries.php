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
];
