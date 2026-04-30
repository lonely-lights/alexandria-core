<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Models\UserApiKey;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<UserApiKey>
 *
 * @method UserApiKey create($attributes = [], ?Model $parent = null)
 * @method UserApiKey make($attributes = [], ?Model $parent = null)
 * @method UserApiKey createOne($attributes = [])
 * @method UserApiKey makeOne($attributes = [])
 */
class UserApiKeyFactory extends Factory
{
    protected $model = UserApiKey::class;

    public function definition(): array
    {
        return [
            'user_id' => fake()->numberBetween(1, 1000),
            'ai_provider_id' => AiProvider::factory(),
            'label' => fake()->words(2, true).' '.now()->format('M Y'),
            'api_key' => 'sk-test-'.fake()->bothify('????????????????'),
            'api_key_last_four' => fake()->bothify('????'),
            'is_active' => false,
        ];
    }

    public function active(): self
    {
        return $this->state(fn () => ['is_active' => true]);
    }

    public function expiresIn(int $days): self
    {
        return $this->state(fn () => ['expires_at' => now()->addDays($days)]);
    }

    public function expired(): self
    {
        return $this->state(fn () => ['expires_at' => now()->subDay()]);
    }

    public function neverExpires(): self
    {
        return $this->state(fn () => ['expires_at' => null]);
    }

    public function forProvider(AiProvider $provider): self
    {
        return $this->state(fn () => ['ai_provider_id' => $provider->id]);
    }
}
