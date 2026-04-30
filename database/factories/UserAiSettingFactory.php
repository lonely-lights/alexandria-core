<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Models\UserAiSetting;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<UserAiSetting>
 *
 * @method UserAiSetting create($attributes = [], ?Model $parent = null)
 * @method UserAiSetting make($attributes = [], ?Model $parent = null)
 * @method UserAiSetting createOne($attributes = [])
 * @method UserAiSetting makeOne($attributes = [])
 */
class UserAiSettingFactory extends Factory
{
    protected $model = UserAiSetting::class;

    public function definition(): array
    {
        return [
            'user_id' => fake()->numberBetween(1, 1000),
            'ai_provider_id' => AiProvider::factory(),
        ];
    }

    public function forUser(int $userId): self
    {
        return $this->state(fn () => ['user_id' => $userId]);
    }

    public function forProvider(AiProvider $provider): self
    {
        return $this->state(fn () => ['ai_provider_id' => $provider->id]);
    }

    public function withModels(string $analyst, string $creative): self
    {
        return $this->state(fn () => [
            'analyst_model_name' => $analyst,
            'creative_model_name' => $creative,
        ]);
    }
}
