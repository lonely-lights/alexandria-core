<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Notable;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Notebook;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<Notebook>
 *
 * @method Notebook create($attributes = [], ?Model $parent = null)
 * @method Notebook make($attributes = [], ?Model $parent = null)
 * @method Notebook createOne($attributes = [])
 * @method Notebook makeOne($attributes = [])
 */
class NotebookFactory extends Factory
{
    protected $model = Notebook::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => fake()->words(3, true),
            'status' => 'active',
            'is_pinned' => false,
            'sort_order' => 0,
        ];
    }

    public function forProject(Project $project): static
    {
        return $this->state(fn () => ['project_id' => $project->id]);
    }

    public function pinned(): static
    {
        return $this->state(fn () => ['is_pinned' => true]);
    }

    public function archived(): static
    {
        return $this->state(fn () => ['status' => 'archived']);
    }
}
