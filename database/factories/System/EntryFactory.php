<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Entry Factory
 *
 * Generates fake Entry instances for testing.
 *
 * Entries are the core content units in Alexandria's EAV system.
 * Each entry belongs to a Project and follows a Blueprint schema.
 *
 * @extends Factory<Entry>
 */
class EntryFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Entry::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'blueprint_id' => Blueprint::factory(),
            'name' => fake()->words(rand(1, 3), true),
            'summary' => fake()->optional(0.6)->sentence(),
            'content' => fake()->optional(0.4)->paragraphs(rand(1, 3), true),
            'sort_order' => 0,
        ];
    }

    /**
     * Create an entry for a specific project.
     * Note: You should also specify a blueprint from the same project.
     */
    public function forProject(Project $project): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => $project->id,
        ]);
    }

    /**
     * Create an entry for a specific blueprint.
     * Automatically sets the project_id to match the blueprint's project.
     */
    public function forBlueprint(Blueprint $blueprint): static
    {
        return $this->state(fn (array $attributes) => [
            'blueprint_id' => $blueprint->id,
            'project_id' => $blueprint->project_id,
        ]);
    }

    /**
     * Create an entry in a specific project with a specific blueprint.
     */
    public function inProjectWithBlueprint(Project $project, Blueprint $blueprint): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => $project->id,
            'blueprint_id' => $blueprint->id,
        ]);
    }

    /**
     * Create a child entry under a parent entry.
     */
    public function withParent(Entry $parent): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_id' => $parent->id,
            'project_id' => $parent->project_id,
            'blueprint_id' => $parent->blueprint_id,
        ]);
    }

    /**
     * Create an entry with full content.
     */
    public function withContent(): static
    {
        return $this->state(fn (array $attributes) => [
            'summary' => fake()->sentence(),
            'content' => fake()->paragraphs(rand(2, 5), true),
        ]);
    }

    /**
     * Create an entry with AI notes.
     */
    public function withAiNotes(): static
    {
        return $this->state(fn (array $attributes) => [
            'ai_notes' => fake()->paragraph(),
        ]);
    }

    /**
     * Create an entry with a specific name.
     */
    public function named(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $name,
        ]);
    }

    /**
     * Create an entry with a specific sort order.
     */
    public function ordered(int $order = 1): static
    {
        return $this->state(fn (array $attributes) => [
            'sort_order' => $order,
        ]);
    }

    /**
     * Create an entry with metadata.
     */
    public function withMetadata(array $metadata): static
    {
        return $this->state(fn (array $attributes) => [
            'metadata' => $metadata,
        ]);
    }
}
