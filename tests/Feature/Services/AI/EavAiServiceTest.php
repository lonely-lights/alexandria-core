<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\EavAiService;
use Illuminate\Auth\GenericUser;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Tiny stand-in for a host-app User. EavAiService only needs ->id via
 * Authenticatable::getAuthIdentifier(), which GenericUser provides.
 */
function makeEavAiServiceUser(int $id = 1): GenericUser
{
    return new GenericUser(['id' => $id]);
}

// ---------------------------------------------------------------------------
// categorizeNote — deferred to CT5d
// ---------------------------------------------------------------------------

it('throws LogicException from categorizeNote until the orchestrator (CT5d) is integrated', function () {
    $project = Project::factory()->create();
    $note = Note::factory()->create();
    $user = makeEavAiServiceUser();

    (new EavAiService)->categorizeNote($note, $user, $project);
})->throws(LogicException::class, 'EavAiService::categorizeNote requires EavAiCategorizationOrchestrator');

// ---------------------------------------------------------------------------
// suggestEntries — stubbed
// ---------------------------------------------------------------------------

it('returns an empty array from suggestEntries (stub until CT5d)', function () {
    $project = Project::factory()->create();
    $user = makeEavAiServiceUser();

    $result = (new EavAiService)->suggestEntries('Some narrative text mentioning Aragorn.', $project, $user);

    expect($result)->toBe([]);
});

// ---------------------------------------------------------------------------
// autoCompleteEntries — works standalone, no AI involved
// ---------------------------------------------------------------------------

it('returns an empty array when no entries match the prefix', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->named('Gimli')->create();

    $result = (new EavAiService)->autoCompleteEntries('Xyz', $project);

    expect($result)->toBe([]);
});

it('matches entries by name prefix', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->named('Aragorn')->create();
    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->named('Arwen')->create();
    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->named('Gimli')->create();

    $result = (new EavAiService)->autoCompleteEntries('Ar', $project);

    expect($result)->toHaveCount(2);
    $names = collect($result)->pluck('name')->all();
    expect($names)->toContain('Aragorn')
        ->and($names)->toContain('Arwen')
        ->and($names)->not->toContain('Gimli');
});

it('is project-scoped — entries in another project do not appear', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $blueprintA = Blueprint::factory()->forProject($projectA)->create();
    $blueprintB = Blueprint::factory()->forProject($projectB)->create();

    Entry::factory()->inProjectWithBlueprint($projectA, $blueprintA)->named('Aragorn')->create();
    Entry::factory()->inProjectWithBlueprint($projectB, $blueprintB)->named('Arwen')->create();

    $result = (new EavAiService)->autoCompleteEntries('Ar', $projectA);

    expect($result)->toHaveCount(1)
        ->and($result[0]['name'])->toBe('Aragorn');
});

it('filters by blueprint slug when provided', function () {
    $project = Project::factory()->create();
    $character = Blueprint::factory()->forProject($project)->character()->create();
    $location = Blueprint::factory()->forProject($project)->location()->create();

    Entry::factory()->inProjectWithBlueprint($project, $character)->named('Aragorn')->create();
    Entry::factory()->inProjectWithBlueprint($project, $character)->named('Arwen')->create();
    Entry::factory()->inProjectWithBlueprint($project, $location)->named('Arnor')->create();

    $result = (new EavAiService)->autoCompleteEntries('Ar', $project, 'characters');

    expect($result)->toHaveCount(2);
    $names = collect($result)->pluck('name')->all();
    expect($names)->toContain('Aragorn')
        ->and($names)->toContain('Arwen')
        ->and($names)->not->toContain('Arnor');
});

it('returns rows shaped {id, name, slug} and limits results to 10', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    // 12 entries — limit should cap at 10.
    for ($i = 1; $i <= 12; $i++) {
        Entry::factory()->inProjectWithBlueprint($project, $blueprint)->named('Prefix'.$i)->create();
    }

    $result = (new EavAiService)->autoCompleteEntries('Prefix', $project);

    expect($result)->toHaveCount(10);

    $first = $result[0];
    expect($first)->toHaveKey('id')
        ->and($first)->toHaveKey('name')
        ->and($first)->toHaveKey('slug')
        // Make sure no extra columns leaked through.
        ->and(array_keys($first))->toBe(['id', 'name', 'slug']);
});
