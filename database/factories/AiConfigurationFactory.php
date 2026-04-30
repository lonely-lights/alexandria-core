<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\AiConfiguration;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<AiConfiguration>
 *
 * @method AiConfiguration create($attributes = [], ?Model $parent = null)
 * @method AiConfiguration make($attributes = [], ?Model $parent = null)
 * @method AiConfiguration createOne($attributes = [])
 * @method AiConfiguration makeOne($attributes = [])
 */
class AiConfigurationFactory extends Factory
{
    protected $model = AiConfiguration::class;

    public function definition(): array
    {
        return [
            'configurable_type' => 'TestModel',
            'configurable_id' => 1,
            'type' => AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS,
            'instructions' => fake()->sentence(),
            'priority' => 0,
            'is_active' => true,
        ];
    }

    public function blueprintInstructions(): self
    {
        return $this->state(fn () => ['type' => AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS]);
    }

    public function fieldInstructions(): self
    {
        return $this->state(fn () => ['type' => AiConfiguration::TYPE_FIELD_INSTRUCTIONS]);
    }

    public function inactive(): self
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
