<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Traits\AI\HasEavAiIntegration;
use Illuminate\Auth\GenericUser;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Tiny stand-in for a host-app User. The trait only needs ->id via
 * Authenticatable::getAuthIdentifier(), which GenericUser provides.
 */
function makeTraitUser(int $id = 1): GenericUser
{
    return new GenericUser(['id' => $id]);
}

// ---------------------------------------------------------------------------
// Trait is applied to Project
// ---------------------------------------------------------------------------

it('applies HasEavAiIntegration to the Project model', function () {
    $project = Project::factory()->create();

    expect(class_uses_recursive($project))->toContain(HasEavAiIntegration::class);
});

// ---------------------------------------------------------------------------
// autoCompleteEntries delegates correctly through the service
// ---------------------------------------------------------------------------

it('delegates autoCompleteEntries through the service and returns matches', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->named('Aragorn')->create();
    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->named('Arwen')->create();
    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->named('Gimli')->create();

    $result = $project->autoCompleteEntries('Ar');

    expect($result)->toHaveCount(2);
    $names = collect($result)->pluck('name')->all();
    expect($names)->toContain('Aragorn')
        ->and($names)->toContain('Arwen')
        ->and($names)->not->toContain('Gimli');
});

// ---------------------------------------------------------------------------
// categorizeNoteWithAi delegates to the service which throws
// ---------------------------------------------------------------------------

it('throws RuntimeException from categorizeNoteWithAi (delegates to service)', function () {
    $project = Project::factory()->create();
    $note = Note::factory()->create();
    $user = makeTraitUser();

    $project->categorizeNoteWithAi($note, $user);
})->throws(RuntimeException::class, 'EavAiService::categorizeNote requires EavAiCategorizationOrchestrator');

it('delegates suggestEntriesFromText through the service and returns the stub array', function () {
    $project = Project::factory()->create();
    $user = makeTraitUser();

    $result = $project->suggestEntriesFromText('Some narrative text mentioning Aragorn.', $user);

    expect($result)->toBe([]);
});

// ---------------------------------------------------------------------------
// suggestEntryRelationships
// ---------------------------------------------------------------------------

it('throws ModelNotFoundException from suggestEntryRelationships when the entry is not in this project', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $blueprintB = Blueprint::factory()->forProject($projectB)->create();
    $entryInProjectB = Entry::factory()->inProjectWithBlueprint($projectB, $blueprintB)->create();

    $projectA->suggestEntryRelationships($entryInProjectB->id);
})->throws(ModelNotFoundException::class);

it('returns an empty array from suggestEntryRelationships for a valid entry (stub until CT5d)', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    $result = $project->suggestEntryRelationships($entry->id);

    expect($result)->toBe([]);
});

// ---------------------------------------------------------------------------
// hasAiIntegrationEnabled
// ---------------------------------------------------------------------------

it('returns true from hasAiIntegrationEnabled by default', function () {
    $project = Project::factory()->create();

    expect($project->hasAiIntegrationEnabled())->toBeTrue();
});
