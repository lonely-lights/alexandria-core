<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Framework;

use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        $name = fake()->words(3, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::slug($name).'-'.Str::random(6),
            'use_subdomain' => false,
        ];
    }

    public function named(string $name): self
    {
        return $this->state(fn () => [
            'name' => $name,
            'slug' => Str::slug($name),
        ]);
    }
}
