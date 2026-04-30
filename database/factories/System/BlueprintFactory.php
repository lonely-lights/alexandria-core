<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Blueprint Factory
 *
 * Generates fake Blueprint instances for testing.
 *
 * Classifications:
 * - 'standard': Regular entries (Character, Location, Item, etc.)
 * - 'list': Simple selection lists (Gender, Genre, Title, etc.)
 * - 'structural': Organizational entries (Chapter, Scene, etc.)
 * - 'relationship': Relationship entries (Character Relationship, etc.)
 *
 * @extends Factory<Blueprint>
 */
class BlueprintFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Blueprint::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(rand(1, 2), true);

        return [
            'project_id' => Project::factory(),
            'name' => ucwords($name),
            'slug' => Str::slug($name),
            'classification' => 'standard',
            // content_renderer omitted -- the migration default ('content') applies.
            // Tests that need a specific renderer override it explicitly.
            'description' => fake()->optional(0.6)->sentence(),
            'icon' => fake()->optional(0.5)->randomElement(['heroicon-user', 'heroicon-map-pin', 'heroicon-book-open', 'heroicon-star']),
            'show_on_dashboard' => true,
            'is_linkable' => true,
            'is_hub' => false,
        ];
    }

    /**
     * Create a blueprint for a specific project.
     */
    public function forProject(Project $project): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => $project->id,
        ]);
    }

    /**
     * Create a standard blueprint (default).
     */
    public function standard(): static
    {
        return $this->state(fn (array $attributes) => [
            'classification' => 'standard',
            'is_linkable' => true,
            'show_on_dashboard' => true,
        ]);
    }

    /**
     * Create a list blueprint (for selection lists).
     */
    public function list(): static
    {
        return $this->state(fn (array $attributes) => [
            'classification' => 'list',
            'list_selection_mode' => 'single',
            'is_linkable' => false,
            'show_on_dashboard' => false,
        ]);
    }

    /**
     * Create a structural blueprint (chapters, scenes, etc.).
     */
    public function structural(): static
    {
        return $this->state(fn (array $attributes) => [
            'classification' => 'structural',
            'is_linkable' => false,
            'show_on_dashboard' => true,
        ]);
    }

    /**
     * Create a relationship blueprint.
     */
    public function relationship(): static
    {
        return $this->state(fn (array $attributes) => [
            'classification' => 'relationship',
            'is_linkable' => false,
            'show_on_dashboard' => false,
        ]);
    }

    /**
     * Create a hub blueprint (navigation hub in UI).
     */
    public function hub(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_hub' => true,
            'show_on_dashboard' => true,
        ]);
    }

    /**
     * Create a blueprint with a specific name.
     */
    public function named(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $name,
            'slug' => Str::slug($name),
        ]);
    }

    /**
     * Create a Character-like blueprint.
     */
    public function character(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Character',
            'slug' => 'characters',
            'classification' => 'standard',
            'icon' => 'heroicon-user',
            'is_linkable' => true,
            'show_on_dashboard' => true,
        ]);
    }

    /**
     * Create a Location-like blueprint.
     */
    public function location(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Location',
            'slug' => 'locations',
            'classification' => 'standard',
            'icon' => 'heroicon-map-pin',
            'is_linkable' => true,
            'show_on_dashboard' => true,
        ]);
    }
}
