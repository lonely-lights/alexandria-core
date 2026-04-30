<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Notable;

use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\Notable\NoteLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NoteLink>
 *
 * @method NoteLink create($attributes = [], ?\Illuminate\Database\Eloquent\Model $parent = null)
 * @method NoteLink make($attributes = [], ?\Illuminate\Database\Eloquent\Model $parent = null)
 * @method NoteLink createOne($attributes = [])
 * @method NoteLink makeOne($attributes = [])
 */
class NoteLinkFactory extends Factory
{
    protected $model = NoteLink::class;

    public function definition(): array
    {
        return [
            'note_id' => Note::factory(),
            'url' => fake()->url(),
            'status' => 'pending',
        ];
    }

    public function forNote(Note $note): static
    {
        return $this->state(fn () => ['note_id' => $note->id]);
    }

    public function fetched(): static
    {
        return $this->state(fn () => [
            'status' => 'fetched',
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'site_name' => fake()->domainName(),
        ]);
    }
}
