<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\System\AiPrompt;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<AiPrompt>
 *
 * @method AiPrompt create($attributes = [], ?Model $parent = null)
 * @method AiPrompt make($attributes = [], ?Model $parent = null)
 * @method AiPrompt createOne($attributes = [])
 * @method AiPrompt makeOne($attributes = [])
 */
class AiPromptFactory extends Factory
{
    protected $model = AiPrompt::class;

    public function definition(): array
    {
        $key = 'test.'.fake()->unique()->slug(2);

        return [
            'name' => fake()->words(3, true),
            'key' => $key,
            'version' => 1,
            'template_path' => $key.'.txt',
            'status' => 'active',
        ];
    }

    public function inactive(): self
    {
        return $this->state(fn () => ['status' => 'inactive']);
    }

    public function archived(): self
    {
        return $this->state(fn () => ['status' => 'archived']);
    }

    public function withKey(string $key): self
    {
        return $this->state(fn () => ['key' => $key, 'template_path' => $key.'.txt']);
    }
}
