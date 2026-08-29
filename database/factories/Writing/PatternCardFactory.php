<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\PatternCard;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * PatternCard Factory — Task 1.
 *
 * @extends Factory<PatternCard>
 *
 * @method PatternCard create($attributes = [], ?Model $parent = null)
 * @method PatternCard make($attributes = [], ?Model $parent = null)
 * @method PatternCard createOne($attributes = [])
 * @method PatternCard makeOne($attributes = [])
 */
class PatternCardFactory extends Factory
{
    protected $model = PatternCard::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => fake()->words(2, true),
            'slug' => fake()->slug(),
            'kind' => fake()->randomElement(['device', 'trope']),
            'definition' => fake()->paragraph(),
            'craft_guidance' => fake()->paragraph(),
            'pitfalls' => fake()->paragraph(),
            'shape' => fake()->paragraph(),
            'is_seeded' => false,
        ];
    }
}
