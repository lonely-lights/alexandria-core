<?php

declare(strict_types=1);

/*
 * View-registry UI strings — Gallery, Kanban, Graph view renderers
 * + their settings panels + ViewToggle chrome. Files live under
 * `resources/js/lib/views/` and are reachable from any blueprint that
 * enables the corresponding view.
 *
 * Surfaced via the `t.views` shared Inertia prop and accessed in
 * React via the useT() hook: `t('views.gallery.enable')`.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/views.php.
 */
return [
    // ── View labels (rendered in ViewToggle segmented control) ──
    'gallery.label' => 'Gallery',
    'kanban.label' => 'Board',
    'graph.label' => 'Graph',
    'tree.label' => 'Tree',
    'timeline.label' => 'Timeline',

    // ── GalleryPanel (settings UI in BlueprintSettingsModal) ──
    'gallery.enable' => 'Enable Gallery view',
    'gallery.sort_by' => 'Sort by',
    'gallery.sort.name' => 'Name (A→Z)',
    'gallery.sort.updated_at' => 'Recently updated',
    'gallery.sort.created_at' => 'Recently created',

    // ── Per-view registry placeholders ──
    'kanban.placeholder' => 'Kanban is configured via the dedicated Kanban menu item in Blueprint Settings.',
    'graph.placeholder' => 'Graph is configured via the dedicated Graph menu item in Blueprint Settings.',
    'tree.placeholder' => 'Tree view uses the Structure settings panel for configuration.',
    'timeline.placeholder' => 'Timeline configuration is managed in the Timeline settings panel.',

    // ── GalleryView (F3) ──
    'gallery.error' => 'Could not load gallery entries: :error',
    'gallery.empty.title' => 'No entries to display.',
    'gallery.empty.subtitle' => 'Create one to see it in the gallery.',
];
