<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\BlueprintView;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<BlueprintView>
 *
 * @method BlueprintView create($attributes = [], ?Model $parent = null)
 * @method BlueprintView make($attributes = [], ?Model $parent = null)
 * @method BlueprintView createOne($attributes = [])
 * @method BlueprintView makeOne($attributes = [])
 */
class BlueprintViewFactory extends Factory
{
    protected $model = BlueprintView::class;

    public function definition(): array
    {
        return [
            'blueprint_id' => Blueprint::factory(),
            'name' => 'Default',
            'type' => 'table',
            'config' => BlueprintView::defaultTableConfig(),
            'is_default' => false,
            'sort_order' => 0,
        ];
    }

    public function default(): self
    {
        return $this->state(fn () => ['is_default' => true]);
    }

    public function timeline(): self
    {
        return $this->state(fn () => ['type' => 'timeline', 'config' => []]);
    }

    public function gallery(): self
    {
        return $this->state(fn () => ['type' => 'gallery', 'config' => []]);
    }

    public function kanban(): self
    {
        return $this->state(fn () => ['type' => 'kanban', 'config' => []]);
    }

    public function forBlueprint(Blueprint $blueprint): self
    {
        return $this->state(fn () => ['blueprint_id' => $blueprint->id]);
    }
}
