<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\AiProvider;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @extends Factory<AiProvider>
 *
 * @method AiProvider create($attributes = [], ?Model $parent = null)
 * @method AiProvider make($attributes = [], ?Model $parent = null)
 * @method AiProvider createOne($attributes = [])
 * @method AiProvider makeOne($attributes = [])
 */
class AiProviderFactory extends Factory
{
    protected $model = AiProvider::class;

    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(4),
            'website' => fake()->url(),
            'is_active' => true,
        ];
    }

    public function inactive(): self
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function anthropic(): self
    {
        return $this->state(fn () => [
            'name' => 'Anthropic', 'slug' => 'anthropic',
            'website' => 'https://www.anthropic.com',
        ]);
    }

    public function openai(): self
    {
        return $this->state(fn () => [
            'name' => 'OpenAI', 'slug' => 'openai',
            'website' => 'https://openai.com',
        ]);
    }

    public function google(): self
    {
        return $this->state(fn () => [
            'name' => 'Google', 'slug' => 'google',
            'website' => 'https://ai.google',
        ]);
    }
}
