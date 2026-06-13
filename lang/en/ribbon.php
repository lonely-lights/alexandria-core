<?php

declare(strict_types=1);

/*
 * Ribbon chrome strings. FLAT dot-string keys on purpose: useT()
 * resolves t('ribbon.x.y') as a literal 'x.y' lookup inside the
 * group bag.
 */
return [
    'mode.collapse' => 'Collapse the ribbon',
    'mode.expand' => 'Pin the ribbon open',

    // Merged-header chrome (workspace surfaces that run navbar-less).
    'menu' => 'Open navigation menu',
    'search' => 'Search',
    'account' => 'Account menu',

    // Quick Action Toolbar.
    'qat_label' => 'Quick actions',
    'qat_edit' => 'Edit quick actions',
    'qat_empty' => 'No quick actions pinned',
    'qat_add' => 'Add to quick actions',
    'qat_remove' => 'Remove from quick actions',
    'qat_move_up' => 'Move up',
    'qat_move_down' => 'Move down',
    'qat_bookmark_label' => 'Label',
    'qat_bookmark_url' => 'URL',
    'qat_bookmark_icon' => 'Icon',
    'qat_bookmark_add' => 'Add bookmark',
];
