<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a field on a blueprint', function () {
    $blueprint = Blueprint::factory()->create();
    $field = BlueprintField::factory()->create([
        'blueprint_id' => $blueprint->id,
        'name' => 'age',
        'type' => 'integer',
    ]);

    expect($field->blueprint_id)->toBe($blueprint->id)
        ->and($field->name)->toBe('age')
        ->and($field->type)->toBe('integer');
});

it('belongs to a blueprint', function () {
    $field = BlueprintField::factory()->create();

    expect($field->blueprint)->toBeInstanceOf(Blueprint::class);
});

it('exposes target_blueprint_slug from validation_rules for entry_reference fields', function () {
    $field = BlueprintField::factory()->create([
        'type' => 'entry_reference',
        'validation_rules' => ['target_blueprint_slug' => 'location'],
    ]);

    expect($field->targetBlueprintSlug)->toBe('location');
});

it('returns null targetBlueprintSlug when validation_rules has no target', function () {
    $field = BlueprintField::factory()->create([
        'type' => 'text',
        'validation_rules' => null,
    ]);

    expect($field->targetBlueprintSlug)->toBeNull();
});

it('isTypeField is true only for entry_reference fields with the flag set', function () {
    $field = BlueprintField::factory()->create([
        'type' => 'entry_reference',
        'validation_rules' => ['is_type_field' => true],
    ]);

    expect($field->isTypeField)->toBeTrue();
});

it('isTypeField is false for non-entry_reference fields even when the flag is set', function () {
    // The accessor gates on type === 'entry_reference'. A text/integer/etc
    // field with is_type_field=true must NOT report as a type field, because
    // the EAV layer expects type-classifier fields to point at another entry.
    $field = BlueprintField::factory()->create([
        'type' => 'text',
        'validation_rules' => ['is_type_field' => true],
    ]);

    expect($field->isTypeField)->toBeFalse();
});

it('forBlueprint factory state assigns sequential sort_order from the database', function () {
    $blueprint = Blueprint::factory()->create();

    $first = BlueprintField::factory()->forBlueprint($blueprint)->create();
    $second = BlueprintField::factory()->forBlueprint($blueprint)->create();
    $third = BlueprintField::factory()->forBlueprint($blueprint)->create();

    expect($first->sort_order)->toBe(0)
        ->and($second->sort_order)->toBe(1)
        ->and($third->sort_order)->toBe(2);
});

it('soft-deletes a field', function () {
    $field = BlueprintField::factory()->create();
    $field->delete();

    /** @var BlueprintField $fresh */
    $fresh = $field->fresh();
    expect($fresh->trashed())->toBeTrue();
});

it('touches its blueprint when saved', function () {
    $blueprint = Blueprint::factory()->create();
    $originalUpdatedAt = $blueprint->updated_at;

    sleep(1); // ensure timestamp difference

    BlueprintField::factory()->create(['blueprint_id' => $blueprint->id]);

    /** @var Blueprint $fresh */
    $fresh = $blueprint->fresh();
    expect($fresh->updated_at->gt($originalUpdatedAt))->toBeTrue();
});
