<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rebuilds counts and mentions from raw content', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);
    $mira = Entry::factory()->create(['project_id' => $project->id, 'blueprint_id' => $blueprint->id, 'name' => 'Mira Vance']);
    $work = Work::factory()->forProject($project)->create();

    // Raw insert path: content present but derived data missing/stale.
    $section = WorkSection::factory()->create([
        'work_id' => $work->id,
        'content' => '[[Mira Vance]] waits alone.',
        'word_count' => 999,
    ]);

    $this->artisan('alexandria:writing:rebuild')->assertExitCode(0);

    expect($section->fresh()->word_count)->toBe(4)
        ->and($section->fresh()->entryMentions)->toHaveCount(1)
        ->and($work->fresh()->word_count)->toBe(4);
});

it('scopes the rebuild to one work when --work is given', function () {
    $workA = Work::factory()->create();
    $workB = Work::factory()->create();
    $sectionA = WorkSection::factory()->create(['work_id' => $workA->id, 'content' => 'One two.', 'word_count' => 999]);
    $sectionB = WorkSection::factory()->create(['work_id' => $workB->id, 'content' => 'One two.', 'word_count' => 999]);

    $this->artisan('alexandria:writing:rebuild', ['--work' => $workA->id])->assertExitCode(0);

    expect($sectionA->fresh()->word_count)->toBe(2)
        ->and($sectionB->fresh()->word_count)->toBe(999);
});
