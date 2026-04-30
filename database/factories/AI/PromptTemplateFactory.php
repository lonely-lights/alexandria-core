<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\AI;

use Alexandria\Core\Models\AI\PromptTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<PromptTemplate>
 *
 * @method PromptTemplate create($attributes = [], ?Model $parent = null)
 * @method PromptTemplate make($attributes = [], ?Model $parent = null)
 * @method PromptTemplate createOne($attributes = [])
 * @method PromptTemplate makeOne($attributes = [])
 */
class PromptTemplateFactory extends Factory
{
    protected $model = PromptTemplate::class;

    public function definition(): array
    {
        return [
            'key' => 'test.prompt.'.fake()->unique()->slug(2),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'category' => 'categorization',
            'template' => "You are a worldbuilding AI assistant.\n\n[DATA_CONTEXT]\n\nPlease categorize the data above.",
            'required_context_type' => 'TestContext',
            'context_schema_version' => '1.0',
            'is_system' => false,
            'is_active' => true,
            'version' => 1,
        ];
    }

    public function system(): self
    {
        return $this->state(fn () => ['is_system' => true]);
    }

    public function inactive(): self
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
