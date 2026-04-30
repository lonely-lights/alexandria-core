<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\AiModel;
use Alexandria\Core\Models\AiProvider;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<AiModel>
 *
 * @method AiModel create($attributes = [], ?Model $parent = null)
 * @method AiModel make($attributes = [], ?Model $parent = null)
 * @method AiModel createOne($attributes = [])
 * @method AiModel makeOne($attributes = [])
 */
class AiModelFactory extends Factory
{
    protected $model = AiModel::class;

    public function definition(): array
    {
        return [
            'ai_provider_id' => AiProvider::factory(),
            'model_id' => fake()->unique()->slug(2),
            'display_name' => fake()->words(2, true),
            'category' => 'general',
            'context_window' => 128000,
            'input_price_per_million' => fake()->randomFloat(4, 0.5, 30),
            'output_price_per_million' => fake()->randomFloat(4, 1, 60),
            'supports_json_mode' => true,
            'supports_vision' => false,
            'is_flagship' => false,
            'is_recommended' => false,
            'is_active' => true,
            'released_at' => fake()->dateTimeBetween('-2 years', 'now'),
        ];
    }

    public function recommended(): self
    {
        return $this->state(fn () => ['is_recommended' => true]);
    }

    public function flagship(): self
    {
        return $this->state(fn () => ['is_flagship' => true]);
    }

    public function inactive(): self
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function analyst(): self
    {
        return $this->state(fn () => ['category' => 'analyst']);
    }

    public function creative(): self
    {
        return $this->state(fn () => ['category' => 'creative']);
    }

    public function forProvider(AiProvider $provider): self
    {
        return $this->state(fn () => ['ai_provider_id' => $provider->id]);
    }
}
