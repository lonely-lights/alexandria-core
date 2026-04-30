<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\ProjectAiInstruction;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<ProjectAiInstruction>
 *
 * @method ProjectAiInstruction create($attributes = [], ?Model $parent = null)
 * @method ProjectAiInstruction make($attributes = [], ?Model $parent = null)
 * @method ProjectAiInstruction createOne($attributes = [])
 * @method ProjectAiInstruction makeOne($attributes = [])
 */
class ProjectAiInstructionFactory extends Factory
{
    protected $model = ProjectAiInstruction::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'label' => fake()->words(3, true),
            'instructions' => fake()->paragraph(),
            'is_default' => false,
            'sort_order' => 0,
        ];
    }

    public function default(): self
    {
        return $this->state(fn () => ['is_default' => true]);
    }
}
