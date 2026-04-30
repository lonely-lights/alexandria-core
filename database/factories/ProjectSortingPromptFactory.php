<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\ProjectSortingPrompt;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<ProjectSortingPrompt>
 *
 * @method ProjectSortingPrompt create($attributes = [], ?Model $parent = null)
 * @method ProjectSortingPrompt make($attributes = [], ?Model $parent = null)
 * @method ProjectSortingPrompt createOne($attributes = [])
 * @method ProjectSortingPrompt makeOne($attributes = [])
 */
class ProjectSortingPromptFactory extends Factory
{
    protected $model = ProjectSortingPrompt::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => fake()->words(3, true),
            'instructions' => fake()->paragraphs(2, true),
            'is_default' => false,
            'is_active' => true,
        ];
    }

    public function default(): self
    {
        return $this->state(fn () => ['is_default' => true]);
    }

    public function inactive(): self
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function forProject(Project $project): self
    {
        return $this->state(fn () => ['project_id' => $project->id]);
    }
}
