<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Blueprint Field Factory
 *
 * Generates fake BlueprintField instances for testing.
 *
 * Field Types:
 * - text: Short text input
 * - textarea: Long text input
 * - integer: Numeric input
 * - boolean: Yes/No toggle
 * - date: Date picker
 * - entry_reference: Reference to another entry
 *
 * @extends Factory<BlueprintField>
 */
class BlueprintFieldFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = BlueprintField::class;

    /**
     * Track sort order per blueprint for sequential ordering.
     */
    protected static array $sortOrders = [];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'blueprint_id' => Blueprint::factory(),
            'name' => Str::snake($name),
            'label' => ucfirst($name),
            'type' => 'text',
            'description' => fake()->optional(0.4)->sentence(),
            'default_value' => null,
            'is_required' => false,
            'sort_order' => 0,
            'validation_rules' => null,
        ];
    }

    /**
     * Create a field for a specific blueprint.
     */
    public function forBlueprint(Blueprint $blueprint): static
    {
        // Track and increment sort order per blueprint
        $blueprintId = $blueprint->id;
        if (! isset(static::$sortOrders[$blueprintId])) {
            static::$sortOrders[$blueprintId] = 0;
        }
        $sortOrder = static::$sortOrders[$blueprintId]++;

        return $this->state(fn (array $attributes) => [
            'blueprint_id' => $blueprint->id,
            'sort_order' => $sortOrder,
        ]);
    }

    /**
     * Create a text field.
     */
    public function text(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'text',
        ]);
    }

    /**
     * Create a textarea field.
     */
    public function textarea(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'textarea',
        ]);
    }

    /**
     * Create an integer field.
     */
    public function integer(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'integer',
        ]);
    }

    /**
     * Create a boolean field.
     */
    public function boolean(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'boolean',
            'default_value' => 'false',
        ]);
    }

    /**
     * Create a date field.
     */
    public function date(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'date',
        ]);
    }

    /**
     * Create an entry_reference field.
     */
    public function entryReference(string $targetBlueprintSlug): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'entry_reference',
            'validation_rules' => [
                'target_blueprint_slug' => $targetBlueprintSlug,
            ],
        ]);
    }

    /**
     * Make the field required.
     */
    public function required(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_required' => true,
        ]);
    }

    /**
     * Create a field with a specific name and label.
     */
    public function named(string $name, ?string $label = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => Str::snake($name),
            'label' => $label ?? ucfirst(str_replace('_', ' ', $name)),
        ]);
    }

    /**
     * Create an "Age" field (common for characters).
     */
    public function age(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'age',
            'label' => 'Age',
            'type' => 'integer',
            'description' => 'Character age in years',
        ]);
    }

    /**
     * Create a "Description" field.
     */
    public function description(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'description',
            'label' => 'Description',
            'type' => 'textarea',
        ]);
    }

    /**
     * Reset sort order tracking (call between test runs if needed).
     */
    public static function resetSortOrders(): void
    {
        static::$sortOrders = [];
    }
}
