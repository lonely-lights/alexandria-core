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
    // Filled per-subsection as the i18n sweep progresses.
];
