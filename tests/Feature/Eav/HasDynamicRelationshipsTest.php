<?php

declare(strict_types=1);

/**
 * Dynamic-relationship magic tests.
 *
 * Suppress IDE warnings on:
 * - dynamic relationship accesses (e.g. $entry->parentScenes,
 *   $entry->characters()) -- runtime-resolved through __call into the trait
 * - the trait's own public methods (addRelationship, removeRelationship,
 *   getDynamicRelationship, callDynamicRelationship, parentRelationships,
 *   childRelationships) when called on factory-created Entry instances
 *   that PHPStorm widens to Collection|Model
 *
 * Static analysis can't fully verify either; the tests exercise the magic.
 *
 * @noinspection PhpUndefinedFieldInspection
 * @noinspection PhpUndefinedMethodInspection
 * @noinspection PhpDynamicFieldDeclarationInspection
 */

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->blueprint = Blueprint::factory()->create(['project_id' => $this->project->id]);
});

it('addRelationship creates an EntryRelationship row', function () {
    $alice = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $rivendell = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);

    $rel = $alice->addRelationship($rivendell, 'home', [
        'parent_label' => 'Home',
        'child_label' => 'Resident',
    ]);

    expect($rel)->toBeInstanceOf(EntryRelationship::class)
        ->and($rel->parent_entry_id)->toBe($alice->id)
        ->and($rel->child_entry_id)->toBe($rivendell->id)
        ->and($rel->relationship_type)->toBe('home')
        ->and($rel->parent_label)->toBe('Home')
        ->and($rel->child_label)->toBe('Resident');
});

it('removeRelationship deletes the matching row', function () {
    $alice = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $rivendell = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);

    $alice->addRelationship($rivendell, 'home');
    expect(EntryRelationship::query()->count())->toBe(1);

    $removed = $alice->removeRelationship($rivendell, 'home');

    expect($removed)->toBeTrue()
        ->and(EntryRelationship::query()->count())->toBe(0);
});

it('getDynamicRelationship returns Collection of related entries (outgoing direction)', function () {
    $character = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $loc1 = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id, 'name' => 'Rivendell']);
    $loc2 = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id, 'name' => 'Hobbiton']);

    $character->addRelationship($loc1, 'home');
    $character->addRelationship($loc2, 'home');

    $homes = $character->getDynamicRelationship('home');

    expect($homes)->toHaveCount(2)
        ->and($homes->pluck('name')->all())->toContain('Rivendell', 'Hobbiton');
});

it('parent prefix in callDynamicRelationship resolves the inverse direction', function () {
    $character = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $loc = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);

    // Character -> Location with relationship_type='home' (outgoing from Character).
    $character->addRelationship($loc, 'home');

    // Now from the location's side, parentHome should find the character.
    $parents = $loc->callDynamicRelationship('parentHome', [])->get();

    expect($parents)->toHaveCount(1)
        ->and($parents->first()->id)->toBe($character->id);
});

it('callDynamicRelationship applies the limit filter', function () {
    $character = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);

    foreach (range(1, 5) as $i) {
        $loc = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
        $character->addRelationship($loc, 'home');
    }

    $limited = $character->callDynamicRelationship('home', ['limit' => 3])->get();

    expect($limited)->toHaveCount(3);
});

it('Entry::__call routes undefined method calls to callDynamicRelationship', function () {
    $character = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $loc = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);

    $character->addRelationship($loc, 'home');

    // Calling $character->home() is not a defined method or relation;
    // __call should catch the BadMethodCallException and route to
    // callDynamicRelationship which returns a Builder.
    $query = $character->home();

    // Assign once -- Builder::get() executes a query each call, so reusing
    // $results is meaningfully faster than chaining ->get() twice.
    $results = $query->get();
    expect($query)->toBeInstanceOf(Builder::class)
        ->and($results)->toHaveCount(1)
        ->and($results->first()->id)->toBe($loc->id);
});

it('childRelationships and parentRelationships HasMany relations resolve', function () {
    $a = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $b = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);

    $a->addRelationship($b, 'friend');

    expect($a->parentRelationships()->count())->toBe(1)
        ->and($b->childRelationships()->count())->toBe(1);
});

it('addRelationship invalidates the dynamic relationship cache on the same instance', function () {
    // Regression test: without cache invalidation, getDynamicRelationship()
    // returned the pre-write Collection because $dynamicRelationshipCache
    // was keyed by raw key string and never reset on write. The trait now
    // clears both the cache + the loaded edge relations in addRelationship.
    $character = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $loc1 = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $loc2 = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);

    $character->addRelationship($loc1, 'home');
    expect($character->getDynamicRelationship('home'))->toHaveCount(1);

    // Write a second relationship on the same instance -- without cache
    // invalidation, the next read would still return only loc1.
    $character->addRelationship($loc2, 'home');
    expect($character->getDynamicRelationship('home'))->toHaveCount(2);
});

it('removeRelationship invalidates the dynamic relationship cache on the same instance', function () {
    $character = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);
    $loc = Entry::factory()->create(['project_id' => $this->project->id, 'blueprint_id' => $this->blueprint->id]);

    $character->addRelationship($loc, 'home');
    expect($character->getDynamicRelationship('home'))->toHaveCount(1);

    $character->removeRelationship($loc, 'home');
    expect($character->getDynamicRelationship('home'))->toHaveCount(0);
});
