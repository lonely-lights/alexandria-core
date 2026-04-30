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

it('exposes is_type_field accessor from validation_rules', function () {
    $field = BlueprintField::factory()->create([
        'validation_rules' => ['is_type_field' => true],
    ]);

    expect($field->isTypeField)->toBeTrue();
});

it('soft-deletes a field', function () {
    $field = BlueprintField::factory()->create();
    $field->delete();

    expect($field->fresh()?->trashed())->toBeTrue();
});

it('touches its blueprint when saved', function () {
    $blueprint = Blueprint::factory()->create();
    $originalUpdatedAt = $blueprint->updated_at;

    sleep(1); // ensure timestamp difference

    BlueprintField::factory()->create(['blueprint_id' => $blueprint->id]);

    expect($blueprint->fresh()->updated_at->gt($originalUpdatedAt))->toBeTrue();
});
