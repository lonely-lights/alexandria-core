<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Writing;

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * WorkSection Factory
 *
 * Generates fake WorkSection instances for testing — Stage 8g.1.
 * Deliberately leaves `position` unset so the model's creating hook
 * exercises the max+1 sibling-group assignment.
 *
 * @extends Factory<WorkSection>
 */
class WorkSectionFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = WorkSection::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'work_id' => Work::factory(),
            'title' => Str::title(fake()->words(2, true)),
            'label' => 'Chapter',
        ];
    }

    /**
     * Create a section holding prose content.
     */
    public function withContent(string $content): static
    {
        return $this->state(fn () => ['content' => $content]);
    }
}
