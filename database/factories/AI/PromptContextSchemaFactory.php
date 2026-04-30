<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\AI;

use Alexandria\Core\Models\AI\PromptContextSchema;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<PromptContextSchema>
 *
 * @method PromptContextSchema create($attributes = [], ?Model $parent = null)
 * @method PromptContextSchema make($attributes = [], ?Model $parent = null)
 * @method PromptContextSchema createOne($attributes = [])
 * @method PromptContextSchema makeOne($attributes = [])
 */
class PromptContextSchemaFactory extends Factory
{
    protected $model = PromptContextSchema::class;

    public function definition(): array
    {
        return [
            'type' => 'TestContext',
            'version' => '1.0',
            'json_schema' => [
                'type' => 'object',
                'required' => ['name'],
                'properties' => [
                    'name' => ['type' => 'string'],
                ],
            ],
            'description' => fake()->sentence(),
        ];
    }
}
