<?php

declare(strict_types=1);

/*
 * RichTextEditor UI strings — toolbar tooltips, the link modal, and the
 * formatting-help legend (findings #17: these shipped as inline English
 * in RichTextEditor.tsx). Surfaced React-side via the `t.editor` shared
 * prop: `t('editor.link_modal.title')`, `t('editor.toolbar.bold.title')`.
 *
 * Consumers override individual entries by publishing
 * `vendor:publish --tag=alexandria-translations` and editing the same
 * keys in their own lang/<locale>/editor.php.
 */
return [
    // ── Toolbar buttons (tooltip title + legend description) ────────
    'toolbar.bold.title' => 'Bold',
    'toolbar.bold.description' => 'Make text bold',
    'toolbar.italic.title' => 'Italic',
    'toolbar.italic.description' => 'Make text italic',
    'toolbar.underline.title' => 'Underline',
    'toolbar.underline.description' => 'Underline text',
    'toolbar.link.title' => 'Link',
    'toolbar.link.description' => 'Insert or edit a hyperlink',
    'toolbar.bullet_list.title' => 'Bullet List',
    'toolbar.bullet_list.description' => 'Create a bulleted list',
    'toolbar.ordered_list.title' => 'Numbered List',
    'toolbar.ordered_list.description' => 'Create a numbered list',
    'toolbar.heading2.title' => 'Heading 2',
    'toolbar.heading2.description' => 'Large heading',
    'toolbar.heading3.title' => 'Heading 3',
    'toolbar.heading3.description' => 'Medium heading',
    'toolbar.mention.title' => 'Mention User',
    'toolbar.mention.description' => 'Mention a user with @username',
    'toolbar.entry_link.title' => 'Entry Link',
    'toolbar.entry_link.description' => 'Link to an entry with [[Page Name]]',
    'toolbar.ai.title' => 'AI Writing Assistant',
    'toolbar.code_view' => 'Switch to Code View',
    'toolbar.wysiwyg_view' => 'Switch to WYSIWYG',
    'toolbar.help' => 'Formatting Help',

    // ── Link modal ───────────────────────────────────────────────────
    'link_modal.title' => 'Insert Link',
    'link_modal.url_label' => 'URL *',
    'link_modal.url_placeholder' => 'https://example.com',
    'link_modal.text_label' => 'Display Text',
    'link_modal.text_hint' => 'Optional',
    'link_modal.text_placeholder' => 'Leave empty to show URL',
    'link_modal.unlink_button' => 'Unlink',
    'link_modal.apply_button' => 'Apply',

    // ── Formatting-help legend ───────────────────────────────────────
    'legend.title' => 'Formatting Help',
];
