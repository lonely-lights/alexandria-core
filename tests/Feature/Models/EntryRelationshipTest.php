<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates an entry relationship between two entries', function () {
    $parent = Entry::factory()->create();
    $child = Entry::factory()->create();

    $rel = EntryRelationship::factory()->create([
        'parent_entry_id' => $parent->id,
        'child_entry_id' => $child->id,
        'relationship_type' => 'home',
        'parent_label' => 'Home',
        'child_label' => 'Resident',
    ]);

    expect($rel->parent_entry_id)->toBe($parent->id)
        ->and($rel->child_entry_id)->toBe($child->id)
        ->and($rel->relationship_type)->toBe('home')
        ->and($rel->parent_label)->toBe('Home')
        ->and($rel->child_label)->toBe('Resident');
});

it('belongs to parent and child entries', function () {
    $rel = EntryRelationship::factory()->create();

    expect($rel->parent)->toBeInstanceOf(Entry::class)
        ->and($rel->child)->toBeInstanceOf(Entry::class);
});

it('allows multiple relationships of the same type between two entries', function () {
    $parent = Entry::factory()->create();
    $child = Entry::factory()->create();

    EntryRelationship::factory()->between($parent, $child)->ofType('lived_in')->create();
    EntryRelationship::factory()->between($parent, $child)->ofType('lived_in')->create();

    expect(EntryRelationship::query()
        ->where('parent_entry_id', $parent->id)
        ->where('child_entry_id', $child->id)
        ->where('relationship_type', 'lived_in')
        ->count())->toBe(2);
});

it('exposes the ofType scope filtering by relationship_type slug', function () {
    EntryRelationship::factory()->ofType('home')->create();
    EntryRelationship::factory()->ofType('family')->create();

    expect(EntryRelationship::ofType('home')->count())->toBe(1)
        ->and(EntryRelationship::ofType('family')->count())->toBe(1);
});

it('archive / unarchive / isArchived lifecycle works', function () {
    $rel = EntryRelationship::factory()->create();
    expect($rel->isArchived())->toBeFalse();

    $rel->archive();
    expect($rel->fresh()->isArchived())->toBeTrue();

    $rel->unarchive();
    expect($rel->fresh()->isArchived())->toBeFalse();
});

it('exposes active and archived scopes', function () {
    EntryRelationship::factory()->create(['archived_at' => null]);
    EntryRelationship::factory()->create(['archived_at' => now()]);

    expect(EntryRelationship::active()->count())->toBe(1)
        ->and(EntryRelationship::archived()->count())->toBe(1);
});

it('soft-deletes a relationship', function () {
    $rel = EntryRelationship::factory()->create();
    $rel->delete();

    /** @var EntryRelationship $fresh */
    $fresh = $rel->fresh();
    expect($fresh->trashed())->toBeTrue();
});
