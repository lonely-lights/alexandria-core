<?php

declare(strict_types=1);

/*
 * Ribbon chrome strings. FLAT dot-string keys on purpose: useT()
 * resolves t('ribbon.x.y') as a literal 'x.y' lookup inside the
 * group bag.
 */
return [
    'mode.slim' => 'Slim ribbon',
    'mode.comfortable' => 'Comfortable ribbon',
    'mode.collapse' => 'Collapse the ribbon',
    'mode.expand' => 'Pin the ribbon open',

    // Merged-header chrome (workspace surfaces that run navbar-less).
    'home' => 'Go to dashboard',
    'search' => 'Search',
    'account' => 'Account menu',
];
