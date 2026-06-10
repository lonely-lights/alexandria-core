<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Work Factory
 *
 * Generates fake Work instances for testing — Stage 8g.1.
 *
 * @extends Factory<Work>
 */
class WorkFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Work::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => fake()->numberBetween(1, 1000),
            'title' => Str::title(fake()->words(3, true)),
            'type' => 'novel',
            'format' => Work::FORMAT_PROSE,
        ];
    }

    /**
     * Create a screenplay-format work.
     */
    public function screenplay(): static
    {
        return $this->state(fn () => [
            'type' => 'screenplay',
            'format' => Work::FORMAT_SCREENPLAY,
        ]);
    }

    /**
     * Create a work for a specific project.
     */
    public function forProject(Project $project): static
    {
        return $this->state(fn () => ['project_id' => $project->id]);
    }
}
