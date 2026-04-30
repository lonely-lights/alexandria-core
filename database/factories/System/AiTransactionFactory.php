<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\AiTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @extends Factory<AiTransaction>
 *
 * @method AiTransaction create($attributes = [], ?Model $parent = null)
 * @method AiTransaction make($attributes = [], ?Model $parent = null)
 * @method AiTransaction createOne($attributes = [])
 * @method AiTransaction makeOne($attributes = [])
 */
class AiTransactionFactory extends Factory
{
    protected $model = AiTransaction::class;

    public function definition(): array
    {
        $provider = fake()->randomElement(['openai', 'anthropic', 'google']);
        $model = fake()->randomElement([
            'gpt-4o',
            'gpt-4o-mini',
            'claude-3-5-sonnet',
            'claude-3-5-haiku',
            'gemini-2.0-flash',
            'gemini-2.5-pro',
        ]);

        $inputTokens = fake()->numberBetween(50, 5000);
        $outputTokens = fake()->numberBetween(50, 2500);
        $thinkingTokens = fake()->numberBetween(0, 1000);

        return [
            'user_id' => null,
            'project_id' => null,
            'batch_id' => null,
            'provider_name' => $provider,
            'model_name' => $model,
            'source' => 'env',
            'context' => fake()->randomElement(['project_categorization', 'note_sorting', 'entry_summary', null]),
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'thinking_tokens' => $thinkingTokens,
            'cache_read_tokens' => fake()->numberBetween(0, 500),
            'cache_write_tokens' => fake()->numberBetween(0, 500),
            'total_tokens' => $inputTokens + $outputTokens + $thinkingTokens,
            'cost' => fake()->randomFloat(6, 0.0001, 0.5),
            'latency_ms' => fake()->numberBetween(50, 5000),
        ];
    }

    public function byUser(): self
    {
        return $this->state(fn () => ['source' => 'user']);
    }

    public function byEnv(): self
    {
        return $this->state(fn () => ['source' => 'env']);
    }

    public function forProject(Project $project): self
    {
        return $this->state(fn () => ['project_id' => $project->id]);
    }

    public function forUser(int $userId): self
    {
        return $this->state(fn () => ['user_id' => $userId]);
    }

    public function forBatch(string $batchId): self
    {
        return $this->state(fn () => ['batch_id' => $batchId]);
    }

    public function withRandomBatch(): self
    {
        return $this->state(fn () => ['batch_id' => (string) Str::uuid()]);
    }
}
