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
    // Filled per-subsection as the i18n sweep progresses.
];
