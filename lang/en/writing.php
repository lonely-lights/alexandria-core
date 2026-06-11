<?php

declare(strict_types=1);

/*
 * Writing dashboard strings (Stage 8g.1). FLAT dot-string keys on
 * purpose: useT() resolves t('writing.x.y') as a literal 'x.y'
 * lookup inside the group bag.
 */
return [
    'index.title' => 'Writing',
    'index.intro' => 'The manuscripts of this project: novels, screenplays, essays, and everything between.',
    'index.create' => 'New work',
    'index.empty' => 'Nothing here yet. Start your first work.',
    'index.words' => ':count words',
    'index.sections' => ':count sections',
    'index.updated' => 'Updated :date',

    'form.create_title' => 'Start a new work',
    'form.title' => 'Title',
    'form.type' => 'Type',
    'form.logline' => 'Logline (optional)',
    'form.logline_help' => 'One sentence that captures the core of the work.',
    'form.create' => 'Create',
    'form.cancel' => 'Cancel',

    'types.novel' => 'Novel',
    'types.screenplay' => 'Screenplay',
    'types.stage_play' => 'Stage play',
    'types.short_story' => 'Short story',
    'types.essay' => 'Essay',
    'types.other' => 'Other',

    'statuses.concept' => 'Concept',
    'statuses.drafting' => 'Drafting',
    'statuses.revising' => 'Revising',
    'statuses.complete' => 'Complete',

    'workspace.add_section' => 'Add section',
    'workspace.add_child' => 'Add inside',
    'workspace.delete_section' => 'Delete section',
    'workspace.delete_confirm_title' => 'Delete this section?',
    'workspace.delete_confirm_body' => 'This removes the section and everything nested inside it.',
    'workspace.delete_confirm_action' => 'Delete',
    'workspace.section_title_placeholder' => 'Section title',
    'workspace.section_label' => 'Label (optional)',
    'workspace.new_section_title' => 'New section',
    'workspace.no_section' => 'Select a section to start writing, or add your first one.',
    'workspace.container_hint' => 'This section holds others. Select a child to write, or start writing here.',
    'workspace.start_writing' => 'Start writing here',
    'workspace.words' => ':count words',
    'workspace.of_target' => 'of :target',
    'workspace.pages' => '~:count pages',
    'workspace.saving' => 'Saving…',
    'workspace.saved' => 'Saved',
    'workspace.save_error' => 'Couldn\'t save. Your text is still here; retrying on the next change.',

    'flash.work_created' => 'Work created.',
    'flash.work_updated' => 'Work updated.',
    'flash.work_deleted' => 'Work deleted.',
    'flash.section_created' => 'Section added.',
    'flash.section_updated' => 'Section updated.',
    'flash.section_deleted' => 'Section deleted.',
];
