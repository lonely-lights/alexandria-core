<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\PatternCard;
use Alexandria\Core\Models\Writing\PatternThread;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * PatternThread Factory — Task 1.
 *
 * created_by resolves through the config-driven user model so the factory
 * works in both the core test suite (Testbench) and the consumer app.
 *
 * @extends Factory<PatternThread>
 *
 * @method PatternThread create($attributes = [], ?Model $parent = null)
 * @method PatternThread make($attributes = [], ?Model $parent = null)
 * @method PatternThread createOne($attributes = [])
 * @method PatternThread makeOne($attributes = [])
 */
class PatternThreadFactory extends Factory
{
    protected $model = PatternThread::class;

    public function definition(): array
    {
        /** @var class-string $userModel */
        $userModel = config('alexandria.models.user');

        return [
            'project_id' => Project::factory(),
            'pattern_card_id' => PatternCard::factory(),
            'title' => fake()->sentence(),
            'stance' => fake()->randomElement(['straight', 'subverted', 'lampshaded', 'inverted', 'averted', 'played_with', null]),
            'scope_type' => '',
            'scope_id' => 0,
            'entry_id' => null,
            'notes' => fake()->paragraph(),
            'created_by' => $userModel::factory(),
        ];
    }
}
