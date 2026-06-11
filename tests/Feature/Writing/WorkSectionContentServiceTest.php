<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Models\Writing\WorkSectionEntryMention;
use Alexandria\Core\Services\Writing\WorkSectionContentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @return array{0: Project, 1: Blueprint, 2: Entry, 3: Work, 4: WorkSection}
 */
function writingFixtures(): array
{
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);
    $mira = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id, 'name' => 'Mira Vance']);
    $work = Work::factory()->forProject($project)->create();
    $section = WorkSection::factory()->create(['work_id' => $work->id]);

    return [$project, $blueprint, $mira, $work, $section];
}

it('persists content, caches the word count, and writes mention rows', function () {
    [, , $mira, $work, $section] = writingFixtures();

    app(WorkSectionContentService::class)->persist($section, '[[Mira Vance]] crossed the bridge. [[Mira Vance]] looked back.');

    $section->refresh();

    // "Mira Vance crossed the bridge. Mira Vance looked back." = 9 words
    expect($section->content)->toContain('[[Mira Vance]]')
        ->and($section->word_count)->toBe(9)
        ->and($section->entryMentions)->toHaveCount(1)
        ->and($section->entryMentions->first()->entry_id)->toBe($mira->id)
        ->and($section->entryMentions->first()->source)->toBe(WorkSectionEntryMention::SOURCE_MENTION)
        ->and($section->entryMentions->first()->mention_count)->toBe(2)
        ->and($work->fresh()->word_count)->toBe(9);
});

it('is idempotent and removes stale mention rows on re-save', function () {
    [, , $mira, , $section] = writingFixtures();
    $service = app(WorkSectionContentService::class);

    $service->persist($section, '[[Mira Vance]] waits.');
    $service->persist($section, 'Nobody is here.');

    expect($section->fresh()->entryMentions)->toHaveCount(0)
        ->and($section->fresh()->word_count)->toBe(3);
});

it('ignores mention names that resolve to no entry or another project', function () {
    [, , , , $section] = writingFixtures();

    $foreign = Entry::factory()->create(['name' => 'Foreign Friend']); // different project

    app(WorkSectionContentService::class)->persist($section, '[[Ghost Name]] met [[Foreign Friend]].');

    expect($section->fresh()->entryMentions)->toHaveCount(0);
});

it('resolves mention names case-insensitively within the project', function () {
    [, , $mira, , $section] = writingFixtures();

    app(WorkSectionContentService::class)->persist($section, '[[mira vance]] arrives.');

    expect($section->fresh()->entryMentions->first()?->entry_id)->toBe($mira->id);
});

it('maintains pov and setting source rows from the reference fields', function () {
    [$project, $blueprint, $mira, , $section] = writingFixtures();
    $spire = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id, 'name' => 'Haven Spire']);

    $section->forceFill(['pov_entry_id' => $mira->id, 'setting_entry_id' => $spire->id])->save();

    app(WorkSectionContentService::class)->syncReferenceMentions($section->fresh());

    $sources = $section->fresh()->entryMentions->pluck('source', 'entry_id');

    expect($sources[$mira->id])->toBe(WorkSectionEntryMention::SOURCE_POV)
        ->and($sources[$spire->id])->toBe(WorkSectionEntryMention::SOURCE_SETTING);

    // A second sync is a no-op — no duplicate rows.
    app(WorkSectionContentService::class)->syncReferenceMentions($section->fresh());

    expect($section->fresh()->entryMentions)->toHaveCount(2);
});

it('updates the work rollup across multiple sections', function () {
    [, , , $work, $section] = writingFixtures();
    $second = WorkSection::factory()->create(['work_id' => $work->id]);
    $service = app(WorkSectionContentService::class);

    $service->persist($section, 'One two three.');
    $service->persist($second, 'Four five.');

    expect($work->fresh()->word_count)->toBe(5);
});

it('caches the section line count and rolls it up across sections', function () {
    [, , , $work, $section] = writingFixtures();
    $second = WorkSection::factory()->create(['work_id' => $work->id]);
    $service = app(WorkSectionContentService::class);

    $service->persist($section, "Line one\nLine two\n\nLine three");
    $service->persist($second, "Lonely line\n\n");

    expect($section->fresh()->line_count)->toBe(3)
        ->and($second->fresh()->line_count)->toBe(1)
        ->and($work->fresh()->line_count)->toBe(4);
});
