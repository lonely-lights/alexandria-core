<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * Entry Relationship Factory
 *
 * Generates fake EntryRelationship instances for testing.
 *
 * EntryRelationship manages bidirectional relationships between entries.
 * Each relationship is stored once with labels for both sides.
 *
 * @extends Factory<EntryRelationship>
 *
 * @method EntryRelationship create($attributes = [], ?Model $parent = null)
 * @method EntryRelationship make($attributes = [], ?Model $parent = null)
 * @method EntryRelationship createOne($attributes = [])
 * @method EntryRelationship makeOne($attributes = [])
 */
class EntryRelationshipFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = EntryRelationship::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'parent_entry_id' => Entry::factory(),
            'child_entry_id' => Entry::factory(),
            'relationship_type' => 'related_to',
            'parent_label' => null,
            'child_label' => null,
            'metadata' => null,
        ];
    }

    /**
     * Create a relationship between two specific entries.
     */
    public function between(Entry $parent, Entry $child): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_entry_id' => $parent->id,
            'child_entry_id' => $child->id,
        ]);
    }

    /**
     * Set the relationship type (slug of the relationship blueprint).
     */
    public function ofType(string $relationshipType): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => $relationshipType,
        ]);
    }

    /**
     * Set the labels for both sides of the relationship.
     *
     * @param  string  $parentLabel  Label shown on the child's page for the parent
     * @param  string  $childLabel  Label shown on the parent's page for the child
     */
    public function withLabels(string $parentLabel, string $childLabel): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_label' => $parentLabel,
            'child_label' => $childLabel,
        ]);
    }

    /**
     * Set metadata for the relationship.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function withMetadata(array $metadata): static
    {
        return $this->state(fn (array $attributes) => [
            'metadata' => $metadata,
        ]);
    }

    /**
     * Create a "home" relationship (Entry → Location).
     */
    public function home(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => 'home',
            'parent_label' => 'Home',
            'child_label' => 'Resident',
        ]);
    }

    /**
     * Create a "family" relationship (Entry → Entry).
     */
    public function family(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => 'family',
            'parent_label' => 'Family Member',
            'child_label' => 'Family Member',
        ]);
    }

    /**
     * Create a "friend" relationship (Entry → Entry).
     */
    public function friend(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => 'friend',
            'parent_label' => 'Friend',
            'child_label' => 'Friend',
        ]);
    }

    /**
     * Create a "member_of" relationship (Entry → Organization).
     */
    public function memberOf(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_type' => 'member_of',
            'parent_label' => 'Organization',
            'child_label' => 'Member',
        ]);
    }
}
