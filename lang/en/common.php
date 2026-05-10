<?php

declare(strict_types=1);

/*
 * Common UI strings — universal words that appear across pages and don't
 * belong to any single domain. Connectors, generic verbs, status words.
 *
 * These are surfaced to every Inertia page as the `t.common` shared prop
 * (see HandleInertiaRequests::share()) and accessed from React via the
 * useT() hook: `t('common.or')`, `t('common.cancel')`, etc.
 *
 * Consumers can override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/common.php.
 */
return [
    // Connectors
    'or' => 'or',
    'and' => 'and',
    'with' => 'with',
    'by' => 'by',

    // Action verbs (universal — page-specific verbs stay in their own files)
    'save' => 'Save',
    'cancel' => 'Cancel',
    'submit' => 'Submit',
    'close' => 'Close',
    'back' => 'Back',
    'next' => 'Next',
    'continue' => 'Continue',
    'edit' => 'Edit',
    'delete' => 'Delete',
    'remove' => 'Remove',
    'confirm' => 'Confirm',
    'create' => 'Create',
    'add' => 'Add',
    'search' => 'Search',
    'filter' => 'Filter',
    'reset' => 'Reset',
    'dismiss' => 'Dismiss',

    // Status words
    'loading' => 'Loading…',
    'saving' => 'Saving…',
    'saved' => 'Saved',
    'success' => 'Success',
    'error' => 'Error',
    'warning' => 'Warning',
    'info' => 'Info',
    'required' => 'Required',
    'optional' => 'Optional',

    // Pagination
    'pagination.showing' => 'Showing :from–:to of :total',
    'pagination.page' => 'Page :current of :last',
    'pagination.first' => 'First page',
    'pagination.previous' => 'Previous page',
    'pagination.next' => 'Next page',
    'pagination.last' => 'Last page',
];
