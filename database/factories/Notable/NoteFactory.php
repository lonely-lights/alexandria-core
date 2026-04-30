<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Notable;

use Alexandria\Core\Models\Notable\Note;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<Note>
 *
 * @method Note create($attributes = [], ?Model $parent = null)
 * @method Note make($attributes = [], ?Model $parent = null)
 * @method Note createOne($attributes = [])
 * @method Note makeOne($attributes = [])
 */
class NoteFactory extends Factory
{
    protected $model = Note::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(),
            'text' => fake()->paragraph(),
            'note_date' => now(),
            'status' => 'active',
            'visibility' => 'private',
            'is_pinned' => false,
        ];
    }

    public function pinned(): static
    {
        return $this->state(fn () => ['is_pinned' => true]);
    }

    public function archived(): static
    {
        return $this->state(fn () => ['status' => 'archived']);
    }
}
