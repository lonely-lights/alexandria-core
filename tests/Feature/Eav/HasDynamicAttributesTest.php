<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\FieldValue;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->blueprint = Blueprint::factory()->create(['project_id' => $this->project->id]);
});

it('reads a dynamic integer field after persisting it directly', function () {
    $field = BlueprintField::factory()->integer()->create([
        'blueprint_id' => $this->blueprint->id,
        'name' => 'age',
    ]);
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);
    FieldValue::factory()->create([
        'entry_id' => $entry->id,
        'blueprint_field_id' => $field->id,
        'value' => '42',
    ]);

    $fresh = $entry->fresh()->load('attributes', 'type.fields');

    expect($fresh->age)->toBe(42); // integer cast applied
});

it('writes a dynamic text field via attribute assignment', function () {
    BlueprintField::factory()->text()->create([
        'blueprint_id' => $this->blueprint->id,
        'name' => 'occupation',
    ]);
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    $entry->occupation = 'Cartographer';

    expect(FieldValue::where('entry_id', $entry->id)->first()->value)
        ->toBe('Cartographer');
});

it('falls through to native columns first', function () {
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
        'name' => 'My Entry',
    ]);

    expect($entry->name)->toBe('My Entry');
});

it('returns null for an unknown attribute when no native column or field exists', function () {
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    // Pest converts PHP "Undefined property" warnings to errors. Wrap in
    // try/catch and assert the value is null OR the warning is thrown -
    // either is acceptable for an undefined-attribute lookup. The trait's
    // __get falls through to parent::__get which warns, but Eloquent
    // silently returns null in many cases.
    @$value = $entry->doesnt_exist;
    expect($value)->toBeNull();
});

it('casts boolean fields correctly on read', function () {
    BlueprintField::factory()->boolean()->create([
        'blueprint_id' => $this->blueprint->id,
        'name' => 'is_friendly',
    ]);
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    $entry->is_friendly = true;

    $fresh = $entry->fresh()->load('attributes', 'type.fields');
    expect($fresh->is_friendly)->toBeTrue();
});

it('handles multi-value fields by returning an array in insertion order', function () {
    $field = BlueprintField::factory()->text()->create([
        'blueprint_id' => $this->blueprint->id,
        'name' => 'titles',
    ]);
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    $entry->titles = ['Captain', 'Cartographer', 'Diplomat'];

    // ->toBe() asserts ordered equality. Entry::attributes() explicitly
    // orders by id so insertion order is the read order regardless of
    // the underlying database engine's row-order semantics.
    $fresh = $entry->fresh()->load('attributes', 'type.fields');
    expect($fresh->titles)->toBe(['Captain', 'Cartographer', 'Diplomat']);
});

it('returns the freshly written value on the same instance after a write', function () {
    // Regression test: with a pre-loaded attributes relation, writing a
    // dynamic field on the same instance must reflect on the next read --
    // not return the stale pre-write value. setDynamicAttribute now clears
    // both attributesCache AND the `attributes` relation so the next read
    // refetches from the database. Without this, the form-save pattern
    // (load then write then read) silently returned pre-write data.
    BlueprintField::factory()->text()->create([
        'blueprint_id' => $this->blueprint->id,
        'name' => 'rank',
    ]);
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    // Pre-load the attributes relation to simulate a form-load pattern.
    $entry->load('attributes', 'type.fields');
    expect($entry->rank)->toBeNull();

    // Write on the same instance.
    $entry->rank = 'Captain';

    // Read on the same instance -- without ->fresh().
    expect($entry->rank)->toBe('Captain');
});
