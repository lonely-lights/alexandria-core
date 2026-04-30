<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\UserAiPrompt;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<UserAiPrompt>
 *
 * @method UserAiPrompt create($attributes = [], ?Model $parent = null)
 * @method UserAiPrompt make($attributes = [], ?Model $parent = null)
 * @method UserAiPrompt createOne($attributes = [])
 * @method UserAiPrompt makeOne($attributes = [])
 */
class UserAiPromptFactory extends Factory
{
    protected $model = UserAiPrompt::class;

    public function definition(): array
    {
        return [
            'user_id' => fake()->numberBetween(1, 1000),
            'label' => fake()->words(2, true),
            'prompt' => fake()->paragraph(),
            'action' => 'custom',
            'sort_order' => 0,
        ];
    }

    public function forUser(int $userId): self
    {
        return $this->state(fn () => ['user_id' => $userId]);
    }
}
