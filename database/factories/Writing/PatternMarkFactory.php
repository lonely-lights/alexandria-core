<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Writing;

use Alexandria\Core\Models\Writing\PatternMark;
use Alexandria\Core\Models\Writing\PatternThread;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * PatternMark Factory — Task 1.
 *
 * created_by resolves through the config-driven user model so the factory
 * works in both the core test suite (Testbench) and the consumer app.
 *
 * @extends Factory<PatternMark>
 *
 * @method PatternMark create($attributes = [], ?Model $parent = null)
 * @method PatternMark make($attributes = [], ?Model $parent = null)
 * @method PatternMark createOne($attributes = [])
 * @method PatternMark makeOne($attributes = [])
 */
class PatternMarkFactory extends Factory
{
    protected $model = PatternMark::class;

    public function definition(): array
    {
        /** @var class-string $userModel */
        $userModel = config('alexandria.models.user');

        return [
            'pattern_thread_id' => PatternThread::factory(),
            'role' => fake()->randomElement(['setup', 'develop', 'payoff']),
            'work_section_id' => WorkSection::factory(),
            'anchor_text' => fake()->sentence(),
            'anchor_offset_hint' => fake()->numberBetween(0, 500),
            'note' => fake()->paragraph(),
            'created_by' => $userModel::factory(),
        ];
    }
}
