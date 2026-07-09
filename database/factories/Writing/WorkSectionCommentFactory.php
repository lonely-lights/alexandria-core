<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Writing;

use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Models\Writing\WorkSectionComment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * WorkSectionComment Factory — Stage 11.5.
 *
 * user_id resolves through the config-driven user model so the factory
 * works in both the core test suite (Testbench) and the consumer app.
 *
 * @extends Factory<WorkSectionComment>
 *
 * @method WorkSectionComment create($attributes = [], ?Model $parent = null)
 * @method WorkSectionComment make($attributes = [], ?Model $parent = null)
 * @method WorkSectionComment createOne($attributes = [])
 * @method WorkSectionComment makeOne($attributes = [])
 */
class WorkSectionCommentFactory extends Factory
{
    protected $model = WorkSectionComment::class;

    public function definition(): array
    {
        /** @var class-string $userModel */
        $userModel = config('alexandria.models.user');

        return [
            'work_section_id' => WorkSection::factory(),
            'user_id' => $userModel::factory(),
            'body' => fake()->sentence(),
        ];
    }
}
