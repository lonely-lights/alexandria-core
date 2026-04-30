<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\Actions\EntryActionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// validateCreateEntry
// ---------------------------------------------------------------------------

it('throws when create_entry payload is missing model_class', function () {
    (new EntryActionService)->validateCreateEntry([
        'attributes' => ['name' => 'Aragorn'],
    ], 0);
})->throws(ValidationException::class);

it('throws when create_entry payload is missing attributes', function () {
    (new EntryActionService)->validateCreateEntry([
        'model_class' => Entry::class,
    ], 0);
})->throws(ValidationException::class);

it('throws when create_entry attributes is not an array', function () {
    (new EntryActionService)->validateCreateEntry([
        'model_class' => Entry::class,
        'attributes' => 'not an array',
    ], 0);
})->throws(ValidationException::class);

it('passes validation for a well-formed create_entry payload', function () {
    $blueprint = Blueprint::factory()->create();

    (new EntryActionService)->validateCreateEntry([
        'model_class' => Entry::class,
        'temp_id' => 'character_aragorn',
        'attributes' => [
            'blueprint_id' => $blueprint->id,
            'project_id' => $blueprint->project_id,
            'name' => 'Aragorn',
        ],
    ], 0);

    // No exception means validation passed.
    expect(true)->toBeTrue();
});

it('throws when create_entry attributes.blueprint_id references a non-existent blueprint', function () {
    (new EntryActionService)->validateCreateEntry([
        'model_class' => Entry::class,
        'attributes' => [
            'blueprint_id' => 999_999,
            'name' => 'Phantom',
        ],
    ], 0);
})->throws(ValidationException::class);

// ---------------------------------------------------------------------------
// validateUpdateEntry
// ---------------------------------------------------------------------------

it('throws when update_entry payload is missing required fields', function () {
    (new EntryActionService)->validateUpdateEntry([
        'model_class' => Entry::class,
        // missing model_id and attributes
    ], 0);
})->throws(ValidationException::class);

it('passes validation for a well-formed update_entry payload', function () {
    (new EntryActionService)->validateUpdateEntry([
        'model_class' => Entry::class,
        'model_id' => 1,
        'attributes' => ['name' => 'Renamed'],
    ], 0);

    expect(true)->toBeTrue();
});

// ---------------------------------------------------------------------------
// createEntry
// ---------------------------------------------------------------------------

it('creates an Entry populating native columns', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Aragorn',
                'summary' => 'Heir of Isildur.',
            ],
        ],
    ]);

    $tempIdMap = [];
    (new EntryActionService)->createEntry($command, $tempIdMap);

    $entry = Entry::query()->where('name', 'Aragorn')->first();

    expect($entry)->not->toBeNull()
        ->and($entry->project_id)->toBe($project->id)
        ->and($entry->blueprint_id)->toBe($blueprint->id)
        ->and($entry->summary)->toBe('Heir of Isildur.')
        ->and($entry->slug)->not->toBeEmpty();
});

it('stores temp_id => entry id in tempIdMap when temp_id is supplied', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'temp_id' => 'character_aragorn',
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Aragorn',
            ],
        ],
    ]);

    $tempIdMap = [];
    (new EntryActionService)->createEntry($command, $tempIdMap);

    $entry = Entry::query()->where('name', 'Aragorn')->first();

    expect($tempIdMap)->toHaveKey('character_aragorn')
        ->and($tempIdMap['character_aragorn'])->toBe($entry->id);
});

it('resolves temp IDs in attributes against the existing tempIdMap', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    // Pre-populate the tempIdMap so the resolver finds it
    $parent = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create(['name' => 'Rivendell']);
    $tempIdMap = ['location_rivendell' => $parent->id];

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Hidden Hall',
                'parent_entry_id' => 'location_rivendell',
            ],
        ],
    ]);

    (new EntryActionService)->createEntry($command, $tempIdMap);

    $entry = Entry::query()->where('name', 'Hidden Hall')->first();

    expect($entry->parent_id)->toBe($parent->id);
});

it('maps parent_entry_id to native parent_id during createEntry', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $parent = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Child',
                'parent_entry_id' => $parent->id,
            ],
        ],
    ]);

    $tempIdMap = [];
    (new EntryActionService)->createEntry($command, $tempIdMap);

    $entry = Entry::query()->where('name', 'Child')->first();

    expect($entry->parent_id)->toBe($parent->id);
});

it('sets dynamic (EAV) attributes after the model is saved', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    // Side-effect: registers `biography` as a dynamic field on the blueprint — assignment dropped.
    BlueprintField::factory()->forBlueprint($blueprint)->textarea()->named('biography')->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Aragorn',
                'biography' => 'Raised in Rivendell as Estel.',
            ],
        ],
    ]);

    $tempIdMap = [];
    (new EntryActionService)->createEntry($command, $tempIdMap);

    /** @var Entry $entry */
    $entry = Entry::query()->where('name', 'Aragorn')->first();

    expect($entry)->not->toBeNull()
        ->and($entry->biography)->toBe('Raised in Rivendell as Estel.');
});

it('creates an entry_relationships row for relationship-classification blueprints', function () {
    $project = Project::factory()->create();
    $standard = Blueprint::factory()->forProject($project)->create();
    $relationship = Blueprint::factory()->forProject($project)->relationship()->create([
        'slug' => 'character-relationship',
    ]);

    $aragorn = Entry::factory()->inProjectWithBlueprint($project, $standard)->create();
    $arwen = Entry::factory()->inProjectWithBlueprint($project, $standard)->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'temp_id' => 'rel_marriage',
            'attributes' => [
                'blueprint_id' => $relationship->id,
                'parent_entry_id' => $aragorn->id,
                'child_entry_id' => $arwen->id,
                'parent_label' => 'Husband',
                'child_label' => 'Wife',
            ],
        ],
    ]);

    $tempIdMap = [];
    (new EntryActionService)->createEntry($command, $tempIdMap);

    $row = DB::table('entry_relationships')
        ->where('parent_entry_id', $aragorn->id)
        ->where('child_entry_id', $arwen->id)
        ->first();

    expect($row)->not->toBeNull()
        ->and($row->relationship_type)->toBe('character-relationship')
        ->and($row->parent_label)->toBe('Husband')
        ->and($row->child_label)->toBe('Wife')
        ->and($tempIdMap['rel_marriage'])->toBe('rel_'.$row->id);
});

it('throws when an unresolved temp_id-shaped value is encountered', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Orphan',
                'parent_entry_id' => 'location_does_not_exist',
            ],
        ],
    ]);

    $tempIdMap = [];
    (new EntryActionService)->createEntry($command, $tempIdMap);
})->throws(Exception::class, 'Unresolved temp_id reference');

// ---------------------------------------------------------------------------
// updateEntry
// ---------------------------------------------------------------------------

it('updates native columns on an existing entry', function () {
    $entry = Entry::factory()->create(['name' => 'Original Name']);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'update_entry',
        'payload' => [
            'model_class' => Entry::class,
            'model_id' => $entry->id,
            'attributes' => [
                'name' => 'Renamed',
                'summary' => 'New summary.',
            ],
        ],
    ]);

    (new EntryActionService)->updateEntry($command, []);

    $entry->refresh();
    expect($entry->name)->toBe('Renamed')
        ->and($entry->summary)->toBe('New summary.');
});

it('resolves temp IDs in updateEntry attributes', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();
    $newParent = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'update_entry',
        'payload' => [
            'model_class' => Entry::class,
            'model_id' => $entry->id,
            'attributes' => [
                'parent_id' => 'character_new_parent',
            ],
        ],
    ]);

    $tempIdMap = ['character_new_parent' => $newParent->id];
    (new EntryActionService)->updateEntry($command, $tempIdMap);

    $entry->refresh();
    expect($entry->parent_id)->toBe($newParent->id);
});

it('persists dynamic (EAV) attributes through updateEntry', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    BlueprintField::factory()->forBlueprint($blueprint)->textarea()->named('biography')->create();

    /** @var Entry $entry */
    $entry = Entry::factory()
        ->inProjectWithBlueprint($project, $blueprint)
        ->create(['name' => 'Aragorn']);

    // Seed an existing dynamic value so we can assert it is overwritten.
    $entry->biography = 'Raised in Rivendell as Estel.';

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'update_entry',
        'payload' => [
            'model_class' => Entry::class,
            'model_id' => $entry->id,
            'attributes' => [
                'summary' => 'Heir of Isildur.', // native column
                'biography' => 'Crowned king of Gondor at the end of the Third Age.', // EAV field
            ],
        ],
    ]);

    (new EntryActionService)->updateEntry($command, []);

    $entry->refresh();
    expect($entry->summary)->toBe('Heir of Isildur.')
        ->and($entry->biography)->toBe('Crowned king of Gondor at the end of the Third Age.');
});

// ---------------------------------------------------------------------------
// integrateField
// ---------------------------------------------------------------------------

it('replaces field content on integrateField with operation=replace', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()
        ->inProjectWithBlueprint($project, $blueprint)
        ->create(['summary' => 'Old summary.']);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'integrate_field',
        'payload' => [
            'entry_id' => $entry->id,
            'field_name' => 'summary',
            'proposed_value' => 'Brand new summary.',
            'operation' => 'replace',
        ],
    ]);

    (new EntryActionService)->integrateField($command, []);

    $entry->refresh();
    expect($entry->summary)->toBe('Brand new summary.');
});

it('enhances field content with a smart separator (adds period when missing)', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()
        ->inProjectWithBlueprint($project, $blueprint)
        ->create(['summary' => 'Born in the North']);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'integrate_field',
        'payload' => [
            'entry_id' => $entry->id,
            'field_name' => 'summary',
            'proposed_value' => 'Raised in Rivendell.',
            'operation' => 'enhance',
        ],
    ]);

    (new EntryActionService)->integrateField($command, []);

    $entry->refresh();
    expect($entry->summary)->toBe('Born in the North. Raised in Rivendell.');
});

it('enhances field content with a single space when previous content already ends with punctuation', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()
        ->inProjectWithBlueprint($project, $blueprint)
        ->create(['summary' => 'Born in the North.']);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'integrate_field',
        'payload' => [
            'entry_id' => $entry->id,
            'field_name' => 'summary',
            'proposed_value' => 'Raised in Rivendell.',
            'operation' => 'enhance',
        ],
    ]);

    (new EntryActionService)->integrateField($command, []);

    $entry->refresh();
    expect($entry->summary)->toBe('Born in the North. Raised in Rivendell.');
});

it('appends field content with a double newline separator on operation=append', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()
        ->inProjectWithBlueprint($project, $blueprint)
        ->create(['content' => 'First paragraph.']);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'integrate_field',
        'payload' => [
            'entry_id' => $entry->id,
            'field_name' => 'content',
            'proposed_value' => 'Second paragraph.',
            'operation' => 'append',
        ],
    ]);

    (new EntryActionService)->integrateField($command, []);

    $entry->refresh();
    expect($entry->content)->toBe("First paragraph.\n\nSecond paragraph.");
});

it('avoids duplication when merging highly overlapping content', function () {
    // When >70% of words overlap, merge falls through to enhanceFieldContent.
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()
        ->inProjectWithBlueprint($project, $blueprint)
        ->create(['summary' => 'Aragorn is the heir of Isildur and king of Gondor.']);

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'integrate_field',
        'payload' => [
            'entry_id' => $entry->id,
            'field_name' => 'summary',
            // Heavy word-overlap with the original to trigger the merge=>enhance path.
            'proposed_value' => 'Aragorn is the heir of Isildur and king.',
            'operation' => 'merge',
        ],
    ]);

    (new EntryActionService)->integrateField($command, []);

    $entry->refresh();
    // Enhance path used: original ends with '.', so separator is a single space.
    expect($entry->summary)->toBe('Aragorn is the heir of Isildur and king of Gondor. Aragorn is the heir of Isildur and king.');
});

it('throws on an unsupported integrateField operation', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $entry = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    $command = AiReviewCommand::factory()->create([
        'action_type' => 'integrate_field',
        'payload' => [
            'entry_id' => $entry->id,
            'field_name' => 'summary',
            'proposed_value' => 'X',
            'operation' => 'unsupported_op',
        ],
    ]);

    (new EntryActionService)->integrateField($command, []);
})->throws(Exception::class, 'Unsupported integration operation');
