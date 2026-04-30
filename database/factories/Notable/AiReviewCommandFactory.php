<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Notable;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<AiReviewCommand>
 *
 * @method AiReviewCommand create($attributes = [], ?Model $parent = null)
 * @method AiReviewCommand make($attributes = [], ?Model $parent = null)
 * @method AiReviewCommand createOne($attributes = [])
 * @method AiReviewCommand makeOne($attributes = [])
 */
class AiReviewCommandFactory extends Factory
{
    protected $model = AiReviewCommand::class;

    public function definition(): array
    {
        return [
            'batch_id' => fake()->uuid(),
            'user_id' => fake()->numberBetween(1, 99999),
            'project_id' => null,
            'context' => null,
            'action_type' => fake()->randomElement([
                'create_entry',
                'transfer_note',
                'copy_note',
                'create_relationship',
            ]),
            'payload' => ['key' => fake()->word(), 'value' => fake()->word()],
            'reasoning' => fake()->sentence(),
            'is_active' => true,
            'status' => 'pending',
            'failure_reason' => null,
            'executed_at' => null,
            'raw_command' => null,
            'validation_errors' => null,
            'order_index' => 0,
        ];
    }

    public function pending(): self
    {
        return $this->state(fn () => ['status' => 'pending']);
    }

    public function approved(): self
    {
        return $this->state(fn () => ['status' => 'approved']);
    }

    public function rejected(): self
    {
        return $this->state(fn () => ['status' => 'rejected']);
    }

    public function executed(): self
    {
        return $this->state(fn () => [
            'status' => 'executed',
            'executed_at' => now(),
        ]);
    }

    public function failed(): self
    {
        return $this->state(fn () => ['status' => 'failed']);
    }

    public function inactive(): self
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function forBatch(string $batchId): self
    {
        return $this->state(fn () => ['batch_id' => $batchId]);
    }

    public function forProject(Project $project): self
    {
        return $this->state(fn () => ['project_id' => $project->id]);
    }

    public function forUser(int $userId): self
    {
        return $this->state(fn () => ['user_id' => $userId]);
    }

    public function malformed(): self
    {
        return $this->state(fn () => [
            'action_type' => null,
            'payload' => null,
            'validation_errors' => ['parse_error' => 'Failed to parse AI response into a valid command.'],
        ]);
    }

    public function withAction(string $actionType, array $payload): self
    {
        return $this->state(fn () => [
            'action_type' => $actionType,
            'payload' => $payload,
        ]);
    }
}
