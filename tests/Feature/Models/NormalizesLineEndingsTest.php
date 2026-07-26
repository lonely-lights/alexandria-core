<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;

it('stores entry content and summary on LF regardless of what was submitted', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);

    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create([
        'content' => "== Heading ==\r\n\r\nBody line one.\r\nBody line two.",
        'summary' => "First line.\r\nSecond line.",
    ]);

    expect($entry->fresh()->content)->toBe("== Heading ==\n\nBody line one.\nBody line two.")
        ->and($entry->fresh()->summary)->toBe("First line.\nSecond line.");
});

it('normalizes a bare carriage return too', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);

    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create([
        'content' => "Old Mac line\rAnother",
    ]);

    expect($entry->fresh()->content)->toBe("Old Mac line\nAnother");
});

it('normalizes on update, not just on create — this is where mixing came from', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);

    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create([
        'content' => "Clean LF body.\nSecond line.",
    ]);

    // A browser textarea round-trip appends CRLF onto LF-stored prose.
    $entry->update(['content' => $entry->content."\r\n\r\n== Appended ==\r\n\r\nMore."]);

    expect($entry->fresh()->content)->not->toContain("\r")
        ->and($entry->fresh()->content)->toContain("\n\n== Appended ==\n\n");
});

it('leaves clean LF prose byte-identical', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->create(['project_id' => $project->id]);
    $clean = "== A ==\n\nline\n\n== B ==\n\nline";

    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create(['content' => $clean]);

    expect($entry->fresh()->content)->toBe($clean);
});

it('normalizes work section content and synopsis', function () {
    $project = Project::factory()->create();
    $work = Work::factory()->create(['project_id' => $project->id]);

    $section = WorkSection::factory()->create([
        'work_id' => $work->id,
        'content' => "INT. ROOM - DAY\r\n\r\nShe waits.",
        'synopsis' => "Beat one.\r\nBeat two.",
    ]);

    expect($section->fresh()->content)->toBe("INT. ROOM - DAY\n\nShe waits.")
        ->and($section->fresh()->synopsis)->toBe("Beat one.\nBeat two.");
});

it('leaves null prose alone', function () {
    $project = Project::factory()->create();
    $work = Work::factory()->create(['project_id' => $project->id]);

    $section = WorkSection::factory()->create(['work_id' => $work->id, 'content' => null, 'synopsis' => null]);

    expect($section->fresh()->content)->toBeNull()->and($section->fresh()->synopsis)->toBeNull();
});
