<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\FieldValue;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a field value attached to an entry and blueprint field', function () {
    $entry = Entry::factory()->create();
    $field = BlueprintField::factory()->create(['blueprint_id' => $entry->blueprint_id]);

    $value = FieldValue::factory()->create([
        'entry_id' => $entry->id,
        'blueprint_field_id' => $field->id,
        'value' => '42',
    ]);

    expect($value->entry_id)->toBe($entry->id)
        ->and($value->blueprint_field_id)->toBe($field->id)
        ->and($value->value)->toBe('42');
});

it('allows multi-value fields (no unique constraint on entry+field)', function () {
    $entry = Entry::factory()->create();
    $field = BlueprintField::factory()->create(['blueprint_id' => $entry->blueprint_id]);

    FieldValue::factory()->create(['entry_id' => $entry->id, 'blueprint_field_id' => $field->id, 'value' => 'A']);
    FieldValue::factory()->create(['entry_id' => $entry->id, 'blueprint_field_id' => $field->id, 'value' => 'B']);

    expect(FieldValue::where('entry_id', $entry->id)->count())->toBe(2);
});

it('belongs to an entry and a blueprint field', function () {
    $value = FieldValue::factory()->create();
    expect($value->entry)->toBeInstanceOf(Entry::class)
        ->and($value->blueprintField)->toBeInstanceOf(BlueprintField::class);
});

it('cascade-deletes when its entry is deleted', function () {
    $entry = Entry::factory()->create();
    $field = BlueprintField::factory()->create(['blueprint_id' => $entry->blueprint_id]);
    FieldValue::factory()->create([
        'entry_id' => $entry->id,
        'blueprint_field_id' => $field->id,
    ]);

    $entry->forceDelete();

    expect(FieldValue::where('entry_id', $entry->id)->count())->toBe(0);
});

it('touches its entry on save', function () {
    $entry = Entry::factory()->create();
    $field = BlueprintField::factory()->create(['blueprint_id' => $entry->blueprint_id]);
    $originalUpdatedAt = $entry->updated_at;

    sleep(1);

    FieldValue::factory()->create(['entry_id' => $entry->id, 'blueprint_field_id' => $field->id]);

    expect($entry->fresh()->updated_at->gt($originalUpdatedAt))->toBeTrue();
});
