<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\Notable;

use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\Notable\NoteHistory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<NoteHistory>
 *
 * @method NoteHistory create($attributes = [], ?Model $parent = null)
 * @method NoteHistory make($attributes = [], ?Model $parent = null)
 * @method NoteHistory createOne($attributes = [])
 * @method NoteHistory makeOne($attributes = [])
 */
class NoteHistoryFactory extends Factory
{
    protected $model = NoteHistory::class;

    public function definition(): array
    {
        return [
            'note_id' => Note::factory(),
            'previous_title' => fake()->sentence(),
            'previous_text' => fake()->paragraph(),
        ];
    }

    public function forNote(Note $note): static
    {
        return $this->state(fn () => ['note_id' => $note->id]);
    }
}
