<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Notable;

use Alexandria\Core\Database\Factories\Notable\NoteHistoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * NoteHistory Model
 *
 * Tracks the previous state of a note before each edit.
 *
 * @property int $id
 * @property int $note_id
 * @property int|null $user_id
 * @property string $previous_title
 * @property string $previous_text
 * @property Carbon|null $previous_note_date
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Note $note
 * @property-read Model|null $editor
 *
 * @method static NoteHistoryFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static NoteHistory create(array $attributes = [])
 */
class NoteHistory extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): NoteHistoryFactory
    {
        return NoteHistoryFactory::new();
    }

    protected function casts(): array
    {
        return [
            'previous_note_date' => 'datetime',
        ];
    }

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }

    /**
     * Get the user who made this edit.
     */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }
}
