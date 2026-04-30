<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Notable;

use Alexandria\Core\Database\Factories\Notable\NoteLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * NoteLink Model
 *
 * External URL preview metadata attached to a note.
 *
 * @property int $id
 * @property int $note_id
 * @property string $url
 * @property string|null $title
 * @property string|null $description
 * @property string|null $image_url
 * @property string|null $favicon_url
 * @property string|null $site_name
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Note $note
 *
 * @method static NoteLinkFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static NoteLink create(array $attributes = [])
 */
class NoteLink extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): NoteLinkFactory
    {
        return NoteLinkFactory::new();
    }

    protected function casts(): array
    {
        return [
            'note_id' => 'integer',
        ];
    }

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }
}
