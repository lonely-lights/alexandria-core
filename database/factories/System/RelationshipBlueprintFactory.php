<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\RelationshipBlueprint;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Relationship Blueprint Factory
 *
 * Generates fake RelationshipBlueprint instances for testing.
 *
 * RelationshipBlueprint defines allowed relationship types between two blueprints.
 * For example: "Character can have Location as home".
 *
 * AI Priority Levels:
 * - 'required': Always create this relationship when detected
 * - 'preferred': Create if context is clear
 * - 'optional': Only create if explicitly mentioned
 *
 * @extends Factory<RelationshipBlueprint>
 *
 * @method RelationshipBlueprint create($attributes = [], ?\Illuminate\Database\Eloquent\Model $parent = null)
 * @method RelationshipBlueprint make($attributes = [], ?\Illuminate\Database\Eloquent\Model $parent = null)
 * @method RelationshipBlueprint createOne($attributes = [])
 * @method RelationshipBlueprint makeOne($attributes = [])
 */
class RelationshipBlueprintFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = RelationshipBlueprint::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'from_blueprint_id' => Blueprint::factory(),
            'to_blueprint_id' => Blueprint::factory(),
            'relationship_name' => fake()->words(2, true),
            'from_label' => ucfirst(fake()->word()),
            'to_label' => ucfirst(fake()->word()),
            'ai_priority' => 'optional',
            'ai_instruction' => null,
            'context_triggers' => null,
            'is_bidirectional' => true,
            'max_connections' => null,
        ];
    }

    /**
     * Create a relationship blueprint between two specific blueprints.
     */
    public function between(Blueprint $from, Blueprint $to): static
    {
        return $this->state(fn (array $attributes) => [
            'from_blueprint_id' => $from->id,
            'to_blueprint_id' => $to->id,
        ]);
    }

    /**
     * Set AI priority to require.
     */
    public function required(): static
    {
        return $this->state(fn (array $attributes) => [
            'ai_priority' => 'required',
        ]);
    }

    /**
     * Set AI priority to prefer.
     */
    public function preferred(): static
    {
        return $this->state(fn (array $attributes) => [
            'ai_priority' => 'preferred',
        ]);
    }

    /**
     * Set AI priority to optional.
     */
    public function optional(): static
    {
        return $this->state(fn (array $attributes) => [
            'ai_priority' => 'optional',
        ]);
    }

    /**
     * Set context triggers for AI detection.
     */
    public function withTriggers(array $triggers): static
    {
        return $this->state(fn (array $attributes) => [
            'context_triggers' => $triggers,
        ]);
    }

    /**
     * Set a maximum number of connections.
     */
    public function maxConnections(int $max): static
    {
        return $this->state(fn (array $attributes) => [
            'max_connections' => $max,
        ]);
    }

    /**
     * Make the relationship unidirectional.
     */
    public function unidirectional(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_bidirectional' => false,
        ]);
    }

    /**
     * Set custom labels.
     */
    public function withLabels(string $fromLabel, string $toLabel): static
    {
        return $this->state(fn (array $attributes) => [
            'from_label' => $fromLabel,
            'to_label' => $toLabel,
        ]);
    }

    /**
     * Create a "home" relationship blueprint (Character → Location).
     */
    public function home(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_name' => 'Home',
            'from_label' => 'Home',
            'to_label' => 'Residents',
            'ai_priority' => 'preferred',
            'context_triggers' => ['lives in', 'resides', 'home', 'dwelling', 'house'],
        ]);
    }

    /**
     * Create a "family" relationship blueprint (Character → Character).
     */
    public function family(): static
    {
        return $this->state(fn (array $attributes) => [
            'relationship_name' => 'Family',
            'from_label' => 'Family Member',
            'to_label' => 'Family Member',
            'ai_priority' => 'required',
            'context_triggers' => ['mother', 'father', 'sister', 'brother', 'parent', 'child', 'spouse'],
        ]);
    }

    /**
     * Set AI instruction for relationship creation.
     */
    public function withAiInstruction(string $instruction): static
    {
        return $this->state(fn (array $attributes) => [
            'ai_instruction' => $instruction,
        ]);
    }
}
