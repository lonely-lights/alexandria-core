<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\ProjectAiSetting;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<ProjectAiSetting>
 *
 * @method ProjectAiSetting create($attributes = [], ?Model $parent = null)
 * @method ProjectAiSetting make($attributes = [], ?Model $parent = null)
 * @method ProjectAiSetting createOne($attributes = [])
 * @method ProjectAiSetting makeOne($attributes = [])
 */
class ProjectAiSettingFactory extends Factory
{
    protected $model = ProjectAiSetting::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'ai_enabled' => true,
            'auto_categorize' => false,
            'require_approval' => true,
            'default_routing_action' => 'suggest',
        ];
    }

    public function disabled(): self
    {
        return $this->state(fn () => ['ai_enabled' => false]);
    }

    public function autoCategorize(): self
    {
        return $this->state(fn () => ['auto_categorize' => true]);
    }

    public function withBudget(float $monthly, ?float $perRequest = null): self
    {
        return $this->state(fn () => [
            'monthly_budget' => $monthly,
            'per_request_limit' => $perRequest,
        ]);
    }
}
